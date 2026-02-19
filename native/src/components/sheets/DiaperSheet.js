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
    if (isoString) setDateTime(isoString);
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

  const handleSave = async () => {
    if (saving) return;
    if (!hasSelection) {
      Alert.alert('Select type', 'Select dry, wet, or poop.');
      return;
    }
    setSaving(true);
    try {
      const timestamp = new Date(dateTime).getTime();
      let uploadedURLs = [];
      for (let i = 0; i < photos.length; i++) {
        try {
          const url = await storage.uploadDiaperPhoto(photos[i]);
          uploadedURLs.push(url);
        } catch (e) {
          console.error('[DiaperSheet] Photo upload failed:', e);
        }
      }
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
        await storage.updateDiaperChange(entry.id, payload);
      } else {
        const created = await storage.addDiaperChange(payload);
        payload.id = created?.id || null;
      }

      if (typeof onSave === 'function') {
        const isNewEntry = !(entry && entry.id);
        await onSave(isNewEntry ? { type: 'diaper', ...payload } : undefined);
      }
      handleClose();
    } catch (error) {
      console.error('[DiaperSheet] Save failed:', error);
      Alert.alert('Error', 'Failed to save diaper change. Please try again.');
    } finally {
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
      onPress={handleSave}
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
      >
        <TTInputRow
          label="Time"
          rawValue={dateTime}
          type="datetime"
          formatDateTime={formatDateTime}
          onOpenPicker={() => setShowDateTimeTray(true)}
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
        onClose={() => setShowDateTimeTray(false)}
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
