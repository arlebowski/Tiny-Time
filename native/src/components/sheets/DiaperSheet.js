/**
 * DiaperSheet — 1:1 from web/components/halfsheets/DiaperSheet.js
 * Wet/Dry/Poop toggles, time, notes, photos, Add/Save CTA
 */
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime } from '../../utils/dateTime';
import HalfSheet from './HalfSheet';
import InputRow from './InputRow';
import { DiaperWetIcon, DiaperDryIcon, DiaperPooIcon } from '../icons';

function TypeButton({ label, icon: Icon, selected, dim, onPress }) {
  const { colors, diaper } = useTheme();
  const bg = selected
    ? `${diaper.primary}29` // ~16% opacity
    : colors.inputBg;
  const border = selected ? diaper.primary : colors.cardBorder;
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
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  const [isWet, setIsWet] = useState(false);
  const [isDry, setIsDry] = useState(true);
  const [isPoo, setIsPoo] = useState(false);

  const hasSelection = isDry || isWet || isPoo;

  useEffect(() => {
    if (entry && entry.timestamp) {
      setDateTime(new Date(entry.timestamp).toISOString());
      setNotes(entry.notes || '');
      setExistingPhotoURLs(entry.photoURLs || []);
      setIsWet(!!entry.isWet);
      setIsDry(!!entry.isDry);
      setIsPoo(!!entry.isPoo);
    } else {
      setDateTime(new Date().toISOString());
      setNotes('');
      setExistingPhotoURLs([]);
      setIsWet(false);
      setIsDry(true);
      setIsPoo(false);
    }
    setPhotos([]);
    setNotesExpanded(false);
  }, [entry]);

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

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDateTime(selectedDate.toISOString());
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
      if (storage && storage.uploadDiaperPhoto && photos.length > 0) {
        for (let i = 0; i < photos.length; i++) {
          try {
            const url = await storage.uploadDiaperPhoto(photos[i]);
            uploadedURLs.push(url);
          } catch (e) {
            console.error('[DiaperSheet] Photo upload failed:', e);
          }
        }
      }
      const mergedPhotos = [...(existingPhotoURLs || []), ...uploadedURLs];
      const payload = {
        timestamp,
        isWet: !!isWet,
        isDry: !!isDry,
        isPoo: !!isPoo,
        notes: (notes && String(notes).trim()) ? notes : null,
        photoURLs: mergedPhotos,
      };

      if (storage) {
        if (entry && entry.id) {
          await storage.updateDiaperChange(entry.id, payload);
        } else {
          await storage.addDiaperChange(payload);
        }
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
        snapPoints={['60%']}
        title="Diaper"
        accentColor={diaper.primary}
        onClose={handleClose}
        footer={footer}
      >
        <InputRow
          label="Time"
          value={dateTime}
          type="datetime"
          formatDateTime={formatDateTime}
          onOpenPicker={() => setShowDatePicker(true)}
        />

        <View style={styles.typePicker}>
          <TypeButton
            label="Dry"
            icon={DiaperDryIcon}
            selected={isDry}
            dim={isWet || isPoo}
            onPress={handleToggleDry}
          />
          <TypeButton
            label="Wet"
            icon={DiaperWetIcon}
            selected={isWet}
            dim={isDry}
            onPress={handleToggleWet}
          />
          <TypeButton
            label="Poop"
            icon={DiaperPooIcon}
            selected={isPoo}
            dim={isDry}
            onPress={handleTogglePoo}
          />
        </View>

        {!notesExpanded ? (
          <Pressable
            style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.7 }]}
            onPress={() => setNotesExpanded(true)}
          >
            <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add notes</Text>
          </Pressable>
        ) : (
          <InputRow
            label="Notes"
            value={notes}
            onChange={setNotes}
            type="text"
            placeholder="Add a note..."
          />
        )}
      </HalfSheet>

      {showDatePicker && (
        <DateTimePicker
          value={new Date(dateTime)}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          onTouchCancel={() => Platform.OS === 'android' && setShowDatePicker(false)}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  typePicker: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
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
    paddingVertical: 12,
  },
  addText: {
    fontSize: 16,
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
