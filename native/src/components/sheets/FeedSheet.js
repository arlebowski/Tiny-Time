/**
 * FeedSheet — 1:1 from web/components/halfsheets/FeedSheet.js
 * Bottle, Nursing, Solids tabs with full input UI
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert, ScrollView } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime, formatElapsedHmsTT } from '../../utils/dateTime';
import HalfSheet from './HalfSheet';
import InputRow from './InputRow';
import AmountStepper from './AmountStepper';
import { BottleIcon, NursingIcon, SolidsIcon } from '../icons';
import { COMMON_FOODS } from '../../constants/foods';

const FEED_TYPES = [
  { id: 'bottle', label: 'Bottle', Icon: BottleIcon, accent: 'bottle' },
  { id: 'nursing', label: 'Nursing', Icon: NursingIcon, accent: 'nursing' },
  { id: 'solids', label: 'Solids', Icon: SolidsIcon, accent: 'solids' },
];

export default function FeedSheet({
  sheetRef,
  onClose,
  entry = null,
  onSave = null,
  onAdd = null,
  preferredVolumeUnit = 'oz',
  activityVisibility = { bottle: true, nursing: true, solids: true },
  feedTypeRef = null,
  storage = null,
}) {
  const { colors, bottle, nursing, solids } = useTheme();
  const isInputVariant = !entry;

  const visibleTypes = [
    activityVisibility?.bottle !== false && 'bottle',
    activityVisibility?.nursing !== false && 'nursing',
    activityVisibility?.solids !== false && 'solids',
  ].filter(Boolean);
  const defaultType = visibleTypes[0] || 'bottle';
  const getInitialType = () => {
    const fromRef = feedTypeRef?.current;
    return (fromRef && visibleTypes.includes(fromRef)) ? fromRef : defaultType;
  };

  const [feedType, setFeedType] = useState(getInitialType);
  const [dateTime, setDateTime] = useState(() => new Date().toISOString());
  const [ounces, setOunces] = useState('');
  const [amountDisplayUnit, setAmountDisplayUnit] = useState(preferredVolumeUnit === 'ml' ? 'ml' : 'oz');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [existingPhotoURLs, setExistingPhotoURLs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);

  // Nursing: left/right timers
  const [leftElapsedMs, setLeftElapsedMs] = useState(0);
  const [rightElapsedMs, setRightElapsedMs] = useState(0);
  const [activeSide, setActiveSide] = useState(null);
  const [lastSide, setLastSide] = useState(null);
  const activeSideRef = useRef(null);
  const activeSideStartRef = useRef(null);
  const [timerTick, setTimerTick] = useState(0);

  // Solids
  const [addedFoods, setAddedFoods] = useState([]);
  const [solidsSearch, setSolidsSearch] = useState('');

  const accentMap = { bottle, nursing, solids };
  const accent = accentMap[feedType]?.primary || bottle.primary;

  useEffect(() => {
    if (entry) {
      const t = entry.feedType || entry.type || 'bottle';
      if (t === 'nursing') {
        setLeftElapsedMs((entry.leftDurationSec || 0) * 1000);
        setRightElapsedMs((entry.rightDurationSec || 0) * 1000);
        setLastSide(entry.lastSide || null);
      } else if (t === 'solids' && entry.foods) {
        setAddedFoods(entry.foods.map((f) => ({ id: f.id || f.name, name: f.name || f })));
      } else if (t === 'bottle') {
        setOunces(entry.ounces ? String(entry.ounces) : '');
      }
      setFeedType(t);
      setDateTime(entry.timestamp ? new Date(entry.timestamp).toISOString() : new Date().toISOString());
      setNotes(entry.notes || '');
      setExistingPhotoURLs(entry.photoURLs || []);
    } else {
      setFeedType(getInitialType());
      setDateTime(new Date().toISOString());
      setOunces('');
      setNotes('');
      setExistingPhotoURLs([]);
      setPhotos([]);
      setLeftElapsedMs(0);
      setRightElapsedMs(0);
      setActiveSide(null);
      setLastSide(null);
      setAddedFoods([]);
    }
    setNotesExpanded(false);
  }, [entry]);

  useEffect(() => {
    if (!activeSideRef.current) return;
    const tick = () => setTimerTick(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeSide]);

  const stopActiveSide = useCallback(() => {
    const side = activeSideRef.current;
    const start = activeSideStartRef.current;
    if (!side || !start) return;
    const delta = Math.max(0, Date.now() - start);
    if (side === 'left') setLeftElapsedMs((p) => p + delta);
    else setRightElapsedMs((p) => p + delta);
    activeSideStartRef.current = null;
    activeSideRef.current = null;
    setActiveSide(null);
  }, []);

  const handleToggleSide = useCallback((side) => {
    if (activeSideRef.current === side) {
      stopActiveSide();
      return;
    }
    if (activeSideRef.current) stopActiveSide();
    activeSideStartRef.current = Date.now();
    activeSideRef.current = side;
    setActiveSide(side);
    setLastSide(side);
  }, [stopActiveSide]);

  const handleClose = useCallback(() => {
    stopActiveSide();
    if (onClose) onClose();
  }, [onClose, stopActiveSide]);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDateTime(selectedDate.toISOString());
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const timestamp = new Date(dateTime).getTime();
      let uploadedURLs = [];
      if (storage?.uploadFeedingPhoto && photos.length > 0) {
        for (const p of photos) {
          try {
            const url = await storage.uploadFeedingPhoto(p);
            uploadedURLs.push(url);
          } catch (e) {}
        }
      }
      const allPhotos = [...existingPhotoURLs, ...uploadedURLs];

      if (feedType === 'bottle') {
        const oz = parseFloat(ounces) || 0;
        if (oz <= 0) {
          Alert.alert('Enter amount', 'Please enter the amount.');
          setSaving(false);
          return;
        }
        if (storage) {
          if (entry?.id) await storage.updateFeeding?.(entry.id, { ounces: oz, timestamp, notes: notes || null, photoURLs: allPhotos });
          else await storage.addFeeding?.(oz, timestamp);
        }
        if (onAdd && !entry) await onAdd({ type: 'bottle', ounces: oz, timestamp, notes: notes || null, photoURLs: allPhotos });
      } else if (feedType === 'nursing') {
        const leftSec = Math.round(leftElapsedMs / 1000);
        const rightSec = Math.round(rightElapsedMs / 1000);
        if (storage) {
          if (entry?.id) await storage.updateNursingSession?.(entry.id, { startTime: timestamp, leftDurationSec: leftSec, rightDurationSec: rightSec, lastSide: lastSide, notes: notes || null, photoURLs: allPhotos });
          else await (storage.addNursingSessionWithNotes || storage.addNursingSession)?.(timestamp, leftSec, rightSec, lastSide, notes || null, allPhotos);
        }
        if (onAdd && !entry) await onAdd({ type: 'nursing', startTime: timestamp, leftDurationSec: leftSec, rightDurationSec: rightSec, lastSide: lastSide, notes: notes || null, photoURLs: allPhotos });
      } else if (feedType === 'solids') {
        if (addedFoods.length === 0) {
          Alert.alert('Add foods', 'Please add at least one food.');
          setSaving(false);
          return;
        }
        const foods = addedFoods.map((f) => ({ id: f.id, name: f.name }));
        if (storage) {
          if (entry?.id) await storage.updateSolidsSession?.(entry.id, { timestamp, foods, notes: notes || null, photoURLs: allPhotos });
          else await storage.addSolidsSession?.({ timestamp, foods, notes: notes || null, photoURLs: allPhotos });
        }
        if (onAdd && !entry) await onAdd({ type: 'solids', timestamp, foods, notes: notes || null, photoURLs: allPhotos });
      }

      handleClose();
    } catch (e) {
      console.error('[FeedSheet] Save failed:', e);
      Alert.alert('Error', 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  const addFood = (food) => {
    if (addedFoods.some((f) => f.id === food.id)) return;
    setAddedFoods((prev) => [...prev, { id: food.id, name: food.name }]);
  };

  const removeFood = (id) => {
    setAddedFoods((prev) => prev.filter((f) => f.id !== id));
  };

  const filteredFoods = solidsSearch.trim()
    ? COMMON_FOODS.filter((f) => f.name.toLowerCase().includes(solidsSearch.toLowerCase()))
    : COMMON_FOODS;

  const now = Date.now();
  const startRef = activeSideStartRef.current;
  const leftDisplayMs = activeSide === 'left' && startRef ? leftElapsedMs + (now - startRef) : leftElapsedMs;
  const rightDisplayMs = activeSide === 'right' && startRef ? rightElapsedMs + (now - startRef) : rightElapsedMs;
  const nursingTotalMs = leftDisplayMs + rightDisplayMs;
  const nursingParts = formatElapsedHmsTT(nursingTotalMs);

  const footer = (
    <Pressable
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: saving ? (accentMap[feedType]?.dark || bottle.dark) : accent },
        pressed && !saving && { opacity: 0.9 },
      ]}
      onPress={handleSave}
      disabled={saving}
    >
      <Text style={styles.ctaText}>{saving ? 'Saving...' : (entry ? 'Save' : 'Add')}</Text>
    </Pressable>
  );

  const handleSheetOpen = useCallback(() => {
    const fromRef = feedTypeRef?.current;
    const t = (fromRef && ['bottle','nursing','solids'].includes(fromRef)) ? fromRef : defaultType;
    setFeedType(t);
  }, [defaultType]);

  return (
    <>
      <HalfSheet sheetRef={sheetRef} snapPoints={['80%']} title="Feed" accentColor={accent} onClose={handleClose} onOpen={handleSheetOpen} footer={footer}>
        {/* Tabs */}
        <View style={[styles.tabs, { backgroundColor: colors.segTrack || colors.track }]}>
          {FEED_TYPES.filter((t) => visibleTypes.includes(t.id)).map((t) => {
            const isActive = feedType === t.id;
            const AccentIcon = t.Icon;
            return (
              <Pressable
                key={t.id}
                style={[
                  styles.tab,
                  isActive && { backgroundColor: colors.segPill || '#fff' },
                ]}
                onPress={() => setFeedType(t.id)}
              >
                <AccentIcon size={20} color={isActive ? accentMap[t.id].primary : colors.textSecondary} />
                <Text style={[styles.tabLabel, { color: isActive ? colors.textPrimary : colors.textSecondary }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {feedType === 'bottle' && (
          <>
            <InputRow label="Time" value={dateTime} type="datetime" formatDateTime={formatDateTime} onOpenPicker={() => setShowDatePicker(true)} />
            <AmountStepper
              valueOz={parseFloat(ounces) || 0}
              unit={amountDisplayUnit}
              onChangeUnit={setAmountDisplayUnit}
              onChangeOz={(oz) => setOunces(String(oz))}
            />
          </>
        )}

        {feedType === 'nursing' && (
          <>
            <InputRow label="Time" value={dateTime} type="datetime" formatDateTime={formatDateTime} onOpenPicker={() => setShowDatePicker(true)} />
            <View style={styles.nursingTotal}>
              <Text style={[styles.durationText, { color: colors.textPrimary }]}>
                {nursingParts.showH && <><Text>{nursingParts.hStr}</Text><Text style={[styles.unit, { color: colors.textSecondary }]}>h </Text></>}
                {nursingParts.showM && <><Text>{nursingParts.mStr}</Text><Text style={[styles.unit, { color: colors.textSecondary }]}>m </Text></>}
                <Text>{nursingParts.sStr}</Text>
                <Text style={[styles.unit, { color: colors.textSecondary }]}>s</Text>
              </Text>
            </View>
            <View style={styles.sideTimers}>
              <SideTimer side="left" displayMs={leftDisplayMs} isActive={activeSide === 'left'} isLast={lastSide === 'left'} onPress={handleToggleSide} accent={nursing.primary} colors={colors} />
              <SideTimer side="right" displayMs={rightDisplayMs} isActive={activeSide === 'right'} isLast={lastSide === 'right'} onPress={handleToggleSide} accent={nursing.primary} colors={colors} />
            </View>
          </>
        )}

        {feedType === 'solids' && (
          <>
            <InputRow label="Time" value={dateTime} type="datetime" formatDateTime={formatDateTime} onOpenPicker={() => setShowDatePicker(true)} />
            <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>Foods</Text>
            {addedFoods.length > 0 && (
              <View style={styles.addedList}>
                {addedFoods.map((f) => (
                  <View key={f.id} style={[styles.addedChip, { backgroundColor: solids.soft }]}>
                    <Text style={[styles.addedName, { color: solids.primary }]}>{f.name}</Text>
                    <Pressable onPress={() => removeFood(f.id)}>
                      <Text style={{ color: colors.error, fontSize: 12 }}>✕</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
            <ScrollView style={styles.foodScroll} nestedScrollEnabled>
              {filteredFoods.slice(0, 20).map((f) => (
                <Pressable
                  key={f.id}
                  style={({ pressed }) => [styles.foodRow, pressed && { opacity: 0.7 }]}
                  onPress={() => addFood(f)}
                >
                  <Text style={styles.foodEmoji}>{f.emoji || '🍽️'}</Text>
                  <Text style={[styles.foodName, { color: colors.textPrimary }]}>{f.name}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        )}

        {!notesExpanded ? (
          <Pressable onPress={() => setNotesExpanded(true)} style={({ pressed }) => [styles.addRow, pressed && { opacity: 0.7 }]}>
            <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add notes</Text>
          </Pressable>
        ) : (
          <InputRow label="Notes" value={notes} onChange={setNotes} type="text" placeholder="Add a note..." />
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

function SideTimer({ side, displayMs, isActive, isLast, onPress, accent, colors }) {
  const parts = formatElapsedHmsTT(displayMs);
  return (
    <View style={styles.sideTimerWrap}>
      {isLast && (
        <View style={[styles.lastBadge, { backgroundColor: `${accent}29` }]}>
          <Text style={[styles.lastText, { color: accent }]}>Last</Text>
        </View>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.sideTimer,
          { backgroundColor: isActive ? `${accent}29` : colors.inputBg, borderColor: isActive ? accent : colors.cardBorder },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => onPress(side)}
      >
        <Text style={[styles.sideTime, { color: isActive ? accent : colors.textSecondary }]}>{parts.str}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  nursingTotal: {
    alignItems: 'center',
    marginVertical: 16,
  },
  durationText: {
    fontSize: 32,
    fontWeight: '700',
  },
  unit: {
    fontSize: 14,
    fontWeight: '300',
  },
  sideTimers: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginBottom: 16,
  },
  sideTimerWrap: {
    alignItems: 'center',
  },
  lastBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 4,
  },
  lastText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sideTimer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideTime: {
    fontSize: 16,
    fontWeight: '600',
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  addedList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  addedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addedName: {
    fontSize: 14,
    fontWeight: '600',
  },
  foodScroll: {
    maxHeight: 200,
    marginBottom: 16,
  },
  foodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
  },
  foodEmoji: {
    fontSize: 24,
  },
  foodName: {
    fontSize: 16,
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
