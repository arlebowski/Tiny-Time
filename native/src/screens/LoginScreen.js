/**
 * LoginScreen — email/password auth with sign-up toggle.
 * Google sign-in button included but disabled until Firebase console config is done.
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
  Alert,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/icons';

export default function LoginScreen() {
  const { colors, spacing, radius } = useTheme();
  const { signIn, signUp, loading } = useAuth();
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

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.appBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <BrandLogo size={48} color={colors.brandIcon} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Tiny Time</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your little one's day
          </Text>
        </View>

        {/* Form */}
        <View style={[styles.card, { backgroundColor: colors.cardBg, borderRadius: radius?.['2xl'] ?? 16 }]}>
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
  title: {
    fontSize: 32,
    fontWeight: '800',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 16,
    marginTop: 4,
  },
  card: {
    padding: 24,
    gap: 16,
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
