/**
 * FeedSheet — 1:1 from web/components/halfsheets/FeedSheet.js
 * Bottle, Nursing, Solids tabs with full input UI
 */
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert, ScrollView, TextInput } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../context/ThemeContext';
import { formatDateTime, formatElapsedHmsTT } from '../../utils/dateTime';
import { colorMix } from '../../utils/colorBlend';
import HalfSheet from './HalfSheet';
import { TTInputRow, TTPhotoRow, DateTimePickerTray } from '../shared';
import AmountStepper from './AmountStepper';
import { BottleIcon, NursingIcon, SolidsIcon, PlayIcon, PauseIcon, SearchIcon, ChevronRightIcon, XIcon } from '../icons';
import { COMMON_FOODS } from '../../constants/foods';

const slugifyFoodId = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const FOOD_MAP = Object.fromEntries(COMMON_FOODS.map((f) => [f.id, f]));

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
  const { colors, bottle, nursing, solids, isDark } = useTheme();
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
  const [showDateTimeTray, setShowDateTimeTray] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(false);

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
  const [solidsStep, setSolidsStep] = useState(1); // 1: entry, 2: browse, 3: review
  const [recentFoods, setRecentFoods] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);

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
    setPhotosExpanded(false);
    if (!entry) setSolidsStep(1);
  }, [entry]);

  // Load recent/custom foods when opening solids
  useEffect(() => {
    if (feedType !== 'solids') return;
    const loadSolidsData = async () => {
      try {
        if (storage) {
          const [recent, custom] = await Promise.all([
            storage.getRecentFoods?.({ forceServer: true }) || Promise.resolve([]),
            storage.getCustomFoods?.() || Promise.resolve([]),
          ]);
          let resolvedRecent = Array.isArray(recent) ? recent : [];
          if (resolvedRecent.length === 0 && typeof storage.getAllSolidsSessions === 'function') {
            try {
              const sessions = await storage.getAllSolidsSessions();
              const sorted = Array.isArray(sessions)
                ? sessions.slice().sort((a, b) => Number(b?.timestamp || 0) - Number(a?.timestamp || 0))
                : [];
              const names = [];
              for (const session of sorted) {
                const foods = Array.isArray(session?.foods) ? session.foods : [];
                for (const food of foods) {
                  const name = String(food?.name || '').trim();
                  if (!name) continue;
                  if (names.some((n) => (typeof n === 'string' ? n : n?.name)?.toLowerCase() === name.toLowerCase())) continue;
                  names.push(name);
                  if (names.length >= 20) break;
                }
                if (names.length >= 20) break;
              }
              resolvedRecent = names;
            } catch (_) {}
          }
          setRecentFoods(resolvedRecent);
          setCustomFoods(
            (Array.isArray(custom) ? custom : [])
              .slice()
              .sort((a, b) => String(a?.name || '').localeCompare(String(b?.name || '')))
          );
        }
        if (!entry) setSolidsStep(1);
      } catch (err) {
        console.error('[FeedSheet] Failed to load solids data:', err);
      }
    };
    loadSolidsData();
  }, [feedType, storage, entry]);

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

  const handleDateTimeChange = (isoString) => {
    if (isoString) setDateTime(isoString);
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

  const addFoodToList = useCallback((food) => {
    if (!food) return;
    const name = food.name || food.label || '';
    if (!name) return;
    const id = food.id || slugifyFoodId(name);
    if (!id) return;
    setAddedFoods((prev) => {
      if (prev.some((f) => f.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          name,
          category: food.category || 'Custom',
          icon: food.icon || null,
          emoji: food.emoji || null,
          preparation: food.preparation || null,
          amount: food.amount || null,
          reaction: food.reaction || null,
        },
      ];
    });
  }, []);

  const removeFoodById = useCallback((foodId) => {
    if (!foodId) return;
    setAddedFoods((prev) => prev.filter((f) => f.id !== foodId));
  }, []);

  const isFoodSelected = useCallback((foodId) => addedFoods.some((f) => f.id === foodId), [addedFoods]);

  const solidsAllFoods = useMemo(() => {
    const commonNames = new Set(COMMON_FOODS.map((f) => String(f?.name || '').toLowerCase()).filter(Boolean));
    const customMap = new Map();
    const addCustom = (food) => {
      if (!food?.name) return;
      const name = String(food.name).trim();
      if (!name) return;
      const key = name.toLowerCase();
      if (commonNames.has(key)) return;
      const id = food.id || slugifyFoodId(name);
      if (!customMap.has(key)) customMap.set(key, { id, name, category: 'Custom', icon: food.emoji ? null : 'SolidsIcon', emoji: food.emoji || null, isCustom: true });
    };
    customFoods.forEach(addCustom);
    addedFoods.forEach(addCustom);
    (recentFoods || []).forEach((item) => addCustom(typeof item === 'string' ? { name: item } : item));
    return [...COMMON_FOODS, ...Array.from(customMap.values())].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [COMMON_FOODS, customFoods, addedFoods, recentFoods]);

  const solidsFoodByName = useMemo(() => {
    const map = new Map();
    solidsAllFoods.forEach((f) => {
      if (f?.name) map.set(String(f.name).toLowerCase(), f);
    });
    return map;
  }, [solidsAllFoods]);

  const solidsRecentFoods = useMemo(() => {
    const fallbackNames = ['Avocado', 'Banana', 'Apple', 'Carrot'];
    const fallback = fallbackNames.map((name) => solidsFoodByName.get(name.toLowerCase()) || { id: slugifyFoodId(name), name });
    if (!Array.isArray(recentFoods) || recentFoods.length === 0) return fallback;
    const normalized = recentFoods
      .map((item) => (typeof item === 'string' ? { name: item } : item))
      .filter((item) => item?.name);
    const resolved = normalized.map((item) => {
      const name = String(item.name);
      const mapped = solidsFoodByName.get(name.toLowerCase());
      return mapped ? { ...mapped, emoji: mapped.emoji || item.emoji || null } : { id: item.id || slugifyFoodId(name), name, emoji: item.emoji || null };
    });
    return resolved.slice(0, 6);
  }, [recentFoods, solidsFoodByName]);

  const solidsTileFoods = useMemo(() => {
    const selectedIds = new Set(addedFoods.map((f) => f.id));
    const selected = addedFoods.map((f) => {
      const def = FOOD_MAP[f.id] || f;
      return { ...def, ...f };
    });
    const remaining = 3 - selected.length;
    const fillers = [];
    if (remaining > 0) {
      for (const food of solidsRecentFoods) {
        if (fillers.length >= remaining) break;
        const def = FOOD_MAP[food.id] || food;
        const resolvedId = def.id || slugifyFoodId(def.name);
        if (!selectedIds.has(resolvedId)) fillers.push({ ...def, id: resolvedId });
      }
    }
    return [...selected, ...fillers].slice(0, 3);
  }, [addedFoods, solidsRecentFoods]);

  const solidsFilteredFoods = useMemo(() => {
    const query = solidsSearch.trim().toLowerCase();
    if (!query) return solidsAllFoods;
    return solidsAllFoods.filter((f) => f.name.toLowerCase().includes(query));
  }, [solidsAllFoods, solidsSearch]);

  const now = Date.now();
  const startRef = activeSideStartRef.current;
  const leftDisplayMs = activeSide === 'left' && startRef ? leftElapsedMs + (now - startRef) : leftElapsedMs;
  const rightDisplayMs = activeSide === 'right' && startRef ? rightElapsedMs + (now - startRef) : rightElapsedMs;
  const nursingTotalMs = leftDisplayMs + rightDisplayMs;
  const nursingParts = formatElapsedHmsTT(nursingTotalMs);

  const solidsHeaderTitle = feedType === 'solids' ? (solidsStep === 2 ? 'Browse foods' : solidsStep === 3 ? 'Review' : 'Solids') : null;
  const sheetTitle = feedType === 'solids' ? solidsHeaderTitle : feedType === 'nursing' ? 'Nursing' : 'Feed';

  // Fixed 606px for all modes — stable height, content scrolls (matches DiaperSheet/SleepSheet pattern)
  const feedSnapPoints = [606];

  const solidsCanSave = !!dateTime && addedFoods.length > 0;
  const solidsCanNext = addedFoods.length > 0;
  const getSolidsFooter = () => {
    if (feedType !== 'solids') return null;
    if (solidsStep === 2) return null;
    if (solidsStep === 3) return { label: saving ? 'Saving...' : (entry ? 'Save' : 'Add'), onClick: handleSave, disabled: saving || !solidsCanSave };
    return { label: 'Next', onClick: () => setSolidsStep(3), disabled: !solidsCanNext };
  };
  const solidsFooter = feedType === 'solids' ? getSolidsFooter() : null;

  const footer = solidsFooter ? (
    <Pressable
      style={({ pressed }) => [
        styles.cta,
        { backgroundColor: saving ? (solids.dark || accent) : accent },
        pressed && !solidsFooter.disabled && { opacity: 0.9 },
      ]}
      onPress={solidsFooter.onClick}
      disabled={solidsFooter.disabled}
    >
      <Text style={[styles.ctaText, solidsFooter.disabled && { opacity: 0.5 }]}>{solidsFooter.label}</Text>
    </Pressable>
  ) : feedType !== 'solids' ? (
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
  ) : null;

  const handleSheetOpen = useCallback(() => {
    const fromRef = feedTypeRef?.current;
    const t = (fromRef && ['bottle','nursing','solids'].includes(fromRef)) ? fromRef : defaultType;
    setFeedType(t);
  }, [defaultType]);

  return (
    <>
      <HalfSheet
        sheetRef={sheetRef}
        snapPoints={feedSnapPoints}
        title={sheetTitle}
        accentColor={accent}
        onClose={handleClose}
        onOpen={handleSheetOpen}
        footer={footer}
        scrollable={true}
        onHeaderBackPress={feedType === 'solids' && solidsStep >= 2 ? () => setSolidsStep(1) : undefined}
        headerRight={
          feedType === 'solids' && solidsStep === 2 && addedFoods.length > 0 ? (
            <Pressable onPress={() => setSolidsStep(3)} style={({ pressed }) => pressed && { opacity: 0.7 }}>
              <Text style={styles.headerDoneText}>Done</Text>
            </Pressable>
          ) : null
        }
      >
        {/* Mode switcher — web: only when creating (not editing), visibleFeedTypeCount > 1 */}
        <View style={styles.feedContent} collapsable={false}>
        {isInputVariant && visibleTypes.length > 1 && !(feedType === 'solids' && solidsStep >= 2) && (
        <View style={styles.feedTypePicker}>
          {FEED_TYPES.filter((t) => visibleTypes.includes(t.id)).map((t) => (
            <FeedTypeButton
              key={t.id}
              label={t.label}
              icon={t.Icon}
              selected={feedType === t.id}
              accent={accentMap[t.id].primary}
              onPress={() => setFeedType(t.id)}
              colors={colors}
              isDark={isDark}
            />
          ))}
        </View>
        )}

        {feedType === 'bottle' && (
          <>
            <TTInputRow label="Time" rawValue={dateTime} type="datetime" formatDateTime={formatDateTime} onOpenPicker={() => setShowDateTimeTray(true)} />
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
            <TTInputRow label="Start time" rawValue={dateTime} type="datetime" formatDateTime={formatDateTime} onOpenPicker={() => setShowDateTimeTray(true)} />
            <View style={styles.nursingTotal}>
              <View style={styles.nursingTotalRow}>
                {nursingParts.showH && <><Text style={[styles.durationText, { color: colors.textPrimary }]}>{nursingParts.hStr}</Text><Text style={[styles.unit, { color: colors.textSecondary }]}>h </Text><View style={styles.unitSpacer} /></>}
                {nursingParts.showM && <><Text style={[styles.durationText, { color: colors.textPrimary }]}>{nursingParts.mStr}</Text><Text style={[styles.unit, { color: colors.textSecondary }]}>m </Text><View style={styles.unitSpacer} /></>}
                <Text style={[styles.durationText, { color: colors.textPrimary }]}>{nursingParts.sStr}</Text>
                <Text style={[styles.unit, { color: colors.textSecondary }]}>s</Text>
              </View>
            </View>
            <View style={styles.sideTimers}>
              <SideTimer side="left" displayMs={leftDisplayMs} isActive={activeSide === 'left'} isLast={lastSide === 'left'} onPress={handleToggleSide} accent={nursing.primary} accentSoft={nursing.soft} colors={colors} runningSide={activeSide} />
              <SideTimer side="right" displayMs={rightDisplayMs} isActive={activeSide === 'right'} isLast={lastSide === 'right'} onPress={handleToggleSide} accent={nursing.primary} accentSoft={nursing.soft} colors={colors} runningSide={activeSide} />
            </View>
          </>
        )}

        {feedType === 'solids' && solidsStep === 1 && (
          <SolidsStepOne
            dateTime={dateTime}
            formatDateTime={formatDateTime}
            onOpenPicker={() => setShowDateTimeTray(true)}
            solidsTileLabel={addedFoods.length === 0 ? 'Add foods' : `${addedFoods.length} food${addedFoods.length !== 1 ? 's' : ''} added`}
            solidsTileFoods={solidsTileFoods}
            isFoodSelected={isFoodSelected}
            addFoodToList={addFoodToList}
            removeFoodById={removeFoodById}
            onBrowsePress={() => setSolidsStep(2)}
            colors={colors}
            solids={solids}
          />
        )}
        {feedType === 'solids' && solidsStep === 2 && (
          <SolidsStepTwo
            solidsSearch={solidsSearch}
            setSolidsSearch={setSolidsSearch}
            solidsFilteredFoods={solidsFilteredFoods}
            isFoodSelected={isFoodSelected}
            addFoodToList={addFoodToList}
            removeFoodById={removeFoodById}
            colors={colors}
            solids={solids}
          />
        )}
        {feedType === 'solids' && solidsStep === 3 && (
          <SolidsStepThree addedFoods={addedFoods} removeFoodById={removeFoodById} colors={colors} solids={solids} />
        )}

        {((feedType === 'solids' && solidsStep === 3) || feedType !== 'solids') && !notesExpanded && !photosExpanded && (
          <View style={styles.addRow}>
            <Pressable style={({ pressed }) => [styles.addItem, pressed && { opacity: 0.7 }]} onPress={() => setNotesExpanded(true)}>
              <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add notes</Text>
            </Pressable>
            <Pressable style={({ pressed }) => [styles.addItem, pressed && { opacity: 0.7 }]} onPress={() => setPhotosExpanded(true)}>
              <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add photos</Text>
            </Pressable>
          </View>
        )}

        {((feedType === 'solids' && solidsStep === 3) || feedType !== 'solids') && notesExpanded && (
          <TTInputRow label="Notes" value={notes} onChange={setNotes} type="text" placeholder="Add a note..." />
        )}

        {((feedType === 'solids' && solidsStep === 3) || feedType !== 'solids') && photosExpanded && (
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

        {((feedType === 'solids' && solidsStep === 3) || feedType !== 'solids') && notesExpanded && !photosExpanded && (
          <Pressable style={({ pressed }) => [styles.addItem, pressed && { opacity: 0.7 }]} onPress={() => setPhotosExpanded(true)}>
            <Text style={[styles.addText, { color: colors.textTertiary }]}>+ Add photos</Text>
          </Pressable>
        )}
        </View>
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

function FoodTile({ food, selected, onPress, dashed, labelOverride, colors, solids }) {
  if (!food) return null;
  const emoji = food.emoji || '🍽️';
  const bg = selected ? colorMix(solids.primary, colors.inputBg || '#F5F5F7', 16) : (colors.inputBg || '#F5F5F7');
  const border = selected ? solids.primary : (colors.cardBorder || colors.borderSubtle || 'transparent');
  const labelColor = selected ? solids.primary : colors.textSecondary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.foodTile,
        {
          backgroundColor: bg,
          borderColor: border,
          borderStyle: dashed ? 'dashed' : 'solid',
          opacity: selected ? 1 : 0.6,
        },
        pressed && { opacity: 0.8 },
      ]}
      onPress={onPress}
    >
      <View style={styles.foodTileIcon}>
        <Text style={styles.foodTileEmoji}>{emoji}</Text>
      </View>
      <Text style={[styles.foodTileLabel, { color: labelColor }]} numberOfLines={1}>
        {labelOverride || food.name}
      </Text>
    </Pressable>
  );
}

function SolidsStepOne({ dateTime, formatDateTime, onOpenPicker, solidsTileLabel, solidsTileFoods, isFoodSelected, addFoodToList, removeFoodById, onBrowsePress, colors, solids }) {
  return (
    <View style={styles.solidsStepOne}>
      <TTInputRow label="Start time" rawValue={dateTime} type="datetime" formatDateTime={formatDateTime} onOpenPicker={onOpenPicker} />
      <View style={styles.solidsTilesSection}>
        <Text style={[styles.solidsTileLabel, { color: colors.textSecondary }]}>{solidsTileLabel}</Text>
        <View style={styles.solidsTilesGrid}>
          {solidsTileFoods.map((food) => {
            const resolvedId = food.id || slugifyFoodId(food.name);
            const selected = isFoodSelected(resolvedId);
            return (
              <View key={resolvedId || food.name} style={styles.solidsTileCell}>
                <FoodTile
                  food={{ ...food, id: resolvedId }}
                  selected={selected}
                  onPress={() => (selected ? removeFoodById(resolvedId) : addFoodToList({ ...food, id: resolvedId }))}
                  colors={colors}
                  solids={solids}
                />
              </View>
            );
          })}
        </View>
      </View>
      <Pressable style={({ pressed }) => [styles.browseButton, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder || colors.borderSubtle }, pressed && { opacity: 0.7 }]} onPress={onBrowsePress}>
        <Text style={[styles.browseButtonText, { color: colors.textPrimary }]}>Browse all foods</Text>
        <ChevronRightIcon size={20} color={colors.textTertiary} />
      </Pressable>
    </View>
  );
}

function SolidsStepTwo({ solidsSearch, setSolidsSearch, solidsFilteredFoods, isFoodSelected, addFoodToList, removeFoodById, colors, solids }) {
  return (
    <View style={styles.solidsStepTwo}>
      <View style={[styles.solidsSearchBar, { backgroundColor: colors.inputBg }]}>
        <SearchIcon size={20} color={colors.textTertiary} />
        <TextInput
          style={[styles.solidsSearchInput, { color: colors.textPrimary }]}
          value={solidsSearch}
          onChangeText={setSolidsSearch}
          placeholder="Search..."
          placeholderTextColor={colors.textTertiary}
        />
      </View>
      <View style={styles.solidsBrowseGrid}>
          {solidsFilteredFoods.map((food) => {
            const selected = isFoodSelected(food.id);
            return (
              <View key={food.id} style={styles.solidsBrowseCell}>
                <FoodTile
                  food={food}
                  selected={selected}
                  onPress={() => (selected ? removeFoodById(food.id) : addFoodToList(food))}
                  colors={colors}
                  solids={solids}
                />
              </View>
            );
          })}
          {solidsSearch.trim() && solidsFilteredFoods.length === 0 && (
            <View style={styles.solidsBrowseCell}>
            <FoodTile
              food={{ id: 'add-custom', name: solidsSearch.trim().slice(0, 12) + (solidsSearch.length > 12 ? '…' : ''), emoji: null }}
              selected={false}
              onPress={() => Alert.alert('Add custom', `Add "${solidsSearch.trim()}" as custom food?`, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Add', onPress: () => addFoodToList({ id: slugifyFoodId(solidsSearch.trim()), name: solidsSearch.trim() }) },
              ])}
              dashed
              labelOverride={`Add "${solidsSearch.trim().slice(0, 12)}${solidsSearch.length > 12 ? '…' : ''}"`}
              colors={colors}
              solids={solids}
            />
            </View>
          )}
        </View>
    </View>
  );
}

function SolidsStepThree({ addedFoods, removeFoodById, colors, solids }) {
  return (
    <View style={styles.solidsStepThree}>
      <View style={styles.solidsReviewList}>
        {addedFoods.map((food) => (
          <Pressable
            key={food.id}
            style={({ pressed }) => [styles.solidsReviewRow, { backgroundColor: colors.inputBg }, pressed && { opacity: 0.7 }]}
            onPress={() => {}}
          >
            <View style={styles.solidsReviewRowInner}>
              <View style={[styles.solidsReviewIcon, { backgroundColor: colorMix(solids.primary, colors.inputBg || '#F5F5F7', 20) }]}>
                {food.emoji ? <Text style={styles.solidsReviewEmoji}>{food.emoji}</Text> : <SolidsIcon size={20} color={solids.primary} />}
              </View>
              <View style={styles.solidsReviewContent}>
                <Text style={[styles.solidsReviewName, { color: colors.textPrimary }]}>{food.name}</Text>
              </View>
              <Pressable onPress={() => removeFoodById(food.id)} style={({ p }) => p && { opacity: 0.7 }}>
                <XIcon size={18} color={colors.textTertiary} />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function FeedTypeButton({ label, icon: Icon, selected, accent, onPress, colors, isDark }) {
  // Web: dark mode → inputBg only; light → selected ? color-mix(accent 16%, inputBg) : inputBg
  const inputBg = colors.inputBg || (isDark ? '#3C3E43' : '#F5F5F7');
  const bg = selected && !isDark ? colorMix(accent, inputBg, 16) : inputBg;
  const border = selected ? accent : (colors.cardBorder || colors.borderSubtle || (isDark ? '#1A1A1A' : '#EBEBEB'));
  const color = selected ? accent : colors.textTertiary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.feedTypeButton,
        { backgroundColor: bg, borderColor: border, borderWidth: 1, opacity: selected ? 1 : 0.5 },
        pressed && { opacity: selected ? 0.9 : 0.6 },
      ]}
      onPress={onPress}
    >
      {Icon ? <Icon size={28} color={color} strokeWidth={1.5} /> : null}
      <Text style={[styles.feedTypeLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function SideTimer({ side, displayMs, isActive, isLast, onPress, accent, accentSoft, colors, runningSide }) {
  const parts = formatElapsedHmsTT(displayMs);
  // Web: color = isActive ? accent : (runningSide ? textTertiary : textSecondary)
  const color = isActive ? accent : (runningSide ? colors.textTertiary : colors.textSecondary);
  // Web: bg = isActive ? color-mix(accent 16%, inputBg) : inputBg
  const bg = isActive ? colorMix(accent, colors.inputBg || '#F5F5F7', 16) : (colors.inputBg || '#F5F5F7');
  const border = isActive ? accent : (colors.cardBorder || colors.borderSubtle || 'transparent');

  return (
    <View style={styles.sideTimerWrap}>
      {isLast && (
        <View
          style={[
            styles.lastBadge,
            {
              backgroundColor: accentSoft || `${accent}29`,
              top: -12,
              ...(side === 'left' ? { left: -4 } : { right: -4 }),
            },
          ]}
        >
          <Text style={[styles.lastText, { color: accent }]}>Last</Text>
        </View>
      )}
      <Pressable
        style={({ pressed }) => [
          styles.sideTimer,
          { backgroundColor: bg, borderColor: border },
          pressed && { opacity: 0.7 },
        ]}
        onPress={() => onPress(side)}
      >
        {isActive ? (
          <PauseIcon size={28} color={color} />
        ) : (
          <PlayIcon size={28} color={color} />
        )}
        <Text style={[styles.sideTime, { color }]}>{parts.str}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Web: grid-cols-3 gap-3 pb-3 → gap 12px, paddingBottom 12px
  feedContent: {
    gap: 8,
  },
  feedTypePicker: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 12,
    paddingBottom: 12,
  },
  // Web TypeButton: width 100%, height 60, border 1px solid (1.5 can cause double-line on RN), rounded-2xl (16)
  feedTypeButton: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  // Web: fontSize 13, fontWeight 600
  feedTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Web: text-center pt-2 pb-1, space-y-2 (8px) to next
  nursingTotal: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    marginBottom: 8,
  },
  // Web: flex items-end justify-center tabular-nums
  nursingTotalRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  // Web: text-[38px] leading-none font-bold tabular-nums
  durationText: {
    fontSize: 38,
    fontWeight: '700',
    lineHeight: 38,
    fontVariant: ['tabular-nums'],
  },
  // Web: text-base font-light ml-1
  unit: {
    fontSize: 16,
    fontWeight: '300',
    marginLeft: 4,
  },
  // Web: ml-2 spacer between h and m
  unitSpacer: {
    width: 8,
  },
  // Web: grid grid-cols-2 place-items-center gap-14 pt-2 pb-1, space-y-2 (8px) to next
  sideTimers: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 56,
    paddingTop: 8,
    paddingBottom: 4,
    marginBottom: 8,
  },
  // Web: relative flex flex-col items-center
  sideTimerWrap: {
    position: 'relative',
    alignItems: 'center',
  },
  // Web: absolute -top-3 px-2.5 py-1 rounded-lg text-[13px] font-semibold shadow-sm; left/right -4px per side
  lastBadge: {
    position: 'absolute',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    zIndex: 1,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  lastText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Web: width 120, height 120, rounded-full, gap-2 between icon and time
  sideTimer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  // Web: fontSize 18, fontWeight 600, tabular-nums
  sideTime: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  sectionLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  // Web FoodTile: flex flex-col items-center justify-center gap-2 rounded-full, aspect-ratio 1
  foodTile: {
    aspectRatio: 1,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  foodTileIcon: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  foodTileEmoji: {
    fontSize: 28,
    lineHeight: 28,
  },
  foodTileLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '90%',
  },
  // Web solidsStepOne: flex flex-col gap-10
  solidsStepOne: {
    flexDirection: 'column',
    gap: 10,
  },
  solidsTilesSection: {
    marginBottom: 0,
  },
  solidsTileLabel: {
    fontSize: 12,
    marginBottom: 10,
  },
  // Web: grid grid-cols-3 gap-3, paddingTop 6, paddingBottom 7
  solidsTilesGrid: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 6,
    paddingBottom: 7,
  },
  solidsTileCell: {
    flex: 1,
    minWidth: 0,
    aspectRatio: 1,
  },
  // Web: w-full rounded-2xl px-5 py-4, marginBottom 7
  browseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 7,
  },
  browseButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  solidsStepTwo: {
    flexDirection: 'column',
    gap: 16,
  },
  // Web: flex items-center gap-3 px-4 py-3 rounded-2xl
  solidsSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
  },
  solidsSearchInput: {
    flex: 1,
    fontSize: 14,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  solidsBrowseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingBottom: 24,
  },
  solidsBrowseCell: {
    width: '30%',
    aspectRatio: 1,
  },
  solidsStepThree: {
    flexDirection: 'column',
    gap: 16,
  },
  solidsReviewList: {
    flexDirection: 'column',
    gap: 8,
  },
  // Web: w-full px-5 py-4, inputBg
  solidsReviewRow: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  solidsReviewRowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  solidsReviewIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  solidsReviewEmoji: {
    fontSize: 20,
    lineHeight: 20,
  },
  solidsReviewContent: {
    flex: 1,
  },
  solidsReviewName: {
    fontSize: 16,
    fontWeight: '500',
  },
  headerDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
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
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  addItem: {
    flex: 1,
    paddingVertical: 12,
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
