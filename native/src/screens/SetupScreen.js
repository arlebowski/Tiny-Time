/**
 * SetupScreen — shown when a user is signed in but has no family/kid.
 * Allows creating a new baby or entering an invite code.
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
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { BrandLogo } from '../components/icons';

export default function SetupScreen() {
  const { colors, radius } = useTheme();
  const { createFamily, acceptInvite, loading, signOut } = useAuth();
  const [mode, setMode] = useState('create'); // 'create' | 'invite'
  const [babyName, setBabyName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState(null);

  const handleCreate = async () => {
    if (!babyName.trim()) {
      setError('Please enter a name');
      return;
    }
    setError(null);
    try {
      await createFamily(babyName.trim());
    } catch (e) {
      setError(e.message || 'Failed to create family');
    }
  };

  const handleJoin = async () => {
    if (!inviteCode.trim()) {
      setError('Please enter an invite code');
      return;
    }
    setError(null);
    try {
      await acceptInvite(inviteCode.trim().toUpperCase());
    } catch (e) {
      setError(e.message || 'Invalid invite code');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.appBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.logoArea}>
          <BrandLogo size={48} color={colors.brandIcon} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Welcome!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Let's get started
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBg, borderRadius: radius?.['2xl'] ?? 16 }]}>
          {/* Mode toggle */}
          <View style={styles.toggleRow}>
            <Pressable
              onPress={() => { setMode('create'); setError(null); }}
              style={[styles.tab, mode === 'create' && { backgroundColor: colors.inputBg }]}
            >
              <Text style={[styles.tabText, { color: mode === 'create' ? colors.textPrimary : colors.textTertiary }]}>
                New Baby
              </Text>
            </Pressable>
            <Pressable
              onPress={() => { setMode('invite'); setError(null); }}
              style={[styles.tab, mode === 'invite' && { backgroundColor: colors.inputBg }]}
            >
              <Text style={[styles.tabText, { color: mode === 'invite' ? colors.textPrimary : colors.textTertiary }]}>
                Join Family
              </Text>
            </Pressable>
          </View>

          {mode === 'create' ? (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderRadius: radius?.lg ?? 12 }]}
                placeholder="Baby's name"
                placeholderTextColor={colors.textTertiary}
                value={babyName}
                onChangeText={setBabyName}
                autoCapitalize="words"
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                style={[styles.button, { backgroundColor: colors.brandIcon, borderRadius: radius?.lg ?? 12 }]}
                onPress={handleCreate}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.buttonText}>Get Started</Text>
                )}
              </Pressable>
            </>
          ) : (
            <>
              <TextInput
                style={[styles.input, { backgroundColor: colors.inputBg, color: colors.textPrimary, borderRadius: radius?.lg ?? 12 }]}
                placeholder="Invite code"
                placeholderTextColor={colors.textTertiary}
                value={inviteCode}
                onChangeText={setInviteCode}
                autoCapitalize="characters"
              />
              {error && <Text style={styles.error}>{error}</Text>}
              <Pressable
                style={[styles.button, { backgroundColor: colors.brandIcon, borderRadius: radius?.lg ?? 12 }]}
                onPress={handleJoin}
                disabled={loading}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.buttonText}>Join Family</Text>
                )}
              </Pressable>
            </>
          )}

          <Pressable onPress={signOut}>
            <Text style={[styles.toggleText, { color: colors.textTertiary }]}>Sign out</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  content: { paddingHorizontal: 24 },
  logoArea: { alignItems: 'center', marginBottom: 40 },
  title: { fontSize: 32, fontWeight: '800', marginTop: 12 },
  subtitle: { fontSize: 16, marginTop: 4 },
  card: { padding: 24, gap: 16 },
  toggleRow: { flexDirection: 'row', gap: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  tabText: { fontSize: 15, fontWeight: '600' },
  input: { height: 48, paddingHorizontal: 16, fontSize: 16 },
  error: { color: '#EF4444', fontSize: 14, textAlign: 'center' },
  button: { height: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggleText: { fontSize: 14, textAlign: 'center', paddingTop: 4 },
});
