/**
 * SetupScreen — shown when a user is signed in but has no family/kid.
 * Allows creating a new baby or entering an invite code.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import TTInputRow from '../components/shared/TTInputRow';
import TTPhotoRow from '../components/shared/TTPhotoRow';
import { BrandLogo } from '../components/icons';

export default function SetupScreen({ onDevExitPreview = null }) {
  const { colors, radius } = useTheme();
  const { createFamily, loading } = useAuth();
  const [babyName, setBabyName] = useState('');
  const [birthDate, setBirthDate] = useState(() => {
    const now = new Date();
    const offsetMs = now.getTimezoneOffset() * 60000;
    return new Date(now.getTime() - offsetMs).toISOString().split('T')[0];
  });
  const [photoExpanded, setPhotoExpanded] = useState(true);
  const [newPhotos, setNewPhotos] = useState([]);
  const [error, setError] = useState(null);
  const canSubmit = !!babyName.trim() && !!birthDate && !!newPhotos?.[0];

  const handleAddPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Please allow photo access to continue.');
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
      setNewPhotos([uri]);
      setPhotoExpanded(true);
      setError(null);
    } catch {
      setError("Couldn't load photo. Please try again.");
    }
  };

  const handleCreate = async () => {
    if (!babyName.trim()) {
      setError("Please enter your baby's name");
      return;
    }
    if (!birthDate) {
      setError('Please enter birth date');
      return;
    }
    if (!newPhotos?.[0]) {
      setError('Please add a photo');
      return;
    }
    setError(null);
    try {
      await createFamily(babyName.trim(), {
        birthDate,
        photoUri: newPhotos[0],
        preferredVolumeUnit: 'oz',
      });
    } catch (e) {
      setError(e.message || 'Failed to create family');
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.appBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.setupHeader}>
          <View style={styles.logoPill}>
            <BrandLogo size={40} color={colors.brandIcon} />
          </View>
          <Text style={[styles.setupTitle, { color: colors.textPrimary }]}>Welcome to Tiny Tracker!</Text>
          <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>Let's set up your baby's profile</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBg, borderRadius: radius?.['2xl'] ?? 16 }]}>
          <View style={styles.sectionSpacer}>
            <TTInputRow
              label="Baby's Name"
              value={babyName}
              onChange={setBabyName}
              placeholder="Emma"
              showIcon={false}
              showChevron={false}
              enableTapAnimation
              showLabel
              type="text"
            />
          </View>

          <View style={styles.sectionSpacer}>
            <TTInputRow
              label="Birth Date"
              value={birthDate}
              onChange={setBirthDate}
              placeholder="YYYY-MM-DD"
              showIcon={false}
              showChevron={false}
              enableTapAnimation
              showLabel
              type="text"
            />
          </View>

          <TTPhotoRow
            expanded={photoExpanded}
            onExpand={() => setPhotoExpanded(true)}
            title="Add a photo"
            existingPhotos={[]}
            newPhotos={newPhotos}
            onAddPhoto={handleAddPhoto}
            onRemovePhoto={(index, isExisting) => {
              if (isExisting) return;
              setNewPhotos((prev) => prev.filter((_, i) => i !== index));
            }}
            onPreviewPhoto={() => {}}
            containerStyle={styles.photoSection}
          />
          <View style={styles.photoToCtaSpacer} />

          {error && <Text style={styles.error}>{error}</Text>}
          <Pressable
            style={[
              styles.button,
              {
                backgroundColor: '#1A1A1A',
                borderRadius: radius?.lg ?? 12,
                opacity: loading || !canSubmit ? 0.5 : 1,
              },
            ]}
            onPress={handleCreate}
            disabled={loading || !canSubmit}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.buttonText}>Get Started</Text>
            )}
          </Pressable>

          {__DEV__ && typeof onDevExitPreview === 'function' ? (
            <Pressable onPress={onDevExitPreview}>
              <Text style={[styles.toggleText, { color: colors.textTertiary }]}>Back to app (dev)</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  setupHeader: { alignItems: 'center', marginBottom: 24, width: '100%', maxWidth: 448 },
  card: {
    width: '100%',
    maxWidth: 448,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  logoPill: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  setupTitle: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  setupSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  error: { color: '#EF4444', fontSize: 14, textAlign: 'center', marginBottom: 8 },
  photoSection: {
    paddingTop: 0,
    paddingBottom: 0,
  },
  sectionSpacer: {
    marginBottom: 4,
  },
  photoToCtaSpacer: {
    height: 40,
  },
  button: { height: 48, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  toggleText: { fontSize: 14, textAlign: 'center', paddingTop: 4 },
});
