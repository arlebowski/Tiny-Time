/**
 * SetupScreen — multi-step onboarding after sign-in (no family yet).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { THEME_TOKENS } from '../../../shared/config/theme';
import { useAuth } from '../context/AuthContext';
import { DatePickerTray } from '../components/shared/Wheelpickers';
import { BabyAvatar } from '../utils/avatarUtils';
import { CalendarIcon, ChevronLeftIcon } from '../components/icons';
import { capture } from '../services/posthogService';
import { useFeatureFlag } from 'posthog-react-native';
import firestoreService from '../services/firestoreService';
const FRAUNCES = Platform.OS === 'android' ? 'Fraunces-Soft-Bold' : 'Fraunces';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseLocalDate(value) {
  if (value == null || value === '') return null;
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0, 0);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeIsoDate(iso) {
  const d = parseLocalDate(iso);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatBirthIso(iso) {
  const d = parseLocalDate(iso);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

// Survives component remount within the same JS session; cleared on wizard exit.
let _persistedStep = 1;
let _persistedBabyName = '';
let _persistedBirthDate = '';

export default function SetupScreen({ onDevExitPreview = null }) {
  const insets = useSafeAreaInsets();
  const { colors, radius, isDark } = useTheme();
  const {
    user,
    createFamily,
    acceptInvite,
    loading: authLoading,
    markSetupComplete,
    selectedKidSnapshot,
    familyId,
    kidId,
  } = useAuth();

  // undefined = flag not yet loaded; treat as off so 0% rollout is honored immediately
  const showPhotoStep = useFeatureFlag('onboarding-photo-step') === true;

  const [step, setStepRaw] = useState(() => _persistedStep);
  const [isInvitePath, setIsInvitePath] = useState(false);
  const [babyName, setBabyNameRaw] = useState(() => _persistedBabyName);

  const setStep = useCallback((s) => {
    const next = typeof s === 'function' ? s(_persistedStep) : s;
    _persistedStep = next;
    setStepRaw(next);
  }, []);

  const setBabyName = useCallback((n) => {
    _persistedBabyName = n;
    setBabyNameRaw(n);
  }, []);

  const [birthDateRaw, setBirthDateRaw] = useState(() => {
    if (!_persistedBirthDate) _persistedBirthDate = todayIso();
    return _persistedBirthDate;
  });
  const setBirthDate = useCallback((iso) => {
    const next = normalizeIsoDate(iso) || _persistedBirthDate || todayIso();
    _persistedBirthDate = next;
    setBirthDateRaw(next);
  }, []);
  const birthDate = birthDateRaw;
  const [photoUri, setPhotoUri] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(2);
  const revealTimersRef = useRef([]);

  // Field first-interaction flags — each fires once per session
  const babyNameInteractedRef = useRef(false);
  const birthDateInteractedRef = useRef(false);
  const photoInteractedRef = useRef(false);
  const inviteCodeInteractedRef = useRef(false);

  // If the flag resolves off while the user is on step 3 (e.g. raced ahead while loading), drop back.
  useEffect(() => {
    if (step === 3 && !showPhotoStep) {
      setStep(2);
    }
  }, [showPhotoStep, step, setStep]);

  // Track every step view for funnel analysis
  useEffect(() => {
    capture('setup_step_viewed', { step: String(step) });
  }, [step]);

  const progressStep = step === 'invite' ? 1 : typeof step === 'number' && step >= 1 && step <= 3 ? step : 1;
  const totalSteps = showPhotoStep ? 4 : 2;

  const displayName = useMemo(() => {
    const n = babyName.trim();
    if (n) return n;
    if (isInvitePath && selectedKidSnapshot?.name) return selectedKidSnapshot.name;
    return 'Baby';
  }, [babyName, isInvitePath, selectedKidSnapshot?.name]);

  const revealPhotoUri = useMemo(() => {
    if (photoUri) return photoUri;
    if (isInvitePath && selectedKidSnapshot?.photoURL) return selectedKidSnapshot.photoURL;
    return null;
  }, [photoUri, isInvitePath, selectedKidSnapshot?.photoURL]);

  const revealBirthLine = useMemo(() => {
    if (!isInvitePath) return formatBirthIso(birthDate);
    const ts = selectedKidSnapshot?.birthDate;
    if (typeof ts === 'number' && Number.isFinite(ts)) {
      const d = new Date(ts);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
      }
    }
    return null;
  }, [isInvitePath, birthDate, selectedKidSnapshot?.birthDate]);

  const exitSetup = useCallback(() => {
    _persistedStep = 1;
    _persistedBabyName = '';
    _persistedBirthDate = '';
    if (onDevExitPreview) {
      onDevExitPreview();
    } else {
      markSetupComplete();
    }
  }, [onDevExitPreview, markSetupComplete]);

  useEffect(() => {
    if (step !== 5) return undefined;
    setRevealCountdown(4);
    revealTimersRef.current.forEach(clearTimeout);
    const t1 = setTimeout(() => setRevealCountdown(3), 1000);
    const t2 = setTimeout(() => setRevealCountdown(2), 2000);
    const t3 = setTimeout(() => setRevealCountdown(1), 3000);
    const t4 = setTimeout(() => {
      capture('setup_step_completed', { step: '5', method: 'auto' });
      exitSetup();
    }, 4000);
    revealTimersRef.current = [t1, t2, t3, t4];
    return () => {
      revealTimersRef.current.forEach(clearTimeout);
      revealTimersRef.current = [];
    };
  }, [step, exitSetup]);

  const onboardingCompletedOnceRef = useRef(false);
  useEffect(() => {
    if (step !== 5) return;
    if (onboardingCompletedOnceRef.current) return;
    onboardingCompletedOnceRef.current = true;
    capture('onboarding_completed', {
      path: isInvitePath ? 'invite' : 'create',
      had_photo: !!photoUri,
      photo_step_shown: showPhotoStep,
    });
  }, [step, isInvitePath, photoUri, showPhotoStep]);

  const finishReveal = () => {
    revealTimersRef.current.forEach(clearTimeout);
    revealTimersRef.current = [];
    capture('setup_step_completed', { step: '5', method: 'tapped' });
    exitSetup();
  };

  const handleAddPhoto = async () => {
    if (!photoInteractedRef.current) {
      photoInteractedRef.current = true;
      capture('setup_field_interacted', { field: 'photo' });
    }
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Please allow photo access to add a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        ...(Platform.OS === 'ios' ? { presentationStyle: 'fullScreen' } : {}),
      });
      if (result.canceled) return;
      const uri = result?.assets?.[0]?.uri;
      if (!uri) return;
      setPhotoUri(uri);
      setError(null);
    } catch {
      setError("Couldn't load photo. Please try again.");
    }
  };

  const handleJoinInvite = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await acceptInvite(code);
      capture('setup_invite_submitted', { success: true });
      setIsInvitePath(true);
      setStep(5);
    } catch (e) {
      capture('setup_invite_submitted', { success: false });
      setError(e?.message || 'Invalid invite code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const backBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const renderProgressBar = () => (
    <View style={styles.progressRow}>
      {Array.from({ length: totalSteps }, (_, idx) => idx + 1).map((i) => (
        <View
          key={i}
          style={{
            height: 4,
            flex: i === progressStep ? 1.4 : 1,
            maxWidth: 32,
            borderRadius: 2,
            marginHorizontal: 3,
            backgroundColor:
              i <= progressStep
                ? colors.brandIcon
                : isDark
                  ? 'rgba(255,255,255,0.15)'
                  : 'rgba(0,0,0,0.08)',
          }}
        />
      ))}
    </View>
  );

  const renderTopBar = ({ showBack, showProgress, counter }) => (
    <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
      {showBack ? (
        <Pressable
          accessibilityRole="button"
          style={[styles.backBtn, { backgroundColor: backBg }]}
          onPress={() => {
            setError(null);
            if (step === 'invite') setStep(1);
            else if (step === 2) setStep(1);
            else if (step === 3) setStep(2);
          }}
        >
          <ChevronLeftIcon size={22} color={colors.textPrimary} />
        </Pressable>
      ) : (
        <View style={styles.backBtnPlaceholder} />
      )}
      {showProgress ? (
        <View style={styles.progressCenter}>{renderProgressBar()}</View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {showProgress ? (
        <Text style={[styles.counter, { color: colors.textSecondary }]}>{counter}</Text>
      ) : (
        <View style={styles.backBtnPlaceholder} />
      )}
    </View>
  );

  if (step === 5) {
    const confetti = [
      { left: '12%', top: '18%', color: colors.brandIcon, size: 10 },
      { left: '82%', top: '14%', color: '#277DC4', size: 14 },
      { left: '78%', top: '34%', color: '#4BAB51', size: 8 },
      { left: '18%', top: '70%', color: '#C99C4F', size: 12 },
      { left: '88%', top: '72%', color: '#8259CF', size: 9 },
      { left: '8%', top: '40%', color: '#4BAB51', size: 7 },
    ];
    return (
      <View style={[styles.flex, { backgroundColor: colors.appBg }]}>
        <View style={[styles.revealInner, { paddingTop: insets.top + 24 }]}>
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {confetti.map((d, idx) => (
              <View
                key={idx}
                style={{
                  position: 'absolute',
                  left: d.left,
                  top: d.top,
                  width: d.size,
                  height: d.size,
                  borderRadius: d.size / 2,
                  backgroundColor: d.color,
                  opacity: 0.85,
                }}
              />
            ))}
          </View>
          <View style={styles.revealContent}>
            <Text style={[styles.revealEyebrow, { color: colors.textSecondary }]}>YOU&apos;RE ALL SET</Text>
            <BabyAvatar
              name={displayName}
              size={150}
              photoUri={revealPhotoUri}
              style={styles.revealAvatarShadow}
            />
            <Text style={[styles.revealTitle, { fontFamily: FRAUNCES, color: colors.textPrimary }]}>
              Welcome,{'\n'}
              <Text style={{ fontStyle: 'italic', color: colors.brandIcon }}>{displayName}</Text>
            </Text>
            <Text style={[styles.revealSub, { color: colors.textSecondary }]}>
              {revealBirthLine ? `Born ${revealBirthLine}.\n` : ''}
              Let&apos;s log their first activity.
            </Text>
          </View>
        </View>
        <View style={[styles.revealFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <Pressable
            style={[styles.brandCta, { backgroundColor: colors.brandIcon, borderRadius: radius?.xl ?? 16 }]}
            onPress={finishReveal}
          >
            <Text style={styles.brandCtaText}>Start tracking →</Text>
          </Pressable>
          <Text style={[styles.countdownText, { color: colors.textSecondary }]}>
            Continuing in {revealCountdown}…
          </Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.appBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {step === 'invite' ? (
        <>
          {renderTopBar({ showBack: true, showProgress: false })}
          <ScrollView
            contentContainerStyle={[styles.stepScroll, { paddingBottom: Math.max(insets.bottom, 24) }]}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>JOIN A FAMILY</Text>
            <Text style={[styles.headline, { fontFamily: FRAUNCES, color: colors.textPrimary }]}>
              Enter your <Text style={{ fontStyle: 'italic', color: colors.brandIcon }}>invite code</Text>.
            </Text>
            <Text style={[styles.caption, { color: colors.textSecondary }]}>
              Ask whoever invited you — it looks like{' '}
              <Text style={{ fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace', fontWeight: '700', color: colors.textPrimary }}>
                A3B7K2
              </Text>
              .
            </Text>
            <TextInput
              style={[
                styles.inviteInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  borderRadius: radius?.['2xl'] ?? 18,
                },
              ]}
              placeholder="A3B7K2"
              placeholderTextColor={colors.textTertiary}
              value={inviteCode}
              onChangeText={(t) => {
                if (!inviteCodeInteractedRef.current && t.length > 0) {
                  inviteCodeInteractedRef.current = true;
                  capture('setup_invite_code_entered');
                }
                setInviteCode(String(t || '').toUpperCase());
              }}
              autoCapitalize="characters"
              maxLength={6}
              autoCorrect={false}
            />
            {error ? <Text style={styles.err}>{error}</Text> : null}
            <Pressable
              style={[
                styles.brandCta,
                {
                  backgroundColor: colors.brandIcon,
                  borderRadius: radius?.xl ?? 16,
                  marginTop: 16,
                  opacity: inviteCode.trim().length < 4 || isSubmitting ? 0.45 : 1,
                },
              ]}
              disabled={inviteCode.trim().length < 4 || isSubmitting || authLoading}
              onPress={handleJoinInvite}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.brandCtaText}>Join family</Text>
              )}
            </Pressable>
            <Pressable
              onPress={() => {
                setStep(1);
                setError(null);
              }}
              style={{ marginTop: 12 }}
            >
              <Text style={[styles.linkMuted, { color: colors.textSecondary }]}>
                Create a new family instead
              </Text>
            </Pressable>
          </ScrollView>
        </>
      ) : (
        <>
          {renderTopBar({
            showBack: step !== 1,
            showProgress: true,
            counter: `${progressStep}/${totalSteps}`,
          })}
          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.stepScroll}
            keyboardShouldPersistTaps="handled"
          >
            {step === 1 ? (
              <>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>WELCOME</Text>
                <Text style={[styles.headline, { fontFamily: FRAUNCES, color: colors.textPrimary }]}>
                  What should we call your{' '}
                  <Text style={{ fontStyle: 'italic', color: colors.brandIcon }}>little one</Text>?
                </Text>
                <Text style={[styles.caption, { color: colors.textSecondary }]}>
                  You can always change this later.
                </Text>
                <TextInput
                  style={[
                    styles.nameInput,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.textPrimary,
                      borderRadius: radius?.xl ?? 16,
                    },
                  ]}
                  placeholder="Baby's name"
                  placeholderTextColor={colors.textTertiary}
                  value={babyName}
                  onChangeText={(t) => {
                    if (!babyNameInteractedRef.current) {
                      babyNameInteractedRef.current = true;
                      capture('setup_field_interacted', { field: 'baby_name' });
                    }
                    setBabyName(t);
                  }}
                  autoFocus
                />
                <Pressable onPress={() => { capture('setup_invite_path_entered'); setStep('invite'); }}>
                  <Text style={[styles.joinLink, { color: colors.textSecondary }]}>
                    Joining a family? Enter your invite code →
                  </Text>
                </Pressable>
              </>
            ) : null}

            {step === 2 ? (
              <>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>
                  HI, {(babyName.trim() || 'little one').toUpperCase()}
                </Text>
                <Text style={[styles.headline, { fontFamily: FRAUNCES, color: colors.textPrimary }]}>
                  When were you <Text style={{ fontStyle: 'italic', color: colors.brandIcon }}>born</Text>?
                </Text>
                <Text style={[styles.caption, { color: colors.textSecondary }]}>
                  Tap to adjust — opens a date picker.
                </Text>
                <Pressable
                  style={[
                    styles.dateBtn,
                    {
                      backgroundColor: colors.inputBg,
                      borderRadius: radius?.['2xl'] ?? 18,
                    },
                  ]}
                  onPress={() => {
                    if (!birthDateInteractedRef.current) {
                      birthDateInteractedRef.current = true;
                      capture('setup_field_interacted', { field: 'birth_date' });
                    }
                    setBirthDatePickerOpen(true);
                  }}
                >
                  <View style={styles.dateBtnMain}>
                    <CalendarIcon size={22} color={colors.textSecondary} />
                    <Text
                      style={[styles.dateBtnLeft, { fontFamily: FRAUNCES, color: colors.textPrimary }]}
                      numberOfLines={1}
                    >
                      {formatBirthIso(birthDate)}
                    </Text>
                  </View>
                  {normalizeIsoDate(birthDate) === todayIso() ? (
                    <Text style={[styles.todayLbl, { color: colors.textSecondary }]}>Today</Text>
                  ) : (
                    <View style={{ width: 40 }} />
                  )}
                </Pressable>
              </>
            ) : null}

            {step === 3 && showPhotoStep ? (
              <>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>ALMOST THERE</Text>
                <Text style={[styles.headline, { fontFamily: FRAUNCES, color: colors.textPrimary }]}>
                  Add a <Text style={{ fontStyle: 'italic', color: colors.brandIcon }}>photo</Text>?
                </Text>
                <Text style={[styles.caption, { color: colors.textSecondary }]}>
                  Or skip — we&apos;ll make a sweet avatar for you.
                </Text>
                <View style={styles.photoWrap}>
                  <Pressable onPress={handleAddPhoto} style={styles.photoCircleOuter}>
                    {photoUri ? (
                      <Image source={{ uri: photoUri }} style={styles.photoCircleImg} />
                    ) : (
                      <View
                        style={[
                          styles.photoDashed,
                          {
                            borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                            backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
                          },
                        ]}
                      >
                        <Text style={[styles.plus, { color: colors.textSecondary }]}>+</Text>
                        <Text style={[styles.addPhotoLbl, { color: colors.textSecondary }]}>Add photo</Text>
                      </View>
                    )}
                  </Pressable>
                  {photoUri ? (
                    <Pressable style={styles.removePhoto} onPress={() => setPhotoUri(null)}>
                      <Text style={styles.removePhotoText}>×</Text>
                    </Pressable>
                  ) : null}
                </View>
                <View style={styles.orRow}>
                  <View style={[styles.orLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
                  <Text style={[styles.orText, { color: colors.textSecondary }]}>or</Text>
                  <View style={[styles.orLine, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]} />
                </View>
                <View style={styles.avatarRow}>
                  <BabyAvatar name={babyName} size={52} />
                  <Text style={[styles.avatarCaption, { color: colors.textSecondary }]}>
                    We&apos;ll use this for now
                  </Text>
                </View>
              </>
            ) : null}

            {error ? <Text style={styles.err}>{error}</Text> : null}
          </ScrollView>

          <View style={[styles.stepFooter, { paddingBottom: Math.max(insets.bottom, 36) }]}>
            {isSubmitting ? (
              <ActivityIndicator color={colors.brandIcon} style={{ paddingVertical: 18 }} />
            ) : (
              <Pressable
                style={[
                  styles.brandCta,
                  {
                    backgroundColor: colors.brandIcon,
                    borderRadius: radius?.xl ?? 16,
                    opacity: step === 1 && !babyName.trim() ? 0.45 : 1,
                  },
                ]}
                disabled={(step === 1 && !babyName.trim()) || authLoading || isSubmitting}
                onPress={async () => {
                  setError(null);
                  if (step === 1) {
                    capture('setup_step_completed', { step: '1' });
                    setStep(2);
                  } else if (step === 2) {
                    capture('setup_step_completed', {
                      step: '2',
                      date_changed: normalizeIsoDate(birthDate) !== todayIso(),
                    });
                    if (!showPhotoStep) {
                      setIsInvitePath(false);
                      if (onDevExitPreview) {
                        setStep(5);
                        return;
                      }
                      setIsSubmitting(true);
                      try {
                        await createFamily(babyName.trim(), {
                          birthDate,
                          photoUri: null,
                          preferredVolumeUnit: 'oz',
                        });
                        setStep(5);
                      } catch (e) {
                        setError(e?.message || 'Something went wrong');
                      } finally {
                        setIsSubmitting(false);
                      }
                    } else {
                      setStep(3);
                    }
                  } else if (step === 3) {
                    capture('setup_step_completed', { step: '3', had_photo: !!photoUri });
                    setIsInvitePath(false);
                    if (onDevExitPreview) {
                      setStep(5);
                      return;
                    }
                    setIsSubmitting(true);
                    try {
                      await createFamily(babyName.trim(), {
                        birthDate,
                        photoUri: photoUri || null,
                        preferredVolumeUnit: 'oz',
                      });
                      setStep(5);
                    } catch (e) {
                      setError(e?.message || 'Something went wrong');
                    } finally {
                      setIsSubmitting(false);
                    }
                  }
                }}
              >
                <Text style={styles.brandCtaText}>
                  {step === 3 ? (photoUri ? 'Continue' : 'Skip & continue') : 'Continue'}
                </Text>
              </Pressable>
            )}
            {__DEV__ && typeof onDevExitPreview === 'function' && step === 1 ? (
              <Pressable onPress={onDevExitPreview}>
                <Text style={[styles.linkMuted, { color: colors.textTertiary }]}>
                  Back to app (dev)
                </Text>
              </Pressable>
            ) : null}
          </View>
        </>
      )}
      <DatePickerTray
        isOpen={birthDatePickerOpen}
        onClose={() => setBirthDatePickerOpen(false)}
        value={birthDate || undefined}
        onChange={(iso) => {
          if (iso) setBirthDate(iso);
        }}
        title="Birth Date"
        minYear={new Date().getFullYear() - 6}
        maxYear={new Date().getFullYear()}
      />
    </KeyboardAvoidingView>
  );
}

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 8,
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlaceholder: { width: 40, height: 40 },
  progressCenter: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    maxWidth: 200,
  },
  counter: { width: 40, textAlign: 'right', fontSize: 12, fontWeight: '600' },
  stepScroll: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 16,
    flexGrow: 1,
  },
  stepFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  eyebrow: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  headline: {
    fontSize: 34,
    letterSpacing: -0.8,
    lineHeight: 37,
    marginBottom: 8,
  },
  caption: {
    fontSize: 15,
    lineHeight: 21,
    marginBottom: 16,
  },
  nameInput: {
    height: 54,
    paddingHorizontal: 16,
    fontSize: 17,
    marginTop: 8,
  },
  joinLink: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 16,
  },
  inviteInput: {
    height: 68,
    paddingHorizontal: 20,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: 12,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  dateBtn: {
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 12,
  },
  dateBtnMain: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dateBtnLeft: {
    flex: 1,
    minWidth: 0,
    fontSize: 22,
    letterSpacing: -0.3,
  },
  todayLbl: { fontSize: 13, fontWeight: '500' },
  photoWrap: {
    alignSelf: 'center',
    marginTop: 8,
    width: 130,
    height: 130,
  },
  photoCircleOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    overflow: 'hidden',
  },
  photoCircleImg: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  photoDashed: {
    width: 130,
    height: 130,
    borderRadius: 65,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  plus: { fontSize: 26 },
  addPhotoLbl: { fontSize: 13, fontWeight: '500' },
  removePhoto: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removePhotoText: { color: '#fff', fontSize: 18, fontWeight: '700', marginTop: -2 },
  orRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 16,
  },
  orLine: { flex: 1, height: 1 },
  orText: { fontSize: 13 },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  avatarCaption: { fontSize: 14 },
  brandCta: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCtaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FWB.bold,
  },
  linkMuted: {
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  err: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  revealInner: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 22,
  },
  revealContent: {
    alignItems: 'center',
    gap: 22,
    zIndex: 1,
  },
  revealEyebrow: {
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    fontWeight: '700',
    textAlign: 'center',
  },
  revealAvatarShadow: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.15,
    shadowRadius: 50,
    elevation: 20,
  },
  revealTitle: {
    fontSize: 48,
    letterSpacing: -1.4,
    lineHeight: 52,
    textAlign: 'center',
    fontWeight: '700',
  },
  revealSub: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 22,
  },
  revealFooter: {
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  countdownText: {
    fontSize: 13,
    textAlign: 'center',
    marginTop: 10,
  },
});
