/**
 * DiaperSheet — 1:1 from web/components/halfsheets/DiaperSheet.js
 * Wet/Dry/Poop toggles, time, notes, photos, Add/Save CTA
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime } from '../../utils/dateTime';
import HalfSheet from './HalfSheet';
import { TTInputRow, TTPhotoRow, DateTimePickerTray } from '../shared';
import { DiaperWetIcon, DiaperDryIcon, DiaperPooIcon } from '../icons';

const FUTURE_TOLERANCE_MS = 60 * 1000;
const TIME_TRACE = true;
const timeTrace = (...args) => {
  if (TIME_TRACE) console.log('[TimeTrace][DiaperSheet]', ...args);
};
const clampIsoToNow = (isoString) => {
  const parsed = new Date(isoString);
  const nowMs = Date.now();
  if (Number.isNaN(parsed.getTime())) return new Date(nowMs).toISOString();
  const ts = parsed.getTime();
  if (ts > nowMs + FUTURE_TOLERANCE_MS) return new Date(nowMs).toISOString();
  return parsed.toISOString();
};

const normalizePhotoUrls = (input) => {
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
};
const FREEZE_DEBUG = false;
const debugLog = (...args) => {
  if (FREEZE_DEBUG) console.log('[FreezeDebug][DiaperSheet]', ...args);
};

function TypeButton({ label, icon: Icon, selected, dim, onPress }) {
  const { colors, diaper } = useTheme();
  const bg = selected ? `${diaper.primary}29` : colors.inputBg;
  const border = selected ? diaper.primary : (colors.cardBorder || colors.borderSubtle);
  const color = selected ? diaper.primary : colors.textSecondary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.typeButton,
        { backgroundColor: bg, borderColor: border, opacity: dim ? 0.35 : 1 },
        pressed && { opacity: 0.7 },
      ]}
      onPress={onPress}
    >
      {Icon ? <Icon size={28} color={color} /> : null}
      <Text style={[styles.typeLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

export default function DiaperSheet({
  sheetRef,
  onClose,
  entry = null,
  onSave = null,
  storage = null,
}) {
  const { colors, diaper } = useTheme();
  const [dateTime, setDateTime] = useState(() => new Date().toISOString());
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [existingPhotoURLs, setExistingPhotoURLs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showDateTimeTray, setShowDateTimeTray] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(false);

  const [isWet, setIsWet] = useState(false);
  const [isDry, setIsDry] = useState(true);
  const [isPoo, setIsPoo] = useState(false);
  const lastTimeTraceRef = React.useRef(0);

  const hasSelection = isDry || isWet || isPoo;

  const hydrateFromEntry = useCallback(() => {
    if (entry && entry.timestamp) {
      setDateTime(new Date(entry.timestamp).toISOString());
      setNotes(entry.notes || '');
      const normalizedExisting = normalizePhotoUrls(entry.photoURLs);
      setExistingPhotoURLs(normalizedExisting);
      setIsWet(!!entry.isWet);
      setIsDry(!!entry.isDry);
      setIsPoo(!!entry.isPoo);
      setNotesExpanded(Boolean(String(entry.notes || '').trim()));
      setPhotosExpanded(normalizedExisting.length > 0);
    } else {
      setDateTime(new Date().toISOString());
      setNotes('');
      setExistingPhotoURLs([]);
      setIsWet(false);
      setIsDry(true);
      setIsPoo(false);
      setNotesExpanded(false);
      setPhotosExpanded(false);
    }
    setPhotos([]);
  }, [entry]);

  useEffect(() => {
    hydrateFromEntry();
  }, [hydrateFromEntry]);

  const handleSheetOpen = useCallback(() => {
    hydrateFromEntry();
  }, [hydrateFromEntry]);

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

  const handleToggleDry = () => {
    const next = !isDry;
    if (next) {
      setIsWet(false);
      setIsPoo(false);
    }
    setIsDry(next);
  };

  const handleToggleWet = () => {
    const next = !isWet;
    if (next && isDry) setIsDry(false);
    setIsWet(next);
  };

  const handleTogglePoo = () => {
    const next = !isPoo;
    if (next && isDry) setIsDry(false);
    setIsPoo(next);
  };

  const handleDateTimeChange = (isoString) => {
    if (!isoString) return;
    const clamped = clampIsoToNow(isoString);
    const now = Date.now();
    if (now - lastTimeTraceRef.current > 400) {
      const rawTs = new Date(isoString).getTime();
      const clampedTs = new Date(clamped).getTime();
      timeTrace('time:change', {
        rawIso: isoString,
        clampedIso: clamped,
        rawDeltaMs: Number.isFinite(rawTs) ? rawTs - now : null,
        clampedDeltaMs: Number.isFinite(clampedTs) ? clampedTs - now : null,
      });
      lastTimeTraceRef.current = now;
    }
    setDateTime(clamped);
  };

  React.useEffect(() => {
    timeTrace('tray:state', { open: showDateTimeTray });
  }, [showDateTimeTray]);

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

  const handleSave = async () => {
    if (saving) return;
    timeTrace('save:tap', { dateTime });
    const timestamp = new Date(dateTime).getTime();
    timeTrace('save:timestamp', {
      timestamp,
      deltaFromNowMs: Number.isFinite(timestamp) ? timestamp - Date.now() : null,
    });
    if (!Number.isFinite(timestamp)) {
      Alert.alert('Invalid time', 'Please choose a valid date and time.');
      return;
    }
    if (timestamp > Date.now() + FUTURE_TOLERANCE_MS) {
      Alert.alert('Invalid time', 'Time cannot be in the future.');
      return;
    }
    const saveStart = Date.now();
    const saveId = `diaper-${saveStart}`;
    debugLog('save:start', {
      saveId,
      photos: photos.length,
      existingPhotos: existingPhotoURLs.length,
      hasNotes: !!(notes && String(notes).trim()),
      hasSelection,
    });
    if (!hasSelection) {
      Alert.alert('Select type', 'Select dry, wet, or poop.');
      return;
    }
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
      let uploadedURLs = [];
      logStep('upload:start');
      for (let i = 0; i < photos.length; i++) {
        try {
          const url = await logAwait(`upload:item:${i}`, () => storage.uploadDiaperPhoto(photos[i]));
          uploadedURLs.push(url);
        } catch (e) {
          console.error('[DiaperSheet] Photo upload failed:', e);
        }
      }
      logStep('upload:done');
      const mergedPhotos = normalizePhotoUrls([...(existingPhotoURLs || []), ...uploadedURLs]);
      const payload = {
        timestamp,
        isWet: !!isWet,
        isDry: !!isDry,
        isPoo: !!isPoo,
        notes: (notes && String(notes).trim()) ? notes : null,
        photoURLs: mergedPhotos,
      };

      if (entry && entry.id) {
        logStep('write:update:start');
        await logAwait('write:update', () => storage.updateDiaperChange(entry.id, payload));
        logStep('write:update:done');
      } else {
        logStep('write:add:start');
        const created = await logAwait('write:add', () => storage.addDiaperChange(payload));
        payload.id = created?.id || null;
        logStep('write:add:done');
      }

      if (typeof onSave === 'function') {
        const isNewEntry = !(entry && entry.id);
        logStep('onSave:start');
        await logAwait('onSave', () =>
          onSave(isNewEntry ? { type: 'diaper', ...payload } : undefined)
        );
        logStep('onSave:done');
      }
      logStep('close:start');
      dismissSheet();
      logStep('close:done');
    } catch (error) {
      console.error('[DiaperSheet] Save failed:', error);
      Alert.alert('Error', 'Failed to save diaper change. Please try again.');
    } finally {
      debugLog('save:done', { saveId, ms: Date.now() - saveStart });
      setSaving(false);
    }
  };

  const ctaLabel = saving ? 'Saving...' : (entry && entry.id ? 'Save' : 'Add');

  const footer = (
    <Pressable
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: saving ? diaper.dark : diaper.primary },
        pressed && !saving && { opacity: 0.9 },
      ]}
      onPress={() => {
        timeTrace('cta:press', { label: ctaLabel, disabled: !!saving });
        debugLog('cta:tap', { label: ctaLabel, disabled: !!saving });
        handleSave();
      }}
      disabled={saving}
    >
      <Text style={styles.ctaText}>{ctaLabel}</Text>
    </Pressable>
  );

  return (
    <>
      <HalfSheet
        sheetRef={sheetRef}
        snapPoints={['85%', '90%']}
        enableDynamicSizing={true}
        title="Diaper"
        accentColor={diaper.primary}
        onClose={handleClose}
        onOpen={handleSheetOpen}
        footer={footer}
        contentPaddingTop={16}
        useFullWindowOverlay={false}
      >
        <TTInputRow
          label="Time"
          rawValue={dateTime}
          type="datetime"
          formatDateTime={formatDateTime}
          onOpenPicker={() => {
            timeTrace('tray:openRequest');
            setShowDateTimeTray(true);
          }}
        />

        <View style={styles.typePicker}>
          <TypeButton label="Dry" icon={DiaperDryIcon} selected={isDry} dim={isWet || isPoo} onPress={handleToggleDry} />
          <TypeButton label="Wet" icon={DiaperWetIcon} selected={isWet} dim={isDry} onPress={handleToggleWet} />
          <TypeButton label="Poop" icon={DiaperPooIcon} selected={isPoo} dim={isDry} onPress={handleTogglePoo} />
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
      </HalfSheet>

      <DateTimePickerTray
        isOpen={showDateTimeTray}
        onClose={() => {
          timeTrace('tray:onClose');
          setShowDateTimeTray(false);
        }}
        value={dateTime}
        onChange={handleDateTimeChange}
        title="Time"
      />
    </>
  );
}

const styles = StyleSheet.create({
  typePicker: {
    flexDirection: 'row',
    gap: 12,
marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 9999,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '600',
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
