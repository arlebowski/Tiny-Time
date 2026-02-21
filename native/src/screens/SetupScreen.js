/**
 * SetupScreen — shown when a user is signed in but has no family/kid.
 * Allows creating a new baby or entering an invite code.
 */
import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../context/ThemeContext';
import { THEME_TOKENS } from '../../../shared/config/theme';
import { useAuth } from '../context/AuthContext';
import TTInputRow from '../components/shared/TTInputRow';
import TTPhotoRow from '../components/shared/TTPhotoRow';

const lockupLt = require('../../assets/lockup-lt.png');
const lockupDk = require('../../assets/lockup-dk.png');

export default function SetupScreen({ onDevExitPreview = null }) {
  const { colors, radius, isDark } = useTheme();
  const { createFamily, acceptInvite, loading } = useAuth();
  const [onboardingMode, setOnboardingMode] = useState('create');
  const [familyName, setFamilyName] = useState('');
  const [babyName, setBabyName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [babyWeight, setBabyWeight] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [photoExpanded, setPhotoExpanded] = useState(true);
  const [newPhotos, setNewPhotos] = useState([]);
  const [error, setError] = useState(null);
  const modeProgress = useRef(new Animated.Value(1)).current;
  const normalizedInviteCode = String(inviteCode || '').trim().toUpperCase();
  const canSubmit = onboardingMode === 'create'
    ? !!babyName.trim() && !!birthDate && !!newPhotos?.[0]
    : !!normalizedInviteCode;
  const createOpacity = modeProgress;
  const joinOpacity = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0],
  });
  const createMaxHeight = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 760],
  });
  const joinMaxHeight = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [140, 0],
  });
  const createTranslateY = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [8, 0],
  });
  const joinTranslateY = modeProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 8],
  });

  const switchMode = (nextMode) => {
    if (nextMode === onboardingMode) return;
    Animated.timing(modeProgress, {
      toValue: nextMode === 'create' ? 1 : 0,
      duration: 260,
      useNativeDriver: false,
    }).start();
    setOnboardingMode(nextMode);
    setError(null);
  };

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
    const parsedWeight = String(babyWeight || '').trim()
      ? Number.parseFloat(String(babyWeight).trim())
      : null;
    if (parsedWeight !== null && (!Number.isFinite(parsedWeight) || parsedWeight <= 0)) {
      setError('Please enter a valid weight');
      return;
    }
    setError(null);
    try {
      await createFamily(babyName.trim(), {
        familyName: familyName.trim(),
        birthDate,
        photoUri: newPhotos[0],
        preferredVolumeUnit: 'oz',
        babyWeight: parsedWeight,
      });
    } catch (e) {
      setError(e.message || 'Failed to create family');
    }
  };

  const handleJoin = async () => {
    if (!normalizedInviteCode) {
      setError('Please enter an invite code');
      return;
    }
    setError(null);
    try {
      await acceptInvite(normalizedInviteCode);
    } catch (e) {
      setError(e?.message || 'Failed to join family');
    }
  };

  const handleSubmit = async () => {
    if (onboardingMode === 'create') {
      await handleCreate();
      return;
    }
    await handleJoin();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.appBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.content}>
        <View style={styles.setupHeader}>
          <Image
            source={isDark ? lockupDk : lockupLt}
            style={styles.lockup}
            resizeMode="contain"
          />
          <Text style={[styles.setupSubtitle, { color: colors.textSecondary }]}>
            {onboardingMode === 'create'
              ? "Let's set up your baby's profile"
              : 'Enter your invite code to join your family'}
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.cardBg, borderRadius: radius?.['2xl'] ?? 16 }]}>
          <View style={[styles.modeToggle, { backgroundColor: colors.inputBg }]}>
            <Pressable
              style={[
                styles.modeToggleOption,
                onboardingMode === 'create' && [styles.modeToggleOptionActive, { backgroundColor: colors.cardBg }],
              ]}
              onPress={() => switchMode('create')}
            >
              <Text style={[styles.modeToggleText, { color: colors.textPrimary }]}>Create Family</Text>
            </Pressable>
            <Pressable
              style={[
                styles.modeToggleOption,
                onboardingMode === 'join' && [styles.modeToggleOptionActive, { backgroundColor: colors.cardBg }],
              ]}
              onPress={() => switchMode('join')}
            >
              <Text style={[styles.modeToggleText, { color: colors.textPrimary }]}>Join with Code</Text>
            </Pressable>
          </View>

          <Animated.View
            pointerEvents={onboardingMode === 'create' ? 'auto' : 'none'}
            style={{
              opacity: createOpacity,
              maxHeight: createMaxHeight,
              overflow: 'hidden',
              transform: [{ translateY: createTranslateY }],
            }}
          >
            <>
              <View style={styles.sectionSpacer}>
                <TTInputRow
                  label="Family Name"
                  value={familyName}
                  onChange={setFamilyName}
                  placeholder="Our Family"
                  showIcon={false}
                  showChevron={false}
                  enableTapAnimation
                  showLabel
                  type="text"
                />
              </View>

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
                  placeholder="Add..."
                  showIcon={false}
                  showChevron={false}
                  enableTapAnimation
                  showLabel
                  type="text"
                />
              </View>

              <View style={styles.sectionSpacer}>
                <TTInputRow
                  label="Current Weight (lbs)"
                  value={babyWeight}
                  onChange={setBabyWeight}
                  placeholder="13.0"
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
            </>
          </Animated.View>

          <Animated.View
            pointerEvents={onboardingMode === 'join' ? 'auto' : 'none'}
            style={{
              opacity: joinOpacity,
              maxHeight: joinMaxHeight,
              overflow: 'hidden',
              transform: [{ translateY: joinTranslateY }],
            }}
          >
            <View style={styles.sectionSpacer}>
              <TTInputRow
                label="Invite Code"
                value={inviteCode}
                onChange={(value) => setInviteCode(String(value || '').toUpperCase())}
                placeholder="ABC123"
                showIcon={false}
                showChevron={false}
                enableTapAnimation
                showLabel
                type="text"
              />
            </View>
          </Animated.View>

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
            onPress={handleSubmit}
            disabled={loading || !canSubmit}
          >
            {loading ? <ActivityIndicator color={colors.brandIcon} /> : (
              <Text style={styles.buttonText}>
                {onboardingMode === 'create' ? 'Get Started' : 'Join Family'}
              </Text>
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

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
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
  lockup: {
    width: 234,
    height: 59,
  },
  setupSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 4,
  },
  modeToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  modeToggleOption: {
    flex: 1,
    borderRadius: 8,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeToggleOptionActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeToggleText: {
    fontSize: 13,
    fontFamily: FWB.bold,
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
  buttonText: { color: '#fff', fontSize: 16, fontFamily: FWB.bold },
  toggleText: { fontSize: 14, textAlign: 'center', paddingTop: 4 },
});
