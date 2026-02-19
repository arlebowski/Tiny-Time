/**
 * authService — Firebase Auth for React Native
 * Uses @react-native-firebase/auth
 */
import { uploadKidPhoto } from './storageService';

let auth = null;
let firestore = null;
let GoogleSignin = null;
let googleStatusCodes = null;
try {
  auth = require('@react-native-firebase/auth').default;
} catch {}
try {
  firestore = require('@react-native-firebase/firestore').default;
} catch {}
try {
  const googleSignIn = require('@react-native-google-signin/google-signin');
  GoogleSignin = googleSignIn.GoogleSignin;
  googleStatusCodes = googleSignIn.statusCodes;
} catch {}
export const isFirebaseAuthAvailable =
  typeof auth === 'function' && typeof firestore === 'function';
const GOOGLE_WEB_CLIENT_ID = '775043948126-045tnb5lf159e1ik8ildjj6sfdv4reac.apps.googleusercontent.com';
let googleConfigured = false;

const assertFirebase = () => {
  if (!isFirebaseAuthAvailable) {
    throw new Error('Firebase native modules are unavailable in this runtime');
  }
};

const assertGoogleSignIn = () => {
  if (!GoogleSignin || !googleStatusCodes) {
    throw new Error('Google Sign-In is unavailable in this runtime');
  }
};

const ensureGoogleConfigured = () => {
  assertGoogleSignIn();
  if (googleConfigured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
  });
  googleConfigured = true;
};

/** Email/password sign-up — creates auth user + ensures profile doc */
export async function signUpWithEmail(email, password) {
  assertFirebase();
  const result = await auth().createUserWithEmailAndPassword(email, password);
  await ensureUserProfile(result.user);
  return result;
}

/** Email/password sign-in */
export async function signInWithEmail(email, password) {
  assertFirebase();
  const result = await auth().signInWithEmailAndPassword(email, password);
  await ensureUserProfile(result.user);
  return result;
}

/** Google sign-in using native Google SDK -> Firebase credential */
export async function signInWithGoogle() {
  assertFirebase();
  ensureGoogleConfigured();

  if (typeof GoogleSignin.hasPlayServices === 'function') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const signInResult = await GoogleSignin.signIn();
  const idToken = signInResult?.idToken || signInResult?.data?.idToken;
  if (!idToken) {
    throw new Error('Google sign-in failed to return an ID token');
  }

  const credential = auth.GoogleAuthProvider.credential(idToken);
  const result = await auth().signInWithCredential(credential);
  await ensureUserProfile(result.user);
  return result;
}

/** Sign out */
export async function signOutUser() {
  assertFirebase();
  await auth().signOut();
}

/**
 * Create or update user profile doc in users/{uid}.
 * Mirrors web/script.js ensureUserProfile().
 */
export async function ensureUserProfile(user) {
  assertFirebase();
  if (!user) return;
  const userRef = firestore().collection('users').doc(user.uid);
  const snap = await userRef.get();
  const now = firestore.FieldValue.serverTimestamp();
  const base = {
    email: user.email || null,
    displayName: user.displayName || null,
    photoURL: user.photoURL || null,
    lastActiveAt: now,
  };

  if (!snap.exists) {
    await userRef.set({ ...base, createdAt: now }, { merge: true });
  } else {
    await userRef.set(base, { merge: true });
  }
}

/**
 * Update signed-in user profile fields in Firebase Auth and users/{uid}.
 * @param {{displayName?: string, email?: string, photoURL?: string}} patch
 */
export async function updateCurrentUserProfile(patch = {}) {
  assertFirebase();
  const currentUser = auth().currentUser;
  if (!currentUser) throw new Error('Not signed in');

  const nextDisplayName = Object.prototype.hasOwnProperty.call(patch, 'displayName')
    ? (patch.displayName || '').trim()
    : currentUser.displayName || null;
  const nextEmail = Object.prototype.hasOwnProperty.call(patch, 'email')
    ? (patch.email || '').trim()
    : currentUser.email || null;
  const nextPhotoURL = Object.prototype.hasOwnProperty.call(patch, 'photoURL')
    ? (patch.photoURL || null)
    : (currentUser.photoURL || null);

  if (Object.prototype.hasOwnProperty.call(patch, 'displayName') || Object.prototype.hasOwnProperty.call(patch, 'photoURL')) {
    await currentUser.updateProfile({
      displayName: nextDisplayName || null,
      photoURL: nextPhotoURL || null,
    });
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'email') && nextEmail && nextEmail !== currentUser.email) {
    await currentUser.updateEmail(nextEmail);
  }

  const userRef = firestore().collection('users').doc(currentUser.uid);
  await userRef.set(
    {
      email: nextEmail || null,
      displayName: nextDisplayName || null,
      photoURL: nextPhotoURL || null,
      lastActiveAt: firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Load the user's familyId and kidId from their families.
 * Returns { familyId, kidId } or null if none found.
 */
export async function loadUserFamily(uid) {
  assertFirebase();
  if (!uid) return null;

  // Find families where user is a member
  const famSnap = await firestore()
    .collection('families')
    .where('members', 'array-contains', uid)
    .limit(1)
    .get();

  if (famSnap.empty) return null;

  const famDoc = famSnap.docs[0];
  const familyId = famDoc.id;
  const famData = famDoc.data();

  // Get the primary kid or first kid
  let kidId = famData.primaryKidId || null;
  if (!kidId) {
    const kidsSnap = await firestore()
      .collection('families')
      .doc(familyId)
      .collection('kids')
      .limit(1)
      .get();
    if (!kidsSnap.empty) {
      kidId = kidsSnap.docs[0].id;
    }
  }

  return { familyId, kidId };
}

/** Create a new family + kid for a first-time user */
export async function createFamilyWithKid(
  uid,
  babyName,
  {
    familyName = null,
    birthDate = null,
    photoUri = null,
    preferredVolumeUnit = 'oz',
    babyWeight = null,
  } = {}
) {
  assertFirebase();
  const now = firestore.FieldValue.serverTimestamp();
  const birthTimestamp = birthDate ? new Date(birthDate).getTime() : null;

  const parsedBabyWeight = Number.parseFloat(String(babyWeight ?? '').trim());
  const normalizedBabyWeight = Number.isFinite(parsedBabyWeight) && parsedBabyWeight > 0
    ? parsedBabyWeight
    : null;

  const normalizedFamilyName = String(familyName || '').trim();

  // Create family
  const famRef = await firestore().collection('families').add({
    members: [uid],
    name: normalizedFamilyName || `${babyName}'s family`,
    createdAt: now,
    primaryKidId: null,
  });

  // Create kid under family
  const kidRef = await firestore()
    .collection('families')
    .doc(famRef.id)
    .collection('kids')
    .add({
      name: babyName,
      members: [uid],
      ownerId: uid,
      birthDate: Number.isFinite(birthTimestamp) ? birthTimestamp : null,
      babyWeight: normalizedBabyWeight,
      photoURL: null,
      createdAt: now,
    });

  // Set primary kid
  await famRef.update({ primaryKidId: kidRef.id });

  // Create default kid settings
  await firestore()
    .collection('families')
    .doc(famRef.id)
    .collection('kids')
    .doc(kidRef.id)
    .collection('settings')
    .doc('default')
    .set({
      preferredVolumeUnit: preferredVolumeUnit === 'ml' ? 'ml' : 'oz',
      ...(normalizedBabyWeight != null ? { babyWeight: normalizedBabyWeight } : {}),
      createdAt: now,
    });

  // Upload profile photo (if provided) and attach URL.
  if (photoUri) {
    const uploadedPhotoUrl = await uploadKidPhoto(photoUri, famRef.id, kidRef.id);
    await kidRef.update({ photoURL: uploadedPhotoUrl || null });
  }

  return { familyId: famRef.id, kidId: kidRef.id };
}

/** Accept an invite code */
export async function acceptInvite(code, userId) {
  assertFirebase();
  const inviteRef = firestore().collection('invites').doc(code);
  const snap = await inviteRef.get();
  if (!snap.exists) throw new Error('Invalid invite');

  const invite = snap.data();
  if (invite.used) throw new Error('Invite already used');

  const familyRef = firestore().collection('families').doc(invite.familyId);

  // Add user to family
  await familyRef.update({
    members: firestore.FieldValue.arrayUnion(userId),
  });

  // Add user to all kids in this family
  const kidsSnap = await familyRef.collection('kids').get();
  await Promise.all(
    kidsSnap.docs.map((kidDoc) =>
      kidDoc.ref.update({
        members: firestore.FieldValue.arrayUnion(userId),
      })
    )
  );

  // Mark invite used
  await inviteRef.update({
    used: true,
    usedBy: userId,
    usedAt: firestore.FieldValue.serverTimestamp(),
  });

  return {
    familyId: invite.familyId,
    kidId: invite.kidId || (kidsSnap.docs[0]?.id || null),
  };
}
