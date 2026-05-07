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
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { THEME_TOKENS } from '../../../shared/config/theme';
import { useAuth } from '../context/AuthContext';
import { DatePickerTray } from '../components/shared/Wheelpickers';
import { BabyAvatar } from '../utils/avatarUtils';
import { pingCommunityInterest } from '../utils/formspree';
import { ChevronLeftIcon } from '../components/icons';

const FRAUNCES = Platform.OS === 'android' ? 'Fraunces-Soft-Bold' : 'Fraunces';

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function normalizeIsoDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatBirthIso(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

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
  } = useAuth();

  const [step, setStep] = useState(1);
  const [isInvitePath, setIsInvitePath] = useState(false);
  const [babyName, setBabyName] = useState('');
  const [birthDate, setBirthDate] = useState(todayIso);
  const [photoUri, setPhotoUri] = useState(null);
  const [inviteCode, setInviteCode] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false);
  const [revealCountdown, setRevealCountdown] = useState(2);
  const revealTimersRef = useRef([]);

  useEffect(() => {
    const email = user?.email || '';
    const isAppleRelay = email.endsWith('@privaterelay.appleid.com');
    setContactEmail(isAppleRelay ? '' : email);
  }, [user?.email]);

  const progressStep = step === 'invite' ? 1 : typeof step === 'number' && step >= 1 && step <= 3 ? step : 1;

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
      exitSetup();
    }, 4000);
    revealTimersRef.current = [t1, t2, t3, t4];
    return () => {
      revealTimersRef.current.forEach(clearTimeout);
      revealTimersRef.current = [];
    };
  }, [step, exitSetup]);

  const finishReveal = () => {
    revealTimersRef.current.forEach(clearTimeout);
    revealTimersRef.current = [];
    exitSetup();
  };

  const handleAddPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Please allow photo access to add a photo.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: false,
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

  const mergeCommunityFirestore = async (optIn) => {
    try {
      const firestore = require('@react-native-firebase/firestore').default;
      const patch = {
        communityOptIn: optIn,
        communityOptInAt: firestore.FieldValue.serverTimestamp(),
        contactEmail: contactEmail.trim() || null,
      };
      await firestore().collection('users').doc(user.uid).set(patch, { merge: true });
    } catch (e) {
      console.warn('[SetupScreen] community merge failed', e);
    }
  };

  const handleCommunityYes = async () => {
    if (!user?.uid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (!isInvitePath) {
        await createFamily(babyName.trim(), {
          birthDate,
          photoUri: photoUri || null,
          preferredVolumeUnit: 'oz',
        });
      }
      await mergeCommunityFirestore(true);
      pingCommunityInterest({
        babyName: displayName,
        contactEmail: contactEmail.trim(),
        uid: user.uid,
      }).catch(() => {});
      setStep(5);
    } catch (e) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommunitySkip = async () => {
    if (!user?.uid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      if (!isInvitePath) {
        await createFamily(babyName.trim(), {
          birthDate,
          photoUri: photoUri || null,
          preferredVolumeUnit: 'oz',
        });
      }
      setStep(5);
    } catch (e) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinInvite = async () => {
    const code = inviteCode.trim().toUpperCase();
    if (code.length < 4) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await acceptInvite(code);
      setIsInvitePath(true);
      setStep(4);
    } catch (e) {
      setError(e?.message || 'Invalid invite code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const backBg = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
  const renderProgressBar = () => (
    <View style={styles.progressRow}>
      {[1, 2, 3].map((i) => (
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

  if (step === 4) {
    const watermark = isDark
      ? require('../../assets/brandlogo-dark.png')
      : require('../../assets/brandlogo-lt.png');
    return (
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: colors.appBg }]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.flex, { paddingTop: insets.top }]}>
          <Image
            source={watermark}
            style={styles.watermark}
            resizeMode="contain"
          />
          <ScrollView
            contentContainerStyle={styles.communityScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.avatarCluster}>
              {['Priya', 'Marcus', 'Yuki', 'Sara'].map((name, i) => (
                <View
                  key={name}
                  style={[
                    styles.avatarClusterItem,
                    {
                      left: i * 38,
                      zIndex: 4 - i,
                      borderColor: colors.appBg,
                    },
                  ]}
                >
                  <BabyAvatar name={name} size={56} />
                </View>
              ))}
            </View>
            <Text style={[styles.communityHeadline, { fontFamily: FRAUNCES, color: colors.textPrimary }]}>
              Built with parents,{'\n'}not just{' '}
              <Text style={{ fontStyle: 'italic', color: colors.brandIcon }}>for</Text> them.
            </Text>
            <Text style={[styles.communityBody, { color: colors.textSecondary }]}>
              Join a small group of parents who share tips, give feedback, and help shape what we build next.
            </Text>
            <Text style={[styles.emailLabel, { color: colors.textSecondary }]}>We&apos;ll reach out here</Text>
            {user?.email?.endsWith('@privaterelay.appleid.com') ? (
              <Text style={[styles.appleHint, { color: colors.textSecondary }]}>
                Apple hid your email — enter yours so we can reach you.
              </Text>
            ) : null}
            <TextInput
              style={[
                styles.contactInput,
                {
                  backgroundColor: colors.inputBg,
                  color: colors.textPrimary,
                  borderRadius: radius?.lg ?? 14,
                },
              ]}
              placeholder="your@email.com"
              placeholderTextColor={colors.textTertiary}
              value={contactEmail}
              onChangeText={setContactEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </ScrollView>
          <View style={[styles.communityFooter, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Pressable
              style={[
                styles.brandCta,
                {
                  backgroundColor: colors.brandIcon,
                  borderRadius: radius?.xl ?? 16,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              disabled={isSubmitting || authLoading}
              onPress={handleCommunityYes}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.brandCtaText}>Yes, I&apos;m interested</Text>
              )}
            </Pressable>
            <Pressable onPress={handleCommunitySkip} disabled={isSubmitting || authLoading}>
              <Text style={[styles.maybeLater, { color: colors.textSecondary }]}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
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
              onChangeText={(t) => setInviteCode(String(t || '').toUpperCase())}
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
            counter: `${progressStep}/3`,
          })}
          <ScrollView
            contentContainerStyle={[styles.stepScroll, { paddingBottom: Math.max(insets.bottom, 24) }]}
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
                  onChangeText={setBabyName}
                  autoFocus
                />
                <Pressable onPress={() => setStep('invite')}>
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
                  onPress={() => setBirthDatePickerOpen(true)}
                >
                  <Text style={[styles.dateBtnLeft, { fontFamily: FRAUNCES, color: colors.textPrimary }]}>
                    {formatBirthIso(birthDate)}
                  </Text>
                  {normalizeIsoDate(birthDate) === todayIso() ? (
                    <Text style={[styles.todayLbl, { color: colors.textSecondary }]}>Today</Text>
                  ) : (
                    <View style={{ width: 40 }} />
                  )}
                </Pressable>
                <DatePickerTray
                  isOpen={birthDatePickerOpen}
                  onClose={() => setBirthDatePickerOpen(false)}
                  value={birthDate || undefined}
                  onChange={(iso) => setBirthDate(iso || birthDate)}
                  title="Birth Date"
                  minYear={new Date().getFullYear() - 6}
                  maxYear={new Date().getFullYear()}
                />
              </>
            ) : null}

            {step === 3 ? (
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

            <Pressable
              style={[
                styles.brandCta,
                {
                  backgroundColor: colors.brandIcon,
                  borderRadius: radius?.xl ?? 16,
                  marginTop: 24,
                  opacity: step === 1 && !babyName.trim() ? 0.45 : 1,
                },
              ]}
              disabled={(step === 1 && !babyName.trim()) || authLoading}
              onPress={() => {
                setError(null);
                if (step === 1) setStep(2);
                else if (step === 2) setStep(3);
                else if (step === 3) {
                  setIsInvitePath(false);
                  setStep(4);
                }
              }}
            >
              <Text style={styles.brandCtaText}>
                {step === 3 ? (photoUri ? 'Continue' : 'Skip & continue') : 'Continue'}
              </Text>
            </Pressable>

            {__DEV__ && typeof onDevExitPreview === 'function' && step === 1 ? (
              <Pressable onPress={onDevExitPreview}>
                <Text style={[styles.linkMuted, { color: colors.textTertiary, marginTop: 16 }]}>
                  Back to app (dev)
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </>
      )}
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
    flexGrow: 1,
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
  dateBtnLeft: {
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
  watermark: {
    position: 'absolute',
    bottom: 60,
    right: -10,
    width: 220,
    height: 220,
    opacity: 0.07,
  },
  communityScroll: {
    paddingHorizontal: 28,
    paddingTop: 24,
    alignItems: 'center',
  },
  avatarCluster: {
    height: 64,
    width: 56 + 3 * 38,
    position: 'relative',
    marginBottom: 32,
    alignSelf: 'center',
  },
  avatarClusterItem: {
    position: 'absolute',
    borderRadius: 28,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  communityHeadline: {
    fontSize: 32,
    letterSpacing: -0.8,
    lineHeight: 36,
    textAlign: 'center',
    marginBottom: 18,
  },
  communityBody: {
    fontSize: 16,
    lineHeight: 25,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 28,
  },
  emailLabel: {
    fontSize: 13,
    fontWeight: '500',
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 320,
    marginBottom: 6,
  },
  appleHint: {
    fontSize: 12,
    alignSelf: 'flex-start',
    width: '100%',
    maxWidth: 320,
    marginBottom: 8,
  },
  contactInput: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    width: '100%',
    maxWidth: 320,
  },
  communityFooter: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 10,
  },
  maybeLater: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 10,
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
