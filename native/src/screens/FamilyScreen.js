/**
 * FamilyScreen — 1:1 migration from web/components/tabs/FamilyTab.js
 *
 * Sections (in order, matching web render):
 *   1. Appearance — Dark mode toggle + color theme picker
 *   2. Kids — Multi-kid list with active indicator + Add Child
 *   3. Baby Info — Photo, name, birth date, weight, feeding unit, day sleep window, activity visibility
 *   4. Family Members — Member list with avatars + remove
 *   5. Account — User info, sign out, delete account
 *
 * Web layout: space-y-4 → 16px vertical gap between cards
 * Web cards: TTCard variant="tracker" → rounded-2xl p-5 shadow-sm bg cardBg
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  Modal,
  StyleSheet,
  Platform,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import {
  runOnJS,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { THEME_TOKENS } from '../../../shared/config/theme';
import { updateCurrentUserProfile } from '../services/authService';
import { uploadKidPhoto, uploadUserPhoto } from '../services/storageService';
import ProfileSubscreen from './family/subscreens/ProfileSubscreen';
import FamilySubscreen from './family/subscreens/FamilySubscreen';
import KidSubscreen from './family/subscreens/KidSubscreen';
import FamilyHubSubscreen from './family/subscreens/FamilyHubSubscreen';
import AppearanceHalfSheet from '../components/sheets/family/AppearanceHalfSheet';
import FeedingUnitHalfSheet from '../components/sheets/family/FeedingUnitHalfSheet';
import DaySleepWindowHalfSheet from '../components/sheets/family/DaySleepWindowHalfSheet';
import AddChildHalfSheet from '../components/sheets/family/AddChildHalfSheet';
import AddFamilyHalfSheet from '../components/sheets/family/AddFamilyHalfSheet';
import {
  SUBPAGE_CANCEL_DURATION_MS,
  SUBPAGE_CLOSE_DURATION_MS,
  SUBPAGE_EASING,
  SUBPAGE_OPEN_DURATION_MS,
  SUBPAGE_SWIPE_CLOSE_THRESHOLD,
  SUBPAGE_SWIPE_VELOCITY_THRESHOLD,
} from '../constants/subpageMotion';
import FamilyDetailFlow from '../components/navigation/FamilyDetailFlow';

// ── Utility helpers (from web FamilyTab) ──

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

const minutesToLabel = (m) => {
  const mm = ((Number(m) % 1440) + 1440) % 1440;
  const h24 = Math.floor(mm / 60);
  const min = mm % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = ((h24 + 11) % 12) + 1;
  return `${h12}:${String(min).padStart(2, '0')} ${ampm}`;
};

const formatAgeFromDate = (birthDate) => {
  if (!birthDate) return '';
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return '';
  const today = new Date();
  const diffMs = today.getTime() - birth.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return '';
  if (diffDays < 7) return `${diffDays} days old`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks old`;
  const months = Math.floor(diffDays / 30);
  return `${months} month${months === 1 ? '' : 's'} old`;
};

const formatMonthDay = (dateLike) => {
  if (!dateLike) return null;
  const d = dateLike instanceof Date ? dateLike : new Date(dateLike);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

// ── Card wrapper (matches web TTCard variant="tracker") ──
// Web: rounded-2xl p-5 shadow-sm bg var(--tt-card-bg)
function Card({ children, style }) {
  const { colors, radius } = useTheme();
  return (
    <View
      style={[
        cardStyles.card,
        {
          backgroundColor: colors.cardBg,
          borderRadius: radius?.['2xl'] ?? 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    padding: 20,                     // p-5
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
});

// ── Card header (matches web TTCardHeader) ──
// Web: text-base font-semibold, mb-4
function CardHeader({ title, right }) {
  const { colors } = useTheme();
  return (
    <View style={headerStyles.row}>
      <Text style={[headerStyles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>
      {right || null}
    </View>
  );
}

const headerStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,               // mb-4
  },
  title: {
    fontSize: 16,                    // text-base
    fontWeight: '600',               // font-semibold
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
});

// ══════════════════════════════════════════════════
// ── FamilyScreen ──
// ══════════════════════════════════════════════════

export default function FamilyScreen({
  header = null,
  user,
  kidId,
  familyId,
  onKidChange,
  kids = [],
  requestAddChild = false,
  onRequestAddChildHandled,
  themeKey: propThemeKey,
  onThemeChange,
  isDark: propIsDark,
  onDarkModeChange,
  showDevSetupToggle = false,
  forceSetupPreview = false,
  forceLoginPreview = false,
  onToggleForceSetupPreview,
  onToggleForceLoginPreview,
  onRequestToggleActivitySheet,
  onDetailOpenChange,
  onInvitePartner,
  onSignOut,
  onDeleteAccount,
}) {
  const FAMILY_NAV_DEBUG = __DEV__;
  const logNav = useCallback((event, payload = null) => {
    if (!FAMILY_NAV_DEBUG) return;
    if (payload) {
      console.log(`[FamilyNav/Screen] ${event}`, payload);
      return;
    }
    console.log(`[FamilyNav/Screen] ${event}`);
  }, [FAMILY_NAV_DEBUG]);

  const { colors, radius } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.max(screenWidth || 0, 1);
  const { createFamily, loading: authLoading } = useAuth();
  const currentUser = user || { uid: '1', displayName: 'Adam', email: 'adam@example.com', photoURL: null };

  // ── State ──
  const [viewStack, setViewStack] = useState(['hub']);
  const [transition, setTransition] = useState(null); // { from, to, direction: 'push' | 'pop' }
  const currentView = viewStack[viewStack.length - 1] || 'hub';
  const previousView = viewStack.length > 1 ? viewStack[viewStack.length - 2] : 'hub';
  const canGoBack = viewStack.length > 1;
  const navProgress = useSharedValue(0); // 0 = no overlay, 1 = overlay fully open
  const navMutationLock = useSharedValue(0); // 0 = unlocked, 1 = locked
  const edgeSwipeEnded = useSharedValue(0); // 0 = no onEnd yet, 1 = onEnd handled
  const [kidData, setKidData] = useState(null);
  const [members, setMembers] = useState([]);
  const [settings, setSettings] = useState({ babyWeight: null, preferredVolumeUnit: 'oz' });
  const [daySleepStartMin, setDaySleepStartMin] = useState(390);
  const [daySleepEndMin, setDaySleepEndMin] = useState(1170);
  const [loading, setLoading] = useState(false);
  const [babyPhotoUrl, setBabyPhotoUrl] = useState(null);

  // Edit states
  const [editingName, setEditingName] = useState(false);
  const [editingWeight, setEditingWeight] = useState(false);
  const [tempBabyName, setTempBabyName] = useState(null);
  const [tempWeight, setTempWeight] = useState(null);

  // Add Child modal
  const appearanceSheetRef = useRef(null);
  const feedingUnitSheetRef = useRef(null);
  const daySleepSheetRef = useRef(null);
  const addChildSheetRef = useRef(null);
  const addFamilySheetRef = useRef(null);
  const screenScrollRef = useRef(null);
  const [newBabyName, setNewBabyName] = useState('');
  const [newBabyBirthDate, setNewBabyBirthDate] = useState('');
  const [newBabyWeight, setNewBabyWeight] = useState('');
  const [newChildPhotoUris, setNewChildPhotoUris] = useState([]);
  const [savingChild, setSavingChild] = useState(false);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [newFamilyBabyName, setNewFamilyBabyName] = useState('');
  const [newFamilyBirthDate, setNewFamilyBirthDate] = useState('');
  const [newFamilyWeight, setNewFamilyWeight] = useState('');
  const [newFamilyPhotoUris, setNewFamilyPhotoUris] = useState([]);
  const [savingFamily, setSavingFamily] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState(currentUser.displayName || '');
  const [profileEmailDraft, setProfileEmailDraft] = useState(currentUser.email || '');
  const [profilePhotoUrl, setProfilePhotoUrl] = useState(currentUser.photoURL || null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [familyInfo, setFamilyInfo] = useState(null);
  const [familyNameDraft, setFamilyNameDraft] = useState('');
  const [savingFamilyName, setSavingFamilyName] = useState(false);
  const [selectedKidForSubpage, setSelectedKidForSubpage] = useState(null);
  const [selectedKidData, setSelectedKidData] = useState(null);
  const [selectedKidSettings, setSelectedKidSettings] = useState({ babyWeight: null, preferredVolumeUnit: 'oz' });
  const [selectedKidLoading, setSelectedKidLoading] = useState(false);
  const [kidPendingDelete, setKidPendingDelete] = useState(null);

  // Theme
  const defaultThemeKey = THEME_TOKENS.DEFAULT_THEME_KEY || 'theme1';
  const colorThemes = THEME_TOKENS.COLOR_THEMES || {};
  const colorThemeOrder = THEME_TOKENS.COLOR_THEME_ORDER || Object.keys(colorThemes);
  const activeThemeKey = propThemeKey || defaultThemeKey;
  const isDark = propIsDark ?? false;

  const resolveTheme = (key) =>
    colorThemes[key] || colorThemes[defaultThemeKey] || Object.values(colorThemes)[0] || null;

  const activeTheme = resolveTheme(activeThemeKey);
  const segmentedTrackColor = isDark ? colors.appBg : colors.inputBg;

  // Load real data from Firestore via DataContext
  const {
    kidData: ctxKidData,
    familyMembers: ctxMembers,
    kidSettings: ctxSettings,
    refresh,
    firestoreService,
    updateKidSettings,
  } = useData();

  const resetAddChildForm = useCallback(() => {
    setNewBabyName('');
    setNewBabyBirthDate('');
    setNewBabyWeight('');
    setNewChildPhotoUris([]);
  }, []);

  const resetAddFamilyForm = useCallback(() => {
    setNewFamilyName('');
    setNewFamilyBabyName('');
    setNewFamilyBirthDate('');
    setNewFamilyWeight('');
    setNewFamilyPhotoUris([]);
  }, []);

  const openAddChildSheet = useCallback(() => {
    addChildSheetRef.current?.present?.();
  }, []);

  const openAddFamilySheet = useCallback(() => {
    addFamilySheetRef.current?.present?.();
  }, []);

  const openAppearanceSheet = useCallback(() => {
    appearanceSheetRef.current?.present?.();
  }, []);

  const openFeedingUnitSheet = useCallback(() => {
    feedingUnitSheetRef.current?.present?.();
  }, []);

  const openDaySleepSheet = useCallback(() => {
    daySleepSheetRef.current?.present?.();
  }, []);

  const closeAddChildSheet = useCallback(() => {
    addChildSheetRef.current?.dismiss?.();
  }, []);

  const closeAddFamilySheet = useCallback(() => {
    addFamilySheetRef.current?.dismiss?.();
  }, []);

  const releaseNavMutationLock = useCallback(() => {
    logNav('navLock:release', {
      currentView,
      transition: transition ? transition.direction : null,
      progress: navProgress.value,
    });
    navMutationLock.value = 0;
  }, [currentView, logNav, navMutationLock, navProgress, transition]);

  const finishPush = useCallback(() => {
    logNav('pushView:finish', {
      currentView,
      transition: transition ? transition.direction : null,
      progress: navProgress.value,
    });
    setTransition(null);
    navMutationLock.value = 0;
  }, [currentView, logNav, navMutationLock, navProgress, transition]);

  const commitPopAndFinish = useCallback(() => {
    logNav('popView:finish', {
      currentView,
      transition: transition ? transition.direction : null,
      progress: navProgress.value,
    });
    setViewStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
    setTransition(null);
    navMutationLock.value = 0;
  }, [currentView, logNav, navMutationLock, navProgress, transition]);

  const pushView = useCallback((nextView) => {
    if (!nextView || nextView === currentView || transition || navMutationLock.value) return;
    navMutationLock.value = 1;
    logNav('pushView:start', { from: currentView, to: nextView });
    setTransition({ from: currentView, to: nextView, direction: 'push' });
    setViewStack((prev) => [...prev, nextView]);
    navProgress.value = 0;
    navProgress.value = withTiming(1, {
      duration: SUBPAGE_OPEN_DURATION_MS,
      easing: SUBPAGE_EASING,
    }, (finished) => {
      runOnJS(logNav)('pushView:end', { from: currentView, to: nextView, finished });
      if (finished) {
        runOnJS(finishPush)();
      } else {
        runOnJS(releaseNavMutationLock)();
      }
    });
  }, [
    currentView,
    finishPush,
    logNav,
    navMutationLock,
    navProgress,
    releaseNavMutationLock,
    transition,
  ]);

  const popView = useCallback(() => {
    if (!canGoBack || transition || navMutationLock.value) return;
    navMutationLock.value = 1;
    logNav('popView:start', { from: currentView, to: previousView });
    setTransition({ from: currentView, to: previousView, direction: 'pop' });
    navProgress.value = 1;
    navProgress.value = withTiming(0, {
      duration: SUBPAGE_CLOSE_DURATION_MS,
      easing: SUBPAGE_EASING,
    }, (finished) => {
      runOnJS(logNav)('popView:end', { from: currentView, to: previousView, finished });
      if (finished) {
        runOnJS(commitPopAndFinish)();
      } else {
        runOnJS(releaseNavMutationLock)();
      }
    });
  }, [
    canGoBack,
    commitPopAndFinish,
    currentView,
    logNav,
    navMutationLock,
    navProgress,
    previousView,
    releaseNavMutationLock,
    transition,
  ]);

  const cancelSwipeBack = useCallback(() => {
    logNav('edgeSwipe:cancelSwipeBack', {
      currentView,
      transition: transition ? transition.direction : null,
      progress: navProgress.value,
    });
    setTransition(null);
    navProgress.value = 1;
    navMutationLock.value = 0;
  }, [currentView, logNav, navMutationLock, navProgress, transition]);

  const resetToHub = useCallback(() => {
    setViewStack(['hub']);
    setTransition(null);
    navMutationLock.value = 0;
  }, [navMutationLock]);

  const edgeSwipeGesture = useMemo(() => Gesture.Pan()
    .enabled(canGoBack && !transition)
    .hitSlop({ left: 0, width: 32 })
    .activeOffsetX(10)
    .failOffsetY([-12, 12])
    .onStart(() => {
      if (navMutationLock.value) {
        runOnJS(logNav)('edgeSwipe:start:blocked');
        return;
      }
      navMutationLock.value = 1;
      edgeSwipeEnded.value = 0;
      runOnJS(logNav)('edgeSwipe:start', { from: currentView, to: previousView });
      runOnJS(setTransition)({ from: currentView, to: previousView, direction: 'pop' });
      navProgress.value = 1;
    })
    .onUpdate((event) => {
      const delta = Math.max(0, event.translationX);
      navProgress.value = Math.max(0, Math.min(1, 1 - (delta / width)));
    })
    .onEnd((event) => {
      edgeSwipeEnded.value = 1;
      const shouldClose =
        event.translationX > width * SUBPAGE_SWIPE_CLOSE_THRESHOLD
        || event.velocityX > SUBPAGE_SWIPE_VELOCITY_THRESHOLD;
      runOnJS(logNav)('edgeSwipe:end', {
        from: currentView,
        to: previousView,
        shouldClose,
        translationX: Math.round(event.translationX),
        velocityX: Math.round(event.velocityX),
      });
      if (shouldClose) {
        navProgress.value = withTiming(0, {
          duration: SUBPAGE_CLOSE_DURATION_MS,
          easing: SUBPAGE_EASING,
        }, (finished) => {
          if (finished) {
            runOnJS(commitPopAndFinish)();
          } else {
            runOnJS(releaseNavMutationLock)();
          }
        });
      } else {
        navProgress.value = withTiming(1, {
          duration: SUBPAGE_CANCEL_DURATION_MS,
          easing: SUBPAGE_EASING,
        }, (finished) => {
          if (finished) {
            runOnJS(cancelSwipeBack)();
          } else {
            runOnJS(releaseNavMutationLock)();
          }
        });
      }
    })
    .onFinalize(() => {
      runOnJS(logNav)('edgeSwipe:finalize', {
        from: currentView,
        to: previousView,
      });
      if (edgeSwipeEnded.value === 0 && navMutationLock.value && transition?.direction === 'pop') {
        runOnJS(logNav)('edgeSwipe:finalize:recover-cancelled', {
          from: currentView,
          to: previousView,
        });
        runOnJS(cancelSwipeBack)();
      }
    }), [
      cancelSwipeBack,
      canGoBack,
      commitPopAndFinish,
      currentView,
      edgeSwipeEnded,
      logNav,
      navMutationLock,
      navProgress,
      previousView,
      releaseNavMutationLock,
      transition,
      width,
    ]);

  useEffect(() => {
    logNav('stack', { viewStack: [...viewStack], transition: transition ? transition.direction : null });
  }, [logNav, transition, viewStack]);

  useEffect(() => {
    if (!transition) return undefined;
    const timeoutId = setTimeout(() => {
      logNav('nav:watchdog:transition-still-active', {
        currentView,
        previousView,
        transition: transition.direction,
        lock: navMutationLock.value,
        progress: navProgress.value,
        viewStack: [...viewStack],
      });
    }, 1400);
    return () => clearTimeout(timeoutId);
  }, [currentView, logNav, navMutationLock, navProgress, previousView, transition, viewStack]);

  useEffect(() => {
    if (ctxKidData) {
      setKidData(ctxKidData);
      if (currentView !== 'kid') {
        setBabyPhotoUrl(ctxKidData.photoURL || null);
      }
    }
    if (ctxMembers?.length) {
      setMembers(ctxMembers);
    }
    if (ctxSettings) {
      setSettings((prev) => ({ ...prev, ...ctxSettings }));
      if (ctxSettings.sleepDayStart != null) setDaySleepStartMin(ctxSettings.sleepDayStart);
      if (ctxSettings.sleepDayEnd != null) setDaySleepEndMin(ctxSettings.sleepDayEnd);
    }
  }, [ctxKidData, ctxMembers, ctxSettings, currentView]);

  useEffect(() => {
    if (!requestAddChild) return;
    openAddChildSheet();
    if (typeof onRequestAddChildHandled === 'function') {
      onRequestAddChildHandled();
    }
  }, [requestAddChild, onRequestAddChildHandled, openAddChildSheet]);

  useEffect(() => {
    setProfileNameDraft(currentUser.displayName || '');
    setProfileEmailDraft(currentUser.email || '');
    setProfilePhotoUrl(currentUser.photoURL || null);
  }, [currentUser.displayName, currentUser.email, currentUser.photoURL]);

  useEffect(() => {
    let cancelled = false;
    const loadFamilyInfo = async () => {
      try {
        const info = await firestoreService?.getFamilyInfo?.();
        if (cancelled) return;
        setFamilyInfo(info || null);
        setFamilyNameDraft(info?.name || '');
      } catch {
        if (!cancelled) {
          setFamilyInfo(null);
          setFamilyNameDraft('');
        }
      }
    };
    loadFamilyInfo();
    return () => { cancelled = true; };
  }, [firestoreService, familyId, members.length]);

  useEffect(() => {
    const isPopToHub = transition?.direction === 'pop' && transition?.to === 'hub';
    const shouldHideHeader = currentView !== 'hub' || (!!transition && !isPopToHub);
    logNav('detailOpenState', {
      currentView,
      transition: transition ? transition.direction : null,
      shouldHideHeader,
    });
    onDetailOpenChange?.(shouldHideHeader);
  }, [currentView, logNav, onDetailOpenChange, transition]);

  useEffect(() => {
    if (viewStack.length !== 1) return;
    if (transition) return;
    onDetailOpenChange?.(false);
  }, [onDetailOpenChange, transition, viewStack.length]);

  useEffect(() => () => {
    onDetailOpenChange?.(false);
  }, [onDetailOpenChange]);

  useEffect(() => {
    // Ensure every subview opens from top even if hub was previously scrolled.
    requestAnimationFrame(() => {
      screenScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    });
  }, [currentView]);

  const loadSelectedKidData = useCallback(async (kidCandidate) => {
    if (!kidCandidate?.id) return;
    setTempBabyName(null);
    setTempWeight(null);
    setEditingName(false);
    setEditingWeight(false);

    const fallbackKidData = kidCandidate.id === kidId && ctxKidData ? { ...ctxKidData } : { ...kidCandidate };
    const fallbackSettings = kidCandidate.id === kidId && ctxSettings
      ? { ...ctxSettings }
      : { babyWeight: kidCandidate?.babyWeight ?? null, preferredVolumeUnit: 'oz' };

    // Keep existing/fallback kid content mounted during refresh to avoid entry flicker.
    setSelectedKidLoading(false);
    setSelectedKidData(fallbackKidData);
    setSelectedKidSettings((prev) => ({ ...prev, ...fallbackSettings }));
    setBabyPhotoUrl(fallbackKidData?.photoURL || null);
    setDaySleepStartMin(
      fallbackKidData?.sleepDayStart
      ?? fallbackKidData?.daySleepStartMinutes
      ?? fallbackSettings?.sleepDayStart
      ?? 390
    );
    setDaySleepEndMin(
      fallbackKidData?.sleepDayEnd
      ?? fallbackKidData?.daySleepEndMinutes
      ?? fallbackSettings?.sleepDayEnd
      ?? 1170
    );

    try {
      if (!firestoreService?.isAvailable || !familyId) {
        return;
      }

      const firestoreModule = require('@react-native-firebase/firestore').default;
      const kidRef = firestoreModule()
        .collection('families')
        .doc(familyId)
        .collection('kids')
        .doc(kidCandidate.id);
      const [kidDoc, settingsDoc] = await Promise.all([
        kidRef.get(),
        kidRef.collection('settings').doc('default').get(),
      ]);

      const loadedKidData = kidDoc.exists ? { id: kidDoc.id, ...kidDoc.data() } : fallbackKidData;
      const loadedSettings = settingsDoc.exists ? settingsDoc.data() : fallbackSettings;

      setSelectedKidData(loadedKidData);
      setSelectedKidSettings((prev) => ({ ...prev, ...(loadedSettings || {}) }));
      setBabyPhotoUrl(loadedKidData?.photoURL || null);
      setDaySleepStartMin(
        loadedKidData?.sleepDayStart
        ?? loadedKidData?.daySleepStartMinutes
        ?? loadedSettings?.sleepDayStart
        ?? 390
      );
      setDaySleepEndMin(
        loadedKidData?.sleepDayEnd
        ?? loadedKidData?.daySleepEndMinutes
        ?? loadedSettings?.sleepDayEnd
        ?? 1170
      );
    } catch (error) {
      console.error('Failed to load selected kid details:', error);
    } finally {
      setSelectedKidLoading(false);
    }
  }, [ctxKidData, ctxSettings, familyId, firestoreService?.isAvailable, kidId]);

  useEffect(() => {
    if (currentView !== 'kid' || !selectedKidForSubpage?.id) return;
    loadSelectedKidData(selectedKidForSubpage);
  }, [currentView, selectedKidForSubpage?.id, loadSelectedKidData]);

  // ── Handlers ──

  const handleThemeChange = (nextKey) => {
    if (!nextKey || nextKey === activeThemeKey) return;
    if (typeof onThemeChange === 'function') onThemeChange(nextKey);
  };

  const handleDarkModeChange = (value) => {
    if (typeof onDarkModeChange === 'function') onDarkModeChange(value === 'dark');
  };

  const handleBabyNameChange = (nextValue) => {
    if (!editingName) setEditingName(true);
    setTempBabyName(nextValue);
  };

  const handleUpdateBabyName = async () => {
    const targetKidId = selectedKidForSubpage?.id;
    if (tempBabyName === null) {
      setEditingName(false);
      return;
    }
    const raw = String(tempBabyName).trim();
    if (!raw) {
      setTempBabyName(selectedKidData?.name || null);
      setEditingName(false);
      return;
    }
    setSelectedKidData((prev) => (prev ? { ...prev, name: raw } : prev));
    setSelectedKidForSubpage((prev) => (prev ? { ...prev, name: raw } : prev));
    setKids((prev) => prev.map((k) => (k.id === targetKidId ? { ...k, name: raw } : k)));
    if (targetKidId === kidId) {
      setKidData((prev) => (prev ? { ...prev, name: raw } : prev));
    }
    try {
      if (targetKidId) {
        await firestoreService?.updateKidDataById?.(targetKidId, { name: raw });
      }
    } catch (error) {
      console.error('Failed to update kid name:', error);
    }
    setTempBabyName(null);
    setEditingName(false);
  };

  const handleWeightChange = (nextValue) => {
    if (!editingWeight) setEditingWeight(true);
    setTempWeight(nextValue);
  };

  const handleUpdateWeight = async () => {
    const targetKidId = selectedKidForSubpage?.id;
    if (tempWeight === null) {
      setEditingWeight(false);
      return;
    }
    const raw = String(tempWeight).trim();
    if (!raw) {
      setTempWeight(null);
      setEditingWeight(false);
      return;
    }
    const weight = parseFloat(raw);
    if (!weight || weight <= 0) {
      setTempWeight(selectedKidSettings.babyWeight?.toString() || null);
      setEditingWeight(false);
      return;
    }
    setSelectedKidSettings((prev) => ({ ...prev, babyWeight: weight }));
    setSelectedKidData((prev) => (prev ? { ...prev, babyWeight: weight } : prev));
    setKids((prev) => prev.map((k) => (k.id === targetKidId ? { ...k, babyWeight: weight } : k)));
    if (targetKidId === kidId) {
      setSettings((prev) => ({ ...prev, babyWeight: weight }));
    }
    try {
      if (targetKidId) {
        await firestoreService?.updateKidDataById?.(targetKidId, { babyWeight: weight });
      }
    } catch (error) {
      console.error('Failed to update kid weight:', error);
    }
    setTempWeight(null);
    setEditingWeight(false);
  };

  const handleVolumeUnitChange = async (nextUnit) => {
    const targetKidId = selectedKidForSubpage?.id || kidId;
    const unit = nextUnit === 'ml' ? 'ml' : 'oz';
    setSelectedKidSettings((prev) => ({ ...prev, preferredVolumeUnit: unit }));
    if (targetKidId === kidId) {
      setSettings((prev) => ({ ...prev, preferredVolumeUnit: unit }));
    }
    try {
      if (targetKidId === kidId) {
        await updateKidSettings?.({ preferredVolumeUnit: unit });
      } else if (firestoreService?.isAvailable && familyId && targetKidId) {
        const firestoreModule = require('@react-native-firebase/firestore').default;
        await firestoreModule()
          .collection('families')
          .doc(familyId)
          .collection('kids')
          .doc(targetKidId)
          .collection('settings')
          .doc('default')
          .set({ preferredVolumeUnit: unit }, { merge: true });
      }
    } catch (error) {
      console.error('Failed to update preferred volume unit:', error);
    }
  };

  const handlePhotoClick = async () => {
    const targetKidId = selectedKidForSubpage?.id;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      const localUri = result.assets[0].uri;
      setBabyPhotoUrl(localUri);
      setSelectedKidData((prev) => (prev ? { ...prev, photoURL: localUri } : prev));
      setSelectedKidForSubpage((prev) => (prev ? { ...prev, photoURL: localUri } : prev));
      setKids((prev) => prev.map((k) => (k.id === targetKidId ? { ...k, photoURL: localUri } : k)));
      try {
        if (familyId && targetKidId) {
          const uploadedPhotoUrl = await uploadKidPhoto(localUri, familyId, targetKidId);
          await firestoreService?.updateKidDataById?.(targetKidId, { photoURL: uploadedPhotoUrl });
          setBabyPhotoUrl(uploadedPhotoUrl);
          setSelectedKidData((prev) => (prev ? { ...prev, photoURL: uploadedPhotoUrl } : prev));
          setSelectedKidForSubpage((prev) => (prev ? { ...prev, photoURL: uploadedPhotoUrl } : prev));
          setKids((prev) => prev.map((k) => (k.id === targetKidId ? { ...k, photoURL: uploadedPhotoUrl } : k)));
          if (targetKidId === kidId) {
            setKidData((prev) => (prev ? { ...prev, photoURL: uploadedPhotoUrl } : prev));
          }
        }
      } catch (error) {
        console.error('Failed to upload kid photo:', error);
        Alert.alert('Error', 'Unable to update photo right now.');
      }
    }
  };

  const handleOpenProfile = useCallback(() => {
    screenScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    pushView('profile');
  }, [pushView]);

  const handleOpenFamily = useCallback(() => {
    screenScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    pushView('family');
  }, [pushView]);

  const handleOpenKidSubpage = useCallback((kid) => {
    screenScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    setTempBabyName(null);
    setTempWeight(null);
    setEditingName(false);
    setEditingWeight(false);
    setSelectedKidForSubpage(kid || null);
    pushView('kid');
  }, [pushView]);

  const handleBack = useCallback(() => {
    screenScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    popView();
  }, [popView]);

  const handleProfilePhotoClick = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setProfilePhotoUrl(result.assets[0].uri);
    }
  }, []);

  const handleSaveProfile = useCallback(async () => {
    const uid = currentUser?.uid;
    if (!uid) {
      Alert.alert('Error', 'Unable to update profile right now.');
      return;
    }

    const nextName = String(profileNameDraft || '').trim();
    const nextEmail = String(profileEmailDraft || '').trim().toLowerCase();
    if (!nextEmail) {
      Alert.alert('Error', 'Email is required.');
      return;
    }

    const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailPattern.test(nextEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setSavingProfile(true);
    try {
      let nextPhotoUrl = profilePhotoUrl || null;
      if (profilePhotoUrl && !String(profilePhotoUrl).startsWith('http')) {
        nextPhotoUrl = await uploadUserPhoto(profilePhotoUrl, familyId, uid);
      }

      await updateCurrentUserProfile({
        displayName: nextName || null,
        email: nextEmail,
        photoURL: nextPhotoUrl,
      });
      await refresh?.();
      setProfilePhotoUrl(nextPhotoUrl);
      Alert.alert('Saved', 'Profile updated.');
      resetToHub();
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Unable to save profile. You may need to sign in again to update your email.');
    } finally {
      setSavingProfile(false);
    }
  }, [currentUser?.uid, familyId, profileNameDraft, profileEmailDraft, profilePhotoUrl, refresh, resetToHub]);

  const isFamilyOwner = useMemo(() => {
    const ownerUid = familyInfo?.ownerId
      || familyInfo?.createdBy
      || (Array.isArray(familyInfo?.members) ? familyInfo.members[0] : null)
      || (Array.isArray(members) ? members[0]?.uid : null);
    const uid = currentUser?.uid;
    if (!uid) return false;
    return ownerUid === uid;
  }, [currentUser?.uid, familyInfo?.ownerId, familyInfo?.createdBy, familyInfo?.members, members]);

  const familyOwnerUid = useMemo(
    () => familyInfo?.ownerId
      || familyInfo?.createdBy
      || (Array.isArray(familyInfo?.members) ? familyInfo.members[0] : null)
      || (Array.isArray(members) ? members[0]?.uid : null)
      || null,
    [familyInfo?.ownerId, familyInfo?.createdBy, familyInfo?.members, members]
  );

  const handleSaveFamilyName = useCallback(async () => {
    if (!isFamilyOwner) return;
    const nextName = String(familyNameDraft || '').trim();
    if (!nextName) return;
    setSavingFamilyName(true);
    try {
      await firestoreService?.updateFamilyData?.({ name: nextName });
      await refresh?.();
      setFamilyInfo((prev) => ({ ...(prev || {}), name: nextName }));
    } catch (error) {
      console.error('Failed to save family name:', error);
      Alert.alert('Error', 'Unable to save family name.');
    } finally {
      setSavingFamilyName(false);
    }
  }, [isFamilyOwner, familyNameDraft, firestoreService, refresh]);

  const hasProfileChanges = useMemo(() => {
    const currentName = String(currentUser.displayName || '').trim();
    const draftName = String(profileNameDraft || '').trim();
    const currentEmail = String(currentUser.email || '').trim().toLowerCase();
    const draftEmail = String(profileEmailDraft || '').trim().toLowerCase();
    const currentPhoto = currentUser.photoURL || '';
    const draftPhoto = profilePhotoUrl || '';
    return draftName !== currentName || draftEmail !== currentEmail || draftPhoto !== currentPhoto;
  }, [currentUser.displayName, currentUser.email, currentUser.photoURL, profileNameDraft, profileEmailDraft, profilePhotoUrl]);

  const handleRemoveMember = (memberId) => {
    Alert.alert(
      'Remove Member',
      "Remove this person's access?",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setMembers((prev) => prev.filter((m) => m.uid !== memberId));
          },
        },
      ]
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Sign out of Tiny Tracker?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => { if (typeof onSignOut === 'function') onSignOut(); },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      "Are you sure you want to delete your account?\n\n" +
        "- You will be removed from the family.\n" +
        "- If you are the owner, ownership will transfer to another member.\n" +
        "- Your baby's data will NOT be deleted.\n\n" +
        "This action cannot be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => { if (typeof onDeleteAccount === 'function') onDeleteAccount(); },
        },
      ]
    );
  };

  const handleRequestDeleteKid = useCallback(() => {
    if (!selectedKidForSubpage?.id) return;
    setKidPendingDelete({
      id: selectedKidForSubpage.id,
      name: selectedKidData?.name || selectedKidForSubpage?.name || 'this child',
    });
  }, [selectedKidForSubpage, selectedKidData?.name]);

  const handleConfirmDeleteKid = useCallback(async () => {
    const targetKid = kidPendingDelete;
    if (!targetKid?.id) return;

    setKidPendingDelete(null);

    try {
      await firestoreService?.softDeleteKidById?.(targetKid.id, currentUser?.uid || null);

      const nextKids = (Array.isArray(kids) ? kids : []).filter((k) => k.id !== targetKid.id);
      setKids(nextKids);
      resetToHub();
      setSelectedKidForSubpage(null);
      setSelectedKidData(null);
      setSelectedKidSettings({ babyWeight: null, preferredVolumeUnit: 'oz' });

      if (kidId === targetKid.id) {
        const fallbackKidId = nextKids[0]?.id || null;
        if (fallbackKidId && typeof onKidChange === 'function') {
          onKidChange(fallbackKidId);
        }
      }

      await refresh?.();
    } catch (error) {
      console.error('Failed to delete kid:', error);
      Alert.alert('Error', 'Unable to delete this child right now.');
    }
  }, [kidPendingDelete, firestoreService, currentUser?.uid, kids, kidId, onKidChange, refresh, resetToHub]);

  const handleAddChildPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      ...(Platform.OS === 'ios' ? { presentationStyle: 'fullScreen' } : {}),
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setNewChildPhotoUris((prev) => [...prev, result.assets[0].uri]);
    }
  }, []);

  const handleRemoveChildPhoto = useCallback((index, isExisting) => {
    if (isExisting) return;
    setNewChildPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleAddFamilyPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      ...(Platform.OS === 'ios' ? { presentationStyle: 'fullScreen' } : {}),
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setNewFamilyPhotoUris((prev) => [...prev, result.assets[0].uri]);
    }
  }, []);

  const handleRemoveFamilyPhoto = useCallback((index, isExisting) => {
    if (isExisting) return;
    setNewFamilyPhotoUris((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleCreateChild = async () => {
    if (!newBabyName.trim()) {
      Alert.alert('Error', "Please enter your child's name");
      return;
    }
    if (!newBabyBirthDate.trim()) {
      Alert.alert('Error', 'Please enter birth date');
      return;
    }
    if (!familyId) {
      Alert.alert('Error', 'Missing family context. Please try again.');
      return;
    }

    const parsedDate = new Date(newBabyBirthDate.trim());
    if (Number.isNaN(parsedDate.getTime())) {
      Alert.alert('Error', 'Please enter a valid birth date');
      return;
    }
    const parsedWeight = String(newBabyWeight || '').trim()
      ? Number.parseFloat(String(newBabyWeight).trim())
      : null;
    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    setSavingChild(true);
    try {
      const newKidId = await firestoreService.createChild({
        name: newBabyName.trim(),
        birthDate: parsedDate.getTime(),
        babyWeight: parsedWeight,
        ownerId: user?.uid || null,
        photoURL: null,
        preferredVolumeUnit: 'oz',
        themeKey: activeThemeKey || defaultThemeKey,
      });

      if (newChildPhotoUris.length > 0 && newChildPhotoUris[0]) {
        const uploadedPhotoUrl = await uploadKidPhoto(newChildPhotoUris[0], familyId, newKidId);
        await firestoreService.updateKidDataById(newKidId, { photoURL: uploadedPhotoUrl });
      }

      closeAddChildSheet();
      resetAddChildForm();
      if (typeof onKidChange === 'function') onKidChange(newKidId);
      await refresh?.();
    } catch (error) {
      console.error('Error creating child:', error);
      Alert.alert('Error', 'Failed to create child. Please try again.');
    } finally {
      setSavingChild(false);
    }
  };

  const handleCreateFamilyFromSheet = useCallback(async () => {
    if (!newFamilyName.trim()) {
      Alert.alert('Error', 'Please enter a family name');
      return;
    }
    if (!newFamilyBabyName.trim()) {
      Alert.alert('Error', "Please enter your child's name");
      return;
    }
    if (!newFamilyBirthDate.trim()) {
      Alert.alert('Error', 'Please enter birth date');
      return;
    }

    const parsedDate = new Date(newFamilyBirthDate.trim());
    if (Number.isNaN(parsedDate.getTime())) {
      Alert.alert('Error', 'Please enter a valid birth date');
      return;
    }

    const parsedWeight = String(newFamilyWeight || '').trim()
      ? Number.parseFloat(String(newFamilyWeight).trim())
      : null;
    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      Alert.alert('Error', 'Please enter a valid weight');
      return;
    }

    if (typeof createFamily !== 'function') {
      Alert.alert('Error', 'Family creation is unavailable right now.');
      return;
    }

    setSavingFamily(true);
    try {
      await createFamily(newFamilyBabyName.trim(), {
        familyName: newFamilyName.trim(),
        birthDate: newFamilyBirthDate.trim(),
        photoUri: newFamilyPhotoUris[0] || null,
        preferredVolumeUnit: 'oz',
        babyWeight: parsedWeight,
      });
      closeAddFamilySheet();
      resetAddFamilyForm();
      resetToHub();
    } catch (error) {
      console.error('Error creating family:', error);
      Alert.alert('Error', error?.message || 'Failed to create family. Please try again.');
    } finally {
      setSavingFamily(false);
    }
  }, [
    newFamilyName,
    newFamilyBabyName,
    newFamilyBirthDate,
    newFamilyWeight,
    newFamilyPhotoUris,
    createFamily,
    closeAddFamilySheet,
    resetAddFamilyForm,
    resetToHub,
  ]);

  const handleOpenActivityVisibility = () => {
    if (typeof onRequestToggleActivitySheet === 'function') {
      onRequestToggleActivitySheet();
    }
  };

  // ── Day sleep window ──
  const dayStart = clamp(daySleepStartMin, 0, 1439);
  const dayEnd = clamp(daySleepEndMin, 0, 1439);
  const selectedKidName = selectedKidData?.name || selectedKidForSubpage?.name || 'Kid';
  const hasStackedSubpage = Boolean(transition || canGoBack);
  const baseViewKey = transition
    ? (transition.direction === 'push' ? transition.from : transition.to)
    : (canGoBack ? previousView : currentView);
  const detailViewKey = transition
    ? (transition.direction === 'push' ? transition.to : transition.from)
    : (canGoBack ? currentView : null);

  const renderSubpageContent = useCallback((viewKey) => {
    if (viewKey === 'profile') {
      return (
        <ProfileSubscreen
          s={s}
          Card={Card}
          colors={colors}
          activeTheme={activeTheme}
          currentUser={currentUser}
          profilePhotoUrl={profilePhotoUrl}
          profileNameDraft={profileNameDraft}
          profileEmailDraft={profileEmailDraft}
          hasProfileChanges={hasProfileChanges}
          savingProfile={savingProfile}
          onBack={handleBack}
          onProfilePhoto={handleProfilePhotoClick}
          onProfileNameChange={setProfileNameDraft}
          onProfileEmailChange={setProfileEmailDraft}
          onSaveProfile={handleSaveProfile}
          onSignOut={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
        />
      );
    }

    if (viewKey === 'family') {
      return (
        <FamilySubscreen
          s={s}
          Card={Card}
          colors={colors}
          activeTheme={activeTheme}
          kids={kids}
          kidId={kidId}
          members={members}
          familyInfo={familyInfo}
          familyNameDraft={familyNameDraft}
          familyOwnerUid={familyOwnerUid}
          currentUser={currentUser}
          isFamilyOwner={isFamilyOwner}
          savingFamilyName={savingFamilyName}
          onBack={handleBack}
          onFamilyNameChange={setFamilyNameDraft}
          onSaveFamilyName={handleSaveFamilyName}
          onOpenKid={handleOpenKidSubpage}
          onOpenAddChild={openAddChildSheet}
          onRemoveMember={handleRemoveMember}
          onInvitePartner={() => onInvitePartner?.()}
          formatAgeFromDate={formatAgeFromDate}
          formatMonthDay={formatMonthDay}
        />
      );
    }

    if (viewKey === 'kid') {
      return (
        <KidSubscreen
          s={s}
          Card={Card}
          colors={colors}
          activeTheme={activeTheme}
          selectedKidName={selectedKidName}
          selectedKidLoading={selectedKidLoading}
          babyPhotoUrl={babyPhotoUrl}
          selectedKidData={selectedKidData}
          selectedKidSettings={selectedKidSettings}
          tempBabyName={tempBabyName}
          tempWeight={tempWeight}
          formatAgeFromDate={formatAgeFromDate}
          onBack={handleBack}
          onPhotoClick={handlePhotoClick}
          onBabyNameChange={handleBabyNameChange}
          onBabyNameFocus={() => setEditingName(true)}
          onBabyNameBlur={handleUpdateBabyName}
          onWeightChange={handleWeightChange}
          onWeightFocus={() => setEditingWeight(true)}
          onWeightBlur={handleUpdateWeight}
          onOpenFeedingUnit={openFeedingUnitSheet}
          onOpenDaySleep={openDaySleepSheet}
          onOpenActivityVisibility={handleOpenActivityVisibility}
          onDeleteKid={handleRequestDeleteKid}
        />
      );
    }

    return (
      <FamilyHubSubscreen
        s={s}
        Card={Card}
        colors={colors}
        activeTheme={activeTheme}
        currentUser={currentUser}
        familyInfo={familyInfo}
        members={members}
        showDevSetupToggle={showDevSetupToggle}
        forceSetupPreview={forceSetupPreview}
        forceLoginPreview={forceLoginPreview}
        onToggleForceSetupPreview={onToggleForceSetupPreview}
        onToggleForceLoginPreview={onToggleForceLoginPreview}
        onOpenProfile={handleOpenProfile}
        onOpenAppearance={openAppearanceSheet}
        onOpenFamily={handleOpenFamily}
        onOpenAddFamily={openAddFamilySheet}
      />
    );
  }, [
    activeTheme,
    babyPhotoUrl,
    colors,
    currentUser,
    familyInfo,
    familyNameDraft,
    familyOwnerUid,
    forceLoginPreview,
    forceSetupPreview,
    formatAgeFromDate,
    formatMonthDay,
    handleBack,
    handleBabyNameChange,
    handleDeleteAccount,
    handleOpenFamily,
    handleOpenActivityVisibility,
    handleOpenKidSubpage,
    handleOpenProfile,
    handlePhotoClick,
    handleProfilePhotoClick,
    handleRemoveMember,
    handleRequestDeleteKid,
    handleSaveFamilyName,
    handleSaveProfile,
    handleSignOut,
    handleUpdateBabyName,
    handleUpdateWeight,
    handleWeightChange,
    isFamilyOwner,
    kidId,
    kids,
    members,
    onInvitePartner,
    onToggleForceLoginPreview,
    onToggleForceSetupPreview,
    openAddChildSheet,
    openAddFamilySheet,
    openAppearanceSheet,
    openDaySleepSheet,
    openFeedingUnitSheet,
    profileEmailDraft,
    profileNameDraft,
    profilePhotoUrl,
    savingFamilyName,
    savingProfile,
    selectedKidData,
    selectedKidLoading,
    selectedKidName,
    selectedKidSettings,
    setFamilyNameDraft,
    setProfileEmailDraft,
    setProfileNameDraft,
    showDevSetupToggle,
    tempBabyName,
    tempWeight,
  ]);

  // ── Loading ──
  if (loading) {
    return (
      <View style={s.loadingContainer}>
        <ActivityIndicator color={colors.textSecondary} />
      </View>
    );
  }

  // ════════════════════════════════
  // ── RENDER ──
  // ════════════════════════════════

  const baseContent = (
    <View style={s.baseContentRoot}>
      {header}
      <ScrollView
        ref={!hasStackedSubpage ? screenScrollRef : null}
        style={[s.scroll, { backgroundColor: colors.appBg }]}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderSubpageContent(baseViewKey)}
      </ScrollView>
    </View>
  );

  const overlayContent = detailViewKey ? (
    <ScrollView
      ref={screenScrollRef}
      style={[s.scroll, { backgroundColor: colors.appBg }]}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {renderSubpageContent(detailViewKey)}
    </ScrollView>
  ) : null;

  return (
    <>
    <FamilyDetailFlow
      progress={navProgress}
      width={width}
      hasStackedSubpage={hasStackedSubpage}
      canGoBack={canGoBack}
      edgeSwipeGesture={edgeSwipeGesture}
      baseContent={baseContent}
      overlayContent={overlayContent}
    />
    <FeedingUnitHalfSheet
      sheetRef={feedingUnitSheetRef}
      s={s}
      colors={colors}
      activeTheme={activeTheme}
      segmentedTrackColor={segmentedTrackColor}
      value={(currentView === 'kid' ? selectedKidSettings.preferredVolumeUnit : settings.preferredVolumeUnit) === 'ml' ? 'ml' : 'oz'}
      onChange={handleVolumeUnitChange}
    />
    <DaySleepWindowHalfSheet
      sheetRef={daySleepSheetRef}
      s={s}
      colors={colors}
      activeTheme={activeTheme}
      dayStart={dayStart}
      dayEnd={dayEnd}
      minutesToLabel={minutesToLabel}
    />
    <AppearanceHalfSheet
      sheetRef={appearanceSheetRef}
      s={s}
      colors={colors}
      activeTheme={activeTheme}
      isDark={isDark}
      segmentedTrackColor={segmentedTrackColor}
      colorThemeOrder={colorThemeOrder}
      activeThemeKey={activeThemeKey}
      resolveTheme={resolveTheme}
      onThemeChange={handleThemeChange}
      onDarkModeChange={handleDarkModeChange}
    />
    <AddChildHalfSheet
      sheetRef={addChildSheetRef}
      s={s}
      colors={colors}
      activeTheme={activeTheme}
      savingChild={savingChild}
      newBabyName={newBabyName}
      newBabyBirthDate={newBabyBirthDate}
      newBabyWeight={newBabyWeight}
      newChildPhotoUris={newChildPhotoUris}
      onClose={() => {
        if (!savingChild) resetAddChildForm();
      }}
      onCreate={handleCreateChild}
      onNameChange={setNewBabyName}
      onBirthDateChange={setNewBabyBirthDate}
      onWeightChange={setNewBabyWeight}
      onAddPhoto={handleAddChildPhoto}
      onRemovePhoto={handleRemoveChildPhoto}
    />
    <AddFamilyHalfSheet
      sheetRef={addFamilySheetRef}
      s={s}
      colors={colors}
      activeTheme={activeTheme}
      savingFamily={savingFamily}
      authLoading={authLoading}
      newFamilyName={newFamilyName}
      newFamilyBabyName={newFamilyBabyName}
      newFamilyBirthDate={newFamilyBirthDate}
      newFamilyWeight={newFamilyWeight}
      newFamilyPhotoUris={newFamilyPhotoUris}
      onClose={() => {
        if (!savingFamily) resetAddFamilyForm();
      }}
      onCreate={handleCreateFamilyFromSheet}
      onFamilyNameChange={setNewFamilyName}
      onBabyNameChange={setNewFamilyBabyName}
      onBirthDateChange={setNewFamilyBirthDate}
      onWeightChange={setNewFamilyWeight}
      onAddPhoto={handleAddFamilyPhoto}
      onRemovePhoto={handleRemoveFamilyPhoto}
    />
    {kidPendingDelete ? (
      <Modal
        visible
        transparent
        animationType="fade"
        onRequestClose={() => setKidPendingDelete(null)}
      >
        <Pressable
          style={s.modalOverlay}
          onPress={() => setKidPendingDelete(null)}
        >
          <Pressable
            style={[s.deleteModal, { backgroundColor: colors.timelineItemBg || colors.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={[s.deleteTitle, { color: colors.textPrimary }]}>
              Delete Kid?
            </Text>
            <Text style={[s.deleteMessage, { color: colors.textSecondary }]}>
              Are you sure you want to delete {kidPendingDelete.name}?
            </Text>
            <View style={s.deleteActions}>
              <Pressable
                style={[s.deleteBtn, s.cancelBtn, { backgroundColor: colors.subtleSurface ?? colors.subtle }]}
                onPress={() => setKidPendingDelete(null)}
              >
                <Text style={[s.deleteBtnText, { color: colors.textPrimary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[s.deleteBtn, s.confirmBtn, { backgroundColor: colors.error }]}
                onPress={handleConfirmDeleteKid}
              >
                <Text style={[s.deleteBtnText, { color: colors.textOnAccent }]}>Delete</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    ) : null}
    </>
  );
}

// ══════════════════════════════════════════════════
// ── Styles ──
// ══════════════════════════════════════════════════

const s = StyleSheet.create({
  baseContentRoot: {
    flex: 1,
  },
  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,        // px-4 (web page padding)
    paddingTop: 0,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 48,
  },
  profileHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: -16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  profileHeaderCol: {
    flex: 1,
    justifyContent: 'center',
  },
  profileHeaderCenter: {
    alignItems: 'center',
  },
  familyHeaderTitleSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    pointerEvents: 'none',
  },
  profileHeaderRight: {
    alignItems: 'flex-end',
  },
  profileBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileBackText: {
    fontSize: 15,
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  profileHeaderMonthLabel: {
    fontSize: 18,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },

  // Card gap (web: space-y-4 = 16px between cards)
  cardGap: { marginTop: 16 },
  familyHubHeader: {
    marginTop: 16,
    marginBottom: 16,
  },
  familyHubHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  devToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  devSetupToggle: {
    minWidth: 30,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  devSetupTogglePressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  devSetupToggleText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },

  // ── Appearance ──
  appearanceEntryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  appearanceEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  appearanceEntryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceEntryIconLabel: {
    fontSize: 17,
    lineHeight: 20,
  },
  appearanceAccountAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  appearanceAccountAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceAccountAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  appearanceEntryTitle: {
    fontSize: 16,
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  appearanceEntrySubtitle: {
    fontSize: 12,
    marginTop: 2,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  appearanceEntryRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  appearancePreviewDots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  appearancePreviewDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  familyAvatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  familyAvatarBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginLeft: -7,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  familyAvatarBubbleFirst: {
    marginLeft: 0,
  },
  familyAvatarBubbleText: {
    fontSize: 9,
    fontWeight: '700',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  familyInviteCard: {
    padding: 0,
  },
  familyNameReadOnlyCard: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 8,
  },
  familyNameBlock: {
    marginTop: 12,
  },
  familyNameReadOnlyLabel: {
    fontSize: 12,
    marginBottom: 4,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  familyNameReadOnlyValue: {
    fontSize: 16,
    fontWeight: '400',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  familyInviteText: {
    fontSize: 14,
    lineHeight: 22,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  familyInviteLink: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  appearanceSheetSpacer: {
    height: 108,
  },
  sectionBody: { gap: 16 },       // space-y-4
  fieldLabel: {
    fontSize: 12,                  // text-xs
    marginBottom: 4,               // mb-1
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  themeSection: { marginTop: 0 },
  appearanceThemeSection: {
    marginTop: 12,
  },
  // Web: grid grid-cols-2 gap-3
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,                       // gap-3
  },
  // Web: w-full text-left rounded-xl border px-3 py-3
  themeButton: {
    width: '48%',
    borderRadius: 12,              // rounded-xl
    borderWidth: 1,
    paddingHorizontal: 12,         // px-3
    paddingVertical: 12,           // py-3
  },
  // Web: text-sm font-semibold
  themeName: {
    fontSize: 14,                  // text-sm
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: flex items-center gap-2 mt-2
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,                        // gap-2
    marginTop: 8,                  // mt-2
  },
  // Web: w-4 h-4 rounded-full border
  swatch: {
    width: 16,                     // w-4
    height: 16,                    // h-4
    borderRadius: 8,               // rounded-full
    borderWidth: 1,
  },

  // ── Kids ──
  hubKidCards: {
    gap: 16,
  },
  hubKidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hubKidLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
  hubKidAvatarRing: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    padding: 2,
    overflow: 'hidden',
    flexShrink: 0,
  },
  hubKidAvatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  hubKidAvatarFallback: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubKidAvatarEmoji: {
    fontSize: 18,
    lineHeight: 20,
  },
  hubKidTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  hubKidTitle: {
    fontSize: 16,
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  hubKidSubtitle: {
    marginTop: 2,
    fontSize: 12,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  hubKidRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 12,
  },
  hubKidActiveBadge: {
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.15)',
  },
  hubKidActiveBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#34C759',
    fontVariant: ['tabular-nums'],
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  addChildIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  addChildBtn: {
    fontSize: 14,
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  kidName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  kidActive: {
    fontSize: 12,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  kidsHint: {
    marginTop: 12,
    fontSize: 12,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },

  // ── Baby Info ──
  photoWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  // Web: w-24 h-24 rounded-full overflow-hidden
  photoCircle: {
    width: 96,                     // w-24
    height: 96,                    // h-24
    borderRadius: 48,              // rounded-full
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitial: {
    fontSize: 36,
    fontWeight: '700',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  profileAvatarUpload: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  profileMainCard: {
    marginTop: 12,
  },
  profileAvatarHint: {
    fontSize: 13,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  profileFieldsWrap: {
    marginTop: 12,
  },
  // Web: absolute bottom-0 right-0 w-8 h-8 rounded-full, border-2
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,                     // w-8
    height: 32,                    // h-8
    borderRadius: 16,              // rounded-full
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  profileSectionLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.9,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  profileAccountLabel: {
    marginTop: 16,
  },
  profileSaveButton: {
    marginTop: 8,
    borderRadius: 11,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Divider sections (mt-4 pt-4 border-t)
  dividerSection: {
    marginTop: 16,                 // mt-4
    paddingTop: 16,                // pt-4
    borderTopWidth: 1,
  },
  // Web: text-base font-semibold mb-2
  sectionTitle: {
    fontSize: 16,                  // text-base
    fontWeight: '600',             // font-semibold
    marginBottom: 8,               // mb-2
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  feedUnitValue: {
    fontSize: 15,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  feedUnitSheetDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  feedUnitSheetSpacer: {
    height: 120,
  },

  // Day sleep
  sleepDescription: {
    fontSize: 12,                  // text-xs
    marginTop: 4,                  // mt-1
    lineHeight: 18,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: grid grid-cols-2 gap-3 mt-4
  sleepInputRow: {
    flexDirection: 'row',
    gap: 12,                       // gap-3
    marginTop: 16,                 // mt-4
  },
  sleepInputHalf: {
    flex: 1,
    minWidth: 0,
  },
  // Slider
  sliderContainer: {
    marginTop: 16,                 // mt-4
  },
  // Web: h-12 rounded-2xl overflow-hidden border
  sliderTrack: {
    height: 48,                    // h-12
    borderRadius: 16,              // rounded-2xl
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  sliderRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  // Web: w-3 h-8 rounded-full shadow-sm border
  sliderHandle: {
    position: 'absolute',
    top: '50%',
    width: 12,                     // w-3
    height: 32,                    // h-8
    borderRadius: 6,               // rounded-full
    borderWidth: 1,
    marginTop: -16,                // -translate-y-1/2
    marginLeft: -6,                // centered on position
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  // Web: flex justify-between text-xs mt-2 px-3
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,                  // mt-2
    paddingHorizontal: 12,         // px-3
  },
  sliderLabel: {
    fontSize: 12,                  // text-xs
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },

  // Activity visibility
  // Web: w-full flex items-center justify-between rounded-2xl p-4
  activityVisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,              // rounded-2xl
    padding: 16,                   // p-4
  },
  // Web: text-sm font-medium
  activityVisTitle: {
    fontSize: 14,
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: text-xs
  activityVisHint: {
    fontSize: 12,
    marginTop: 2,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },

  // ── Family Members ──
  membersCardsList: { gap: 16 },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarWrap: { flexShrink: 0 },
  // Web: w-12 h-12 rounded-full
  memberAvatar: {
    width: 48,                     // w-12
    height: 48,                    // h-12
    borderRadius: 24,              // rounded-full
  },
  memberAvatarFallback: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberInitial: {
    fontSize: 16,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: flex-1 min-w-0
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  // Web: text-sm font-medium truncate
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  ownerBadge: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexShrink: 0,
  },
  ownerBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: text-xs truncate
  memberEmail: {
    fontSize: 12,
    marginTop: 2,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  memberRemoveIconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  memberRemoveIconButtonPressed: {
    transform: [{ scale: 0.95 }],
  },

  // ── Account ──
  accountBody: { gap: 12 },       // space-y-3
  // Web: flex items-center justify-between p-3 rounded-lg
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,                   // p-3
    borderRadius: 8,               // rounded-lg
  },
  profileEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  // Web: text-sm font-medium
  userName: {
    fontSize: 14,
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: text-xs
  userEmail: {
    fontSize: 12,
    marginTop: 2,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: w-10 h-10 rounded-full
  userAvatar: {
    width: 40,                     // w-10
    height: 40,                    // h-10
    borderRadius: 20,
  },
  userAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarInitial: {
    fontSize: 14,
    fontWeight: '700',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: w-full py-3 rounded-xl font-semibold
  accountBtn: {
    paddingVertical: 12,           // py-3
    borderRadius: 12,              // rounded-xl
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBtnText: {
    fontSize: 16,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  deleteAccountBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  deleteAccountBtnText: {
    fontSize: 13,
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  deleteKidWarning: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },

  // ── Add Child HalfSheet ──
  addChildFooter: {
    width: '100%',
  },
  addChildSubmit: {
    height: 48,
    width: '100%',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChildSubmitText: {
    fontSize: 16,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  addChildSectionSpacer: {
    marginBottom: 4,
  },
  addChildPhotoSection: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  addChildPhotoToCtaSpacer: {
    height: 40,
  },
  // Timeline-style confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  deleteModal: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    padding: 24,
  },
  deleteTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 8,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  deleteMessage: {
    fontSize: 16,
    marginBottom: 24,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  deleteActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {},
  confirmBtn: {},
  deleteBtnText: {
    fontSize: 16,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
});
