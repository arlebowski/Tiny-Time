#!/usr/bin/env node
/**
 * Creates an App Store reviewer test account.
 * By default, creates user only (no family) so they go through onboarding.
 * Set SKIP_ONBOARDING=true to pre-create family+kid and skip onboarding.
 *
 * Run: cd functions && npm run create-reviewer
 *
 * Requires: service-account-key.json in native/ or project root.
 */

const path = require('path');
const fs = require('fs');

// Resolve service account path (relative to functions/scripts/)
const projectRoot = path.join(__dirname, '../..');
const candidates = [
  process.env.GOOGLE_APPLICATION_CREDENTIALS,
  path.join(projectRoot, 'native/service-account-key.json'),
  path.join(projectRoot, 'service-account-key.json'),
].filter(Boolean);

let credPath = candidates.find((p) => p && fs.existsSync(p));
if (!credPath) {
  console.error('No Firebase service account found. Set GOOGLE_APPLICATION_CREDENTIALS or add service-account-key.json to native/ or project root.');
  process.exit(1);
}

process.env.GOOGLE_APPLICATION_CREDENTIALS = credPath;

const admin = require('firebase-admin');
admin.initializeApp({ projectId: process.env.FIREBASE_PROJECT_ID || undefined });

const auth = admin.auth();
const db = admin.firestore();

const REVIEWER_EMAIL = process.env.REVIEWER_EMAIL || 'reviewer@tinytracker.app';
const REVIEWER_PASSWORD = process.env.REVIEWER_PASSWORD || 'Review2026!';
const BABY_NAME = process.env.REVIEWER_BABY_NAME || 'Emma';
const FAMILY_NAME = process.env.REVIEWER_FAMILY_NAME || 'Review Family';
const SKIP_ONBOARDING = process.env.SKIP_ONBOARDING === 'true';

async function main() {
  console.log('Creating App Store reviewer account...');
  console.log('  Email:', REVIEWER_EMAIL);
  console.log('  Password:', REVIEWER_PASSWORD);
  console.log('  Force onboarding:', !SKIP_ONBOARDING);

  let user;
  try {
    user = await auth.getUserByEmail(REVIEWER_EMAIL);
    console.log('  User already exists (uid:', user.uid, ')');
  } catch (e) {
    if (e.code === 'auth/user-not-found') {
      user = await auth.createUser({
        email: REVIEWER_EMAIL,
        password: REVIEWER_PASSWORD,
        displayName: 'App Store Reviewer',
        emailVerified: true,
      });
      console.log('  Created new user (uid:', user.uid, ')');
    } else {
      throw e;
    }
  }

  const uid = user.uid;
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Ensure user profile
  await db.doc(`users/${uid}`).set({
    email: REVIEWER_EMAIL,
    displayName: 'App Store Reviewer',
    lastActiveAt: now,
    createdAt: now,
  }, { merge: true });
  console.log('  User profile updated');

  // Find existing family (if any)
  const existingFam = await db.collection('families')
    .where('members', 'array-contains', uid)
    .limit(1)
    .get();

  if (!existingFam.empty) {
    const famRef = existingFam.docs[0].ref;
    if (SKIP_ONBOARDING) {
      console.log('  Family already exists, skipping onboarding');
      printSuccess(false);
      return;
    }
    // Force onboarding: delete family so user hits SetupScreen
    console.log('  Deleting existing family to force onboarding...');
    await db.recursiveDelete(famRef);
    console.log('  Family removed');
    printSuccess(true);
    return;
  }

  if (SKIP_ONBOARDING) {
    const birthTimestamp = new Date('2024-01-15').getTime();
    const famRef = await db.collection('families').add({
      members: [uid],
      name: FAMILY_NAME,
      createdAt: now,
      primaryKidId: null,
    });
    const kidRef = await famRef.collection('kids').add({
      name: BABY_NAME,
      members: [uid],
      ownerId: uid,
      birthDate: birthTimestamp,
      babyWeight: 13.5,
      photoURL: null,
      createdAt: now,
    });
    await famRef.update({ primaryKidId: kidRef.id });
    await kidRef.collection('settings').doc('default').set({
      preferredVolumeUnit: 'oz',
      babyWeight: 13.5,
      createdAt: now,
    });
    console.log('  Created family:', famRef.id, '| kid:', kidRef.id);
    printSuccess(false);
  } else {
    console.log('  No family created — user will go through onboarding');
    printSuccess(true);
  }
}

function printSuccess(goesThroughOnboarding) {
  console.log('');
  console.log('✓ App Store reviewer account ready!');
  if (goesThroughOnboarding) {
    console.log('  Sign in → user will see onboarding (Create Family / Join with Code)');
  }
  console.log('');
  console.log('Add these credentials in App Store Connect → App Review Information:');
  console.log('  Username:', REVIEWER_EMAIL);
  console.log('  Password:', REVIEWER_PASSWORD);
  console.log('');
}

main().catch((e) => {
  console.error('Error:', e.message || e);
  process.exit(1);
});
