/**
 * Centered card — community interest prompt (shown D1+ after signup, once).
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Image,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { THEME_TOKENS } from '../../../shared/config/theme';
import { useAuth } from '../context/AuthContext';
import { BabyAvatar } from '../utils/avatarUtils';
import { pingCommunityInterest } from '../utils/formspree';
import { capture } from '../services/posthogService';
import { XIcon } from './icons';

const FRAUNCES = Platform.OS === 'android' ? 'Fraunces-Soft-Bold' : 'Fraunces';
const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;

export default function CommunityModal({ visible, onDismiss }) {
  const insets = useSafeAreaInsets();
  const { colors, radius, isDark } = useTheme();
  const { user, selectedKidSnapshot } = useAuth();
  const [contactEmail, setContactEmail] = useState('');
  const [contactEmailInteracted, setContactEmailInteracted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!visible || !user?.email) return;
    const email = user.email || '';
    const isAppleRelay = email.endsWith('@privaterelay.appleid.com');
    setContactEmail(isAppleRelay ? '' : email);
    setError(null);
    setContactEmailInteracted(false);
  }, [visible, user?.email]);

  useEffect(() => {
    if (visible) {
      capture('community_prompt_viewed');
    }
  }, [visible]);

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
      console.warn('[CommunityModal] community merge failed', e);
    }
  };

  const handleYes = async () => {
    if (!user?.uid) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await mergeCommunityFirestore(true);
      pingCommunityInterest({
        babyName: selectedKidSnapshot?.name || user?.displayName || '',
        contactEmail: contactEmail.trim(),
        uid: user.uid,
      }).catch(() => {});
      capture('community_prompt_completed', { opted_in: true });
      onDismiss?.();
    } catch (e) {
      setError(e?.message || 'Something went wrong');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    capture('community_prompt_completed', { opted_in: false });
    onDismiss?.();
  };

  const watermark = isDark
    ? require('../../assets/brandlogo-dark.png')
    : require('../../assets/brandlogo-lt.png');

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleSkip}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={handleSkip} accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderColor: colors.cardBorder || colors.borderSubtle,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <Image source={watermark} style={styles.watermarkInCard} resizeMode="contain" />
          <View style={styles.cardHeader}>
            <View style={{ width: 36 }} />
            <Pressable
              hitSlop={12}
              onPress={handleSkip}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
              disabled={isSubmitting}
            >
              <XIcon size={22} color={colors.textTertiary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={[styles.communityScroll, { paddingBottom: 8 }]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 420 }}
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
                      borderColor: colors.cardBg,
                    },
                  ]}
                >
                  <BabyAvatar name={name} size={56} />
                </View>
              ))}
            </View>
            <Text style={[styles.communityHeadline, { fontFamily: FRAUNCES, color: colors.textPrimary }]}>
              Built{' '}
              <Text style={{ fontStyle: 'italic', color: colors.brandIcon }}>with</Text>
              {' '}parents,{'\n'}not just for them.
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
              onChangeText={(t) => {
                if (!contactEmailInteracted) {
                  setContactEmailInteracted(true);
                  capture('community_prompt_field_interacted', { field: 'contact_email' });
                }
                setContactEmail(t);
              }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {error ? <Text style={styles.err}>{error}</Text> : null}
          </ScrollView>
          <View style={[styles.communityFooter, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <Pressable
              style={[
                styles.brandCta,
                {
                  backgroundColor: colors.brandIcon,
                  borderRadius: radius?.xl ?? 16,
                  opacity: isSubmitting ? 0.6 : 1,
                },
              ]}
              disabled={isSubmitting}
              onPress={handleYes}
            >
              {isSubmitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.brandCtaText}>Yes, I&apos;m interested</Text>
              )}
            </Pressable>
            <Pressable onPress={handleSkip} disabled={isSubmitting}>
              <Text style={[styles.maybeLater, { color: colors.textSecondary }]}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    paddingTop: 8,
  },
  watermarkInCard: {
    position: 'absolute',
    bottom: 40,
    right: -16,
    width: 200,
    height: 200,
    opacity: 0.07,
    pointerEvents: 'none',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 10,
    marginBottom: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  communityScroll: {
    paddingHorizontal: 22,
    paddingTop: 8,
    alignItems: 'center',
  },
  avatarCluster: {
    height: 64,
    width: 56 + 3 * 38,
    position: 'relative',
    marginBottom: 24,
    alignSelf: 'center',
  },
  avatarClusterItem: {
    position: 'absolute',
    borderRadius: 28,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  communityHeadline: {
    fontSize: 26,
    letterSpacing: -0.6,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 14,
  },
  communityBody: {
    fontSize: 15,
    lineHeight: 23,
    textAlign: 'center',
    maxWidth: 300,
    marginBottom: 20,
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
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  maybeLater: {
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    paddingVertical: 10,
  },
  brandCta: {
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandCtaText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: FWB.bold,
  },
  err: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
});
