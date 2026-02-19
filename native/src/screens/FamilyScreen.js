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
import {
  View,
  Text,
  Pressable,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { THEME_TOKENS } from '../../../shared/config/theme';
import SegmentedToggle from '../components/shared/SegmentedToggle';
import TTInputRow from '../components/shared/TTInputRow';
import HalfSheet from '../components/sheets/HalfSheet';
import SheetInputRow from '../components/sheets/InputRow';
import TTPhotoRow from '../components/shared/TTPhotoRow';
import {
  EditIcon,
  BabyIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CameraIcon,
  TrashIcon,
  PlusIcon,
} from '../components/icons';
import { updateCurrentUserProfile } from '../services/authService';
import { uploadKidPhoto, uploadUserPhoto } from '../services/storageService';

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
  const { colors, radius } = useTheme();
  const currentUser = user || { uid: '1', displayName: 'Adam', email: 'adam@example.com', photoURL: null };

  // ── State ──
  const [currentView, setCurrentView] = useState('hub');
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
  const screenScrollRef = useRef(null);
  const [newBabyName, setNewBabyName] = useState('');
  const [newBabyBirthDate, setNewBabyBirthDate] = useState('');
  const [newChildPhotoUris, setNewChildPhotoUris] = useState([]);
  const [savingChild, setSavingChild] = useState(false);
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
    setNewChildPhotoUris([]);
  }, []);

  const openAddChildSheet = useCallback(() => {
    addChildSheetRef.current?.present?.();
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
    onDetailOpenChange?.(currentView !== 'hub');
    return () => {
      onDetailOpenChange?.(false);
    };
  }, [currentView, onDetailOpenChange]);

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

    setSelectedKidLoading(true);
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
        setSelectedKidLoading(false);
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
    setCurrentView('profile');
  }, []);

  const handleOpenFamily = useCallback(() => {
    screenScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    setCurrentView('family');
  }, []);

  const handleOpenKidSubpage = useCallback((kid) => {
    screenScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    setTempBabyName(null);
    setTempWeight(null);
    setEditingName(false);
    setEditingWeight(false);
    setSelectedKidForSubpage(kid || null);
    setCurrentView('kid');
  }, []);

  const handleBackToHub = useCallback(() => {
    screenScrollRef.current?.scrollTo?.({ y: 0, animated: false });
    setCurrentView('hub');
  }, []);

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
      setCurrentView('hub');
    } catch (error) {
      console.error('Failed to save profile:', error);
      Alert.alert('Error', 'Unable to save profile. You may need to sign in again to update your email.');
    } finally {
      setSavingProfile(false);
    }
  }, [currentUser?.uid, familyId, profileNameDraft, profileEmailDraft, profilePhotoUrl, refresh]);

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

  const handleAddChildPhoto = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setNewChildPhotoUris((prev) => [...prev, result.assets[0].uri]);
    }
  }, []);

  const handleRemoveChildPhoto = useCallback((index, isExisting) => {
    if (isExisting) return;
    setNewChildPhotoUris((prev) => prev.filter((_, i) => i !== index));
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

    const parsedDate = new Date(`${newBabyBirthDate.trim()}T12:00:00`);
    if (Number.isNaN(parsedDate.getTime())) {
      Alert.alert('Error', 'Please use YYYY-MM-DD for birth date');
      return;
    }

    setSavingChild(true);
    try {
      const newKidId = await firestoreService.createChild({
        name: newBabyName.trim(),
        birthDate: parsedDate.getTime(),
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

  const handleOpenActivityVisibility = () => {
    if (typeof onRequestToggleActivitySheet === 'function') {
      onRequestToggleActivitySheet();
    }
  };

  // ── Day sleep window ──
  const dayStart = clamp(daySleepStartMin, 0, 1439);
  const dayEnd = clamp(daySleepEndMin, 0, 1439);
  const selectedKidName = selectedKidData?.name || selectedKidForSubpage?.name || 'Kid';

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

  return (
    <>
    <ScrollView
      ref={screenScrollRef}
      style={[s.scroll, { backgroundColor: colors.appBg }]}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {currentView === 'profile' ? (
        <>
          <View style={[s.profileHeader, { borderBottomColor: colors.cardBorder || 'transparent' }]}>
            <View style={s.profileHeaderCol}>
              <Pressable onPress={handleBackToHub} hitSlop={8} style={s.profileBackButton}>
                <ChevronLeftIcon size={20} color={colors.textSecondary} />
                <Text style={[s.profileBackText, { color: colors.textSecondary }]}>
                  Account
                </Text>
              </Pressable>
            </View>
            <View style={[s.profileHeaderCol, s.profileHeaderCenter, s.familyHeaderTitleSlot]}>
              <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>My Profile</Text>
            </View>
            <View style={[s.profileHeaderCol, s.profileHeaderRight]} />
          </View>

          <Card style={s.profileMainCard}>
            <View style={s.profileAvatarUpload}>
              <Pressable onPress={handleProfilePhotoClick} style={s.photoWrap}>
                <View style={[s.photoCircle, { backgroundColor: colors.inputBg }]}>
                  {profilePhotoUrl ? (
                    <Image source={{ uri: profilePhotoUrl }} style={s.photoImage} />
                  ) : (
                    <View style={[s.photoPlaceholder, { backgroundColor: activeTheme?.bottle?.soft || colors.subtleSurface }]}>
                      <Text style={[s.profileInitial, { color: activeTheme?.bottle?.primary || colors.textPrimary }]}>
                        {(profileNameDraft || currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View
                  style={[
                    s.cameraBadge,
                    {
                      backgroundColor: activeTheme?.bottle?.primary || colors.primaryBrand,
                      borderColor: colors.cardBg,
                    },
                  ]}
                >
                  <CameraIcon size={16} color="#ffffff" />
                </View>
              </Pressable>
              <Text style={[s.profileAvatarHint, { color: colors.textSecondary }]}>Tap to change photo</Text>
            </View>
            <View style={s.profileFieldsWrap}>
              <TTInputRow
                label="Name"
                type="text"
                icon={EditIcon}
                value={profileNameDraft}
                placeholder="Your name"
                onChange={setProfileNameDraft}
              />
              <TTInputRow
                label="Email"
                type="text"
                icon={EditIcon}
                value={profileEmailDraft}
                placeholder="name@example.com"
                onChange={setProfileEmailDraft}
              />
            </View>
          </Card>

          {hasProfileChanges ? (
            <Pressable
              onPress={handleSaveProfile}
              disabled={savingProfile}
              style={({ pressed }) => [
                s.profileSaveButton,
                { backgroundColor: colors.primaryActionBg, opacity: savingProfile ? 0.6 : 1 },
                pressed && !savingProfile && { opacity: 0.8 },
              ]}
            >
              <Text style={[s.accountBtnText, { color: colors.primaryActionText }]}>
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </Text>
            </Pressable>
          ) : null}

          <Text style={[s.profileSectionLabel, s.profileAccountLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>

          <Card>
            <View style={s.accountBody}>
              <Pressable
                onPress={handleSignOut}
                style={({ pressed }) => [
                  s.accountBtn,
                  { backgroundColor: colors.errorSoft },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <Text style={[s.accountBtnText, { color: colors.error }]}>Sign Out</Text>
              </Pressable>
              <Pressable
                onPress={handleDeleteAccount}
                style={({ pressed }) => [
                  s.deleteAccountBtn,
                  pressed && { opacity: 0.65 },
                ]}
              >
                <Text style={[s.deleteAccountBtnText, { color: colors.textSecondary }]}>Delete My Account</Text>
              </Pressable>
            </View>
          </Card>

          <View style={{ height: 40 }} />
        </>
      ) : currentView === 'family' ? (
        <>
          <View style={[s.profileHeader, { borderBottomColor: colors.cardBorder || 'transparent' }]}>
            <View style={s.profileHeaderCol}>
              <Pressable onPress={handleBackToHub} hitSlop={8} style={s.profileBackButton}>
                <ChevronLeftIcon size={20} color={colors.textSecondary} />
                <Text style={[s.profileBackText, { color: colors.textSecondary }]}>
                  Account
                </Text>
              </Pressable>
            </View>
            <View style={[s.profileHeaderCol, s.profileHeaderCenter, s.familyHeaderTitleSlot]}>
              <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>Family</Text>
            </View>
            <View style={[s.profileHeaderCol, s.profileHeaderRight]} />
          </View>

          <View style={s.familyNameBlock}>
            {isFamilyOwner ? (
              <TTInputRow
                label="Family Name"
                type="text"
                icon={EditIcon}
                value={familyNameDraft}
                placeholder="Family"
                onChange={setFamilyNameDraft}
              />
            ) : (
              <View style={[s.familyNameReadOnlyCard, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder || colors.borderSubtle }]}>
                <Text style={[s.familyNameReadOnlyLabel, { color: colors.textSecondary }]}>Family Name</Text>
                <Text style={[s.familyNameReadOnlyValue, { color: colors.textPrimary }]}>
                  {familyInfo?.name || 'Family'}
                </Text>
              </View>
            )}
          </View>
          {isFamilyOwner && String(familyNameDraft || '').trim() && String(familyNameDraft || '').trim() !== String(familyInfo?.name || '').trim() ? (
            <Pressable
              onPress={handleSaveFamilyName}
              disabled={savingFamilyName}
              style={({ pressed }) => [
                s.profileSaveButton,
                { backgroundColor: colors.primaryActionBg, opacity: savingFamilyName ? 0.6 : 1 },
                pressed && !savingFamilyName && { opacity: 0.8 },
              ]}
            >
              <Text style={[s.accountBtnText, { color: colors.primaryActionText }]}>
                {savingFamilyName ? 'Saving...' : 'Save Family Name'}
              </Text>
            </Pressable>
          ) : null}

          <Card style={s.cardGap}>
            <CardHeader title="Family Members" />
            <View style={s.membersList}>
              {members.map((member) => {
                const memberUid = member?.uid || null;
                const isOwner = Boolean(memberUid && familyOwnerUid && memberUid === familyOwnerUid);
                return (
                  <View
                    key={member.uid}
                    style={[
                      s.memberRow,
                      {
                        backgroundColor: colors.inputBg,
                        borderRadius: radius?.['2xl'] ?? 16,
                      },
                    ]}
                  >
                      <View style={s.memberAvatarWrap}>
                        {member.photoURL ? (
                          <Image
                            source={{ uri: member.photoURL }}
                            style={s.memberAvatar}
                          />
                        ) : (
                          <View
                            style={[
                              s.memberAvatarFallback,
                              { backgroundColor: colors.subtleSurface },
                            ]}
                          >
                            <Text style={[s.memberInitial, { color: colors.textPrimary }]}>
                              {(member.displayName || member.email || '?').charAt(0).toUpperCase()}
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={s.memberInfo}>
                        <View style={s.memberNameRow}>
                          <Text
                            style={[s.memberName, { color: colors.textPrimary }]}
                            numberOfLines={1}
                          >
                            {member.displayName || member.email || 'Member'}
                          </Text>
                          {isOwner ? (
                            <View
                              style={[
                                s.ownerBadge,
                                {
                                  backgroundColor: colors.segTrack || colors.track,
                                  borderColor: colors.cardBorder || colors.borderSubtle,
                                },
                              ]}
                            >
                              <Text style={[s.ownerBadgeText, { color: colors.textSecondary }]}>
                                Owner
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        <Text
                          style={[s.memberEmail, { color: colors.textSecondary }]}
                          numberOfLines={1}
                        >
                          {member.email}
                        </Text>
                      </View>
                      {member.uid !== currentUser.uid && (
                        <Pressable
                          onPress={() => handleRemoveMember(member.uid)}
                          accessibilityRole="button"
                          accessibilityLabel={`Remove ${member.displayName || member.email || 'member'}`}
                          style={({ pressed }) => [
                            s.memberRemoveIconButton,
                            {
                              backgroundColor: colors.segTrack || colors.track,
                              borderColor: colors.cardBorder,
                            },
                            pressed && s.memberRemoveIconButtonPressed,
                          ]}
                        >
                          <TrashIcon size={20} color={colors.error} />
                        </Pressable>
                      )}
                  </View>
                );
              })}
            </View>
          </Card>

          <Card style={s.cardGap}>
            <View style={s.familyInviteCard}>
              <Text style={[s.familyInviteText, { color: colors.textSecondary }]}>
                Share a link to invite someone. They'll need a Tiny account if they don't have one yet.
              </Text>
              <Pressable
                onPress={() => onInvitePartner?.()}
                style={({ pressed }) => [pressed && { opacity: 0.7 }]}
              >
                <Text style={[s.familyInviteLink, { color: activeTheme?.bottle?.primary || colors.primaryBrand }]}>
                  Copy invite link ↗
                </Text>
              </Pressable>
            </View>
          </Card>

          <View style={{ height: 40 }} />
        </>
      ) : currentView === 'kid' ? (
        <>
          <View style={[s.profileHeader, { borderBottomColor: colors.cardBorder || 'transparent' }]}>
            <View style={s.profileHeaderCol}>
              <Pressable onPress={handleBackToHub} hitSlop={8} style={s.profileBackButton}>
                <ChevronLeftIcon size={20} color={colors.textSecondary} />
                <Text style={[s.profileBackText, { color: colors.textSecondary }]}>
                  Your Kids
                </Text>
              </Pressable>
            </View>
            <View style={[s.profileHeaderCol, s.profileHeaderCenter, s.familyHeaderTitleSlot]}>
              <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>{selectedKidName}</Text>
            </View>
            <View style={[s.profileHeaderCol, s.profileHeaderRight]} />
          </View>
          {selectedKidLoading ? (
            <View style={s.loadingContainer}>
              <ActivityIndicator color={colors.textSecondary} />
            </View>
          ) : (
            <Card style={s.profileMainCard}>
              <View style={s.profileAvatarUpload}>
                <Pressable onPress={handlePhotoClick} style={s.photoWrap}>
                  <View style={[s.photoCircle, { backgroundColor: colors.inputBg }]}>
                    {babyPhotoUrl ? (
                      <Image
                        source={{ uri: babyPhotoUrl }}
                        style={s.photoImage}
                      />
                    ) : (
                      <View style={[s.photoPlaceholder, { backgroundColor: activeTheme?.bottle?.soft || colors.subtleSurface }]}>
                        <BabyIcon size={48} color={activeTheme?.bottle?.primary || colors.textTertiary} />
                      </View>
                    )}
                  </View>
                  <View
                    style={[
                      s.cameraBadge,
                      {
                        backgroundColor: activeTheme?.bottle?.primary || colors.primaryBrand,
                        borderColor: colors.cardBg,
                      },
                    ]}
                  >
                    <CameraIcon size={16} color="#ffffff" />
                  </View>
                </Pressable>
                <Text style={[s.profileAvatarHint, { color: colors.textSecondary }]}>Tap to change photo</Text>
              </View>

              <View style={s.profileFieldsWrap}>
                <TTInputRow
                  label="Name"
                  type="text"
                  icon={EditIcon}
                  value={tempBabyName !== null ? tempBabyName : (selectedKidData?.name || '')}
                  placeholder="Baby"
                  onChange={handleBabyNameChange}
                  onFocus={() => setEditingName(true)}
                  onBlur={handleUpdateBabyName}
                />
                <TTInputRow
                  label="Birth date"
                  type="datetime"
                  icon={EditIcon}
                  rawValue={selectedKidData?.birthDate ? new Date(selectedKidData.birthDate).toISOString() : null}
                  placeholder={
                    selectedKidData?.birthDate
                      ? `${new Date(selectedKidData.birthDate).toLocaleDateString()} \u2022 ${formatAgeFromDate(selectedKidData.birthDate)}`
                      : 'Not set'
                  }
                  formatDateTime={(iso) => {
                    const d = new Date(iso);
                    const dateLabel = d.toLocaleDateString();
                    const ageLabel = formatAgeFromDate(d);
                    return ageLabel ? `${dateLabel} \u2022 ${ageLabel}` : dateLabel;
                  }}
                />
                <TTInputRow
                  label="Current weight (lbs)"
                  type="number"
                  icon={EditIcon}
                  value={tempWeight !== null ? tempWeight : (selectedKidSettings.babyWeight?.toString() || '')}
                  placeholder="Not set"
                  onChange={handleWeightChange}
                  onFocus={() => setEditingWeight(true)}
                  onBlur={handleUpdateWeight}
                />
              </View>

            </Card>
          )}

          <Card style={s.cardGap}>
            <Pressable
              onPress={openDaySleepSheet}
              style={({ pressed }) => [
                s.appearanceEntryRow,
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={s.appearanceEntryLeft}>
                <View style={[s.appearanceEntryIcon, { backgroundColor: colors.inputBg }]}>
                  <Text style={s.appearanceEntryIconLabel}>🌙</Text>
                </View>
                <View>
                  <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Day Sleep Window</Text>
                  <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>
                    Set day vs night sleep timing
                  </Text>
                </View>
              </View>
              <View style={s.appearanceEntryRight}>
                <ChevronRightIcon size={16} color={colors.textSecondary} />
              </View>
            </Pressable>
          </Card>

          <Card style={s.cardGap}>
            <Pressable
              onPress={handleOpenActivityVisibility}
              style={({ pressed }) => [
                s.appearanceEntryRow,
                pressed && { opacity: 0.75 },
              ]}
            >
              <View style={s.appearanceEntryLeft}>
                <View style={[s.appearanceEntryIcon, { backgroundColor: colors.inputBg }]}>
                  <Text style={s.appearanceEntryIconLabel}>👁️</Text>
                </View>
                <View>
                  <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Activity Visibility</Text>
                  <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>
                    Show & hide tracker activities
                  </Text>
                </View>
              </View>
              <View style={s.appearanceEntryRight}>
                <ChevronRightIcon size={16} color={colors.textSecondary} />
              </View>
            </Pressable>
          </Card>

          <View style={{ height: 40 }} />
        </>
      ) : (
        <>
      {showDevSetupToggle ? (
        <View style={s.familyDevRowTop}>
          <View style={s.devToggleRow}>
            <Pressable
              onPress={() => onToggleForceSetupPreview?.(!forceSetupPreview)}
              style={({ pressed }) => [
                s.devSetupToggle,
                {
                  borderColor: forceSetupPreview ? colors.brandIcon : (colors.cardBorder || colors.borderSubtle),
                  backgroundColor: forceSetupPreview ? colors.subtleSurface : colors.cardBg,
                },
                pressed && s.devSetupTogglePressed,
              ]}
            >
              <Text
                style={[
                  s.devSetupToggleText,
                  { color: forceSetupPreview ? colors.brandIcon : colors.textTertiary },
                ]}
              >
                OB
              </Text>
            </Pressable>
            <Pressable
              onPress={() => onToggleForceLoginPreview?.(!forceLoginPreview)}
              style={({ pressed }) => [
                s.devSetupToggle,
                {
                  borderColor: forceLoginPreview ? colors.brandIcon : (colors.cardBorder || colors.borderSubtle),
                  backgroundColor: forceLoginPreview ? colors.subtleSurface : colors.cardBg,
                },
                pressed && s.devSetupTogglePressed,
              ]}
            >
              <Text
                style={[
                  s.devSetupToggleText,
                  { color: forceLoginPreview ? colors.brandIcon : colors.textTertiary },
                ]}
              >
                LG
              </Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      <View style={s.familyHubHeader}>
        <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>Account and Profile</Text>
      </View>
      {/* ── Account Card ── */}
      {/* Hub entrypoint for Profile subpage */}
      <Card>
        <Pressable
          onPress={handleOpenProfile}
          style={({ pressed }) => [
            s.appearanceEntryRow,
            pressed && { opacity: 0.75 },
          ]}
        >
          <View style={s.appearanceEntryLeft}>
            {currentUser.photoURL ? (
              <Image source={{ uri: currentUser.photoURL }} style={s.appearanceAccountAvatar} />
            ) : (
              <View style={[s.appearanceAccountAvatarFallback, { backgroundColor: colors.subtleSurface }]}>
                <Text style={[s.appearanceAccountAvatarInitial, { color: colors.textPrimary }]}>
                  {(currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>
                {currentUser.displayName || 'User'}
              </Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>
                {currentUser.email}
              </Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <ChevronRightIcon size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Card>
      {/* ── 1. Appearance Card ── */}
      <Card style={s.cardGap}>
        <Pressable
          onPress={openAppearanceSheet}
          style={({ pressed }) => [
            s.appearanceEntryRow,
            pressed && { opacity: 0.75 },
          ]}
        >
          <View style={s.appearanceEntryLeft}>
            <View style={[s.appearanceEntryIcon, { backgroundColor: colors.inputBg }]}>
              <Text style={s.appearanceEntryIconLabel}>🎨</Text>
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Appearance</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>Theme & dark mode</Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <View style={s.appearancePreviewDots}>
              {['bottle', 'nursing', 'sleep'].map((cardKey) => (
                <View
                  key={`preview-${cardKey}`}
                  style={[
                    s.appearancePreviewDot,
                    { backgroundColor: activeTheme?.[cardKey]?.primary || colors.textTertiary },
                  ]}
                />
              ))}
            </View>
            <ChevronRightIcon size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Card>

      <View style={s.familyHubHeader}>
        <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>Your Kids</Text>
      </View>

      {/* ── 2. Kids Top-level Cards ── */}
      {Array.isArray(kids) && kids.length > 0 && (
        <View style={s.hubKidCards}>
          {kids.map((k) => {
            const isCurrent = k.id === kidId;
            const ageLabel = formatAgeFromDate(k.birthDate);
            const weightVal = Number(k?.babyWeight || k?.currentWeight || k?.weight || 0);
            const weightLabel = Number.isFinite(weightVal) && weightVal > 0 ? `${Math.round(weightVal * 10) / 10} lbs` : null;
            const birthLabel = formatMonthDay(k.birthDate);
            const subtitle = [ageLabel, weightLabel, birthLabel].filter(Boolean).join(' \u2022 ');
            return (
              <Card key={`hub-kid-${k.id}`}>
                <Pressable
                  onPress={() => handleOpenKidSubpage(k)}
                  style={({ pressed }) => [
                    s.hubKidRow,
                    pressed && { opacity: 0.75 },
                  ]}
                >
                  <View style={s.hubKidLeft}>
                    <View style={[s.hubKidAvatarRing, { borderColor: activeTheme?.bottle?.primary || colors.primaryBrand }]}>
                      {k.photoURL ? (
                        <Image source={{ uri: k.photoURL }} style={s.hubKidAvatarImage} />
                      ) : (
                        <View style={[s.hubKidAvatarFallback, { backgroundColor: activeTheme?.bottle?.soft || colors.subtleSurface }]}>
                          <Text style={s.hubKidAvatarEmoji}>👶</Text>
                        </View>
                      )}
                    </View>
                    <View style={s.hubKidTextWrap}>
                      <Text style={[s.hubKidTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                        {k.name || 'Baby'}
                      </Text>
                      <Text style={[s.hubKidSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
                        {subtitle || 'Tap to open profile'}
                      </Text>
                    </View>
                  </View>
                  <View style={s.hubKidRight}>
                    {isCurrent ? (
                      <View style={s.hubKidActiveBadge}>
                        <Text style={s.hubKidActiveBadgeText}>Active</Text>
                      </View>
                    ) : null}
                    <ChevronRightIcon size={16} color={colors.textSecondary} />
                  </View>
                </Pressable>
              </Card>
            );
          })}
        </View>
      )}

      <Card style={s.cardGap}>
        <Pressable
          onPress={openAddChildSheet}
          style={({ pressed }) => [
            s.appearanceEntryRow,
            pressed && { opacity: 0.75 },
          ]}
        >
          <View style={s.appearanceEntryLeft}>
            <View style={[s.addChildIconWrap, { backgroundColor: colors.inputBg }]}>
              <PlusIcon size={20} color={colors.textPrimary} />
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Add Child</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>
                Track another little one
              </Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <ChevronRightIcon size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Card>

      <View style={s.familyHubHeader}>
        <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>Family</Text>
      </View>

      {/* ── 4. Family Card ── */}
      <Card style={s.cardGap}>
        <Pressable
          onPress={handleOpenFamily}
          style={({ pressed }) => [
            s.appearanceEntryRow,
            pressed && { opacity: 0.75 },
          ]}
        >
          <View style={s.appearanceEntryLeft}>
            <View style={[s.appearanceEntryIcon, { backgroundColor: colors.inputBg }]}>
              <Text style={s.appearanceEntryIconLabel}>👨‍👩‍👧</Text>
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Family</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>
                {`${members.length} ${members.length === 1 ? 'person' : 'people'} with access`}
              </Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <View style={s.familyAvatarStack}>
              {members.slice(0, 4).map((member, index) => (
                <View
                  key={`fam-preview-${member.uid}`}
                  style={[
                    s.familyAvatarBubble,
                    index === 0 && s.familyAvatarBubbleFirst,
                    { backgroundColor: colors.inputBg, borderColor: colors.cardBg },
                  ]}
                >
                  <Text style={[s.familyAvatarBubbleText, { color: colors.textPrimary }]}>
                    {(member.displayName || member.email || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
            <ChevronRightIcon size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Card>

      <Card style={s.cardGap}>
        <Pressable
          onPress={openFeedingUnitSheet}
          style={({ pressed }) => [
            s.appearanceEntryRow,
            pressed && { opacity: 0.75 },
          ]}
        >
          <View style={s.appearanceEntryLeft}>
            <View style={[s.appearanceEntryIcon, { backgroundColor: colors.inputBg }]}>
              <Text style={s.appearanceEntryIconLabel}>🍼</Text>
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Feeding Unit</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>Shared across all kids</Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <Text style={[s.feedUnitValue, { color: colors.textSecondary }]}>
              {settings.preferredVolumeUnit === 'ml' ? 'ml' : 'oz'}
            </Text>
            <ChevronRightIcon size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Card>

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />
        </>
      )}
    </ScrollView>
    <HalfSheet
      sheetRef={feedingUnitSheetRef}
      title="Feeding Unit"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      snapPoints={['92%']}
      enableDynamicSizing
      scrollable
    >
      <Text style={[s.feedUnitSheetDescription, { color: colors.textSecondary }]}>
        Everyone in your family logs in the same unit. Switching applies everywhere.
      </Text>
      <SegmentedToggle
        value={settings.preferredVolumeUnit === 'ml' ? 'ml' : 'oz'}
        options={[
          { value: 'oz', label: 'oz' },
          { value: 'ml', label: 'ml' },
        ]}
        onChange={handleVolumeUnitChange}
        variant="body"
        size="medium"
        trackColor={segmentedTrackColor}
      />
      <View style={s.feedUnitSheetSpacer} />
    </HalfSheet>
    <HalfSheet
      sheetRef={daySleepSheetRef}
      title="Day Sleep Window"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      snapPoints={['92%']}
      enableDynamicSizing
      scrollable
    >
      <Text style={[s.sleepDescription, { color: colors.textSecondary }]}>
        Sleep that starts between these times counts as{' '}
        <Text style={{ fontWeight: '500', color: colors.textPrimary }}>Day Sleep</Text>
        {' '}(naps). Everything else counts as{' '}
        <Text style={{ fontWeight: '500', color: colors.textPrimary }}>Night Sleep</Text>.
      </Text>

      <View style={s.sleepInputRow}>
        <View style={s.sleepInputHalf}>
          <TTInputRow
            label="Start"
            type="datetime"
            icon={EditIcon}
            rawValue={null}
            placeholder={minutesToLabel(dayStart)}
            formatDateTime={() => minutesToLabel(dayStart)}
          />
        </View>
        <View style={s.sleepInputHalf}>
          <TTInputRow
            label="End"
            type="datetime"
            icon={EditIcon}
            rawValue={null}
            placeholder={minutesToLabel(dayEnd)}
            formatDateTime={() => minutesToLabel(dayEnd)}
          />
        </View>
      </View>

      <View style={s.sliderContainer}>
        <View
          style={[
            s.sliderTrack,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.cardBorder || colors.borderSubtle,
            },
          ]}
        >
          <View
            style={[
              s.sliderRange,
              {
                left: `${(Math.min(dayStart, dayEnd) / 1440) * 100}%`,
                width: `${(Math.abs(dayEnd - dayStart) / 1440) * 100}%`,
                backgroundColor: activeTheme?.sleep?.soft || colors.highlightSoft,
              },
            ]}
          />
          <View
            style={[
              s.sliderHandle,
              {
                left: `${(dayStart / 1440) * 100}%`,
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder || colors.borderSubtle,
              },
            ]}
          />
          <View
            style={[
              s.sliderHandle,
              {
                left: `${(dayEnd / 1440) * 100}%`,
                backgroundColor: colors.cardBg,
                borderColor: colors.cardBorder || colors.borderSubtle,
              },
            ]}
          />
        </View>
        <View style={s.sliderLabels}>
          {['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'].map((label) => (
            <Text key={label} style={[s.sliderLabel, { color: colors.textTertiary }]}>
              {label}
            </Text>
          ))}
        </View>
      </View>
      <View style={s.feedUnitSheetSpacer} />
    </HalfSheet>
    <HalfSheet
      sheetRef={appearanceSheetRef}
      title="Appearance"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      snapPoints={['92%']}
      enableDynamicSizing
      scrollable
    >
      <View style={s.sectionBody}>
        <View>
          <Text style={[s.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Dark Mode</Text>
          <SegmentedToggle
            value={isDark ? 'dark' : 'light'}
            options={[
              { value: 'light', label: 'Light' },
              { value: 'dark', label: 'Dark' },
            ]}
            onChange={handleDarkModeChange}
            variant="body"
            size="medium"
            trackColor={segmentedTrackColor}
          />
        </View>

        <View style={[s.themeSection, s.appearanceThemeSection]}>
          <Text style={[s.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>
            Color Theme
          </Text>
          <View style={s.themeGrid}>
            {colorThemeOrder.map((key) => {
              const t = resolveTheme(key);
              if (!t) return null;
              const isSelected = activeThemeKey === key;
              const swatchOrder = ['bottle', 'nursing', 'sleep', 'diaper', 'solids'];
              return (
                <Pressable
                  key={key}
                  onPress={() => handleThemeChange(key)}
                  style={[
                    s.themeButton,
                    {
                      backgroundColor: isSelected ? colors.subtleSurface : colors.cardBg,
                      borderColor: isSelected ? colors.outlineStrong : (colors.cardBorder || colors.borderSubtle),
                    },
                  ]}
                >
                  <Text style={[s.themeName, { color: colors.textPrimary }]}>
                    {t.name || key}
                  </Text>
                  <View style={s.swatchRow}>
                    {swatchOrder.map((cardKey) => {
                      const accent = t[cardKey]?.primary || 'transparent';
                      return (
                        <View
                          key={`${key}-${cardKey}`}
                          style={[
                            s.swatch,
                            {
                              backgroundColor: accent,
                              borderColor: colors.cardBorder || colors.borderSubtle,
                            },
                          ]}
                        />
                      );
                    })}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={s.appearanceSheetSpacer} />
      </View>
    </HalfSheet>
    <HalfSheet
      sheetRef={addChildSheetRef}
      title="Add Child"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      onClose={() => {
        if (!savingChild) resetAddChildForm();
      }}
      snapPoints={['76%']}
      initialSnapIndex={0}
      enableDynamicSizing={false}
      scrollable
      footer={(
        <View style={s.addChildFooter}>
          <Pressable
            onPress={closeAddChildSheet}
            disabled={savingChild}
            style={({ pressed }) => [pressed && { opacity: 0.7 }, s.addChildCancelWrap]}
          >
            <Text style={[s.addChildCancel, { color: colors.textSecondary }]}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={handleCreateChild}
            disabled={savingChild}
            style={({ pressed }) => [
              s.addChildSubmit,
              {
                backgroundColor: colors.primaryActionBg,
                opacity: savingChild ? 0.5 : (pressed ? 0.85 : 1),
              },
            ]}
          >
            <Text style={[s.addChildSubmitText, { color: colors.primaryActionText }]}>
              {savingChild ? 'Saving...' : 'Add Child'}
            </Text>
          </Pressable>
        </View>
      )}
    >
      <Text style={[s.addChildSubtitle, { color: colors.textSecondary }]}>
        This child will share the same family and members.
      </Text>
      <SheetInputRow
        label="Child's Name"
        type="text"
        icon={EditIcon}
        value={newBabyName}
        onChange={setNewBabyName}
        placeholder="Enter name"
      />
      <SheetInputRow
        label="Birth date"
        type="text"
        icon={EditIcon}
        value={newBabyBirthDate}
        onChange={setNewBabyBirthDate}
        placeholder="YYYY-MM-DD"
      />
      <TTPhotoRow
        expanded
        showTitle
        title="Photo"
        existingPhotos={[]}
        newPhotos={newChildPhotoUris}
        onAddPhoto={handleAddChildPhoto}
        onRemovePhoto={handleRemoveChildPhoto}
        onPreviewPhoto={() => {}}
        showAddHint
        addHint="Add"
        addTileBorder
      />
    </HalfSheet>
    </>
  );
}

// ══════════════════════════════════════════════════
// ── Styles ──
// ══════════════════════════════════════════════════

const s = StyleSheet.create({
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
  familyDevRowTop: {
    marginTop: 4,
    marginBottom: 8,
    alignItems: 'flex-end',
  },
  familyHubHeader: {
    marginTop: 16,
    marginBottom: 16,
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
  membersList: { gap: 12 },       // space-y-3
  // Web: flex items-center gap-3 p-3 rounded-xl
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,                       // gap-3
    padding: 12,                   // p-3
    borderRadius: 16,              // rounded-2xl
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

  // ── Add Child HalfSheet ──
  addChildSubtitle: {
    fontSize: 12,
    marginBottom: 16,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  addChildFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  addChildCancelWrap: {
    paddingHorizontal: 4,
    paddingVertical: 10,
  },
  addChildCancel: {
    fontSize: 14,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  addChildSubmit: {
    minHeight: 40,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addChildSubmitText: {
    fontSize: 14,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
});
