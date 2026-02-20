/**
 * LoginScreen — Google + email/password auth with sign-up toggle.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

const lockupLt = require('../../assets/lockup-lt.png');
const lockupDk = require('../../assets/lockup-dk.png');

export default function LoginScreen({ onDevExitPreview = null }) {
  const { colors, radius, isDark } = useTheme();
  const { signIn, signUp, signInWithGoogle, loading } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password');
      return;
    }
    setError(null);
    try {
      if (isSignUp) {
        await signUp(email.trim(), password);
      } else {
        await signIn(email.trim(), password);
      }
    } catch (e) {
      const msg = e.message || 'Authentication failed';
      // Simplify Firebase error messages
      if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        setError('Invalid email or password');
      } else if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists');
      } else if (msg.includes('weak-password')) {
        setError('Password should be at least 6 characters');
      } else if (msg.includes('invalid-email')) {
        setError('Please enter a valid email address');
      } else {
        setError(msg);
      }
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e) {
      const code = String(e?.code || '');
      const msg = String(e?.message || 'Google sign-in failed. Please try again.');

      if (code.includes('SIGN_IN_CANCELLED')) return;
      if (code.includes('IN_PROGRESS')) {
        setError('Google sign-in is already in progress.');
        return;
      }
      if (code.includes('PLAY_SERVICES_NOT_AVAILABLE')) {
        setError('Google Play Services is unavailable on this device.');
        return;
      }
      setError(msg);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.appBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <Image
            source={isDark ? lockupDk : lockupLt}
            style={styles.lockup}
            resizeMode="contain"
          />
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your little one's day
          </Text>
        </View>

        {/* Form */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderRadius: radius?.['2xl'] ?? 16 }]}>
          <Pressable
            style={({ pressed }) => [
              styles.googleButton,
              {
                backgroundColor: pressed ? colors.inputBg : colors.appBg,
                borderColor: colors.textTertiary,
                borderRadius: radius?.lg ?? 12,
              },
            ]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.textPrimary} />
            ) : (
              <>
                <Text style={styles.googleGlyph}>G</Text>
                <Text style={[styles.googleButtonText, { color: colors.textPrimary }]}>Sign in with Google</Text>
              </>
            )}
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: colors.inputBg }]} />
            <Text style={[styles.dividerText, { color: colors.textSecondary }]}>Or continue with email</Text>
            <View style={[styles.dividerLine, { backgroundColor: colors.inputBg }]} />
          </View>

          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderRadius: radius?.lg ?? 12 }]}
            placeholder="Email"
            placeholderTextColor={colors.textTertiary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TextInput
            style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderRadius: radius?.lg ?? 12 }]}
            placeholder="Password"
            placeholderTextColor={colors.textTertiary}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          {error ? (
            <Text style={styles.error}>{error}</Text>
          ) : null}

          <Pressable
            style={[styles.button, { backgroundColor: colors.brandIcon, borderRadius: radius?.lg ?? 12 }]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </Pressable>

          <Pressable onPress={() => { setIsSignUp(!isSignUp); setError(null); }}>
            <Text style={[styles.toggleText, { color: colors.textSecondary }]}>
              {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
            </Text>
          </Pressable>
          {__DEV__ && typeof onDevExitPreview === 'function' ? (
            <Pressable onPress={onDevExitPreview}>
              <Text style={[styles.toggleText, { color: colors.textSecondary }]}>Back to app (dev)</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: 40,
  },
  lockup: {
    width: 234,
    height: 59,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 8,
  },
  card: {
    padding: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  googleButton: {
    height: 48,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleGlyph: {
    fontSize: 18,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    height: 48,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  error: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  toggleText: {
    fontSize: 14,
    textAlign: 'center',
    paddingTop: 4,
  },
});
