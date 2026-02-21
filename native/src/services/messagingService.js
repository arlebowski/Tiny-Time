/**
 * messagingService — FCM token registration for push notifications
 * Saves token to users/{uid} for Cloud Functions to send notifications
 */
let messaging = null;
let firestore = null;
let auth = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch {}
try {
  firestore = require('@react-native-firebase/firestore').default;
} catch {}
try {
  auth = require('@react-native-firebase/auth').default;
} catch {}

const isAvailable = typeof messaging === 'object' && typeof firestore === 'function' && typeof auth === 'function';

/** Request notification permission (iOS) */
async function requestPermission() {
  if (!isAvailable) return false;
  const authStatus = await messaging().requestPermission();
  return authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;
}

/** Get current FCM token */
async function getToken() {
  if (!isAvailable) return null;
  try {
    return await messaging().getToken();
  } catch (e) {
    console.warn('[messagingService] getToken failed:', e?.message);
    return null;
  }
}

/** Save FCM token to users/{uid}.fcmTokens array */
async function saveTokenToFirestore(uid, token) {
  if (!uid || !token || !firestore) return;
  try {
    const userRef = firestore().collection('users').doc(uid);
    await userRef.set(
      {
        fcmTokens: firestore.FieldValue.arrayUnion(token),
        fcmTokenUpdatedAt: firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  } catch (e) {
    console.warn('[messagingService] saveTokenToFirestore failed:', e?.message);
  }
}

/** Remove token from users/{uid} (e.g. on sign out) */
async function removeTokenFromFirestore(uid, token) {
  if (!uid || !token || !firestore) return;
  try {
    const userRef = firestore().collection('users').doc(uid);
    await userRef.update({
      fcmTokens: firestore.FieldValue.arrayRemove(token),
    });
  } catch (e) {
    console.warn('[messagingService] removeTokenFromFirestore failed:', e?.message);
  }
}

/** Register FCM token for current user. Call after sign-in. */
async function registerTokenForCurrentUser() {
  if (!isAvailable) return;
  const user = auth().currentUser;
  if (!user?.uid) return;
  const hasPermission = await requestPermission();
  if (!hasPermission) return;
  const token = await getToken();
  if (token) await saveTokenToFirestore(user.uid, token);
}

/** Unregister token on sign out */
async function unregisterToken() {
  if (!isAvailable) return;
  const user = auth().currentUser;
  if (!user?.uid) return;
  const token = await getToken();
  if (token) await removeTokenFromFirestore(user.uid, token);
}

/** Set up token refresh listener — saves new token when it changes */
function onTokenRefresh(callback) {
  if (!isAvailable) return () => {};
  return messaging().onTokenRefresh(async (newToken) => {
    const user = auth().currentUser;
    if (user?.uid && newToken) await saveTokenToFirestore(user.uid, newToken);
    callback?.(newToken);
  });
}

/** Handle foreground messages (optional — for in-app banner) */
function onForegroundMessage(handler) {
  if (!isAvailable) return () => {};
  return messaging().onMessage(handler);
}

/** Handle notification opened (background/quit) */
function onNotificationOpened(handler) {
  if (!isAvailable) return () => {};
  return messaging().onNotificationOpenedApp(handler);
}

/** Check if app was opened from a notification (cold start) */
async function getInitialNotification() {
  if (!isAvailable) return null;
  return messaging().getInitialNotification();
}

export const messagingService = {
  isAvailable,
  requestPermission,
  getToken,
  saveTokenToFirestore,
  removeTokenFromFirestore,
  registerTokenForCurrentUser,
  unregisterToken,
  onTokenRefresh,
  onForegroundMessage,
  onNotificationOpened,
  getInitialNotification,
};
