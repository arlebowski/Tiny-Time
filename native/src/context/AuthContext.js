/**
 * AuthContext — provides auth state + family/kid selection to the entire app.
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  isFirebaseAuthAvailable,
  ensureUserProfile,
  loadUserFamily,
  createFamilyWithKid,
  signOutUser,
  signInWithEmail,
  signUpWithEmail,
  acceptInvite,
} from '../services/authService';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [familyId, setFamilyId] = useState(null);
  const [kidId, setKidId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Listen for auth state changes
  useEffect(() => {
    if (!isFirebaseAuthAvailable) {
      setUser({ uid: 'local-user', email: 'local@tinytracker.app', displayName: 'Local User' });
      setFamilyId('local-family');
      setKidId('local-kid');
      setNeedsSetup(false);
      setLoading(false);
      return () => {};
    }

    const auth = require('@react-native-firebase/auth').default;
    const unsubscribe = auth().onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        try {
          await ensureUserProfile(firebaseUser);
          const family = await loadUserFamily(firebaseUser.uid);
          if (family) {
            setFamilyId(family.familyId);
            setKidId(family.kidId);
            setNeedsSetup(false);
          } else {
            // User has no family yet — needs onboarding
            setNeedsSetup(true);
          }
        } catch (e) {
          console.warn('Failed to load user family:', e);
          setNeedsSetup(true);
        }
      } else {
        setUser(null);
        setFamilyId(null);
        setKidId(null);
        setNeedsSetup(false);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

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

  const handleSignOut = useCallback(async () => {
    if (!isFirebaseAuthAvailable) return;
    await signOutUser();
  }, []);

  /** Create family + kid for first-time user */
  const handleCreateFamily = useCallback(async (babyName) => {
    if (!isFirebaseAuthAvailable) return;
    if (!user) return;
    setLoading(true);
    try {
      const result = await createFamilyWithKid(user.uid, babyName);
      setFamilyId(result.familyId);
      setKidId(result.kidId);
      setNeedsSetup(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  /** Accept an invite code and join that family */
  const handleAcceptInvite = useCallback(async (code) => {
    if (!isFirebaseAuthAvailable) return;
    if (!user) return;
    setLoading(true);
    try {
      const result = await acceptInvite(code, user.uid);
      setFamilyId(result.familyId);
      setKidId(result.kidId);
      setNeedsSetup(false);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const value = {
    user,
    familyId,
    kidId,
    loading,
    needsSetup,
    signIn: handleSignIn,
    signUp: handleSignUp,
    signOut: handleSignOut,
    createFamily: handleCreateFamily,
    acceptInvite: handleAcceptInvite,
    setKidId,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be inside AuthProvider');
  return ctx;
}
