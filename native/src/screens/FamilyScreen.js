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

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  ChevronRightIcon,
  CameraIcon,
} from '../components/icons';
import { uploadKidPhoto } from '../services/storageService';

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
  onSignOut,
  onDeleteAccount,
}) {
  const { colors } = useTheme();

  // ── State ──
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
  const addChildSheetRef = useRef(null);
  const [newBabyName, setNewBabyName] = useState('');
  const [newBabyBirthDate, setNewBabyBirthDate] = useState('');
  const [newChildPhotoUris, setNewChildPhotoUris] = useState([]);
  const [savingChild, setSavingChild] = useState(false);

  // Theme
  const defaultThemeKey = THEME_TOKENS.DEFAULT_THEME_KEY || 'theme1';
  const colorThemes = THEME_TOKENS.COLOR_THEMES || {};
  const colorThemeOrder = THEME_TOKENS.COLOR_THEME_ORDER || Object.keys(colorThemes);
  const activeThemeKey = propThemeKey || defaultThemeKey;
  const isDark = propIsDark ?? false;

  const resolveTheme = (key) =>
    colorThemes[key] || colorThemes[defaultThemeKey] || Object.values(colorThemes)[0] || null;

  const activeTheme = resolveTheme(activeThemeKey);
  const kidAccent = activeTheme?.bottle?.primary || colors.primaryBrand;
  const segmentedTrackColor = isDark ? colors.appBg : colors.inputBg;

  // Load real data from Firestore via DataContext
  const {
    kidData: ctxKidData,
    familyMembers: ctxMembers,
    kidSettings: ctxSettings,
    refresh,
    firestoreService,
  } = useData();

  const resetAddChildForm = useCallback(() => {
    setNewBabyName('');
    setNewBabyBirthDate('');
    setNewChildPhotoUris([]);
  }, []);

  const openAddChildSheet = useCallback(() => {
    addChildSheetRef.current?.present?.();
  }, []);

  const closeAddChildSheet = useCallback(() => {
    addChildSheetRef.current?.dismiss?.();
  }, []);

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

  const handleUpdateBabyName = () => {
    if (tempBabyName === null) {
      setEditingName(false);
      return;
    }
    const raw = String(tempBabyName).trim();
    if (!raw) {
      setTempBabyName(kidData?.name || null);
      setEditingName(false);
      return;
    }
    setKidData((prev) => (prev ? { ...prev, name: raw } : prev));
    setTempBabyName(null);
    setEditingName(false);
  };

  const handleWeightChange = (nextValue) => {
    if (!editingWeight) setEditingWeight(true);
    setTempWeight(nextValue);
  };

  const handleUpdateWeight = () => {
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
      setTempWeight(settings.babyWeight?.toString() || null);
      setEditingWeight(false);
      return;
    }
    setSettings((prev) => ({ ...prev, babyWeight: weight }));
    setTempWeight(null);
    setEditingWeight(false);
  };

  const handleVolumeUnitChange = (nextUnit) => {
    const unit = nextUnit === 'ml' ? 'ml' : 'oz';
    setSettings((prev) => ({ ...prev, preferredVolumeUnit: unit }));
  };

  const handlePhotoClick = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets?.[0]?.uri) {
      setBabyPhotoUrl(result.assets[0].uri);
    }
  };

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

  // ── Mock user ──
  const currentUser = user || { uid: '1', displayName: 'Adam', email: 'adam@example.com', photoURL: null };

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
      style={[s.scroll, { backgroundColor: colors.appBg }]}
      contentContainerStyle={s.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── 1. Appearance Card ── */}
      {/* Web: TTCard variant="tracker", header "Appearance", space-y-4 */}
      <Card>
        <CardHeader
          title="Appearance"
          right={showDevSetupToggle ? (
            <View style={s.devToggleRow}>
              <Pressable
                onPress={() => onToggleForceSetupPreview?.(!forceSetupPreview)}
                style={[
                  s.devSetupToggle,
                  {
                    borderColor: forceSetupPreview ? colors.brandIcon : (colors.cardBorder || colors.borderSubtle),
                    backgroundColor: forceSetupPreview ? colors.inputBg : 'transparent',
                  },
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
                style={[
                  s.devSetupToggle,
                  {
                    borderColor: forceLoginPreview ? colors.brandIcon : (colors.cardBorder || colors.borderSubtle),
                    backgroundColor: forceLoginPreview ? colors.inputBg : 'transparent',
                  },
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
          ) : null}
        />
        <View style={s.sectionBody}>
          {/* Dark Mode toggle */}
          {/* Web: label text-xs mb-1, then SegmentedToggle */}
          <View>
            <Text style={[s.fieldLabel, { color: colors.textSecondary }]}>Dark Mode</Text>
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

          {/* Color Theme picker */}
          {/* Web: label text-xs mb-2 "Color Theme", grid grid-cols-2 gap-3 */}
          <View style={s.themeSection}>
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
                    {/* Web: text-sm font-semibold */}
                    <Text style={[s.themeName, { color: colors.textPrimary }]}>
                      {t.name || key}
                    </Text>
                    {/* Web: flex items-center gap-2 mt-2 */}
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
        </View>
      </Card>

      {/* ── 2. Kids Card ── */}
      {/* Web: TTCard, header "Kids" with "+ Add Child" right action */}
      {kids && kids.length > 0 && (
        <Card style={s.cardGap}>
          <CardHeader
            title="Kids"
            right={
              <Pressable onPress={openAddChildSheet}>
                <Text style={[s.addChildBtn, { color: activeTheme?.bottle?.primary || colors.primaryBrand }]}>
                  + Add Child
                </Text>
              </Pressable>
            }
          />
          {/* Web: space-y-2 */}
          <View style={s.kidsList}>
            {kids.map((k) => {
              const isCurrent = k.id === kidId;
              return (
                <Pressable
                  key={k.id}
                  onPress={() => {
                    if (!isCurrent && typeof onKidChange === 'function') onKidChange(k.id);
                  }}
                  style={[
                    s.kidRow,
                    {
                      borderColor: isCurrent ? colors.outlineStrong : (colors.cardBorder || colors.borderSubtle),
                      backgroundColor: isCurrent ? colors.subtleSurface : colors.cardBg,
                    },
                  ]}
                >
                  <Text
                    style={[
                      s.kidName,
                      { color: isCurrent ? colors.textPrimary : colors.textSecondary },
                    ]}
                    numberOfLines={1}
                  >
                    {k.name || 'Baby'}
                  </Text>
                  {isCurrent && (
                    <Text style={[s.kidActive, { color: kidAccent }]}>Active</Text>
                  )}
                </Pressable>
              );
            })}
          </View>
          {/* Web: mt-3 text-xs color textSecondary */}
          <Text style={[s.kidsHint, { color: colors.textSecondary }]}>
            Active kid controls what you see in Tracker and Analytics.
          </Text>
        </Card>
      )}

      {/* ── 3. Baby Info Card ── */}
      {/* Web: TTCard, header "Baby Info" mb-4, photo+name row mb-6 */}
      <Card style={s.cardGap}>
        <CardHeader title="Baby Info" />

        {/* Photo + Name row */}
        {/* Web: flex items-center gap-4 mb-6 */}
        <View style={s.photoNameRow}>
          {/* Photo */}
          {/* Web: w-24 h-24 rounded-full, camera badge w-8 h-8 */}
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
            {/* Camera badge */}
            {/* Web: absolute bottom-0 right-0 w-8 h-8 rounded-full, bg var(--tt-feed), border-2 cardBg */}
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

          {/* Name input */}
          {/* Web: flex-1 min-w-0, marginTop 10px */}
          <View style={s.nameInputWrap}>
            <TTInputRow
              label="Name"
              type="text"
              size="compact"
              icon={EditIcon}
              value={tempBabyName !== null ? tempBabyName : (kidData?.name || '')}
              placeholder="Baby"
              onChange={handleBabyNameChange}
              onFocus={() => setEditingName(true)}
              onBlur={handleUpdateBabyName}
            />
          </View>
        </View>

        {/* Baby info rows */}
        {/* Web: space-y-2 mb-3 */}
        <View style={s.infoRows}>
          {/* Birth date — display only (tappable opens picker on web, static on native for now) */}
          <TTInputRow
            label="Birth date"
            type="datetime"
            icon={EditIcon}
            rawValue={kidData?.birthDate ? new Date(kidData.birthDate).toISOString() : null}
            placeholder={
              kidData?.birthDate
                ? `${new Date(kidData.birthDate).toLocaleDateString()} \u2022 ${formatAgeFromDate(kidData.birthDate)}`
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
            value={tempWeight !== null ? tempWeight : (settings.babyWeight?.toString() || '')}
            placeholder="Not set"
            onChange={handleWeightChange}
            onFocus={() => setEditingWeight(true)}
            onBlur={handleUpdateWeight}
          />
        </View>

        {/* Feeding unit */}
        {/* Web: mt-4 pt-4 border-t, label text-base font-semibold mb-2 */}
        <View style={[s.dividerSection, { borderTopColor: colors.cardBorder || colors.borderSubtle }]}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Feeding unit</Text>
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
        </View>

        {/* Day sleep window */}
        {/* Web: mt-4 pt-4 border-t */}
        <View style={[s.dividerSection, { borderTopColor: colors.cardBorder || colors.borderSubtle }]}>
          <View>
            <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Day sleep window</Text>
            <Text style={[s.sleepDescription, { color: colors.textSecondary }]}>
              Sleep that starts between these times counts as{' '}
              <Text style={{ fontWeight: '500', color: colors.textPrimary }}>Day Sleep</Text>
              {' '}(naps). Everything else counts as{' '}
              <Text style={{ fontWeight: '500', color: colors.textPrimary }}>Night Sleep</Text>.
            </Text>
          </View>

          {/* Start / End inputs */}
          {/* Web: grid grid-cols-2 gap-3 mt-4 */}
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

          {/* Visual slider bar */}
          {/* Web: mt-4, h-12 rounded-2xl overflow-hidden border */}
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
              {/* Highlighted range */}
              <View
                style={[
                  s.sliderRange,
                  {
                    left: `${(Math.min(dayStart, dayEnd) / 1440) * 100}%`,
                    width: `${(Math.abs(dayEnd - dayStart) / 1440) * 100}%`,
                    backgroundColor: colors.highlightIndigoSoft,
                  },
                ]}
              />
              {/* Start handle */}
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
              {/* End handle */}
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
            {/* Time labels */}
            {/* Web: flex justify-between text-xs mt-2 px-3 */}
            <View style={s.sliderLabels}>
              {['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'].map((label) => (
                <Text key={label} style={[s.sliderLabel, { color: colors.textTertiary }]}>
                  {label}
                </Text>
              ))}
            </View>
          </View>
        </View>

        {/* Activity visibility */}
        {/* Web: mt-4 pt-4 border-t */}
        <View style={[s.dividerSection, { borderTopColor: colors.cardBorder || colors.borderSubtle }]}>
          <Text style={[s.sectionTitle, { color: colors.textPrimary }]}>Activity visibility</Text>
          {/* Web: w-full flex items-center justify-between rounded-2xl p-4, bg inputBg */}
          <Pressable
            onPress={handleOpenActivityVisibility}
            style={({ pressed }) => [
              s.activityVisBtn,
              { backgroundColor: colors.inputBg },
              pressed && { opacity: 0.7 },
            ]}
          >
            <View>
              <Text style={[s.activityVisTitle, { color: colors.textPrimary }]}>
                Show & hide activities
              </Text>
              <Text style={[s.activityVisHint, { color: colors.textSecondary }]}>
                Choose which Tracker cards appear
              </Text>
            </View>
            <ChevronRightIcon size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </Card>

      {/* ── 4. Family Members Card ── */}
      {/* Web: TTCard, header "Family Members" mb-4, space-y-3 mb-4 */}
      <Card style={s.cardGap}>
        <CardHeader title="Family Members" />
        <View style={s.membersList}>
          {members.map((member) => (
            <View
              key={member.uid}
              style={[s.memberRow, { backgroundColor: colors.inputBg }]}
            >
              {/* Avatar */}
              {/* Web: flex-shrink-0, w-12 h-12 rounded-full */}
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
              {/* Info */}
              {/* Web: flex-1 min-w-0, name text-sm font-medium, email text-xs */}
              <View style={s.memberInfo}>
                <Text
                  style={[s.memberName, { color: colors.textPrimary }]}
                  numberOfLines={1}
                >
                  {member.displayName || member.email || 'Member'}
                </Text>
                <Text
                  style={[s.memberEmail, { color: colors.textSecondary }]}
                  numberOfLines={1}
                >
                  {member.email}
                </Text>
              </View>
              {/* Remove button (not for current user) */}
              {member.uid !== currentUser.uid && (
                <Pressable onPress={() => handleRemoveMember(member.uid)}>
                  <Text style={s.removeBtn}>Remove</Text>
                </Pressable>
              )}
            </View>
          ))}
        </View>
      </Card>

      {/* ── 5. Account Card ── */}
      {/* Web: TTCard, header "Account" mb-4 */}
      <Card style={s.cardGap}>
        <CardHeader title="Account" />
        {/* Web: space-y-3 */}
        <View style={s.accountBody}>
          {/* User info row */}
          {/* Web: flex items-center justify-between p-3 rounded-lg, bg inputBg */}
          <View style={[s.userInfoRow, { backgroundColor: colors.inputBg }]}>
            <View>
              <Text style={[s.userName, { color: colors.textPrimary }]}>
                {currentUser.displayName || 'User'}
              </Text>
              <Text style={[s.userEmail, { color: colors.textSecondary }]}>
                {currentUser.email}
              </Text>
            </View>
            {currentUser.photoURL && (
              <Image
                source={{ uri: currentUser.photoURL }}
                style={s.userAvatar}
              />
            )}
          </View>

          {/* Sign Out button */}
          {/* Web: w-full py-3 rounded-xl font-semibold, bg error-soft, color error */}
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

          {/* Delete Account button */}
          {/* Subtle destructive action: text-only, reduced emphasis */}
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

      {/* Bottom spacing */}
      <View style={{ height: 40 }} />

    </ScrollView>
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

  // Card gap (web: space-y-4 = 16px between cards)
  cardGap: { marginTop: 16 },
  devToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  devSetupToggle: {
    minWidth: 24,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
  },
  devSetupToggleText: {
    fontSize: 10,
    fontWeight: '700',
    lineHeight: 12,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },

  // ── Appearance ──
  sectionBody: { gap: 16 },       // space-y-4
  fieldLabel: {
    fontSize: 12,                  // text-xs
    marginBottom: 4,               // mb-1
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  themeSection: { marginTop: 0 },
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
  addChildBtn: {
    fontSize: 14,                  // text-sm
    fontWeight: '500',             // font-medium
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  kidsList: { gap: 8 },           // space-y-2
  // Web: w-full px-4 py-3 rounded-xl border flex items-center justify-between text-sm
  kidRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,         // px-4
    paddingVertical: 12,           // py-3
    borderRadius: 12,              // rounded-xl
    borderWidth: 1,
  },
  kidName: {
    fontSize: 14,                  // text-sm
    fontWeight: '500',             // font-medium
    flex: 1,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: text-xs font-semibold
  kidActive: {
    fontSize: 12,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: mt-3 text-xs
  kidsHint: {
    marginTop: 12,                 // mt-3
    fontSize: 12,                  // text-xs
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },

  // ── Baby Info ──
  // Web: flex items-center gap-4 mb-6
  photoNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,                       // gap-4
    marginBottom: 24,              // mb-6
  },
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
  // Web: flex-1 min-w-0, marginTop: 10px
  nameInputWrap: {
    flex: 1,
    minWidth: 0,
    marginTop: 10,
  },
  // Web: space-y-2 mb-3
  infoRows: {
    gap: 8,                        // space-y-2
    marginBottom: 12,              // mb-3
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
    borderRadius: 12,              // rounded-xl
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
  // Web: text-sm font-medium truncate
  memberName: {
    fontSize: 14,
    fontWeight: '500',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: text-xs truncate
  memberEmail: {
    fontSize: 12,
    marginTop: 2,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  // Web: text-xs text-red-500 font-medium
  removeBtn: {
    fontSize: 12,
    fontWeight: '500',
    color: '#ef4444',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
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
