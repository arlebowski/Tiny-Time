/**
 * SleepSheet — 1:1 from web/components/halfsheets/SleepSheet.js
 * Start/End time, duration display, Start/End sleep timer, notes, photos
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { useData } from '../../context/DataContext';
import { formatDateTime, formatElapsedHmsTT } from '../../utils/dateTime';
import HalfSheet from './HalfSheet';
import { TTInputRow, TTPhotoRow, DateTimePickerTray } from '../shared';

const FUTURE_TOLERANCE_MS = 60 * 1000;

function calculateDuration(startTime, endTime) {
  if (!startTime || !endTime) return null;
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  if (end < start) return null;
  return end - start;
}

function normalizeIsoTime(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function clampStartIsoToNow(value) {
  const normalized = normalizeIsoTime(value);
  const now = Date.now();
  if (!normalized) return new Date(now).toISOString();
  const startMs = new Date(normalized).getTime();
  return startMs > now + FUTURE_TOLERANCE_MS ? new Date(now).toISOString() : normalized;
}

function isFutureMs(value, nowMs = Date.now()) {
  return Number(value) > nowMs + FUTURE_TOLERANCE_MS;
}

function normalizeSleepStartMs(startMs, nowMs = Date.now()) {
  if (!startMs) return null;
  return startMs > nowMs + 3 * 3600000 ? startMs - 86400000 : startMs;
}

function normalizePhotoUrls(input) {
  if (!input) return [];
  const items = Array.isArray(input) ? input : [input];
  const urls = [];
  for (const item of items) {
    if (typeof item === 'string' && item.trim()) {
      urls.push(item);
      continue;
    }
    if (item && typeof item === 'object') {
      const maybe =
        item.url ||
        item.publicUrl ||
        item.publicURL ||
        item.downloadURL ||
        item.downloadUrl ||
        item.src ||
        item.uri;
      if (typeof maybe === 'string' && maybe.trim()) {
        urls.push(maybe);
      }
    }
  }
  return urls;
}
const FREEZE_DEBUG = false;
const debugLog = (...args) => {
  if (FREEZE_DEBUG) console.log('[FreezeDebug][SleepSheet]', ...args);
};
const TIME_TRACE = true;
const timeTrace = (...args) => {
  if (TIME_TRACE) console.log('[TimeTrace][SleepSheet]', ...args);
};

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
  const { activeSleep, sleepSessions } = useData();
  const isInputVariant = !entry;
  const activeSleepId = activeSleep?.id || null;

  const [startTime, setStartTime] = useState(() => {
    if (!isInputVariant) return new Date().toISOString();
    return activeSleep?.startTime ? new Date(activeSleep.startTime).toISOString() : null;
  });
  const [endTime, setEndTime] = useState(null);
  const [sleepState, setSleepState] = useState('idle'); // 'idle' | 'running'
  const [sleepElapsedMs, setSleepElapsedMs] = useState(0);
  const [endTimeManuallyEdited, setEndTimeManuallyEdited] = useState(false);
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [existingPhotoURLs, setExistingPhotoURLs] = useState([]);
  const [lastValidDurationMs, setLastValidDurationMs] = useState(0);
  const [saving, setSaving] = useState(false);
  const [showStartTray, setShowStartTray] = useState(false);
  const [showEndTray, setShowEndTray] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [activeSleepSessionId, setActiveSleepSessionId] = useState(null);

  const sleepIntervalRef = useRef(null);
  const endTimeManuallyEditedRef = useRef(false);
  const lastTimeTraceRef = useRef(0);

  const durationResultMs = (() => {
    if (!startTime || !endTime) return 0;
    return calculateDuration(startTime, endTime);
  })();
  const isValid = durationResultMs !== null;
  const stableDurationMs = isValid ? Number(durationResultMs || 0) : lastValidDurationMs;
  const displayMs = (() => {
    if (isInputVariant && sleepState === 'running' && !endTimeManuallyEditedRef.current) return sleepElapsedMs;
    if (!startTime || !endTime) return 0;
    return stableDurationMs;
  })();
  const tParts = formatElapsedHmsTT(displayMs);

  useEffect(() => {
    if (isValid) setLastValidDurationMs(stableDurationMs);
  }, [isValid, stableDurationMs]);

  useEffect(() => {
    if (entry) {
      setStartTime(entry.startTime ? new Date(entry.startTime).toISOString() : new Date().toISOString());
      setEndTime(entry.endTime ? new Date(entry.endTime).toISOString() : null);
      setNotes(entry.notes || '');
      const normalizedExisting = normalizePhotoUrls(entry.photoURLs);
      setExistingPhotoURLs(normalizedExisting);
      setNotesExpanded(Boolean(String(entry.notes || '').trim()));
      setPhotosExpanded(normalizedExisting.length > 0);
      setSleepState('idle');
      setEndTimeManuallyEdited(false);
      endTimeManuallyEditedRef.current = false;
    } else {
      const activeStartIso = isInputVariant && activeSleep?.startTime ? new Date(activeSleep.startTime).toISOString() : null;
      setStartTime(activeStartIso);
      setEndTime(null);
      if (isInputVariant && !activeSleepId) {
        setSleepState('idle');
        setSleepElapsedMs(0);
        setEndTimeManuallyEdited(false);
        endTimeManuallyEditedRef.current = false;
      }
      setNotes('');
      setExistingPhotoURLs([]);
      setPhotos([]);
      setNotesExpanded(false);
      setPhotosExpanded(false);
    }
  }, [entry, isInputVariant, activeSleep, activeSleepId]);

  useEffect(() => {
    if (!isInputVariant) return;
    if (activeSleep && activeSleep.id) {
      if (!activeSleepSessionId || activeSleepSessionId !== activeSleep.id) {
        setActiveSleepSessionId(activeSleep.id);
      }
      if (activeSleep.startTime) {
        const serverStartIso = new Date(activeSleep.startTime).toISOString();
        setStartTime(serverStartIso);
        const normalizedStart = normalizeSleepStartMs(activeSleep.startTime);
        if (normalizedStart) setSleepElapsedMs(Date.now() - normalizedStart);
      }
      if (!endTimeManuallyEditedRef.current) {
        setEndTime(null);
        setEndTimeManuallyEdited(false);
      }
      if (sleepState !== 'running' && !endTimeManuallyEditedRef.current) {
        setSleepState('running');
      }
      return;
    }

    if (sleepState === 'running') setSleepState('idle');
    setStartTime(null);
    setEndTime(null);
    setSleepElapsedMs(0);
    setEndTimeManuallyEdited(false);
    endTimeManuallyEditedRef.current = false;
    if (activeSleepSessionId) setActiveSleepSessionId(null);
  }, [isInputVariant, activeSleep, sleepState, activeSleepSessionId]);

  useEffect(() => {
    if (sleepIntervalRef.current) clearInterval(sleepIntervalRef.current);
    if (!isInputVariant || sleepState !== 'running' || endTimeManuallyEditedRef.current || !startTime) return;
    const startMs = normalizeSleepStartMs(new Date(startTime).getTime());
    if (!startMs) return;
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

  const dismissSheet = useCallback(() => {
    if (sheetRef?.current?.dismiss) {
      sheetRef.current.dismiss();
      return;
    }
    handleClose();
  }, [sheetRef, handleClose]);

  const handleSheetOpen = useCallback(() => {
    if (entry) {
      setNotes(entry.notes || '');
      const normalizedExisting = normalizePhotoUrls(entry.photoURLs);
      setExistingPhotoURLs(normalizedExisting);
      setPhotos([]);
      setNotesExpanded(Boolean(String(entry.notes || '').trim()));
      setPhotosExpanded(normalizedExisting.length > 0);
      return;
    }
    setNotes('');
    setExistingPhotoURLs([]);
    setPhotos([]);
    setNotesExpanded(false);
    setPhotosExpanded(false);
  }, [entry]);

  const handleStartTimeChange = (isoString) => {
    const clamped = clampStartIsoToNow(isoString);
    const now = Date.now();
    if (now - lastTimeTraceRef.current > 400) {
      const rawTs = new Date(isoString).getTime();
      const clampedTs = new Date(clamped).getTime();
      timeTrace('start:change', {
        rawIso: isoString,
        clampedIso: clamped,
        rawDeltaMs: Number.isFinite(rawTs) ? rawTs - now : null,
        clampedDeltaMs: Number.isFinite(clampedTs) ? clampedTs - now : null,
      });
      lastTimeTraceRef.current = now;
    }
    setStartTime(clamped);
    if (isInputVariant && sleepState === 'running') {
      setEndTime(null);
      setEndTimeManuallyEdited(false);
      endTimeManuallyEditedRef.current = false;
      const sessionId = activeSleepSessionId || activeSleepId;
      if (sessionId && clamped && storage?.updateSleepSession) {
        const startMs = new Date(clamped).getTime();
        (async () => {
          try {
            await storage.updateSleepSession(sessionId, {
              startTime: startMs,
              endTime: null,
              isActive: true,
            });
          } catch (e) {
            console.error('[SleepSheet] Failed to update active sleep start time:', e);
          }
        })();
      }
    }
  };

  const handleEndTimeChange = (isoString) => {
    const clamped = clampStartIsoToNow(isoString);
    const now = Date.now();
    if (now - lastTimeTraceRef.current > 400) {
      const rawTs = new Date(isoString).getTime();
      const clampedTs = new Date(clamped).getTime();
      timeTrace('end:change', {
        rawIso: isoString,
        clampedIso: clamped,
        rawDeltaMs: Number.isFinite(rawTs) ? rawTs - now : null,
        clampedDeltaMs: Number.isFinite(clampedTs) ? clampedTs - now : null,
      });
      lastTimeTraceRef.current = now;
    }
    setEndTime(clamped || null);
    setEndTimeManuallyEdited(true);
    endTimeManuallyEditedRef.current = true;
    if (isInputVariant && sleepState === 'running') {
      setSleepState('idle');
    }
  };

  const checkSleepOverlap = useCallback(
    async (startMs, endMs, excludeId = null) => {
      if (!startMs || !endMs || !Array.isArray(sleepSessions)) return false;
      return sleepSessions.some((s) => {
        if (!s || (excludeId && s.id === excludeId)) return false;
        const sStart = Number(s.startTime || 0);
        if (!sStart) return false;
        const sEnd = Number(s.endTime || Date.now());
        return startMs < sEnd && endMs > sStart;
      });
    },
    [sleepSessions]
  );

  const handleStartSleep = async () => {
    if (!isInputVariant || saving) return;
    const opStart = Date.now();
    const opId = `sleep-start-${opStart}`;
    debugLog('startSleep:start', { opId, sleepState, hasActiveSleep: !!(activeSleepSessionId || activeSleepId) });
    setSaving(true);
    try {
      const stepStart = Date.now();
      const logStep = (name, extra = null) =>
        debugLog(`startSleep:${name}`, { opId, ms: Date.now() - stepStart, ...(extra || {}) });
      const logAwait = async (name, fn) => {
        const started = Date.now();
        logStep(`${name}:start`);
        const result = await fn();
        logStep(`${name}:done`, { tookMs: Date.now() - started });
        return result;
      };
      const isIdleWithTimes = sleepState === 'idle' && startTime && endTime;
      let sessionId = activeSleepSessionId || activeSleepId;
      let startMs;
      let effectiveStartIso = startTime;

      if (isIdleWithTimes) {
        startMs = new Date(startTime).getTime();
        setEndTime(null);
      } else {
        const parsed = effectiveStartIso ? new Date(effectiveStartIso).getTime() : NaN;
        if (!effectiveStartIso || !Number.isFinite(parsed)) {
          effectiveStartIso = new Date().toISOString();
          setStartTime(effectiveStartIso);
          startMs = new Date(effectiveStartIso).getTime();
        } else {
          const clamped = clampStartIsoToNow(effectiveStartIso);
          if (clamped !== effectiveStartIso) {
            effectiveStartIso = clamped;
            setStartTime(effectiveStartIso);
          }
          startMs = new Date(effectiveStartIso).getTime();
        }
        setEndTime(null);
      }

      if (!sessionId) {
        const session = await logAwait('storage:startSleep', () => storage?.startSleep?.(startMs));
        sessionId = session?.id;
        if (sessionId) setActiveSleepSessionId(sessionId);
      } else if (storage?.updateSleepSession) {
        await logAwait('storage:updateSleepSession', () =>
          storage.updateSleepSession(sessionId, {
            startTime: startMs,
            endTime: null,
            isActive: true,
          })
        );
      }
      setSleepState('running');
    } catch (e) {
      console.error('[SleepSheet] Start sleep failed:', e);
      Alert.alert('Error', 'Failed to start sleep.');
    } finally {
      debugLog('startSleep:done', { opId, ms: Date.now() - opStart });
      setSaving(false);
    }
  };

  const handleEndSleep = async () => {
    if (!isInputVariant || sleepState !== 'running' || saving) return;
    const opStart = Date.now();
    const opId = `sleep-end-${opStart}`;
    debugLog('endSleep:start', {
      opId,
      photos: photos.length,
      existingPhotos: existingPhotoURLs.length,
      hasNotes: !!(notes && String(notes).trim()),
    });
    setSaving(true);
    try {
      const stepStart = Date.now();
      const logStep = (name, extra = null) =>
        debugLog(`endSleep:${name}`, { opId, ms: Date.now() - stepStart, ...(extra || {}) });
      const logAwait = async (name, fn) => {
        const started = Date.now();
        logStep(`${name}:start`);
        const result = await fn();
        logStep(`${name}:done`, { tookMs: Date.now() - started });
        return result;
      };
      const nowIso = new Date().toISOString();
      const endMs = Date.now();
      setEndTime(nowIso);

      const sessionId = activeSleepSessionId || activeSleepId;
      if (sessionId && storage && storage.endSleep) {
        await logAwait('storage:endSleep', () => storage.endSleep(sessionId, endMs));
        if (notes || photos.length > 0) {
          let uploadedURLs = [];
          if (storage.uploadSleepPhoto && photos.length > 0) {
            for (let i = 0; i < photos.length; i += 1) {
              const p = photos[i];
              try {
                const url = await logAwait(`upload:item:${i}`, () => storage.uploadSleepPhoto(p));
                uploadedURLs.push(url);
              } catch (e) {}
            }
          }
          const allPhotos = [...existingPhotoURLs, ...uploadedURLs];
          if (storage.updateSleepSession) {
            await logAwait('storage:updateSleepSession', () =>
              storage.updateSleepSession(sessionId, {
                notes: notes || null,
                photoURLs: allPhotos,
              })
            );
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
      setEndTimeManuallyEdited(false);
      endTimeManuallyEditedRef.current = false;

      dismissSheet();
      if (onAdd) {
        const startMs = startTime ? new Date(startTime).getTime() : null;
        await logAwait('onAdd', () =>
          onAdd(startMs && endMs ? {
            id: sessionId || null,
            type: 'sleep',
            startTime: startMs,
            endTime: endMs,
          } : undefined)
        );
      }
    } catch (e) {
      console.error('[SleepSheet] End sleep failed:', e);
      Alert.alert('Error', 'Failed to end sleep.');
    } finally {
      debugLog('endSleep:done', { opId, ms: Date.now() - opStart });
      setSaving(false);
    }
  };

  const handleSaveSleep = async () => {
    if (!isInputVariant || saving) return;
    if (!isValid) return;
    timeTrace('save:tap', { startTime, endTime, sleepState, endTimeManuallyEdited });
    const startMs = new Date(startTime).getTime();
    const endMs = new Date(endTime).getTime();
    timeTrace('save:timestamp', {
      startMs,
      endMs,
      startDeltaMs: Number.isFinite(startMs) ? startMs - Date.now() : null,
      endDeltaMs: Number.isFinite(endMs) ? endMs - Date.now() : null,
    });
    if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) {
      Alert.alert('Invalid time', 'Please choose valid start and end times.');
      return;
    }
    if (isFutureMs(startMs) || isFutureMs(endMs)) {
      Alert.alert('Invalid time', 'Start and end times cannot be in the future.');
      return;
    }
    const saveStart = Date.now();
    const saveId = `sleep-${saveStart}`;
    debugLog('save:start', {
      saveId,
      photos: photos.length,
      existingPhotos: existingPhotoURLs.length,
      hasNotes: !!(notes && String(notes).trim()),
      hasActiveSleep: !!(activeSleepSessionId || activeSleepId),
    });
    setSaving(true);
    try {
      const stepStart = Date.now();
      const logStep = (name, extra = null) =>
        debugLog(`step:${name}`, { saveId, ms: Date.now() - stepStart, ...(extra || {}) });
      const logAwait = async (name, fn) => {
        const started = Date.now();
        logStep(`${name}:start`);
        const result = await fn();
        logStep(`${name}:done`, { tookMs: Date.now() - started });
        return result;
      };
      const excludeId = activeSleepSessionId || activeSleepId || null;
      logStep('overlap:start');
      const hasOverlap = await logAwait('overlap:check', () =>
        checkSleepOverlap(startMs, endMs, excludeId)
      );
      logStep('overlap:done');
      if (hasOverlap) {
        Alert.alert('Overlap detected', 'This sleep session overlaps an existing sleep session. Please adjust the times.');
        setSaving(false);
        return;
      }

      let uploadedURLs = [];
      if (storage?.uploadSleepPhoto && photos.length > 0) {
        logStep('upload:start');
        for (let i = 0; i < photos.length; i += 1) {
          const p = photos[i];
          try {
            const url = await logAwait(`upload:item:${i}`, () => storage.uploadSleepPhoto(p));
            uploadedURLs.push(url);
          } catch (e) {}
        }
        logStep('upload:done');
      }
      const allPhotos = [...existingPhotoURLs, ...uploadedURLs];

      const sessionId = activeSleepSessionId || activeSleepId;
      let resolvedSessionId = sessionId || null;
      if (sessionId && storage?.endSleep) {
        logStep('sleep:end:start');
        await logAwait('sleep:end', () => storage.endSleep(sessionId, endMs));
        logStep('sleep:end:done');
        if (notes || allPhotos.length > 0) {
          logStep('sleep:update:start');
          await logAwait('sleep:update', () =>
            storage.updateSleepSession?.(sessionId, {
              notes: notes || null,
              photoURLs: allPhotos,
            })
          );
          logStep('sleep:update:done');
        }
        setActiveSleepSessionId(null);
      } else if (storage?.startSleep) {
        logStep('sleep:start:start');
        const session = await logAwait('sleep:start', () => storage.startSleep(startMs));
        logStep('sleep:start:done');
        resolvedSessionId = session?.id || null;
        logStep('sleep:end:start');
        await logAwait('sleep:end', () => storage.endSleep(session.id, endMs));
        logStep('sleep:end:done');
        if (notes || allPhotos.length > 0) {
          logStep('sleep:update:start');
          await logAwait('sleep:update', () =>
            storage.updateSleepSession?.(session.id, {
              notes: notes || null,
              photoURLs: allPhotos,
            })
          );
          logStep('sleep:update:done');
        }
      }

      setSleepState('idle');
      setStartTime(new Date().toISOString());
      setEndTime(null);
      setNotes('');
      setPhotos([]);
      setSleepElapsedMs(0);
      setEndTimeManuallyEdited(false);
      endTimeManuallyEditedRef.current = false;

      logStep('dismiss:start');
      dismissSheet();
      logStep('dismiss:done');
      if (onAdd) {
        logStep('onAdd:start');
        await logAwait('onAdd', () =>
          onAdd({
            id: resolvedSessionId,
            type: 'sleep',
            startTime: startMs,
            endTime: endMs,
            notes: notes || null,
            photoURLs: allPhotos || [],
          })
        );
        logStep('onAdd:done');
      }
    } catch (e) {
      console.error('[SleepSheet] Save failed:', e);
      Alert.alert('Error', 'Failed to save sleep session.');
    } finally {
      debugLog('save:done', { saveId, ms: Date.now() - saveStart });
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
  let ctaDisabled = !isValid;
  if (saving) {
    ctaLabel = 'Saving...';
    ctaOnPress = () => {};
    ctaDisabled = true;
  } else if (isInputVariant && sleepState === 'running') {
    ctaLabel = 'End sleep';
    ctaOnPress = handleEndSleep;
    ctaDisabled = false;
  } else if (isInputVariant && endTimeManuallyEdited) {
    ctaLabel = 'Save';
    ctaOnPress = handleSaveSleep;
    ctaDisabled = !isValid;
  } else if (isInputVariant) {
    ctaLabel = 'Start sleep';
    ctaOnPress = handleStartSleep;
    ctaDisabled = false;
  } else {
    ctaDisabled = !isValid;
  }

  const footer = (
    <View style={styles.footerRow}>
      <Pressable
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: saving ? sleep.dark : sleep.primary, opacity: ctaDisabled ? 0.7 : 1 },
          pressed && !saving && !ctaDisabled && { opacity: 0.9 },
        ]}
        onPress={() => {
          timeTrace('cta:press', {
            label: ctaLabel,
            disabled: !!ctaDisabled,
            sleepState,
            endTimeManuallyEdited,
          });
          debugLog('cta:tap', {
            label: ctaLabel,
            disabled: !!ctaDisabled,
            sleepState,
            endTimeManuallyEdited,
          });
          ctaOnPress();
        }}
        disabled={ctaDisabled}
      >
        <Text style={styles.ctaText}>{ctaLabel}</Text>
      </Pressable>
    </View>
  );

  return (
    <>
      <HalfSheet
        sheetRef={sheetRef}
        snapPoints={['85%', '90%']}
        enableDynamicSizing={true}
        title="Sleep"
        accentColor={sleep.primary}
        onClose={handleClose}
        onOpen={handleSheetOpen}
        footer={footer}
        contentPaddingTop={16}
        useFullWindowOverlay={false}
      >
        <View style={styles.durationBlock}>
          <Text style={[styles.durationText, { color: colors.textPrimary }]}>
            {tParts.showH && (
              <>
                <Text>{tParts.hStr}</Text>
                <Text>{'\u200A'}</Text>
                <Text style={[styles.unit, { color: colors.textSecondary }]}>h</Text>
                <Text>{'  '}</Text>
              </>
            )}
            {tParts.showM && (
              <>
                <Text>{tParts.mStr}</Text>
                <Text>{'\u200A'}</Text>
                <Text style={[styles.unit, { color: colors.textSecondary }]}>m</Text>
                <Text>{'  '}</Text>
              </>
            )}
            <Text>{tParts.sStr}</Text>
            <Text>{'\u200A'}</Text>
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
        value={startTime || new Date().toISOString()}
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
    marginBottom: 16,
  },
  durationText: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 40,
    includeFontPadding: false,
  },
  unit: {
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 30,
    includeFontPadding: false,
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
