/**
 * SleepSheet — 1:1 from web/components/halfsheets/SleepSheet.js
 * Start/End time, duration display, Start/End sleep timer, notes, photos
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime, formatElapsedHmsTT } from '../../utils/dateTime';
import HalfSheet from './HalfSheet';
import { TTInputRow, TTPhotoRow, DateTimePickerTray } from '../shared';

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
  const [showStartTray, setShowStartTray] = useState(false);
  const [showEndTray, setShowEndTray] = useState(false);
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

  const handleStartTimeChange = (isoString) => {
    if (isoString) setStartTime(isoString);
  };

  const handleEndTimeChange = (isoString) => {
    if (isoString) setEndTime(isoString);
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
        snapPoints={[606]}
        title="Sleep"
        accentColor={sleep.primary}
        onClose={handleClose}
        footer={footer}
        contentPaddingTop={40}
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
            <TTInputRow
              label="Start time"
              rawValue={startTime}
              type="datetime"
              formatDateTime={formatDateTime}
              onOpenPicker={() => setShowStartTray(true)}
              placeholder="Add..."
            />
          </View>
          <View style={styles.inputCol}>
            <TTInputRow
              label="End time"
              rawValue={endTime}
              type="datetime"
              formatDateTime={formatDateTime}
              onOpenPicker={() => setShowEndTray(true)}
              placeholder="Add..."
            />
          </View>
        </View>

        {!notesExpanded && !photosExpanded && (
          <View style={styles.addRow}>
            <Pressable style={({ pressed }) => [styles.addItem, pressed && { opacity: 0.7 }]} onPress={() => setNotesExpanded(true)}>
              <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add notes</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.addItem, pressed && { opacity: 0.7 }]} onPress={() => setPhotosExpanded(true)}>
              <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add photos</Text>
            </Pressable>
          </View>
        )}

        {photosExpanded && !notesExpanded && (
          <Pressable style={({ pressed }) => [styles.addItem, pressed && { opacity: 0.7 }]} onPress={() => setNotesExpanded(true)}>
            <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add notes</Text>
          </Pressable>
        )}

        {notesExpanded && !photosExpanded && (
          <Pressable style={({ pressed }) => [styles.addItem, pressed && { opacity: 0.7 }]} onPress={() => setPhotosExpanded(true)}>
            <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add photos</Text>
          </Pressable>
        )}

        {notesExpanded && (
          <TTInputRow label="Notes" value={notes} onChange={setNotes} type="text" placeholder="Add a note..." />
        )}

        {photosExpanded && (
          <TTPhotoRow
            expanded={photosExpanded}
            onExpand={() => setPhotosExpanded(true)}
            title="Photos"
            showTitle={true}
            existingPhotos={existingPhotoURLs}
            newPhotos={photos}
            onAddPhoto={handleAddPhoto}
            onRemovePhoto={handleRemovePhoto}
            onPreviewPhoto={() => {}}
            addLabel="+ Add photos"
          />
        )}
      </HalfSheet>

      <DateTimePickerTray
        isOpen={showStartTray}
        onClose={() => setShowStartTray(false)}
        value={startTime}
        onChange={handleStartTimeChange}
        title="Start time"
      />
      <DateTimePickerTray
        isOpen={showEndTray}
        onClose={() => setShowEndTray(false)}
        value={endTime || new Date().toISOString()}
        onChange={handleEndTimeChange}
        title="End time"
      />
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
  addItem: {
    flex: 1,
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
