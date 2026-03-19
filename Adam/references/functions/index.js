/**
 * Firebase Cloud Functions — push notifications for family members
 * Triggers on new logs (feeds, sleeps, diapers) and sleep started
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

/** Get FCM tokens for all family members except the actor */
async function getFamilyMemberTokens(familyId, excludeUid) {
  const famSnap = await admin.firestore().doc(`families/${familyId}`).get();
  if (!famSnap.exists) return [];
  const members = (famSnap.data()?.members || []).filter((uid) => uid !== excludeUid);
  const tokens = [];
  for (const uid of members) {
    const userSnap = await admin.firestore().doc(`users/${uid}`).get();
    if (!userSnap.exists) continue;
    const data = userSnap.data();
    const userTokens = Array.isArray(data?.fcmTokens)
      ? data.fcmTokens
      : data?.fcmToken
        ? [data.fcmToken]
        : [];
    tokens.push(...userTokens.filter(Boolean));
  }
  return [...new Set(tokens)];
}

/** Get kid name for notification body */
async function getKidName(familyId, kidId) {
  const kidSnap = await admin.firestore().doc(`families/${familyId}/kids/${kidId}`).get();
  return kidSnap.exists ? (kidSnap.data()?.name || 'Baby') : 'Baby';
}

/** Send multicast notification, removing invalid tokens */
async function sendToTokens(tokens, notification, data = {}) {
  if (tokens.length === 0) return;
  try {
    const result = await admin.messaging().sendEachForMulticast({
      tokens,
      notification: {
        title: notification.title,
        body: notification.body,
      },
      data: { ...data },
      apns: {
        payload: { aps: { sound: 'default' } },
        fcmOptions: {},
      },
      android: {
        priority: 'high',
        notification: { sound: 'default' },
      },
    });
    if (result.failureCount > 0) {
      const invalidTokens = [];
      result.responses.forEach((resp, i) => {
        if (!resp.success && resp.error?.code === 'messaging/invalid-registration-token') {
          invalidTokens.push(tokens[i]);
        }
      });
      if (invalidTokens.length > 0) {
        await removeInvalidTokens(invalidTokens);
      }
    }
  } catch (e) {
    console.error('sendToTokens error:', e);
  }
}

/** Remove invalid FCM tokens from user docs */
async function removeInvalidTokens(invalidTokens) {
  if (invalidTokens.length === 0) return;
  const usersSnap = await admin.firestore().collection('users').get();
  const invalidSet = new Set(invalidTokens);
  const batch = admin.firestore().batch();
  let hasUpdates = false;
  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const tokens = Array.isArray(data?.fcmTokens) ? data.fcmTokens : [];
    const filtered = tokens.filter((t) => !invalidSet.has(t));
    if (filtered.length !== tokens.length) {
      batch.update(doc.ref, { fcmTokens: filtered });
      hasUpdates = true;
    }
  }
  if (hasUpdates) await batch.commit();
}

// ─── Triggers ───

exports.onNewFeeding = functions.firestore
  .document('families/{familyId}/kids/{kidId}/feedings/{docId}')
  .onCreate(async (snap, ctx) => {
    const { familyId, kidId } = ctx.params;
    const data = snap.data();
    const actorUid = data.createdByUid || null;
    const tokens = await getFamilyMemberTokens(familyId, actorUid);
    if (tokens.length === 0) return;
    const kidName = await getKidName(familyId, kidId);
    const oz = data.ounces;
    const body = oz != null ? `${kidName}: ${oz} oz bottle` : `${kidName}: feeding logged`;
    await sendToTokens(tokens, { title: 'New feeding', body }, {
      type: 'feeding',
      familyId,
      kidId,
    });
  });

exports.onNewNursing = functions.firestore
  .document('families/{familyId}/kids/{kidId}/nursingSessions/{docId}')
  .onCreate(async (snap, ctx) => {
    const { familyId, kidId } = ctx.params;
    const data = snap.data();
    const actorUid = data.createdByUid || null;
    const tokens = await getFamilyMemberTokens(familyId, actorUid);
    if (tokens.length === 0) return;
    const kidName = await getKidName(familyId, kidId);
    await sendToTokens(tokens, {
      title: 'New nursing',
      body: `${kidName}: nursing session logged`,
    }, { type: 'nursing', familyId, kidId });
  });

exports.onNewSolids = functions.firestore
  .document('families/{familyId}/kids/{kidId}/solidsSessions/{docId}')
  .onCreate(async (snap, ctx) => {
    const { familyId, kidId } = ctx.params;
    const data = snap.data();
    const actorUid = data.createdByUid || null;
    const tokens = await getFamilyMemberTokens(familyId, actorUid);
    if (tokens.length === 0) return;
    const kidName = await getKidName(familyId, kidId);
    await sendToTokens(tokens, {
      title: 'New solids',
      body: `${kidName}: solids logged`,
    }, { type: 'solids', familyId, kidId });
  });

exports.onNewDiaper = functions.firestore
  .document('families/{familyId}/kids/{kidId}/diaperChanges/{docId}')
  .onCreate(async (snap, ctx) => {
    const { familyId, kidId } = ctx.params;
    const data = snap.data();
    const actorUid = data.createdByUid || null;
    const tokens = await getFamilyMemberTokens(familyId, actorUid);
    if (tokens.length === 0) return;
    const kidName = await getKidName(familyId, kidId);
    await sendToTokens(tokens, {
      title: 'New diaper',
      body: `${kidName}: diaper change logged`,
    }, { type: 'diaper', familyId, kidId });
  });

exports.onNewSleep = functions.firestore
  .document('families/{familyId}/kids/{kidId}/sleepSessions/{docId}')
  .onCreate(async (snap, ctx) => {
    const { familyId, kidId } = ctx.params;
    const data = snap.data();
    if (!data.isActive) return; // Only notify for sleep started (active session)
    const actorUid = data.startedByUid || data.createdByUid || null;
    const tokens = await getFamilyMemberTokens(familyId, actorUid);
    if (tokens.length === 0) return;
    const kidName = await getKidName(familyId, kidId);
    await sendToTokens(tokens, {
      title: 'Sleep started',
      body: `${kidName} started sleeping`,
    }, { type: 'sleep_started', familyId, kidId });
  });
