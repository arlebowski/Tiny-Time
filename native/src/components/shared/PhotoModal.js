/**
 * PhotoModal — full-screen photo viewer with Share and Close.
 * Used in Timeline and edit sheets (FeedSheet, SleepSheet, DiaperSheet).
 */
import React from 'react';
import {
  View,
  Text,
  Pressable,
  Modal,
  Image,
  StyleSheet,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { THEME_TOKENS } from '../../../../shared/config/theme';

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;

function getPhotoUri(photo) {
  if (typeof photo === 'string' && photo.trim()) return photo.trim();
  if (photo && typeof photo === 'object') {
    const uri = photo.uri || photo.url || photo.publicUrl || photo.publicURL ||
      photo.downloadURL || photo.downloadUrl || photo.src;
    if (typeof uri === 'string' && uri.trim()) return uri.trim();
  }
  return null;
}

export default function PhotoModal({ visible, photo, onClose }) {
  const insets = useSafeAreaInsets();
  const uri = getPhotoUri(photo);

  const handleShare = React.useCallback(async () => {
    if (!uri) return;
    try {
      await Share.share({
        message: uri,
        url: uri,
        title: 'Photo',
      });
    } catch (e) {
      // User cancelled or error
    }
  }, [uri]);

  if (!visible || !uri) return null;

  return (
    <Modal
      visible={!!visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar style="light" />
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.imageWrap}
          onPress={(e) => e.stopPropagation()}
        >
          <Image
            source={{ uri }}
            style={styles.image}
            resizeMode="contain"
          />
        </Pressable>
        <View style={[styles.actions, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <Pressable style={styles.btn} onPress={handleShare}>
            <Text style={styles.btnText}>Share</Text>
          </Pressable>
          <Pressable style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Close</Text>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageWrap: {
    flex: 1,
    alignSelf: 'stretch',
  },
  image: {
    flex: 1,
    width: '100%',
  },
  actions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    paddingTop: 16,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  btn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  btnText: {
    fontSize: 16,
    fontFamily: FWB.semibold,
    color: '#fff',
  },
});
