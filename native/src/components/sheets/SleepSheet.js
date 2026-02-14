/**
 * SleepSheet — 1:1 from web/components/halfsheets/SleepSheet.js
 * Start/End time, duration display, Start/End sleep timer, notes, photos
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime, formatElapsedHmsTT } from '../../utils/dateTime';
import HalfSheet from './HalfSheet';
import InputRow from './InputRow';

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (end < start) return null;
  return end - start;
}

export default function SleepSheet({
  sheetRef,
  onClose,
  kidId = null,
  entry = null,
  onDelete = null,
  onSave = null,
  onAdd = null,
  storage = null,
}) {
  const { colors, sleep } = useTheme();
  const isInputVariant = !entry;

  const [startTime, setStartTime] = useState(() => new Date().toISOString());
  const [endTime, setEndTime] = useState(null);
  const [sleepState, setSleepState] = useState('idle'); // 'idle' | 'running'
  const [sleepElapsedMs, setSleepElapsedMs] = useState(0);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [existingPhotoURLs, setExistingPhotoURLs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [activeSleepSessionId, setActiveSleepSessionId] = useState(null);

  const sleepIntervalRef = useRef(null);

  const durationMs = (() => {
    if (isInputVariant && sleepState === 'running' && !endTime) return sleepElapsedMs;
    if (!startTime || !endTime) return 0;
    const d = calculateDuration(startTime, endTime);
    return d || 0;
  })();
  const tParts = formatElapsedHmsTT(durationMs);
  const isValid = !startTime || !endTime || calculateDuration(startTime, endTime) !== null;

  useEffect(() => {
    if (entry) {
      setStartTime(entry.startTime ? new Date(entry.startTime).toISOString() : new Date().toISOString());
      setEndTime(entry.endTime ? new Date(entry.endTime).toISOString() : null);
      setNotes(entry.notes || '');
      setExistingPhotoURLs(entry.photoURLs || []);
      setSleepState('idle');
    } else {
      setStartTime(new Date().toISOString());
      setEndTime(null);
      setSleepState('idle');
      setNotes('');
      setExistingPhotoURLs([]);
      setPhotos([]);
      setSleepElapsedMs(0);
    }
    setNotesExpanded(false);
    setPhotosExpanded(false);
  }, [entry]);

  useEffect(() => {
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    if (!isInputVariant || sleepState !== 'running' || !startTime) return;
    const startMs = new Date(startTime).getTime();
    const tick = () => setSleepElapsedMs(Math.max(0, Date.now() - startMs));
    tick();
    sleepIntervalRef.current = setInterval(tick, 1000);
    return () => {
      if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    };
  }, [isInputVariant, sleepState, startTime]);

  const handleClose = useCallback(() => {
    if (onClose) onClose();
  }, [onClose]);

  const handleStartTimeChange = (event, selectedDate) => {
    setShowStartPicker(Platform.OS === 'ios');
    if (selectedDate) setStartTime(selectedDate.toISOString());
  };

  const handleEndTimeChange = (event, selectedDate) => {
    setShowEndPicker(Platform.OS === 'ios');
    if (selectedDate) setEndTime(selectedDate.toISOString());
  };

  const handleStartSleep = async () => {
    if (!isInputVariant || saving) return;
    try {
      const startMs = new Date(startTime || new Date()).getTime();
      let sessionId = activeSleepSessionId;
      if (!sessionId && storage && storage.startSleep) {
        const session = await storage.startSleep(startMs);
        sessionId = session?.id;
        setActiveSleepSessionId(sessionId);
      }
      setSleepState('running');
      setEndTime(null);
    } catch (e) {
      console.error('[SleepSheet] Start sleep failed:', e);
      Alert.alert('Error', 'Failed to start sleep.');
    }
  };

  const handleEndSleep = async () => {
    if (!isInputVariant || sleepState !== 'running' || saving) return;
    setSaving(true);
    try {
      const nowIso = new Date().toISOString();
      const endMs = Date.now();
      setEndTime(nowIso);

      const sessionId = activeSleepSessionId;
      if (sessionId && storage && storage.endSleep) {
        await storage.endSleep(sessionId, endMs);
        if (notes || photos.length > 0) {
          let uploadedURLs = [];
          if (storage.uploadSleepPhoto && photos.length > 0) {
            for (const p of photos) {
              try {
                const url = await storage.uploadSleepPhoto(p);
                uploadedURLs.push(url);
              } catch (e) {}
            }
          }
          const allPhotos = [...existingPhotoURLs, ...uploadedURLs];
          if (storage.updateSleepSession) {
            await storage.updateSleepSession(sessionId, {
              notes: notes || null,
              photoURLs: allPhotos,
            });
          }
        }
        setActiveSleepSessionId(null);
      }

      setSleepState('idle');
      setStartTime(new Date().toISOString());
      setEndTime(null);
      setNotes('');
      setPhotos([]);
      setSleepElapsedMs(0);

      handleClose();
      if (onAdd) await onAdd({ type: 'sleep', startTime: new Date(startTime).getTime(), endTime: endMs });
    } catch (e) {
      console.error('[SleepSheet] End sleep failed:', e);
      Alert.alert('Error', 'Failed to end sleep.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSleep = async () => {
    if (!isInputVariant || saving || !isValid) return;
    setSaving(true);
    try {
      const startMs = new Date(startTime).getTime();
      const endMs = new Date(endTime).getTime();

      let uploadedURLs = [];
      if (storage?.uploadSleepPhoto && photos.length > 0) {
        for (const p of photos) {
          try {
            const url = await storage.uploadSleepPhoto(p);
            uploadedURLs.push(url);
          } catch (e) {}
        }
      }
      const allPhotos = [...existingPhotoURLs, ...uploadedURLs];

      if (activeSleepSessionId && storage?.endSleep) {
        await storage.endSleep(activeSleepSessionId, endMs);
        if (notes || allPhotos.length > 0) {
          await storage.updateSleepSession?.(activeSleepSessionId, {
            notes: notes || null,
            photoURLs: allPhotos,
          });
        }
        setActiveSleepSessionId(null);
      } else if (storage?.startSleep) {
        const session = await storage.startSleep(startMs);
        await storage.endSleep(session.id, endMs);
        if (notes || allPhotos.length > 0) {
          await storage.updateSleepSession?.(session.id, {
            notes: notes || null,
            photoURLs: allPhotos,
          });
        }
      }

      handleClose();
      if (onAdd) await onAdd({ type: 'sleep', startTime: startMs, endTime: endMs });
    } catch (e) {
      console.error('[SleepSheet] Save failed:', e);
      Alert.alert('Error', 'Failed to save sleep session.');
    } finally {
      setSaving(false);
    }
  };

  const handleAddPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to add photos.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]?.base64) {
      setPhotos((prev) => [...prev, `data:image/jpeg;base64,${result.assets[0].base64}`]);
    }
  };

  const handleRemovePhoto = (index, isExisting = false) => {
    if (isExisting) setExistingPhotoURLs((prev) => prev.filter((_, i) => i !== index));
    else setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  let ctaLabel = 'Save';
  let ctaOnPress = handleSaveSleep;
  if (saving) {
    ctaLabel = 'Saving...';
    ctaOnPress = () => {};
  } else if (isInputVariant && sleepState === 'running') {
    ctaLabel = 'End sleep';
    ctaOnPress = handleEndSleep;
  } else if (isInputVariant && !startTime && !endTime) {
    ctaLabel = 'Start sleep';
    ctaOnPress = handleStartSleep;
  }

  const footer = (
    <View style={styles.footerRow}>
      {isInputVariant && sleepState === 'idle' && !startTime && !endTime ? (
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: sleep.primary },
            pressed && { opacity: 0.9 },
          ]}
          onPress={handleStartSleep}
        >
          <Text style={styles.ctaText}>Start sleep</Text>
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.cta,
            { backgroundColor: saving ? sleep.dark : sleep.primary },
            pressed && !saving && { opacity: 0.9 },
          ]}
          onPress={ctaOnPress}
          disabled={saving || (ctaLabel === 'Save' && !isValid)}
        >
          <Text style={styles.ctaText}>{ctaLabel}</Text>
        </Pressable>
      )}
    </View>
  );

  return (
    <>
      <HalfSheet
        sheetRef={sheetRef}
        snapPoints={['75%']}
        title="Sleep"
        accentColor={sleep.primary}
        onClose={handleClose}
        footer={footer}
      >
        <View style={styles.durationBlock}>
          <Text style={[styles.durationText, { color: colors.textPrimary }]}>
            {tParts.showH && <><Text>{tParts.hStr}</Text><Text style={[styles.unit, { color: colors.textSecondary }]}>h </Text></>}
            {tParts.showM && <><Text>{tParts.mStr}</Text><Text style={[styles.unit, { color: colors.textSecondary }]}>m </Text></>}
            <Text>{tParts.sStr}</Text>
            <Text style={[styles.unit, { color: colors.textSecondary }]}>s</Text>
          </Text>
        </View>

        <View style={styles.inputRow}>
          <View style={styles.inputCol}>
            <InputRow
              label="Start time"
              value={startTime}
              type="datetime"
              formatDateTime={formatDateTime}
              onOpenPicker={() => setShowStartPicker(true)}
              placeholder="Add..."
            />
          </View>
          <View style={styles.inputCol}>
            <InputRow
              label="End time"
              value={endTime}
              type="datetime"
              formatDateTime={formatDateTime}
              onOpenPicker={() => setShowEndPicker(true)}
              placeholder="Add..."
            />
          </View>
        </View>

        {!notesExpanded && !photosExpanded ? (
          <View style={styles.addRow}>
            <Pressable onPress={() => setNotesExpanded(true)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add notes</Text>
            </Pressable>
            <Pressable onPress={() => setPhotosExpanded(true)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add photos</Text>
            </Pressable>
          </View>
        ) : null}

        {notesExpanded && (
          <InputRow label="Notes" value={notes} onChange={setNotes} type="text" placeholder="Add a note..." />
        )}

        {photosExpanded && (
          <View style={styles.photoRow}>
            <Text style={[styles.photoLabel, { color: colors.textSecondary }]}>Photos</Text>
            <View style={styles.photoList}>
              {existingPhotoURLs.map((url, i) => (
                <View key={`e-${i}`} style={[styles.photoTile, { backgroundColor: colors.inputBg }]}>
                  <Text style={{ color: colors.textTertiary }}>Photo</Text>
                  <Pressable onPress={() => handleRemovePhoto(i, true)}>
                    <Text style={{ color: colors.error }}>Remove</Text>
                  </Pressable>
                </View>
              ))}
              {photos.map((_, i) => (
                <View key={`n-${i}`} style={[styles.photoTile, { backgroundColor: colors.inputBg }]}>
                  <Text style={{ color: colors.textTertiary }}>New</Text>
                  <Pressable onPress={() => handleRemovePhoto(i, false)}>
                    <Text style={{ color: colors.error }}>Remove</Text>
                  </Pressable>
                </View>
              ))}
              <Pressable style={[styles.photoAdd, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder }]} onPress={handleAddPhoto}>
                <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add</Text>
              </Pressable>
            </View>
          </View>
        )}
      </HalfSheet>

      {showStartPicker && (
        <DateTimePicker
          value={new Date(startTime)}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleStartTimeChange}
          onTouchCancel={() => Platform.OS === 'android' && setShowStartPicker(false)}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endTime ? new Date(endTime) : new Date()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleEndTimeChange}
          onTouchCancel={() => Platform.OS === 'android' && setShowEndPicker(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  durationBlock: {
    alignItems: 'center',
    marginBottom: 24,
  },
  durationText: {
    fontSize: 40,
    fontWeight: '700',
  },
  unit: {
    fontSize: 16,
    fontWeight: '300',
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  addRow: {
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  addText: {
    fontSize: 16,
  },
  photoRow: {
    marginTop: 8,
  },
  photoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  photoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoTile: {
    width: 80,
    height: 80,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoAdd: {
    width: 80,
    height: 80,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRow: {
    width: '100%',
  },
  cta: {
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
