/**
 * AuthContext — provides auth state + family/kid selection to the entire app.
 */
import React, { createContext, useContext, useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  isFirebaseAuthAvailable,
  ensureUserProfile,
  loadUserFamily,
  loadUserFamilies,
  createFamilyWithKid,
  signOutUser,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
  acceptInvite,
} from '../services/authService';
import { messagingService } from '../services/messagingService';

const AuthContext = createContext(null);
const KID_SELECTION_KEY_PREFIX = 'tt_selected_kid';
const FAMILY_SELECTION_KEY_PREFIX = 'tt_selected_family';
const TRACKER_BOOTSTRAP_CACHE_PREFIX = 'tt_tracker_bootstrap_v1';

function getFamilySelectionKey(uid) {
  if (!uid) return null;
  return `${FAMILY_SELECTION_KEY_PREFIX}:${uid}`;
}

function getKidSelectionKey(uid, familyId) {
  if (!uid || !familyId) return null;
  return `${KID_SELECTION_KEY_PREFIX}:${uid}:${familyId}`;
}

function getTrackerBootstrapKey(familyId, kidId) {
  if (!familyId || !kidId) return null;
  return `${TRACKER_BOOTSTRAP_CACHE_PREFIX}:${familyId}:${kidId}`;
}

function extractInviteCodeFromUrl(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const parsed = new URL(url);
    const invite = parsed.searchParams.get('invite');
    return invite ? String(invite).trim().toUpperCase() : null;
  } catch {
    const match = url.match(/[?&]invite=([^&]+)/i);
    if (!match?.[1]) return null;
    try {
      return decodeURIComponent(match[1]).trim().toUpperCase();
    } catch {
      return match[1].trim().toUpperCase();
    }
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [familyId, setFamilyIdState] = useState(null);
  const [kidId, setKidIdState] = useState(null);
  const [families, setFamilies] = useState([]);
  const [selectedKidSnapshot, setSelectedKidSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [pendingInviteCode, setPendingInviteCode] = useState(null);
  const inviteInFlightRef = useRef(false);
  const handledInviteCodesRef = useRef(new Set());

  const hydrateKidSnapshot = useCallback(async (nextFamilyId, nextKidId) => {
    const key = getTrackerBootstrapKey(nextFamilyId, nextKidId);
    if (!key) {
      setSelectedKidSnapshot(null);
      return;
    }
    try {
      const raw = await AsyncStorage.getItem(key);
      if (!raw) {
        setSelectedKidSnapshot(null);
        return;
      }
      const parsed = JSON.parse(raw);
      const fromKids = Array.isArray(parsed?.kids)
        ? parsed.kids.find((kid) => kid?.id === nextKidId)
        : null;
      const fromKidData = parsed?.kidData?.id === nextKidId ? parsed.kidData : null;
      setSelectedKidSnapshot(fromKids || fromKidData || null);
    } catch {
      setSelectedKidSnapshot(null);
    }
  }, []);

  const applyInviteForUser = useCallback(async (inviteCode, userId) => {
    const code = typeof inviteCode === 'string' ? inviteCode.trim().toUpperCase() : '';
    if (!code || !userId || !isFirebaseAuthAvailable) return false;
    if (handledInviteCodesRef.current.has(code)) {
      setPendingInviteCode(null);
      return true;
    }
    if (inviteInFlightRef.current) return false;

    inviteInFlightRef.current = true;
    try {
      const result = await acceptInvite(code, userId);
      handledInviteCodesRef.current.add(code);
      setPendingInviteCode(null);
      if (result?.familyId && result?.kidId) {
        setFamilyIdState(result.familyId);
        setKidIdState(result.kidId);
        setNeedsSetup(false);
        await hydrateKidSnapshot(result.familyId, result.kidId);
        const key = getKidSelectionKey(userId, result.familyId);
        if (key) {
          AsyncStorage.setItem(key, result.kidId).catch(() => {});
        }
        return true;
      }
      return false;
    } catch (error) {
      setPendingInviteCode(null);
      throw error;
    } finally {
      inviteInFlightRef.current = false;
    }
  }, [hydrateKidSnapshot]);

  const setKidId = useCallback((nextKidId) => {
    const resolvedKidId = typeof nextKidId === 'function' ? nextKidId(kidId) : nextKidId;
    setKidIdState(resolvedKidId);
    hydrateKidSnapshot(familyId, resolvedKidId).catch(() => {});
    const key = getKidSelectionKey(user?.uid, familyId);
    if (key && resolvedKidId) {
      AsyncStorage.setItem(key, resolvedKidId).catch(() => {});
    }
  }, [familyId, kidId, user?.uid, hydrateKidSnapshot]);

  useEffect(() => {
    let mounted = true;
    const consumeInitialUrl = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (!mounted) return;
        const inviteCode = extractInviteCodeFromUrl(initialUrl);
        if (inviteCode) setPendingInviteCode(inviteCode);
      } catch {}
    };

    consumeInitialUrl();
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const inviteCode = extractInviteCodeFromUrl(url);
      if (inviteCode) setPendingInviteCode(inviteCode);
    });

    return () => {
      mounted = false;
      subscription?.remove?.();
    };
  }, []);

  // Listen for auth state changes
  useEffect(() => {
    if (!isFirebaseAuthAvailable) {
      setUser({ uid: 'local-user', email: 'local@tinytracker.app', displayName: 'Local User' });
      setFamilyId('local-family');
      setKidIdState('local-kid');
      setSelectedKidSnapshot({ id: 'local-kid', name: 'Levi', photoURL: null });
      setNeedsSetup(false);
      setLoading(false);
      return () => {};
    }

    const auth = require('@react-native-firebase/auth').default;
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          const inviteHandled = await applyInviteForUser(pendingInviteCode, firebaseUser.uid);
          if (inviteHandled) {
            setLoading(false);
            return;
          }
          await ensureUserProfile(firebaseUser);
          messagingService.registerTokenForCurrentUser().catch(() => {});
          const allFamilies = await loadUserFamilies(firebaseUser.uid);
          const familySelectionKey = getFamilySelectionKey(firebaseUser.uid);
          const cachedFamilyId = familySelectionKey ? await AsyncStorage.getItem(familySelectionKey) : null;
          const family = await loadUserFamily(firebaseUser.uid, cachedFamilyId || undefined);

          if (family && allFamilies.length > 0) {
            setFamilies(allFamilies);
            setFamilyIdState(family.familyId);
            const cachedKidKey = getKidSelectionKey(firebaseUser.uid, family.familyId);
            const cachedKidId = cachedKidKey ? await AsyncStorage.getItem(cachedKidKey) : null;
            const resolvedKidId = cachedKidId || family.kidId;
            setKidIdState(resolvedKidId);
            await hydrateKidSnapshot(family.familyId, resolvedKidId);
            if (familySelectionKey) {
              AsyncStorage.setItem(familySelectionKey, family.familyId).catch(() => {});
            }
            setNeedsSetup(false);
          } else if (allFamilies.length === 0) {
            // User has no family yet — needs onboarding
            setSelectedKidSnapshot(null);
            setNeedsSetup(true);
          }
        } catch (e) {
          console.warn('Failed to load user family:', e);
          setNeedsSetup(true);
        }
      } else {
        setUser(null);
        setFamilyIdState(null);
        setKidIdState(null);
        setFamilies([]);
        setSelectedKidSnapshot(null);
        setNeedsSetup(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, [applyInviteForUser, pendingInviteCode, hydrateKidSnapshot]);

  useEffect(() => {
    if (!user?.uid) return;
    if (!pendingInviteCode) return;
    applyInviteForUser(pendingInviteCode, user.uid).catch((e) => {
      console.warn('Failed to accept invite from deep link:', e);
    });
  }, [user?.uid, pendingInviteCode, applyInviteForUser]);

  // FCM token refresh — save new token when it changes
  useEffect(() => {
    if (!user?.uid || !messagingService.isAvailable) return;
    const unsub = messagingService.onTokenRefresh(() => {
      messagingService.registerTokenForCurrentUser().catch(() => {});
    });
    return unsub;
  }, [user?.uid]);

  const handleSignIn = useCallback(async (email, password) => {
    if (!isFirebaseAuthAvailable) return;
    setLoading(true);
    try {
      await signInWithEmail(email, password);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignUp = useCallback(async (email, password) => {
    if (!isFirebaseAuthAvailable) return;
    setLoading(true);
    try {
      await signUpWithEmail(email, password);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGoogleSignIn = useCallback(async () => {
    if (!isFirebaseAuthAvailable) return;
    setLoading(true);
    try {
      await signInWithGoogle();
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!isFirebaseAuthAvailable) return;
    messagingService.unregisterToken().catch(() => {});
    await signOutUser();
  }, []);

  /** Create family + kid — adds new family and switches to it (keeps existing families) */
  const handleCreateFamily = useCallback(async (babyName, options = {}) => {
    if (!isFirebaseAuthAvailable) return;
    if (!user) return;
    setLoading(true);
    try {
      const result = await createFamilyWithKid(user.uid, babyName, options);
      const familyName = options?.familyName?.trim() || `${babyName}'s family`;

      setFamilyIdState(result.familyId);
      setKidIdState(result.kidId);
      setFamilies((prev) => [...prev, { familyId: result.familyId, kidId: result.kidId, name: familyName }]);
      await hydrateKidSnapshot(result.familyId, result.kidId);
      setNeedsSetup(false);

      const familyKey = getFamilySelectionKey(user.uid);
      const kidKey = getKidSelectionKey(user.uid, result.familyId);
      if (familyKey) AsyncStorage.setItem(familyKey, result.familyId).catch(() => {});
      if (kidKey) AsyncStorage.setItem(kidKey, result.kidId).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [user, hydrateKidSnapshot]);

  /** Accept an invite code and join that family */
  const handleAcceptInvite = useCallback(async (code) => {
    if (!isFirebaseAuthAvailable) return;
    if (!user) return;
    setLoading(true);
    try {
      const result = await acceptInvite(code, user.uid);
      setFamilyIdState(result.familyId);
      setKidIdState(result.kidId);
      const allFamilies = await loadUserFamilies(user.uid);
      setFamilies(allFamilies);
      await hydrateKidSnapshot(result.familyId, result.kidId);
      setNeedsSetup(false);
      const familyKey = getFamilySelectionKey(user.uid);
      const kidKey = getKidSelectionKey(user.uid, result.familyId);
      if (familyKey) AsyncStorage.setItem(familyKey, result.familyId).catch(() => {});
      if (kidKey) AsyncStorage.setItem(kidKey, result.kidId).catch(() => {});
    } finally {
      setLoading(false);
    }
  }, [user, hydrateKidSnapshot]);

  /** Switch to a different family (user must be a member) */
  const setFamilyId = useCallback(async (nextFamilyId) => {
    if (!nextFamilyId || nextFamilyId === familyId) return;
    const match = families.find((f) => f.familyId === nextFamilyId);
    if (!match) return;

    setFamilyIdState(nextFamilyId);
    setKidIdState(match.kidId);
    await hydrateKidSnapshot(nextFamilyId, match.kidId);

    const familyKey = getFamilySelectionKey(user?.uid);
    const kidKey = getKidSelectionKey(user?.uid, nextFamilyId);
    if (familyKey) AsyncStorage.setItem(familyKey, nextFamilyId).catch(() => {});
    if (kidKey) AsyncStorage.setItem(kidKey, match.kidId).catch(() => {});
  }, [familyId, families, user?.uid, hydrateKidSnapshot]);

  const value = useMemo(() => ({
    user,
    familyId,
    kidId,
    families,
    selectedKidSnapshot,
    loading,
    needsSetup,
    signIn: handleSignIn,
    signInWithGoogle: handleGoogleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    createFamily: handleCreateFamily,
    acceptInvite: handleAcceptInvite,
    setKidId,
    setFamilyId,
  }), [
    user,
    familyId,
    kidId,
    families,
    selectedKidSnapshot,
    loading,
    needsSetup,
    handleSignIn,
    handleGoogleSignIn,
    handleSignUp,
    handleSignOut,
    handleCreateFamily,
    handleAcceptInvite,
    setKidId,
    setFamilyId,
  ]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
