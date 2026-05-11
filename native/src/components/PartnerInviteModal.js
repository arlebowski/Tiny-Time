/**
 * Centered card — invite partner after first activity (PostHog flag partner-invite-prompt).
 */
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
  Platform,
  Share,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { BabyAvatar } from '../utils/avatarUtils';
import { XIcon } from './icons';
import { capture } from '../services/posthogService';
import firestoreService from '../services/firestoreService';
import { trackPartnerInvited } from '../services/appsflyerService';
import { THEME_TOKENS } from '../../../shared/config/theme';

const FRAUNCES = Platform.OS === 'android' ? 'Fraunces-Soft-Bold' : 'Fraunces';
const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
const APP_SHARE_BASE_URL = 'https://tinytracker.io/dl';

function partnerSeenKey(uid) {
  return uid ? `tt_partner_prompt_seen:${uid}` : null;
}

export default function PartnerInviteModal({ visible, onDismiss }) {
  const { colors, radius } = useTheme();
  const { user, familyId, kidId, selectedKidSnapshot } = useAuth();
  const { kidData } = useData();
  const [busy, setBusy] = useState(false);

  const uid = user?.uid || null;

  const displayName = useMemo(() => {
    const n = String(kidData?.name || selectedKidSnapshot?.name || '').trim();
    return n || 'Baby';
  }, [kidData?.name, selectedKidSnapshot?.name]);

  const markSeen = useCallback(async () => {
    const key = partnerSeenKey(uid);
    if (key) await AsyncStorage.setItem(key, '1').catch(() => {});
  }, [uid]);

  const handleClose = useCallback(async () => {
    await markSeen();
    onDismiss?.();
  }, [markSeen, onDismiss]);

  const userAvatarName =
    user?.displayName?.trim()
    || user?.email?.split('@')[0]?.trim()
    || '?';

  const handleSendInvite = async () => {
    const resolvedKidId = kidId;
    if (!familyId || !resolvedKidId) {
      Alert.alert('Something went wrong', 'Try again in a moment.');
      return;
    }
    setBusy(true);
    let code;
    try {
      firestoreService.initialize(familyId, resolvedKidId);
      code = await firestoreService.createInvite(resolvedKidId);
    } catch (e) {
      console.warn('[PartnerInviteModal] createInvite failed', e);
      Alert.alert('Failed to create invite.', 'Please try again.');
      setBusy(false);
      return;
    }
    const rawKidName = String(displayName || '').trim();
    const possessiveKidName = rawKidName
      ? (rawKidName.toLowerCase().endsWith('s') ? `${rawKidName}'` : `${rawKidName}'s`)
      : 'your';
    const headerLine = rawKidName
      ? `Join ${possessiveKidName} family on Tiny Tracker.`
      : 'Join your family on Tiny Tracker.';
    const message = `${headerLine}\nInstall app: ${APP_SHARE_BASE_URL}\nInvite code: ${code}`;
    try {
      const result = await Share.share({
        title: 'Join me on Tiny Tracker',
        message,
      });
      if (Platform.OS !== 'ios' || result?.action !== Share.dismissedAction) {
        trackPartnerInvited().catch(() => {});
        capture('partner_invited', { source: 'first-activity' });
        await markSeen();
        onDismiss?.();
      }
    } catch {
      /* share cancelled */
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Dismiss" />
        <View
          style={[
            styles.card,
            {
              backgroundColor: colors.cardBg,
              borderRadius: 28,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.cardBorder || colors.borderSubtle,
            },
          ]}
          onStartShouldSetResponder={() => true}
        >
          <View style={styles.cardHeader}>
            <View style={{ width: 36 }} />
            <Pressable
              hitSlop={12}
              onPress={handleClose}
              style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <XIcon size={22} color={colors.textTertiary} />
            </Pressable>
          </View>

          <View style={styles.partnerAvatarRow}>
            <View style={[styles.partnerAvatarSlot, { left: 0, zIndex: 2 }]}>
              <BabyAvatar
                name={userAvatarName}
                size={60}
                photoUri={user?.photoURL || null}
                style={[styles.partnerAvatarRing, { borderColor: colors.cardBg }]}
              />
            </View>
            <View
              style={[
                styles.partnerPlaceholderAvatar,
                {
                  left: 40,
                  zIndex: 1,
                  backgroundColor: colors.inputBg,
                  borderColor: colors.cardBg,
                },
              ]}
            >
              <Text style={[styles.partnerPlaceholderPlus, { color: colors.textSecondary }]}>+</Text>
            </View>
          </View>

          <Text style={[styles.headline, { fontFamily: FRAUNCES, color: colors.textPrimary }]}>
            Invite a{' '}
            <Text style={{ fontStyle: 'italic', color: colors.brandIcon }}>partner</Text>
            {' '}or{' '}
            <Text style={{ fontStyle: 'italic', color: colors.brandIcon }}>caregiver</Text>
          </Text>
          <Text style={[styles.caption, { color: colors.textSecondary }]}>
            They&apos;ll get a link and an invite code to join the family.
          </Text>

          <Pressable
            style={[
              styles.brandCta,
              {
                backgroundColor: colors.brandIcon,
                borderRadius: radius?.xl ?? 16,
                opacity: busy ? 0.65 : 1,
              },
            ]}
            onPress={handleSendInvite}
            disabled={busy}
          >
            <Text style={styles.brandCtaText}>Send invite</Text>
          </Pressable>
          <Pressable onPress={handleClose} disabled={busy}>
            <Text style={[styles.skip, { color: colors.textSecondary }]}>Maybe later</Text>
          </Pressable>
        </View>
      </View>
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
    paddingHorizontal: 22,
    paddingBottom: 22,
    paddingTop: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  iconBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerAvatarRow: {
    height: 64,
    width: 56 + 40,
    position: 'relative',
    alignSelf: 'center',
    marginBottom: 20,
    marginTop: 4,
  },
  partnerAvatarSlot: {
    position: 'absolute',
    top: 0,
  },
  partnerAvatarRing: {
    borderWidth: 3,
    borderRadius: 999,
    overflow: 'hidden',
  },
  partnerPlaceholderAvatar: {
    position: 'absolute',
    top: 0,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partnerPlaceholderPlus: {
    fontSize: 28,
    fontFamily: FWB.medium,
    lineHeight: 32,
  },
  headline: {
    fontSize: 24,
    letterSpacing: -0.5,
    lineHeight: 30,
    textAlign: 'center',
    marginBottom: 12,
  },
  caption: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 22,
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
  skip: {
    fontSize: 15,
    fontFamily: FWB.medium,
    textAlign: 'center',
    paddingVertical: 12,
  },
});
