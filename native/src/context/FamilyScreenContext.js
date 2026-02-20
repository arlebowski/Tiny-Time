/**
 * FamilyScreenContext — Shared state provider for the Family tab's native stack.
 *
 * All state, handlers, refs, and computed values that were in FamilyScreen
 * now live here so that stable screen components can consume them via
 * useFamilyScreen() without needing inline render functions.
 */

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  Alert,
  StyleSheet,
  Platform,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from './ThemeContext';
import { useData } from './DataContext';
import { useAuth } from './AuthContext';
import { THEME_TOKENS } from '../../../shared/config/theme';
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
function Card({ children, style, onPress, disabled = false }) {
  const { colors, radius } = useTheme();
  const cardStyle = ({ pressed }) => [
    cardStyles.card,
    {
      backgroundColor: colors.cardBg,
      borderRadius: radius?.['2xl'] ?? 16,
    },
    style,
    pressed && onPress && !disabled ? cardStyles.cardPressed : null,
  ];

  if (typeof onPress === 'function') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={cardStyle}
      >
        {children}
      </Pressable>
    );
  }

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

const FW = THEME_TOKENS.TYPOGRAPHY.fontWeight;
const cardStyles = StyleSheet.create({
  card: {
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],
  },
});

// ── Context ──

const FamilyScreenContext = createContext(null);

export const useFamilyScreen = () => {
  const ctx = useContext(FamilyScreenContext);
  if (!ctx) throw new Error('useFamilyScreen must be used within FamilyScreenProvider');
  return ctx;
};

export function FamilyScreenProvider({
  children,
  // External props from AppShell
  header = null,
  user,
  kidId,
  familyId,
  onKidChange,
  kids: propKids = [],
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
  const { createFamily, loading: authLoading } = useAuth();
  const currentUser = user || { uid: '1', displayName: 'Adam', email: 'adam@example.com', photoURL: null };

  // ── State ──
  const [kids, setKids] = useState(propKids);
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

  // Add Child / Family
  const appearanceSheetRef = useRef(null);
  const feedingUnitSheetRef = useRef(null);
  const daySleepSheetRef = useRef(null);
  const addChildSheetRef = useRef(null);
  const addFamilySheetRef = useRef(null);
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

  // Sync kids prop
  useEffect(() => {
    setKids(propKids);
  }, [propKids]);

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

  // ── Sheet open/close ──

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

  // ── Data loading effects ──

  useEffect(() => {
    if (ctxKidData) {
      setKidData(ctxKidData);
      setBabyPhotoUrl(ctxKidData.photoURL || null);
    }
    if (ctxMembers?.length) {
      setMembers(ctxMembers);
    }
    if (ctxSettings) {
      setSettings((prev) => ({ ...prev, ...ctxSettings }));
      if (ctxSettings.sleepDayStart != null) setDaySleepStartMin(ctxSettings.sleepDayStart);
      if (ctxSettings.sleepDayEnd != null) setDaySleepEndMin(ctxSettings.sleepDayEnd);
    }
  }, [ctxKidData, ctxMembers, ctxSettings]);

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

  // ── Kid subpage data loading ──

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

  const prepareKidSubpage = useCallback((kid) => {
    setTempBabyName(null);
    setTempWeight(null);
    setEditingName(false);
    setEditingWeight(false);
    setSelectedKidForSubpage(kid || null);
    loadSelectedKidData(kid);
  }, [loadSelectedKidData]);

  // ── Handlers ──

  const handleThemeChange = useCallback((nextKey) => {
    if (!nextKey || nextKey === activeThemeKey) return;
    if (typeof onThemeChange === 'function') onThemeChange(nextKey);
  }, [activeThemeKey, onThemeChange]);

  const handleDarkModeChange = useCallback((value) => {
    if (typeof onDarkModeChange === 'function') onDarkModeChange(value === 'dark');
  }, [onDarkModeChange]);

  const handleBabyNameChange = useCallback((nextValue) => {
    if (!editingName) setEditingName(true);
    setTempBabyName(nextValue);
  }, [editingName]);

  const handleUpdateBabyName = useCallback(async () => {
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
  }, [selectedKidForSubpage?.id, tempBabyName, selectedKidData?.name, kidId, firestoreService]);

  const handleWeightChange = useCallback((nextValue) => {
    if (!editingWeight) setEditingWeight(true);
    setTempWeight(nextValue);
  }, [editingWeight]);

  const handleUpdateWeight = useCallback(async () => {
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
  }, [selectedKidForSubpage?.id, tempWeight, selectedKidSettings.babyWeight, kidId, firestoreService]);

  const handleVolumeUnitChange = useCallback(async (nextUnit) => {
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
  }, [selectedKidForSubpage?.id, kidId, updateKidSettings, firestoreService, familyId]);

  const handlePhotoClick = useCallback(async () => {
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
  }, [selectedKidForSubpage?.id, familyId, kidId, firestoreService]);

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

  const handleRemoveMember = useCallback((memberId) => {
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
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert('Sign Out', 'Sign out of Tiny Tracker?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => { if (typeof onSignOut === 'function') onSignOut(); },
      },
    ]);
  }, [onSignOut]);

  const handleDeleteAccount = useCallback(() => {
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
  }, [onDeleteAccount]);

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
  }, [kidPendingDelete, firestoreService, currentUser?.uid, kids, kidId, onKidChange, refresh]);

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

  const handleCreateChild = useCallback(async () => {
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
  }, [
    newBabyName, newBabyBirthDate, newBabyWeight, newChildPhotoUris,
    familyId, user?.uid, activeThemeKey, defaultThemeKey,
    firestoreService, closeAddChildSheet, resetAddChildForm, onKidChange, refresh,
  ]);

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
    } catch (error) {
      console.error('Error creating family:', error);
      Alert.alert('Error', error?.message || 'Failed to create family. Please try again.');
    } finally {
      setSavingFamily(false);
    }
  }, [
    newFamilyName, newFamilyBabyName, newFamilyBirthDate, newFamilyWeight, newFamilyPhotoUris,
    createFamily, closeAddFamilySheet, resetAddFamilyForm,
  ]);

  const handleOpenActivityVisibility = useCallback(() => {
    if (typeof onRequestToggleActivitySheet === 'function') {
      onRequestToggleActivitySheet();
    }
  }, [onRequestToggleActivitySheet]);

  // ── Computed values ──
  const dayStart = clamp(daySleepStartMin, 0, 1439);
  const dayEnd = clamp(daySleepEndMin, 0, 1439);
  const selectedKidName = selectedKidData?.name || selectedKidForSubpage?.name || 'Kid';

  const value = useMemo(() => ({
    // External props forwarded
    header,
    currentUser,
    kidId,
    familyId,
    onKidChange,
    showDevSetupToggle,
    forceSetupPreview,
    forceLoginPreview,
    onToggleForceSetupPreview,
    onToggleForceLoginPreview,
    onInvitePartner,

    // Components & styles
    Card,
    s,
    colors,

    // Theme
    activeTheme,
    activeThemeKey,
    isDark,
    segmentedTrackColor,
    colorThemeOrder,
    resolveTheme,

    // Data
    kids,
    kidData,
    members,
    settings,
    familyInfo,
    loading,
    authLoading,

    // Kid subpage
    selectedKidForSubpage,
    selectedKidData,
    selectedKidSettings,
    selectedKidLoading,
    selectedKidName,
    babyPhotoUrl,
    tempBabyName,
    tempWeight,
    dayStart,
    dayEnd,

    // Profile
    profileNameDraft,
    profileEmailDraft,
    profilePhotoUrl,
    savingProfile,
    hasProfileChanges,

    // Family
    familyNameDraft,
    familyOwnerUid,
    isFamilyOwner,
    savingFamilyName,

    // Add child
    savingChild,
    newBabyName,
    newBabyBirthDate,
    newBabyWeight,
    newChildPhotoUris,

    // Add family
    savingFamily,
    newFamilyName,
    newFamilyBabyName,
    newFamilyBirthDate,
    newFamilyWeight,
    newFamilyPhotoUris,

    // Delete kid
    kidPendingDelete,
    setKidPendingDelete,

    // Sheet refs
    appearanceSheetRef,
    feedingUnitSheetRef,
    daySleepSheetRef,
    addChildSheetRef,
    addFamilySheetRef,

    // Sheet handlers
    openAddChildSheet,
    openAddFamilySheet,
    openAppearanceSheet,
    openFeedingUnitSheet,
    openDaySleepSheet,
    closeAddChildSheet,
    closeAddFamilySheet,
    resetAddChildForm,
    resetAddFamilyForm,

    // Navigation prep
    prepareKidSubpage,
    loadSelectedKidData,

    // Handlers
    handleThemeChange,
    handleDarkModeChange,
    handleBabyNameChange,
    handleUpdateBabyName,
    handleWeightChange,
    handleUpdateWeight,
    handleVolumeUnitChange,
    handlePhotoClick,
    handleProfilePhotoClick,
    handleSaveProfile,
    handleSaveFamilyName,
    handleRemoveMember,
    handleSignOut,
    handleDeleteAccount,
    handleRequestDeleteKid,
    handleConfirmDeleteKid,
    handleAddChildPhoto,
    handleRemoveChildPhoto,
    handleAddFamilyPhoto,
    handleRemoveFamilyPhoto,
    handleCreateChild,
    handleCreateFamilyFromSheet,
    handleOpenActivityVisibility,

    // State setters needed by screens
    setProfileNameDraft,
    setProfileEmailDraft,
    setFamilyNameDraft,
    setEditingName,
    setEditingWeight,
    setNewBabyName,
    setNewBabyBirthDate,
    setNewBabyWeight,
    setNewFamilyName,
    setNewFamilyBabyName,
    setNewFamilyBirthDate,
    setNewFamilyWeight,

    // Utility functions
    formatAgeFromDate,
    formatMonthDay,
    minutesToLabel,
  }), [
    header, currentUser, kidId, familyId, onKidChange,
    showDevSetupToggle, forceSetupPreview, forceLoginPreview,
    onToggleForceSetupPreview, onToggleForceLoginPreview, onInvitePartner,
    colors, activeTheme, activeThemeKey, isDark, segmentedTrackColor,
    colorThemeOrder, kids, kidData, members, settings, familyInfo,
    loading, authLoading,
    selectedKidForSubpage, selectedKidData, selectedKidSettings,
    selectedKidLoading, selectedKidName, babyPhotoUrl, tempBabyName, tempWeight,
    dayStart, dayEnd,
    profileNameDraft, profileEmailDraft, profilePhotoUrl, savingProfile, hasProfileChanges,
    familyNameDraft, familyOwnerUid, isFamilyOwner, savingFamilyName,
    savingChild, newBabyName, newBabyBirthDate, newBabyWeight, newChildPhotoUris,
    savingFamily, newFamilyName, newFamilyBabyName, newFamilyBirthDate, newFamilyWeight, newFamilyPhotoUris,
    kidPendingDelete,
    prepareKidSubpage, loadSelectedKidData,
    handleThemeChange, handleDarkModeChange,
    handleBabyNameChange, handleUpdateBabyName,
    handleWeightChange, handleUpdateWeight,
    handleVolumeUnitChange, handlePhotoClick, handleProfilePhotoClick,
    handleSaveProfile, handleSaveFamilyName, handleRemoveMember,
    handleSignOut, handleDeleteAccount,
    handleRequestDeleteKid, handleConfirmDeleteKid,
    handleAddChildPhoto, handleRemoveChildPhoto,
    handleAddFamilyPhoto, handleRemoveFamilyPhoto,
    handleCreateChild, handleCreateFamilyFromSheet,
    handleOpenActivityVisibility,
    openAddChildSheet, openAddFamilySheet, openAppearanceSheet,
    openFeedingUnitSheet, openDaySleepSheet,
    closeAddChildSheet, closeAddFamilySheet,
    resetAddChildForm, resetAddFamilyForm,
  ]);

  return (
    <FamilyScreenContext.Provider value={value}>
      {children}
    </FamilyScreenContext.Provider>
  );
}

// ══════════════════════════════════════════════════
// ── Styles (shared with all family screens) ──
// ══════════════════════════════════════════════════

const s = StyleSheet.create({
  // Scroll
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 16,
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
    fontWeight: FW.medium,
    fontFamily: 'SF-Pro',
  },
  profileHeaderMonthLabel: {
    fontSize: 18,
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },

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
    fontWeight: FW.bold,
    lineHeight: 12,
    fontFamily: 'SF-Pro',
  },

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
    fontWeight: FW.bold,
    fontFamily: 'SF-Pro',
  },
  appearanceEntryTitle: {
    fontSize: 16,
    fontWeight: FW.medium,
    fontFamily: 'SF-Pro',
  },
  appearanceEntrySubtitle: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'SF-Pro',
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
    fontWeight: FW.bold,
    fontFamily: 'SF-Pro',
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
    fontFamily: 'SF-Pro',
  },
  familyNameReadOnlyValue: {
    fontSize: 16,
    fontWeight: FW.normal,
    fontFamily: 'SF-Pro',
  },
  familyInviteText: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: 'SF-Pro',
  },
  familyInviteLink: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },
  appearanceSheetSpacer: {
    height: 108,
  },
  sectionBody: { gap: 16 },
  fieldLabel: {
    fontSize: 12,
    marginBottom: 4,
    fontFamily: 'SF-Pro',
  },
  themeSection: { marginTop: 0 },
  appearanceThemeSection: {
    marginTop: 12,
  },
  themeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  themeButton: {
    width: '48%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  themeName: {
    fontSize: 14,
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },
  swatchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  swatch: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
  },

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
    fontWeight: FW.bold,
    fontFamily: 'Fraunces',
    fontVariationSettings: '"wght" 700, "SOFT" 23, "WONK" 1, "opsz" 63',
  },
  hubKidSubtitle: {
    marginTop: 2,
    fontSize: 12,
    fontFamily: 'SF-Pro',
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
    fontWeight: FW.semibold,
    color: '#34C759',
    fontVariant: ['tabular-nums'],
    fontFamily: 'SF-Pro',
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
    fontWeight: FW.medium,
    fontFamily: 'SF-Pro',
  },
  kidName: {
    fontSize: 14,
    fontWeight: FW.bold,
    flex: 1,
    fontFamily: 'Fraunces',
    fontVariationSettings: '"wght" 700, "SOFT" 23, "WONK" 1, "opsz" 63',
  },
  kidActive: {
    fontSize: 12,
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },
  kidsHint: {
    marginTop: 12,
    fontSize: 12,
    fontFamily: 'SF-Pro',
  },

  photoWrap: {
    position: 'relative',
    flexShrink: 0,
  },
  photoCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
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
    fontWeight: FW.bold,
    fontFamily: 'SF-Pro',
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
    fontFamily: 'SF-Pro',
  },
  profileFieldsWrap: {
    marginTop: 12,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  profileSectionLabel: {
    marginTop: 14,
    marginBottom: 8,
    fontSize: 11,
    fontWeight: FW.bold,
    letterSpacing: 0.9,
    fontFamily: 'SF-Pro',
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
  dividerSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: FW.semibold,
    marginBottom: 8,
    fontFamily: 'SF-Pro',
  },
  feedUnitValue: {
    fontSize: 15,
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },
  feedUnitSheetDescription: {
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: 'SF-Pro',
  },
  feedUnitSheetSpacer: {
    height: 120,
  },

  sleepDescription: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 18,
    fontFamily: 'SF-Pro',
  },
  sleepInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  sleepInputHalf: {
    flex: 1,
    minWidth: 0,
  },
  sliderContainer: {
    marginTop: 16,
  },
  sliderTrack: {
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  sliderRange: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  sliderHandle: {
    position: 'absolute',
    top: '50%',
    width: 12,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    marginTop: -16,
    marginLeft: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 12,
  },
  sliderLabel: {
    fontSize: 12,
    fontFamily: 'SF-Pro',
  },

  activityVisBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    padding: 16,
  },
  activityVisTitle: {
    fontSize: 14,
    fontWeight: FW.medium,
    fontFamily: 'SF-Pro',
  },
  activityVisHint: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'SF-Pro',
  },

  membersCardsList: { gap: 16 },
  memberCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatarWrap: { flexShrink: 0 },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
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
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },
  memberInfo: {
    flex: 1,
    minWidth: 0,
  },
  memberNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberName: {
    fontSize: 14,
    fontWeight: FW.medium,
    fontFamily: 'SF-Pro',
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
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },
  memberEmail: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'SF-Pro',
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

  accountBody: { gap: 12 },
  userInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
  },
  profileEntryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: FW.medium,
    fontFamily: 'SF-Pro',
  },
  userEmail: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: 'SF-Pro',
  },
  userAvatar: {
    width: 40,
    height: 40,
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
    fontWeight: FW.bold,
    fontFamily: 'SF-Pro',
  },
  accountBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBtnText: {
    fontSize: 16,
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },
  deleteAccountBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  deleteAccountBtnText: {
    fontSize: 13,
    fontWeight: FW.medium,
    fontFamily: 'SF-Pro',
  },
  deleteKidWarning: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 10,
    textAlign: 'center',
    fontFamily: 'SF-Pro',
  },

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
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
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
    fontWeight: FW.semibold,
    marginBottom: 8,
    fontFamily: 'SF-Pro',
  },
  deleteMessage: {
    fontSize: 16,
    marginBottom: 24,
    fontFamily: 'SF-Pro',
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
    fontWeight: FW.semibold,
    fontFamily: 'SF-Pro',
  },
});
