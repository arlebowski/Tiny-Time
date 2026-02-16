/**
 * authService — Firebase Auth for React Native
 * Uses @react-native-firebase/auth
 */
let auth = null;
let firestore = null;
try {
  auth = require('@react-native-firebase/auth').default;
} catch {}
try {
  firestore = require('@react-native-firebase/firestore').default;
} catch {}
export const isFirebaseAuthAvailable =
  typeof auth === 'function' && typeof firestore === 'function';

const assertFirebase = () => {
  if (!isFirebaseAuthAvailable) {
    throw new Error('Firebase native modules are unavailable in this runtime');
  }
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
export async function createFamilyWithKid(uid, babyName) {
  assertFirebase();
  const now = firestore.FieldValue.serverTimestamp();

  // Create family
  const famRef = await firestore().collection('families').add({
    members: [uid],
    name: `${babyName}'s family`,
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
      createdAt: now,
    });

  // Set primary kid
  await famRef.update({ primaryKidId: kidRef.id });

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
