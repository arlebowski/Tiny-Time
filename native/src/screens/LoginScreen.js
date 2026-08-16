/**
 * LoginScreen — Google, Apple, progressive email/password (no sign-up toggle).
 */
import React, { useState } from 'react';
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
  Alert,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useTheme } from '../context/ThemeContext';
import { THEME_TOKENS } from '../../../shared/config/theme';
import { useAuth } from '../context/AuthContext';
import { GoogleGLogo } from '../components/icons';
import { capture } from '../services/posthogService';

/** High-res white silhouette for the background decoration (1024px source, no blurring). */
const lockupDk = require('../../assets/brandlogo-white-1024.png');

const FRAUNCES = Platform.OS === 'android' ? 'Fraunces-Soft-Bold' : 'Fraunces';
/** RN ignores fontStyle:italic for variable roman fonts — use real italic face */
const FRAUNCES_ITALIC = 'Fraunces-Italic';

export default function LoginScreen({ onDevExitPreview = null }) {
  const { colors, radius, isDark } = useTheme();
  const {
    continueWithEmail,
    sendPasswordReset,
    signInWithGoogle,
    signInWithApple,
    loading,
  } = useAuth();
  const [emailExpanded, setEmailExpanded] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [resetMessage, setResetMessage] = useState(null);
  const [appleSignInBusy, setAppleSignInBusy] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(Platform.OS === 'ios');

  React.useEffect(() => {
    capture('login_screen_viewed');
  }, []);

  React.useEffect(() => {
    let mounted = true;
    if (Platform.OS !== 'ios') return () => {};
    AppleAuthentication.isAvailableAsync()
      .then((available) => {
        if (mounted) setAppleAvailable(Boolean(available));
      })
      .catch(() => {
        if (mounted) setAppleAvailable(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const mapEmailError = (e) => {
    const code = String(e?.code ?? '');
    const msg = String(e?.message ?? '');
    if (code.includes('wrong-password') || code.includes('invalid-credential')) {
      return 'Invalid email or password';
    }
    if (code.includes('email-already-in-use')) {
      return 'An account with this email already exists';
    }
    if (code.includes('weak-password')) {
      return 'Password should be at least 6 characters';
    }
    if (code.includes('invalid-email')) {
      return 'Please enter a valid email address';
    }
    return msg || 'Authentication failed';
  };

  const handleSubmitEmail = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      setResetMessage(null);
      return;
    }
    setError(null);
    setResetMessage(null);
    try {
      await continueWithEmail(email.trim(), password);
    } catch (e) {
      const code = String(e?.code ?? '');
      let error_type = 'other';
      if (code.includes('wrong-password') || code.includes('invalid-credential')) error_type = 'invalid_credentials';
      else if (code.includes('email-already-in-use')) error_type = 'email_in_use';
      else if (code.includes('weak-password')) error_type = 'weak_password';
      else if (code.includes('invalid-email')) error_type = 'invalid_email';
      capture('login_error', { method: 'email', error_type });
      setError(mapEmailError(e));
    }
  };

  const handleForgotPassword = async () => {
    capture('login_forgot_password_tapped');
    setError(null);
    setResetMessage(null);
    if (!email.trim()) {
      setError('Enter your email first.');
      return;
    }
    try {
      await sendPasswordReset(email.trim());
      setResetMessage('Check your inbox.');
    } catch (e) {
      setError(e?.message || 'Could not send reset email.');
    }
  };

  const handleGoogleSignIn = async () => {
    capture('login_method_tapped', { method: 'google' });
    setError(null);
    setResetMessage(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      const code = String(e?.code ?? '');
      const msg = String(e?.message ?? 'Google sign-in failed. Please try again.');
      const isCancelled =
        code.includes('SIGN_IN_CANCELLED') ||
        code === '12501' ||
        msg.toLowerCase().includes('cancel');

      if (isCancelled) return;

      capture('login_error', { method: 'google', error_type: 'google_error' });
      console.error('[Google Sign-In]', { code, message: msg, fullError: e });
      if (__DEV__ && Platform.OS === 'android') {
        Alert.alert('Google Sign-In Error', `${msg}\n\nCode: ${code || 'none'}`);
      }

      if (code.includes('IN_PROGRESS')) {
        setError('Google sign-in is already in progress.');
        return;
      }
      if (code.includes('PLAY_SERVICES_NOT_AVAILABLE')) {
        setError('Google Play Services is unavailable on this device.');
        return;
      }
      if (code === '10' || code.includes('DEVELOPER_ERROR')) {
        setError(
          'Configuration error (Code 10). Add your app SHA-1 to Firebase Console → Project Settings → Your Android app.'
        );
        return;
      }
      setError(msg);
    }
  };

  async function handleAppleSignIn() {
    if (appleSignInBusy || loading) return;
    capture('login_method_tapped', { method: 'apple' });
    setError(null);
    setResetMessage(null);
    setAppleSignInBusy(true);
    try {
      const isAvailable = await AppleAuthentication.isAvailableAsync();
      if (!isAvailable) {
        setAppleAvailable(false);
        setError('Sign in with Apple is not available on this device.');
        Alert.alert('Apple Sign-In Unavailable', 'Sign in with Apple is not available on this device.');
        return;
      }
      setAppleAvailable(true);

      const appleCredential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      await signInWithApple(
        appleCredential?.identityToken || null,
        appleCredential?.nonce || null
      );
    } catch (e) {
      const code = String(e?.code ?? '');
      const msg = String(e?.message ?? 'Apple sign-in failed. Please try again.');
      if (code === 'ERR_REQUEST_CANCELED') {
        setError('Apple sign-in was canceled.');
        return;
      }
      capture('login_error', { method: 'apple', error_type: 'apple_error' });
      console.error('[Apple Sign-In]', { code, message: msg, fullError: e });
      setError(msg);
      Alert.alert('Apple Sign-In Error', msg);
    } finally {
      setAppleSignInBusy(false);
    }
  }

  const primaryCtaBg = isDark ? '#FFFFFF' : '#1A1A1A';
  const primaryCtaFg = isDark ? '#000000' : '#FFFFFF';

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.root, { backgroundColor: '#FF4D79' }]}>
        <View style={styles.hero}>
          <View style={styles.heroHeadlineWrapper}>
            <Image
              source={lockupDk}
              style={styles.heroBgLogo}
              resizeMode="contain"
              pointerEvents="none"
            />
            <View style={styles.heroHeadlineColumn}>
            <Text style={[styles.heroHeadlineLine, styles.heroHeadlineStrong, { fontFamily: FRAUNCES }]}>
              Track your
            </Text>
            <Text style={[styles.heroHeadlineLine, styles.heroItalic, { fontFamily: FRAUNCES_ITALIC }]}>
              tiny
            </Text>
            <Text style={[styles.heroHeadlineLine, styles.heroHeadlineStrong, { fontFamily: FRAUNCES }]}>
              human&apos;s
            </Text>
            <Text style={[styles.heroHeadlineLine, styles.heroHeadlineStrong, { fontFamily: FRAUNCES }]}>
              day.
            </Text>
            </View>
          </View>
          <Text style={styles.heroSub}>
            Feeds, naps, diapers — all in one place.
          </Text>
        </View>

        <View
          style={[
            styles.shelf,
            {
              backgroundColor: colors.appBg,
              borderTopLeftRadius: 28,
              borderTopRightRadius: 28,
            },
          ]}
        >
          {Platform.OS === 'ios' ? (
            <AppleAuthentication.AppleAuthenticationButton
              buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
              buttonStyle={
                isDark
                  ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                  : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
              }
              cornerRadius={radius?.xl ?? 16}
              onPress={handleAppleSignIn}
              disabled={!appleAvailable || appleSignInBusy || loading}
              style={styles.appleBtn}
            />
          ) : null}

          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              {
                backgroundColor: pressed ? colors.inputBg : 'transparent',
                borderColor: colors.textTertiary,
                borderRadius: radius?.xl ?? 16,
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading && !emailExpanded ? (
              <ActivityIndicator size="small" />
            ) : (
              <>
                <GoogleGLogo size={20} />
                <Text style={[styles.googleButtonText, { color: colors.textPrimary }]}>
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          {!emailExpanded ? (
            <Pressable
              onPress={() => {
                capture('login_method_tapped', { method: 'email' });
                setEmailExpanded(true);
                setError(null);
                setResetMessage(null);
              }}
            >
              <Text style={[styles.emailToggle, { color: colors.textSecondary }]}>
                Use email instead
              </Text>
            </Pressable>
          ) : (
            <View style={styles.emailBlock}>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    color: colors.textPrimary,
                    borderRadius: radius?.lg ?? 14,
                  },
                ]}
                placeholder="Email"
                placeholderTextColor={colors.textTertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: colors.inputBg,
                    color: colors.textPrimary,
                    borderRadius: radius?.lg ?? 14,
                  },
                ]}
                placeholder="Password"
                placeholderTextColor={colors.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <Pressable style={styles.forgotRow} onPress={handleForgotPassword}>
                <Text style={[styles.forgotText, { color: colors.brandIcon }]}>Forgot password?</Text>
              </Pressable>
              {error ? <Text style={styles.msgError}>{error}</Text> : null}
              {resetMessage ? (
                <Text style={[styles.msgOk, { color: colors.textSecondary }]}>{resetMessage}</Text>
              ) : null}
              <Pressable
                style={[
                  styles.primaryBtn,
                  {
                    backgroundColor: primaryCtaBg,
                    borderRadius: radius?.xl ?? 16,
                    opacity: !email.trim() || !password.trim() ? 0.45 : 1,
                  },
                ]}
                onPress={handleSubmitEmail}
                disabled={loading || !email.trim() || !password.trim()}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={primaryCtaFg} />
                ) : (
                  <Text style={[styles.primaryBtnText, { color: primaryCtaFg }]}>Continue with email</Text>
                )}
              </Pressable>
            </View>
          )}

          {__DEV__ && typeof onDevExitPreview === 'function' ? (
            <Pressable onPress={onDevExitPreview}>
              <Text style={[styles.devLink, { color: colors.textSecondary }]}>Back to app (dev)</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  root: {
    flex: 1,
  },
  hero: {
    flex: 1,
    paddingTop: 64,
    paddingHorizontal: 28,
    paddingBottom: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  heroHeadlineWrapper: {
    position: 'relative',
  },
  heroBgLogo: {
    position: 'absolute',
    width: 293,
    height: 293,
    top: -20,
    right: -10,
    opacity: 0.2,
    transform: [{ rotate: '20deg' }],
  },
  /** Four-line stack: Track your / tiny / (gap) / human&apos;s / day. */
  heroHeadlineColumn: {
    alignSelf: 'stretch',
    alignItems: 'flex-start',
  },
  heroHeadlineLine: {
    fontSize: 64,
    color: '#fff',
    letterSpacing: -2.6,
    lineHeight: 74,
  },
  /** Extra air between “tiny” and “human&apos;s” (matches reference layout). */
  heroHeadlineAfterTinyGap: {
    height: 0,
  },
  heroHeadlineStrong: {
    fontWeight: '600',
  },
  /** Regular-weight italic face; weight set explicitly so it does not pick up semibold from siblings. */
  heroItalic: {
    fontWeight: '400',
    fontStyle: 'normal',
  },
  heroSub: {
    marginTop: 18,
    fontSize: 15,
    color: '#FFFFFF',
    lineHeight: 24.65,
    maxWidth: 300,
    fontWeight: '500',
    fontFamily: FWB.medium,
  },
  shelf: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 10,
  },
  appleBtn: {
    width: '100%',
    height: 54,
  },
  googleButton: {
    height: 54,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: FWB.semibold,
  },
  emailToggle: {
    fontSize: 14,
    paddingVertical: 8,
    textAlign: 'center',
    fontWeight: '500',
  },
  emailBlock: {
    gap: 8,
  },
  input: {
    height: 50,
    paddingHorizontal: 16,
    fontSize: 16,
    fontFamily: FWB.normal,
    letterSpacing: 0,
  },
  forgotRow: {
    alignSelf: 'flex-end',
    paddingVertical: 2,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '500',
  },
  msgError: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  msgOk: {
    fontSize: 14,
    textAlign: 'center',
  },
  primaryBtn: {
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: FWB.bold,
  },
  devLink: {
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 8,
  },
});
