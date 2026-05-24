/**
 * authService — Firebase Auth for React Native
 * Uses @react-native-firebase/auth
 */
import { uploadKidPhoto } from './storageService';
import { Platform } from 'react-native';
import { pingNewSignup } from '../utils/formspree';
import { localDateToMs } from '../utils/dateTime';

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

/**
 * Progressive email auth: sign in, or create account if user not found / ambiguous credential.
 */
export async function continueWithEmail(email, password) {
  assertFirebase();
  try {
    const result = await auth().signInWithEmailAndPassword(email, password);
    await ensureUserProfile(result.user);
    return { isNewUser: false };
  } catch (e) {
    const code = e?.code || '';
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      try {
        const result = await auth().createUserWithEmailAndPassword(email, password);
        await ensureUserProfile(result.user);
        return { isNewUser: true };
      } catch (createErr) {
        if (createErr?.code === 'auth/email-already-in-use') {
          const wrong = new Error('Invalid email or password');
          wrong.code = 'auth/wrong-password';
          throw wrong;
        }
        throw createErr;
      }
    }
    throw e;
  }
}

/** Send password reset email */
export async function sendPasswordReset(email) {
  assertFirebase();
  await auth().sendPasswordResetEmail(String(email || '').trim());
}

/** Google sign-in using native Google SDK -> Firebase credential */
export async function signInWithGoogle() {
  assertFirebase();
  ensureGoogleConfigured();

  if (typeof GoogleSignin.hasPlayServices === 'function') {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
  }

  const signInResult = await GoogleSignin.signIn();
  if (signInResult?.type === 'cancelled') {
    const cancelError = new Error('Google sign-in was cancelled.');
    cancelError.code = 'SIGN_IN_CANCELLED';
    throw cancelError;
  }

  let idToken = signInResult?.idToken || signInResult?.data?.idToken;

  // On Android, idToken is sometimes null in the signIn response; fetch via getTokens()
  if (Platform.OS === 'android' && !idToken && typeof GoogleSignin.getTokens === 'function') {
    try {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens?.idToken || null;
    } catch (e) {
      console.warn('[authService] getTokens fallback failed:', e);
    }
  }

  if (!idToken) {
    console.warn('[authService] signIn result:', JSON.stringify(signInResult, null, 2));
    throw new Error('Google sign-in failed to return an ID token. Check that webClientId matches your Firebase web client.');
  }

  const credential = auth.GoogleAuthProvider.credential(idToken);
  const result = await auth().signInWithCredential(credential);
  await ensureUserProfile(result.user);
  return result;
}

/** Apple sign-in using Apple identity token -> Firebase credential */
export async function signInWithAppleIdentityToken(identityToken, rawNonce = null) {
  assertFirebase();
  if (!identityToken) {
    throw new Error('Apple sign-in did not return an identity token.');
  }

  const AppleAuthProvider = auth?.AppleAuthProvider;
  if (!AppleAuthProvider || typeof AppleAuthProvider.credential !== 'function') {
    throw new Error('Firebase AppleAuthProvider is unavailable in this runtime');
  }
  const credential = AppleAuthProvider.credential(identityToken, rawNonce || undefined);
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
    pingNewSignup(user).catch(() => {});
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
 * Prefers preferredFamilyId if provided and user is a member.
 */
export async function loadUserFamily(uid, preferredFamilyId = null) {
  assertFirebase();
  if (!uid) return null;

  const families = await loadUserFamilies(uid);
  if (!families || families.length === 0) return null;

  if (preferredFamilyId) {
    const match = families.find((f) => f.familyId === preferredFamilyId);
    if (match) return { familyId: match.familyId, kidId: match.kidId };
  }

  return { familyId: families[0].familyId, kidId: families[0].kidId };
}

/**
 * Load all families where the user is a member.
 * Returns [{ familyId, kidId, name }] or [].
 */
export async function loadUserFamilies(uid) {
  assertFirebase();
  if (!uid) return [];

  const famSnap = await firestore()
    .collection('families')
    .where('members', 'array-contains', uid)
    .get();

  if (famSnap.empty) return [];

  const result = [];
  for (const famDoc of famSnap.docs) {
    const familyId = famDoc.id;
    const famData = famDoc.data() || {};
    if (famData.isDeleted) continue;
    const name = famData.name || 'Family';

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

    result.push({
      familyId,
      kidId,
      name,
      memberCount: Array.isArray(famData.members) ? famData.members.length : 1,
    });
  }

  return result;
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
  const birthTimestamp = birthDate ? localDateToMs(birthDate) : null;

  const parsedBabyWeight = Number.parseFloat(String(babyWeight ?? '').trim());
  const normalizedBabyWeight = Number.isFinite(parsedBabyWeight) && parsedBabyWeight > 0
    ? parsedBabyWeight
    : null;

  const normalizedFamilyName = String(familyName || '').trim();

  // Create family
  const famRef = await firestore().collection('families').add({
    members: [uid],
    ownerId: uid,
    createdBy: uid,
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
  const normalizedCode = String(code || '').trim().toUpperCase();
  if (!normalizedCode) throw new Error('Invalid invite');

  const inviteRef = firestore().collection('invites').doc(normalizedCode);
  const preInviteSnap = await inviteRef.get();
  const preInviteExists = typeof preInviteSnap?.exists === 'function'
    ? preInviteSnap.exists()
    : Boolean(preInviteSnap?.exists);
  if (!preInviteExists) throw new Error('Invalid invite');

  const preInvite = preInviteSnap.data?.() || null;
  if (!preInvite?.familyId) throw new Error('Invalid invite');

  const familyRef = firestore().collection('families').doc(preInvite.familyId);
  const kidsSnap = await familyRef.collection('kids').get();
  const kidRefs = kidsSnap.docs.map((doc) => doc.ref);

  return firestore().runTransaction(async (tx) => {
    const inviteSnap = await tx.get(inviteRef);
    const inviteExists = typeof inviteSnap?.exists === 'function'
      ? inviteSnap.exists()
      : Boolean(inviteSnap?.exists);
    if (!inviteExists) throw new Error('Invalid invite');

    const invite = inviteSnap.data?.() || null;
    if (!invite?.familyId) throw new Error('Invalid invite');

    const familySnap = await tx.get(familyRef);
    const familyExists = typeof familySnap?.exists === 'function'
      ? familySnap.exists()
      : Boolean(familySnap?.exists);
    if (!familyExists) throw new Error('Invalid invite');

    const famData = familySnap.data?.() || {};
    const members = Array.isArray(famData.members) ? famData.members : [];
    let resolvedKidId = invite.kidId || famData.primaryKidId || kidRefs[0]?.id || null;

    if (members.includes(userId)) {
      return { familyId: invite.familyId, kidId: resolvedKidId };
    }

    if (invite.used) throw new Error('Invite already used');

    tx.update(familyRef, {
      members: firestore.FieldValue.arrayUnion(userId),
    });

    kidRefs.forEach((kidRef) => {
      tx.update(kidRef, {
        members: firestore.FieldValue.arrayUnion(userId),
      });
    });

    tx.update(inviteRef, {
      used: true,
      usedBy: userId,
      usedAt: firestore.FieldValue.serverTimestamp(),
    });

    return {
      familyId: invite.familyId,
      kidId: resolvedKidId,
    };
  });
}

/** Delete signed-in user account and remove membership references. */
export async function deleteCurrentUserAccount() {
  assertFirebase();
  const currentUser = auth().currentUser;
  const uid = currentUser?.uid || null;
  if (!uid || !currentUser) throw new Error('Not signed in');

  const familiesSnap = await firestore()
    .collection('families')
    .where('members', 'array-contains', uid)
    .get();

  for (const famDoc of familiesSnap.docs) {
    const familyData = famDoc.data() || {};
    const currentMembers = Array.isArray(familyData.members) ? familyData.members : [];
    const nextMembers = currentMembers.filter((memberUid) => memberUid && memberUid !== uid);
    const nextOwnerUid = nextMembers[0] || null;

    const familyPatch = { members: nextMembers };
    if (familyData.ownerId === uid) familyPatch.ownerId = nextOwnerUid;
    if (familyData.createdBy === uid) familyPatch.createdBy = nextOwnerUid;
    await famDoc.ref.set(familyPatch, { merge: true });

    const kidSnap = await famDoc.ref.collection('kids').where('members', 'array-contains', uid).get();
    await Promise.all(kidSnap.docs.map((kidDoc) => {
      const kidData = kidDoc.data() || {};
      const kidMembers = Array.isArray(kidData.members) ? kidData.members : [];
      const nextKidMembers = kidMembers.filter((memberUid) => memberUid && memberUid !== uid);
      const nextKidOwnerUid = nextKidMembers[0] || null;
      const kidPatch = { members: nextKidMembers };
      if (kidData.ownerId === uid) kidPatch.ownerId = nextKidOwnerUid;
      return kidDoc.ref.set(kidPatch, { merge: true });
    }));
  }

  try {
    await firestore().collection('users').doc(uid).delete();
  } catch {}

  try {
    await currentUser.delete();
  } catch (error) {
    const code = String(error?.code || '');
    if (code.includes('requires-recent-login')) {
      throw new Error('For security, please sign out and sign back in, then try deleting your account again.');
    }
    throw error;
  }
}
