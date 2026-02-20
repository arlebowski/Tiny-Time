/**
 * FeedSheet — refactored for deterministic HalfSheet sizing behavior.
 * - No forced minHeight
 * - No BottomSheetScrollView inside content by default
 * - Footer/CTA provided via HalfSheet footer (sticky), not in content
 * - Scroll enabled only for Solids Browse (step 2)
 *
 * Based on the FeedSheet you provided. :contentReference[oaicite:1]{index=1}
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Alert, TextInput, Image, ScrollView } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatDateTime, formatElapsedHmsTT } from '../../utils/dateTime';
import { colorMix } from '../../utils/colorBlend';
import HalfSheet from './HalfSheet';
import { TTInputRow, TTPhotoRow, DateTimePickerTray, TTPickerTray } from '../shared';
import AmountStepper from './AmountStepper';
import TimelineSwipeRow from '../Timeline/TimelineSwipeRow';
import {
  BottleIcon,
  NursingIcon,
  SolidsIcon,
  PrepRawIcon,
  PrepMashedIcon,
  PrepSteamedIcon,
  PrepPureedIcon,
  PrepBoiledIcon,
  PlayIcon,
  PauseIcon,
  SearchIcon,
  ChevronRightIcon,
} from '../icons';
import { COMMON_FOODS } from '../../constants/foods';
import { resolveFoodIconAsset } from '../../constants/foodIcons';

const slugifyFoodId = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

const FOOD_MAP = Object.fromEntries(COMMON_FOODS.map((f) => [f.id, f]));
const FOOD_MAP_BY_NAME = Object.fromEntries(COMMON_FOODS.map((f) => [String(f.name || '').toLowerCase(), f]));
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

const FEED_TYPES = [
  { id: 'bottle', label: 'Bottle', Icon: BottleIcon, accent: 'bottle' },
  { id: 'nursing', label: 'Nursing', Icon: NursingIcon, accent: 'nursing' },
  { id: 'solids', label: 'Solids', Icon: SolidsIcon, accent: 'solids' },
];
const SOLIDS_PREP_METHODS = ['Raw', 'Mashed', 'Steamed', 'Pureed', 'Boiled'];
const SOLIDS_AMOUNTS = ['All', 'Most', 'Some', 'A little', 'None'];
const SOLIDS_REACTIONS = [
  { label: 'Loved', emoji: '😍' },
  { label: 'Liked', emoji: '😊' },
  { label: 'Neutral', emoji: '😐' },
  { label: 'Disliked', emoji: '😖' },
];
const PREP_ICON_BY_LABEL = {
  Raw: PrepRawIcon,
  Mashed: PrepMashedIcon,
  Steamed: PrepSteamedIcon,
  Pureed: PrepPureedIcon,
  Boiled: PrepBoiledIcon,
};
const AmountNoneIcon = ({ size = 28, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" />
  </Svg>
);
const AmountSomeIcon = ({ size = 28, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" />
    <Path d="M 12,3 A 9,9 0 0,1 21,12 L 12,12 Z" fill={color} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const AmountMostIcon = ({ size = 28, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" stroke={color} strokeWidth="1.5" fill="none" />
    <Path d="M 12,3 A 9,9 0 1,1 3,12 L 12,12 Z" fill={color} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);
const AmountAllIcon = ({ size = 28, color = 'currentColor' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="9" fill={color} />
  </Svg>
);
const AMOUNT_ICON_BY_LABEL = {
  'A little': AmountNoneIcon,
  Some: AmountSomeIcon,
  Most: AmountMostIcon,
  All: AmountAllIcon,
};
const normalizeSolidsToken = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
const resolveSolidsPrep = (value) => {
  const token = normalizeSolidsToken(value);
  const labelByToken = {
    raw: 'Raw',
    mashed: 'Mashed',
    steamed: 'Steamed',
    pureed: 'Pureed',
    'puréed': 'Pureed',
    boiled: 'Boiled',
  };
  const label = labelByToken[token] || String(value || '').trim();
  const Icon = PREP_ICON_BY_LABEL[label] || null;
  if (!label) return null;
  return { key: `prep-${token || label}`, label, icon: Icon };
};
const resolveSolidsAmount = (value) => {
  const token = normalizeSolidsToken(value);
  const byToken = {
    all: '● All',
    most: '◕ Most',
    some: '◑ Some',
    'a-little': '◔ A little',
    little: '◔ A little',
    none: '○ None',
  };
  const label = byToken[token] || (value ? `◌ ${value}` : '');
  return label ? { key: `amount-${token || label}`, label } : null;
};
const resolveSolidsReaction = (value) => {
  const token = normalizeSolidsToken(value);
  const byToken = {
    loved: '😍 Loved',
    liked: '😊 Liked',
    neutral: '😐 Neutral',
    disliked: '😖 Disliked',
  };
  const label = byToken[token] || (value ? `🙂 ${value}` : '');
  return label ? { key: `reaction-${token || label}`, label } : null;
};
const buildSolidsMetaParts = (food) => {
  const parts = [];
  if (food?.preparation) {
    const prep = resolveSolidsPrep(food.preparation);
    if (prep) parts.push(prep);
  }
  if (food?.amount) {
    const amount = resolveSolidsAmount(food.amount);
    if (amount) parts.push(amount);
  }
  if (food?.reaction) {
    const reaction = resolveSolidsReaction(food.reaction);
    if (reaction) parts.push(reaction);
  }
  return parts.filter(Boolean);
};
const FUTURE_TOLERANCE_MS = 60 * 1000;
const TIME_TRACE = true;
const timeTrace = (...args) => {
  if (TIME_TRACE) console.log('[TimeTrace][FeedSheet]', ...args);
};
const clampIsoToNow = (isoString) => {
  const parsed = new Date(isoString);
  const nowMs = Date.now();
  if (Number.isNaN(parsed.getTime())) return new Date(nowMs).toISOString();
  const ts = parsed.getTime();
  if (ts > nowMs + FUTURE_TOLERANCE_MS) return new Date(nowMs).toISOString();
  return parsed.toISOString();
};
const FREEZE_DEBUG = false;
const debugLog = (...args) => {
  if (FREEZE_DEBUG) console.log('[FreezeDebug][FeedSheet]', ...args);
};
const SOLIDS_HEIGHT_DEBUG = __DEV__;
const solidsHeightLog = (event, payload = {}) => {
  if (!SOLIDS_HEIGHT_DEBUG) return;
  console.log('[SolidsHeight][FeedSheet]', event, { t: Date.now(), ...payload });
};

export default function FeedSheet({
  sheetRef,
  onClose,
  entry = null,
  onSave = null,
  onAdd = null,
  preferredVolumeUnit = 'oz',
  onPreferredVolumeUnitChange = null,
  lastBottleAmountOz = null,
  activityVisibility = { bottle: true, nursing: true, solids: true },
  feedTypeRef = null,
  storage = null,
}) {
  const { colors, bottle, nursing, solids, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const isInputVariant = !entry;

  const visibleTypes = [
    activityVisibility?.bottle !== false && 'bottle',
    activityVisibility?.nursing !== false && 'nursing',
    activityVisibility?.solids !== false && 'solids',
  ].filter(Boolean);

  const defaultType = visibleTypes[0] || 'bottle';
  const initialBottleAmount = useMemo(() => {
    const n = Number(lastBottleAmountOz);
    return Number.isFinite(n) && n > 0 ? String(n) : '';
  }, [lastBottleAmountOz]);

  const getInitialType = () => {
    const fromRef = feedTypeRef?.current;
    return fromRef && visibleTypes.includes(fromRef) ? fromRef : defaultType;
  };

  const [feedType, setFeedType] = useState(getInitialType);
  const [dateTime, setDateTime] = useState(() => new Date().toISOString());
  const [ounces, setOunces] = useState(() => initialBottleAmount);
  const [amountDisplayUnit, setAmountDisplayUnit] = useState(preferredVolumeUnit === 'ml' ? 'ml' : 'oz');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState([]);
  const [existingPhotoURLs, setExistingPhotoURLs] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showDateTimeTray, setShowDateTimeTray] = useState(false);
  const [notesExpanded, setNotesExpanded] = useState(false);
  const [photosExpanded, setPhotosExpanded] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const dateTimeTouchedRef = useRef(false);
  const lastTimeTraceRef = useRef(0);
  const userEditedAmountRef = useRef(false);
  const userEditedUnitRef = useRef(false);
  const didInitOpenRef = useRef(false);

  // Nursing timers
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
  const [detailFoodId, setDetailFoodId] = useState(null);
  const [openSwipeFoodId, setOpenSwipeFoodId] = useState(null);
  const [solidsStepOneHeight, setSolidsStepOneHeight] = useState(0);
  const [solidsStepOneContentHeight, setSolidsStepOneContentHeight] = useState(0);
  const [solidsLockedContentBaseHeight, setSolidsLockedContentBaseHeight] = useState(0);
  const [solidsCtaHeight, setSolidsCtaHeight] = useState(0);
  const [recentFoods, setRecentFoods] = useState([]);
  const [customFoods, setCustomFoods] = useState([]);
  const [modeHeights, setModeHeights] = useState({ bottle: 0, nursing: 0, solids: 0 });
  const [lockedModeHeight, setLockedModeHeight] = useState(0);

  const accentMap = { bottle, nursing, solids };
  const accent = accentMap[feedType]?.primary || bottle.primary;

  // ---- Load entry / reset state on open/edit ----
  useEffect(() => {
    if (entry) {
      const t = entry.feedType || entry.type || 'bottle';

      if (t === 'nursing') {
        setLeftElapsedMs((entry.leftDurationSec || 0) * 1000);
        setRightElapsedMs((entry.rightDurationSec || 0) * 1000);
        setLastSide(entry.lastSide || null);
        setOunces('');
      } else if (t === 'solids' && entry.foods) {
        setAddedFoods(
          entry.foods.map((f) => {
            const name = String(f?.name || f || '').trim();
            const id = String(f?.id || slugifyFoodId(name));
            const def = FOOD_MAP[id] || FOOD_MAP_BY_NAME[name.toLowerCase()] || null;
            return {
              id,
              name,
              category: f?.category || def?.category || 'Custom',
              icon: f?.icon || def?.icon || null,
              emoji: f?.emoji || def?.emoji || null,
              preparation: f?.preparation || null,
              amount: f?.amount || null,
              reaction: f?.reaction || null,
            };
          })
        );
        setOunces(entry.ounces ? String(entry.ounces) : '');
      } else if (t === 'bottle') {
        setOunces(entry.ounces ? String(entry.ounces) : '');
      }

      setFeedType(t);
      const entryTs = t === 'nursing' ? (entry.startTime || entry.timestamp) : entry.timestamp;
      setDateTime(entryTs ? new Date(entryTs).toISOString() : new Date().toISOString());
      dateTimeTouchedRef.current = false;
      userEditedAmountRef.current = false;
      setNotes(entry.notes || '');
      const normalizedExisting = normalizePhotoUrls(entry.photoURLs);
      setExistingPhotoURLs(normalizedExisting);
      setNotesExpanded(Boolean(String(entry.notes || '').trim()));
      setPhotosExpanded(normalizedExisting.length > 0);
      setSolidsLockedContentBaseHeight(0);
    } else {
      setFeedType(getInitialType());
      setDateTime(new Date().toISOString());
      dateTimeTouchedRef.current = false;
      userEditedAmountRef.current = false;
      setOunces(initialBottleAmount);
      setNotes('');
      setExistingPhotoURLs([]);
      setPhotos([]);
      setLeftElapsedMs(0);
      setRightElapsedMs(0);
      setActiveSide(null);
      setLastSide(null);
      setAddedFoods([]);
      setNotesExpanded(false);
      setPhotosExpanded(false);
      setSolidsLockedContentBaseHeight(0);
    }

    if (!entry) setSolidsStep(1);
  }, [entry, initialBottleAmount]);

  // Keep bottle amount primed while closed so first render on open is never empty/0.
  useEffect(() => {
    if (isSheetOpen || entry) return;
    setOunces(initialBottleAmount);
  }, [initialBottleAmount, isSheetOpen, entry]);

  // ---- Web parity: when creating, nursing starts with empty time unless user explicitly set it ----
  useEffect(() => {
    if (!isSheetOpen || entry) return;
    if (feedType === 'nursing') {
      if (!dateTimeTouchedRef.current) {
        setDateTime('');
      }
      return;
    }
    if (!dateTimeTouchedRef.current) {
      setDateTime(new Date().toISOString());
    }
  }, [feedType, isSheetOpen, entry]);

  // Keep amount toggle aligned with preferred unit unless user manually changes it in this open session.
  useEffect(() => {
    if (!isSheetOpen || entry) return;
    if (userEditedUnitRef.current) return;
    setAmountDisplayUnit(preferredVolumeUnit === 'ml' ? 'ml' : 'oz');
  }, [preferredVolumeUnit, isSheetOpen, entry]);

  // ---- Web parity: prefill amount from latest feeding for new entries ----
  useEffect(() => {
    let cancelled = false;

    const maybePrefillFromServer = async () => {
      if (!isSheetOpen || entry) return;
      if (userEditedAmountRef.current) return;
      if (!storage) return;

      const getAllFeedings =
        storage.getAllFeedings ||
        storage.getFeedings ||
        null;
      if (typeof getAllFeedings !== 'function') return;

      try {
        const all = await getAllFeedings();
        if (cancelled || userEditedAmountRef.current) return;
        if (!Array.isArray(all) || all.length === 0) return;

        const last = all.reduce((acc, cur) => {
          if (!cur) return acc;
          const t = Number(cur.timestamp || cur.time || cur.createdAt || 0);
          if (!acc) return cur;
          const accT = Number(acc.timestamp || acc.time || acc.createdAt || 0);
          return t > accT ? cur : acc;
        }, null);

        const lastOz = Number(last?.ounces ?? last?.amountOz ?? last?.amount ?? last?.volumeOz ?? last?.volume);
        if (!Number.isFinite(lastOz) || lastOz <= 0) return;

        const lastUnitRaw = String(last?.unit || last?.amountUnit || last?.volumeUnit || '').toLowerCase();
        const lastUnit = lastUnitRaw === 'ml' || lastUnitRaw === 'oz' ? lastUnitRaw : null;
        const unit = userEditedUnitRef.current
          ? (amountDisplayUnit === 'ml' ? 'ml' : 'oz')
          : (lastUnit || (preferredVolumeUnit === 'ml' ? 'ml' : 'oz'));

        setOunces(String(lastOz));
        setAmountDisplayUnit(unit);
      } catch (_) {}
    };

    maybePrefillFromServer();
    return () => {
      cancelled = true;
    };
  }, [isSheetOpen, entry, storage, preferredVolumeUnit]);

  // ---- Solids: load recent/custom when solids active ----
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
                  if (names.some((n) => String(n || '').toLowerCase() === name.toLowerCase())) continue;
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

  // ---- Nursing ticking ----
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

  const handleToggleSide = useCallback(
    (side) => {
      if (activeSideRef.current === side) {
        stopActiveSide();
        return;
      }
      if (activeSideRef.current) stopActiveSide();
      if (!dateTime) {
        setDateTime(new Date().toISOString());
        dateTimeTouchedRef.current = false;
      }
      activeSideStartRef.current = Date.now();
      activeSideRef.current = side;
      setActiveSide(side);
      setLastSide(side);
    },
    [stopActiveSide, dateTime]
  );

  const handleClose = useCallback(() => {
    stopActiveSide();
    setIsSheetOpen(false);
    didInitOpenRef.current = false;
    dateTimeTouchedRef.current = false;
    userEditedAmountRef.current = false;
    userEditedUnitRef.current = false;
    setDetailFoodId(null);
    setOpenSwipeFoodId(null);
    if (onClose) onClose();
  }, [onClose, stopActiveSide]);

  const dismissSheet = useCallback(() => {
    if (sheetRef?.current?.dismiss) {
      sheetRef.current.dismiss();
      return;
    }
    handleClose();
  }, [sheetRef, handleClose]);

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
    dateTimeTouchedRef.current = true;
    setDateTime(clamped);
  };

  const handleSave = async () => {
    if (saving) return;
    timeTrace('save:tap', { feedType, dateTime });
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
    const saveId = `${feedType}-${saveStart}`;
    debugLog('save:start', {
      saveId,
      feedType,
      photos: photos.length,
      existingPhotos: existingPhotoURLs.length,
      hasNotes: !!(notes && String(notes).trim()),
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
      let uploadedURLs = [];

      if (storage?.uploadFeedingPhoto && photos.length > 0) {
        logStep('upload:start');
        for (let i = 0; i < photos.length; i += 1) {
          const p = photos[i];
          try {
            const url = await logAwait(`upload:item:${i}`, () => storage.uploadFeedingPhoto(p));
            uploadedURLs.push(url);
          } catch (e) {}
        }
        logStep('upload:done');
      }

      const allPhotos = [...existingPhotoURLs, ...uploadedURLs];

      if (feedType === 'bottle') {
        const oz = parseFloat(ounces) || 0;
        let createdEntry = null;
        if (oz <= 0) {
          Alert.alert('Enter amount', 'Please enter the amount.');
          setSaving(false);
          return;
        }
        if (storage) {
          logStep('bottle:write:start');
          if (entry?.id) {
            if (typeof storage.updateFeedingWithNotes === 'function') {
              await logAwait('bottle:updateFeedingWithNotes', () =>
                storage.updateFeedingWithNotes(entry.id, oz, timestamp, notes || null, allPhotos)
              );
            } else {
              await logAwait('bottle:updateFeeding', () =>
                storage.updateFeeding?.(entry.id, {
                  ounces: oz,
                  timestamp,
                  notes: notes || null,
                  photoURLs: allPhotos,
                })
              );
            }
          } else {
            if (typeof storage.addFeedingWithNotes === 'function') {
              createdEntry = await logAwait('bottle:addFeedingWithNotes', () =>
                storage.addFeedingWithNotes(oz, timestamp, notes || null, allPhotos)
              );
            } else {
              createdEntry = await logAwait('bottle:addFeeding', () =>
                storage.addFeeding?.(oz, timestamp)
              );
            }
          }
          logStep('bottle:write:done');
        }
        try {
          const hasNote = !!(notes && String(notes).trim().length > 0);
          const hasPhotos = Array.isArray(allPhotos) && allPhotos.length > 0;
          if ((hasNote || hasPhotos) && storage && typeof storage.saveMessage === 'function') {
            logStep('bottle:message:start');
            const timeLabel = new Date(timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });
            await logAwait('bottle:saveMessage', () =>
              storage.saveMessage({
                role: 'assistant',
                content: `@tinytracker: Feeding • ${timeLabel}${hasNote ? `\n${String(notes).trim()}` : ''}`,
                timestamp: Date.now(),
                source: 'log',
                logType: 'feeding',
                logTimestamp: timestamp,
                photoURLs: hasPhotos ? allPhotos : [],
              })
            );
            logStep('bottle:message:done');
          }
        } catch (_) {}
        if (onAdd && !entry) {
          logStep('bottle:onAdd:start');
          await onAdd({
            id: createdEntry?.id || null,
            type: 'bottle',
            ounces: oz,
            timestamp,
            notes: notes || null,
            photoURLs: allPhotos,
          });
          logStep('bottle:onAdd:done');
        }
      } else if (feedType === 'nursing') {
        const leftSec = Math.round(leftElapsedMs / 1000);
        const rightSec = Math.round(rightElapsedMs / 1000);
        let createdEntry = null;
        if (leftSec + rightSec <= 0) {
          Alert.alert('Track duration', 'Please track at least one side before saving.');
          setSaving(false);
          return;
        }
        if (storage) {
          logStep('nursing:write:start');
          if (entry?.id) {
            if (typeof storage.updateNursingSessionWithNotes === 'function') {
              await logAwait('nursing:updateWithNotes', () =>
                storage.updateNursingSessionWithNotes(
                  entry.id,
                  timestamp,
                  leftSec,
                  rightSec,
                  lastSide,
                  notes || null,
                  allPhotos
                )
              );
            } else {
              await logAwait('nursing:update', () =>
                storage.updateNursingSession?.(entry.id, {
                  startTime: timestamp,
                  timestamp,
                  leftDurationSec: leftSec,
                  rightDurationSec: rightSec,
                  lastSide,
                  notes: notes || null,
                  photoURLs: allPhotos,
                })
              );
            }
          }
          else if (typeof storage.addNursingSessionWithNotes === 'function') {
            createdEntry = await logAwait('nursing:addWithNotes', () =>
              storage.addNursingSessionWithNotes(
                timestamp,
                leftSec,
                rightSec,
                lastSide,
                notes || null,
                allPhotos
              )
            );
          } else {
            createdEntry = await logAwait('nursing:add', () =>
              storage.addNursingSession?.(timestamp, leftSec, rightSec, lastSide)
            );
          }
          logStep('nursing:write:done');
        }
        try {
          const hasNote = !!(notes && String(notes).trim().length > 0);
          const hasPhotos = Array.isArray(allPhotos) && allPhotos.length > 0;
          if ((hasNote || hasPhotos) && storage && typeof storage.saveMessage === 'function') {
            logStep('nursing:message:start');
            const timeLabel = new Date(timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });
            await logAwait('nursing:saveMessage', () =>
              storage.saveMessage({
                role: 'assistant',
                content: `@tinytracker: Nursing • ${timeLabel}${hasNote ? `\n${String(notes).trim()}` : ''}`,
                timestamp: Date.now(),
                source: 'log',
                logType: 'nursing',
                logTimestamp: timestamp,
                photoURLs: hasPhotos ? allPhotos : [],
              })
            );
            logStep('nursing:message:done');
          }
        } catch (_) {}
        if (onAdd && !entry) {
          logStep('nursing:onAdd:start');
          await onAdd({
            id: createdEntry?.id || null,
            type: 'nursing',
            startTime: timestamp,
            leftDurationSec: leftSec,
            rightDurationSec: rightSec,
            lastSide: lastSide,
            notes: notes || null,
            photoURLs: allPhotos,
          });
          logStep('nursing:onAdd:done');
        }
      } else if (feedType === 'solids') {
        let createdEntry = null;
        if (addedFoods.length === 0) {
          Alert.alert('Add foods', 'Please add at least one food.');
          setSaving(false);
          return;
        }
        const foods = addedFoods.map((f) => ({
          id: f.id || slugifyFoodId(f.name || ''),
          name: f.name,
          icon: f.icon || null,
          emoji: f.emoji || null,
          category: f.category || 'Custom',
          amount: f.amount || null,
          reaction: f.reaction || null,
          preparation: f.preparation || null,
          notes: f.notes || null,
        }));
        if (storage) {
          logStep('solids:write:start');
          if (entry?.id) {
            await logAwait('solids:update', () =>
              storage.updateSolidsSession?.(entry.id, { timestamp, foods, notes: notes || null, photoURLs: allPhotos })
            );
          } else {
            createdEntry = await logAwait('solids:add', () =>
              storage.addSolidsSession?.({ timestamp, foods, notes: notes || null, photoURLs: allPhotos })
            );
          }
          logStep('solids:write:done');
        }
        try {
          logStep('solids:recentFoods:start');
          const currentRecentRaw = await logAwait('solids:getRecentFoods', () =>
            storage?.getRecentFoods?.({ forceServer: true })
          );
          const currentRecent = Array.isArray(currentRecentRaw)
            ? currentRecentRaw
                .map((item) => (typeof item === 'string' ? { name: item } : item))
                .filter((item) => item && item.name)
            : [];
          let updatedRecent = [...currentRecent];
          addedFoods.forEach((food) => {
            const name = String(food?.name || '').trim();
            if (!name) return;
            const nextItem = {
              name,
              icon: food?.icon || null,
              emoji: food?.emoji || null,
              category: food?.category || 'Custom',
            };
            updatedRecent = [
              nextItem,
              ...updatedRecent.filter(
                (existing) => String(existing?.name || '').toLowerCase() !== name.toLowerCase()
              ),
            ];
          });
          updatedRecent = updatedRecent.slice(0, 20);
          if (typeof storage?.updateKidData === 'function') {
            await logAwait('solids:updateKidData', () =>
              storage.updateKidData({ recentSolidFoods: updatedRecent })
            );
          } else {
            const reversed = updatedRecent.slice().reverse();
            for (let i = 0; i < reversed.length; i += 1) {
              const item = reversed[i];
              await logAwait(`solids:updateRecentFoods:${i}`, () =>
                storage?.updateRecentFoods?.(item?.name)
              );
            }
          }
          setRecentFoods(updatedRecent);
          logStep('solids:recentFoods:done');
        } catch (e) {
          console.error('[FeedSheet] Failed to update recent foods:', e);
        }
        try {
          const hasNote = !!(notes && String(notes).trim().length > 0);
          const hasPhotos = Array.isArray(allPhotos) && allPhotos.length > 0;
          if ((hasNote || hasPhotos) && storage && typeof storage.saveMessage === 'function') {
            logStep('solids:message:start');
            const timeLabel = new Date(timestamp).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            });
            const foodNames = addedFoods.map((f) => f.name).join(', ');
            await logAwait('solids:saveMessage', () =>
              storage.saveMessage({
                role: 'assistant',
                content: `@tinytracker: Solids • ${timeLabel}\n${foodNames}${hasNote ? `\n${String(notes).trim()}` : ''}`,
                timestamp: Date.now(),
                source: 'log',
                logType: 'solids',
                logTimestamp: timestamp,
                photoURLs: hasPhotos ? allPhotos : [],
              })
            );
            logStep('solids:message:done');
          }
        } catch (_) {}
        if (onAdd && !entry) {
          logStep('solids:onAdd:start');
          await onAdd({
            id: createdEntry?.id || null,
            type: 'solids',
            timestamp,
            foods,
            notes: notes || null,
            photoURLs: allPhotos,
          });
          logStep('solids:onAdd:done');
        }
      }

      logStep('dismiss:start');
      dismissSheet();
      logStep('dismiss:done');
    } catch (e) {
      console.error('[FeedSheet] Save failed:', e);
      Alert.alert('Error', 'Failed to save.');
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

  const addFoodToList = useCallback((food) => {
    if (!food) return;
    const name = food.name || food.label || '';
    if (!name) return;
    const id = food.id || slugifyFoodId(name);
    if (!id) return;
    const def = FOOD_MAP[id] || FOOD_MAP_BY_NAME[String(name).toLowerCase()] || null;

    setAddedFoods((prev) => {
      if (prev.some((f) => f.id === id)) return prev;
      return [
        ...prev,
        {
          id,
          name,
          category: food.category || def?.category || 'Custom',
          icon: food.icon || def?.icon || null,
          emoji: food.emoji || def?.emoji || null,
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
    setOpenSwipeFoodId((prev) => (String(prev || '') === String(foodId) ? null : prev));
    setDetailFoodId((prev) => (String(prev || '') === String(foodId) ? null : prev));
  }, []);

  const updateFoodDetail = useCallback((foodId, field, value) => {
    if (!foodId || !field) return;
    setAddedFoods((prev) =>
      prev.map((f) => {
        if (String(f.id) !== String(foodId)) return f;
        const current = f[field];
        return { ...f, [field]: current === value ? null : value };
      })
    );
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
      if (!customMap.has(key))
        customMap.set(key, {
          id,
          name,
          category: 'Custom',
          icon: food.icon || (food.emoji ? null : 'SolidsIcon'),
          emoji: food.emoji || null,
          isCustom: true,
        });
    };

    customFoods.forEach(addCustom);
    addedFoods.forEach(addCustom);
    (recentFoods || []).forEach((item) => addCustom(typeof item === 'string' ? { name: item } : item));

    return [...COMMON_FOODS, ...Array.from(customMap.values())].sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [customFoods, addedFoods, recentFoods]);

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

    const normalized = recentFoods.map((item) => (typeof item === 'string' ? { name: item } : item)).filter((item) => item?.name);
    const resolved = normalized.map((item) => {
      const name = String(item.name);
      const mapped = solidsFoodByName.get(name.toLowerCase());
      return mapped
        ? { ...mapped, icon: mapped.icon || item.icon || null, emoji: mapped.emoji || item.emoji || null }
        : { id: item.id || slugifyFoodId(name), name, icon: item.icon || null, emoji: item.emoji || null };
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

  // ---- Display nursing totals ----
  const now = Date.now();
  const startRef = activeSideStartRef.current;
  const leftDisplayMs = activeSide === 'left' && startRef ? leftElapsedMs + (now - startRef) : leftElapsedMs;
  const rightDisplayMs = activeSide === 'right' && startRef ? rightElapsedMs + (now - startRef) : rightElapsedMs;
  const nursingTotalMs = leftDisplayMs + rightDisplayMs;
  const nursingParts = formatElapsedHmsTT(nursingTotalMs);

  const solidsHeaderTitle =
    feedType === 'solids' ? (solidsStep === 2 ? 'Browse foods' : solidsStep === 3 ? 'Review' : 'Solids') : null;
  const sheetTitle = feedType === 'solids' ? solidsHeaderTitle : feedType === 'nursing' ? 'Nursing' : 'Feed';

  const solidsCanSave = !!dateTime && addedFoods.length > 0;
  const solidsCanNext = addedFoods.length > 0;
  const detailFood = detailFoodId ? addedFoods.find((f) => String(f.id) === String(detailFoodId)) || null : null;
  const solidsMeasuredContentBaseHeight = Math.ceil(
    solidsStepOneContentHeight ||
      solidsStepOneHeight ||
      modeHeights.solids ||
      lockedModeHeight ||
      0
  );
  const solidsContentBaseHeight = Math.ceil(solidsLockedContentBaseHeight || solidsMeasuredContentBaseHeight || 0);
  const solidsFooterReserve = Math.ceil((solidsCtaHeight || 48) + 12 + (insets?.bottom || 0) + 50);
  const solidsStepTwoHeight = Math.ceil(solidsContentBaseHeight + solidsFooterReserve);
  const lockSolidsContentBaseHeight = useCallback(() => {
    setSolidsLockedContentBaseHeight((prev) => {
      if (prev > 0) return prev;
      const preferred = Math.ceil(Number(solidsStepOneContentHeight) || 0);
      const measured = Math.ceil(Number(solidsMeasuredContentBaseHeight) || 0);
      const next = preferred > 0 ? preferred : measured > 0 ? measured : prev;
      solidsHeightLog('lock:content-base', { prev, preferred, measured, next });
      return next;
    });
  }, [solidsMeasuredContentBaseHeight, solidsStepOneContentHeight]);

  const goFromStepOneTo = useCallback(
    (nextStep) => {
      lockSolidsContentBaseHeight();
      setSolidsStep(nextStep);
    },
    [lockSolidsContentBaseHeight]
  );

  const updateModeHeight = useCallback((mode, nextHeightRaw) => {
    const nextHeight = Math.ceil(Number(nextHeightRaw) || 0);
    if (!nextHeight) return;
    setModeHeights((prev) => {
      const prevHeight = prev[mode] || 0;
      if (Math.abs(prevHeight - nextHeight) < 1) return prev;
      return { ...prev, [mode]: nextHeight };
    });
  }, []);

  useEffect(() => {
    const heights = visibleTypes.map((type) => modeHeights[type] || 0).filter((h) => h > 0);
    if (heights.length === 0) return;
    const maxHeight = Math.max(...heights);
    setLockedModeHeight((prev) => (prev === maxHeight ? prev : maxHeight));
  }, [visibleTypes, modeHeights]);

  useEffect(() => {
    if (feedType !== 'solids' || solidsStep !== 3) {
      setDetailFoodId(null);
      setOpenSwipeFoodId(null);
    }
  }, [feedType, solidsStep]);

  const getSolidsFooter = () => {
    if (feedType !== 'solids') return null;
    if (solidsStep === 2) return null;
    if (solidsStep === 3) return { label: saving ? 'Saving...' : entry ? 'Save' : 'Add', onClick: handleSave, disabled: saving || !solidsCanSave };
    return {
      label: 'Next',
      onClick: () => {
        goFromStepOneTo(3);
      },
      disabled: !solidsCanNext,
    };
  };

  const solidsFooter = feedType === 'solids' ? getSolidsFooter() : null;

  const footer =
    solidsFooter ? (
      <Pressable
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: saving ? solids.dark || accent : accent },
          pressed && !solidsFooter.disabled && { opacity: 0.9 },
        ]}
        onLayout={(e) => {
          if (feedType !== 'solids' || solidsStep === 2) return;
          const next = Math.ceil(Number(e?.nativeEvent?.layout?.height) || 0);
          if (!next) return;
          setSolidsCtaHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
        }}
        onPress={() => {
          timeTrace('cta:press', {
            feedType,
            label: solidsFooter.label,
            disabled: !!solidsFooter.disabled,
          });
          debugLog('cta:tap', {
            feedType,
            label: solidsFooter.label,
            disabled: !!solidsFooter.disabled,
          });
          solidsFooter.onClick?.();
        }}
        disabled={solidsFooter.disabled}
      >
        <Text style={[styles.ctaText, solidsFooter.disabled && { opacity: 0.5 }]}>{solidsFooter.label}</Text>
      </Pressable>
    ) : feedType !== 'solids' ? (
      <Pressable
        style={({ pressed }) => [
          styles.cta,
          { backgroundColor: saving ? accentMap[feedType]?.dark || bottle.dark : accent },
          pressed && !saving && { opacity: 0.9 },
        ]}
        onPress={() => {
          timeTrace('cta:press', {
            feedType,
            label: saving ? 'Saving...' : entry ? 'Save' : 'Add',
            disabled: !!saving,
          });
          debugLog('cta:tap', {
            feedType,
            label: saving ? 'Saving...' : entry ? 'Save' : 'Add',
            disabled: !!saving,
          });
          handleSave();
        }}
        disabled={saving}
      >
        <Text style={styles.ctaText}>{saving ? 'Saving...' : entry ? 'Save' : 'Add'}</Text>
      </Pressable>
    ) : null;

  const handleSheetOpen = useCallback(() => {
    if (didInitOpenRef.current) {
      return;
    }
    didInitOpenRef.current = true;
    const fromRef = feedTypeRef?.current;
    const t = fromRef && ['bottle', 'nursing', 'solids'].includes(fromRef) ? fromRef : defaultType;
    setIsSheetOpen(true);
    setFeedType(t);
    if (entry) {
      setNotes(entry.notes || '');
      const normalizedExisting = normalizePhotoUrls(entry.photoURLs);
      setExistingPhotoURLs(normalizedExisting);
      setPhotos([]);
      setNotesExpanded(Boolean(String(entry.notes || '').trim()));
      setPhotosExpanded(normalizedExisting.length > 0);
      return;
    }
    if (!entry) {
      const preferredUnit = preferredVolumeUnit === 'ml' ? 'ml' : 'oz';
      setDateTime(t === 'nursing' ? '' : new Date().toISOString());
      dateTimeTouchedRef.current = false;
      userEditedAmountRef.current = false;
      userEditedUnitRef.current = false;
      setOunces(initialBottleAmount);
      setAmountDisplayUnit(preferredUnit);
      setNotes('');
      setExistingPhotoURLs([]);
      setPhotos([]);
      setLeftElapsedMs(0);
      setRightElapsedMs(0);
      setActiveSide(null);
      setLastSide(null);
      setAddedFoods([]);
      setNotesExpanded(false);
      setPhotosExpanded(false);
      setSolidsStep(1);
      setSolidsSearch('');
      setSolidsStepOneHeight(0);
      setSolidsStepOneContentHeight(0);
      setSolidsLockedContentBaseHeight(0);
      setSolidsCtaHeight(0);
    }
  }, [defaultType, feedTypeRef, entry, initialBottleAmount, preferredVolumeUnit]);

  const scrollable = false;

  useEffect(() => {
    if (feedType !== 'solids') return;
    solidsHeightLog('state', {
      step: solidsStep,
      stepOnePanel: solidsStepOneHeight,
      stepOneContent: solidsStepOneContentHeight,
      measuredBase: solidsMeasuredContentBaseHeight,
      lockedBase: solidsLockedContentBaseHeight,
      contentBase: solidsContentBaseHeight,
      footerReserve: solidsFooterReserve,
      stepTwoHeight: solidsStepTwoHeight,
      lockedModeHeight,
      solidsModeHeight: modeHeights.solids || 0,
      foods: addedFoods.length,
      notesExpanded,
      photosExpanded,
      scrollable,
    });
  }, [
    feedType,
    solidsStep,
    solidsStepOneHeight,
    solidsStepOneContentHeight,
    solidsMeasuredContentBaseHeight,
    solidsLockedContentBaseHeight,
    solidsContentBaseHeight,
    solidsFooterReserve,
    solidsStepTwoHeight,
    lockedModeHeight,
    modeHeights.solids,
    addedFoods.length,
    notesExpanded,
    photosExpanded,
    scrollable,
  ]);

  const renderNotesPhotosBlock = () => (
    <View style={styles.addonsBlock}>
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

      {notesExpanded && <TTInputRow label="Notes" value={notes} onChange={setNotes} type="text" placeholder="Add a note..." />}

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
    </View>
  );

  return (
    <>
      <HalfSheet
        sheetRef={sheetRef}
        title={sheetTitle}
        accentColor={accent}
        onClose={handleClose}
        onOpen={handleSheetOpen}
        // Deterministic sizing model:
        // - CONTENT_HEIGHT (fit content)
        // - 90% (expanded ceiling)
        snapPoints={['85%', '90%']}
        enableDynamicSizing={true}
        maxDynamicContentSize={undefined}
        scrollable={scrollable}
        footer={footer}
        useFullWindowOverlay={false}
        onHeaderBackPress={
          feedType === 'solids' && solidsStep >= 2
            ? () => {
                solidsHeightLog('nav:back-to-step1', { fromStep: solidsStep });
                setSolidsStep(1);
              }
            : undefined
        }
        headerRight={
          feedType === 'solids' && solidsStep === 2 && addedFoods.length > 0 ? (
            <Pressable
              onPress={() => {
                solidsHeightLog('nav:step2-done-to-step3', { fromStep: solidsStep });
                lockSolidsContentBaseHeight();
                setSolidsStep(3);
              }}
              style={({ pressed }) => pressed && { opacity: 0.7 }}
            >
              <Text style={styles.headerDoneText}>Done</Text>
            </Pressable>
          ) : null
        }
      >
        <View
          style={styles.feedContent}
          onLayout={(e) => {
            if (feedType !== 'solids' || solidsStep !== 1) return;
            const next = Math.ceil(Number(e?.nativeEvent?.layout?.height) || 0);
            if (!next) return;
            solidsHeightLog('layout:feed-content-step1', { height: next });
            setSolidsStepOneContentHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
          }}
        >
          {/* Mode switcher (only when creating, multiple visible types, not in solids browse/review stack) */}
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

          {!(feedType === 'solids' && solidsStep >= 2) && (
            <View style={styles.modePanels}>
              {visibleTypes.includes('bottle') && (
                <View
                  collapsable={false}
                  style={[
                    styles.modePanel,
                    feedType !== 'bottle' && styles.modePanelHidden,
                    lockedModeHeight > 0 && { minHeight: lockedModeHeight },
                  ]}
                  pointerEvents={feedType === 'bottle' ? 'auto' : 'none'}
                  onLayout={(e) => updateModeHeight('bottle', e.nativeEvent.layout.height)}
                >
                  <>
                    <TTInputRow
                      label="Time"
                      rawValue={dateTime}
                      type="datetime"
                      formatDateTime={formatDateTime}
                      onOpenPicker={() => setShowDateTimeTray(true)}
                    />
                    <AmountStepper
                      valueOz={parseFloat(ounces) || 0}
                      unit={amountDisplayUnit}
                      onChangeUnit={async (unit) => {
                        const normalized = unit === 'ml' ? 'ml' : 'oz';
                        userEditedUnitRef.current = true;
                        setAmountDisplayUnit(normalized);
                        if (typeof onPreferredVolumeUnitChange === 'function') {
                          try {
                            await onPreferredVolumeUnitChange(normalized);
                          } catch (_) {}
                        }
                      }}
                      onChangeOz={(oz) => {
                        userEditedAmountRef.current = true;
                        setOunces(String(oz));
                      }}
                    />
                    {feedType === 'bottle' && renderNotesPhotosBlock()}
                  </>
                </View>
              )}

              {visibleTypes.includes('nursing') && (
                <View
                  collapsable={false}
                  style={[
                    styles.modePanel,
                    feedType !== 'nursing' && styles.modePanelHidden,
                    lockedModeHeight > 0 && { minHeight: lockedModeHeight },
                  ]}
                  pointerEvents={feedType === 'nursing' ? 'auto' : 'none'}
                  onLayout={(e) => updateModeHeight('nursing', e.nativeEvent.layout.height)}
                >
                  <>
                    <TTInputRow
                      label="Start time"
                      rawValue={dateTime}
                      type="datetime"
                      formatDateTime={formatDateTime}
                      onOpenPicker={() => setShowDateTimeTray(true)}
                    />
                    <View style={styles.nursingTotal}>
                      <Text style={[styles.durationText, { color: colors.textPrimary }]}>
                        {nursingParts.showH && (
                          <>
                            <Text>{nursingParts.hStr}</Text>
                            <Text>{'\u200A'}</Text>
                            <Text style={[styles.unit, { color: colors.textSecondary }]}>h</Text>
                            <Text>{'  '}</Text>
                          </>
                        )}
                        {nursingParts.showM && (
                          <>
                            <Text>{nursingParts.mStr}</Text>
                            <Text>{'\u200A'}</Text>
                            <Text style={[styles.unit, { color: colors.textSecondary }]}>m</Text>
                            <Text>{'  '}</Text>
                          </>
                        )}
                        <Text>{nursingParts.sStr}</Text>
                        <Text>{'\u200A'}</Text>
                        <Text style={[styles.unit, { color: colors.textSecondary }]}>s</Text>
                      </Text>
                    </View>

                    <View style={styles.sideTimers}>
                      <SideTimer
                        side="left"
                        displayMs={leftDisplayMs}
                        isActive={activeSide === 'left'}
                        isLast={lastSide === 'left'}
                        onPress={handleToggleSide}
                        accent={nursing.primary}
                        accentSoft={nursing.soft}
                        colors={colors}
                        runningSide={activeSide}
                      />
                      <SideTimer
                        side="right"
                        displayMs={rightDisplayMs}
                        isActive={activeSide === 'right'}
                        isLast={lastSide === 'right'}
                        onPress={handleToggleSide}
                        accent={nursing.primary}
                        accentSoft={nursing.soft}
                        colors={colors}
                        runningSide={activeSide}
                      />
                    </View>
                    {feedType === 'nursing' && renderNotesPhotosBlock()}
                  </>
                </View>
              )}

              {visibleTypes.includes('solids') && (
                <View
                  collapsable={false}
                  style={[
                    styles.modePanel,
                    feedType !== 'solids' && styles.modePanelHidden,
                    lockedModeHeight > 0 && { minHeight: lockedModeHeight },
                  ]}
                  pointerEvents={feedType === 'solids' ? 'auto' : 'none'}
                  onLayout={(e) => updateModeHeight('solids', e.nativeEvent.layout.height)}
                >
                  <SolidsStepOne
                    dateTime={dateTime}
                    formatDateTime={formatDateTime}
                    onOpenPicker={() => setShowDateTimeTray(true)}
                    onContentLayout={(height) => {
                      const next = Math.ceil(Number(height) || 0);
                      if (!next) return;
                      solidsHeightLog('layout:step1-panel', { height: next });
                      setSolidsStepOneHeight((prev) => (Math.abs(prev - next) < 1 ? prev : next));
                    }}
                    solidsTileLabel={addedFoods.length === 0 ? 'Add foods' : `${addedFoods.length} food${addedFoods.length !== 1 ? 's' : ''} added`}
                    solidsTileFoods={solidsTileFoods}
                    isFoodSelected={isFoodSelected}
                    addFoodToList={addFoodToList}
                    removeFoodById={removeFoodById}
                    onBrowsePress={() => {
                      solidsHeightLog('nav:step1-browse-to-step2', { fromStep: solidsStep });
                      goFromStepOneTo(2);
                    }}
                    colors={colors}
                    solids={solids}
                  />
                </View>
              )}
            </View>
          )}

          {feedType === 'solids' && solidsStep === 2 && (
            <View
              onLayout={(e) => {
                const h = Math.ceil(Number(e?.nativeEvent?.layout?.height) || 0);
                solidsHeightLog('layout:step2-wrapper', { height: h });
              }}
              style={
                solidsStepTwoHeight > 0
                  ? { height: solidsStepTwoHeight, maxHeight: solidsStepTwoHeight }
                  : lockedModeHeight > 0
                    ? { height: lockedModeHeight + solidsFooterReserve, maxHeight: lockedModeHeight + solidsFooterReserve }
                    : null
              }
            >
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
            </View>
          )}

          {feedType === 'solids' && solidsStep === 3 && (
            <View
              onLayout={(e) => {
                const h = Math.ceil(Number(e?.nativeEvent?.layout?.height) || 0);
                solidsHeightLog('layout:step3-wrapper', { height: h });
              }}
              style={solidsContentBaseHeight > 0 ? { minHeight: solidsContentBaseHeight } : lockedModeHeight > 0 ? { minHeight: lockedModeHeight } : null}
            >
              <SolidsStepThree
                addedFoods={addedFoods}
                removeFoodById={removeFoodById}
                onOpenDetail={(foodId) => {
                  setOpenSwipeFoodId(null);
                  setDetailFoodId(foodId);
                }}
                openSwipeFoodId={openSwipeFoodId}
                setOpenSwipeFoodId={setOpenSwipeFoodId}
                colors={colors}
                solids={solids}
              />
              {renderNotesPhotosBlock()}
            </View>
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
      <TTPickerTray
        isOpen={!!detailFood}
        onClose={() => {
          setDetailFoodId(null);
          setOpenSwipeFoodId(null);
        }}
        height="52%"
        scrollEnabled={false}
        header={
          detailFood
            ? (
                <View style={styles.detailTrayHeader}>
                  <View style={styles.detailTrayHeaderLeft}>
                    <View style={[styles.detailTrayFoodIcon, { backgroundColor: colorMix(solids.primary, colors.inputBg || '#F5F5F7', 16) }]}>
                      {resolveFoodIconAsset(detailFood.icon) ? (
                        <Image source={resolveFoodIconAsset(detailFood.icon)} style={styles.detailTrayFoodIconImage} resizeMode="contain" />
                      ) : detailFood.emoji ? (
                        <Text style={styles.detailTrayFoodEmoji}>{detailFood.emoji}</Text>
                      ) : (
                        <SolidsIcon size={16} color={solids.primary} />
                      )}
                    </View>
                    <Text style={[styles.detailTrayHeaderTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      {detailFood.name}
                    </Text>
                  </View>
                  <View />
                  <Pressable
                    onPress={() => {
                      setDetailFoodId(null);
                      setOpenSwipeFoodId(null);
                    }}
                    style={({ pressed }) => pressed && { opacity: 0.6 }}
                  >
                    <Text style={[styles.detailTrayDoneText, { color: solids.primary }]}>Done</Text>
                  </Pressable>
                </View>
              )
            : null
        }
      >
        {detailFood ? (
          <View style={styles.detailTrayBody}>
            <View>
              <Text style={[styles.detailSectionLabel, { color: colors.textSecondary }]}>Preparation</Text>
              <View style={styles.detailChipsRow}>
                {SOLIDS_PREP_METHODS.map((method) => (
                  <SolidsDetailChip
                    key={method}
                    label={method}
                    icon={PREP_ICON_BY_LABEL[method] || null}
                    selected={detailFood.preparation === method}
                    dim={!!detailFood.preparation && detailFood.preparation !== method}
                    onPress={() => updateFoodDetail(detailFood.id, 'preparation', method)}
                    colors={colors}
                    solids={solids}
                  />
                ))}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionLabel, { color: colors.textSecondary }]}>Amount</Text>
              <View style={styles.detailChipsRow}>
                {SOLIDS_AMOUNTS.map((amount) => (
                  <SolidsDetailChip
                    key={amount}
                    label={amount}
                    icon={AMOUNT_ICON_BY_LABEL[amount] || AmountNoneIcon}
                    iconOnly
                    selected={detailFood.amount === amount}
                    dim={!!detailFood.amount && detailFood.amount !== amount}
                    onPress={() => updateFoodDetail(detailFood.id, 'amount', amount)}
                    colors={colors}
                    solids={solids}
                  />
                ))}
              </View>
            </View>

            <View style={styles.detailSection}>
              <Text style={[styles.detailSectionLabel, { color: colors.textSecondary }]}>Reaction</Text>
              <View style={styles.detailChipsRow}>
                {SOLIDS_REACTIONS.map((reaction) => (
                  <SolidsReactionChip
                    key={reaction.label}
                    reaction={reaction}
                    selected={detailFood.reaction === reaction.label}
                    dim={!!detailFood.reaction && detailFood.reaction !== reaction.label}
                    onPress={() => updateFoodDetail(detailFood.id, 'reaction', reaction.label)}
                    colors={colors}
                    solids={solids}
                  />
                ))}
              </View>
            </View>
          </View>
        ) : null}
      </TTPickerTray>
    </>
  );
}

function FoodTile({ food, selected, onPress, dashed, labelOverride, colors, solids }) {
  if (!food) return null;
  const emoji = food.emoji || '🍽️';
  const iconAsset = resolveFoodIconAsset(food.icon);
  const bg = selected ? colorMix(solids.primary, colors.inputBg || '#F5F5F7', 16) : colors.inputBg || '#F5F5F7';
  const border = selected ? solids.primary : colors.cardBorder || colors.borderSubtle || 'transparent';
  const labelColor = selected ? solids.primary : colors.textSecondary;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.foodTile,
        { backgroundColor: bg, borderColor: border, borderStyle: dashed ? 'dashed' : 'solid', opacity: selected ? 1 : 0.6 },
        pressed && { opacity: 0.8 },
      ]}
      onPress={onPress}
    >
      <View style={styles.foodTileIcon}>
        {iconAsset ? <Image source={iconAsset} style={styles.foodTileImage} resizeMode="contain" /> : <Text style={styles.foodTileEmoji}>{emoji}</Text>}
      </View>
      <Text style={[styles.foodTileLabel, { color: labelColor }]} numberOfLines={1}>
        {labelOverride || food.name}
      </Text>
    </Pressable>
  );
}

function SolidsStepOne({
  dateTime,
  formatDateTime,
  onOpenPicker,
  onContentLayout,
  solidsTileLabel,
  solidsTileFoods,
  isFoodSelected,
  addFoodToList,
  removeFoodById,
  onBrowsePress,
  colors,
  solids,
}) {
  return (
    <View
      style={styles.solidsStepOne}
      onLayout={(e) => {
        onContentLayout?.(e?.nativeEvent?.layout?.height || 0);
      }}
    >
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

      <Pressable
        style={({ pressed }) => [
          styles.browseButton,
          { backgroundColor: colors.inputBg, borderColor: colors.cardBorder || colors.borderSubtle },
          pressed && { opacity: 0.7 },
        ]}
        onPress={onBrowsePress}
      >
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

      <ScrollView
        style={styles.solidsBrowseScroll}
        contentContainerStyle={styles.solidsBrowseGrid}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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
              onPress={() =>
                Alert.alert('Add custom', `Add "${solidsSearch.trim()}" as custom food?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Add', onPress: () => addFoodToList({ id: slugifyFoodId(solidsSearch.trim()), name: solidsSearch.trim() }) },
                ])
              }
              dashed
              labelOverride={`Add "${solidsSearch.trim().slice(0, 12)}${solidsSearch.length > 12 ? '…' : ''}"`}
              colors={colors}
              solids={solids}
            />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function SolidsStepThree({ addedFoods, removeFoodById, onOpenDetail, openSwipeFoodId, setOpenSwipeFoodId, colors, solids }) {
  return (
    <View style={styles.solidsStepThree}>
      <View style={styles.solidsReviewList}>
        {addedFoods.map((food) => {
          const rowId = String(food.id);
          const iconAsset = resolveFoodIconAsset(food.icon);
          const summaryParts = buildSolidsMetaParts(food);
          return (
            <TimelineSwipeRow
              key={rowId}
              card={{ id: rowId }}
              isSwipeEnabled
              onEdit={() => onOpenDetail?.(rowId)}
              onDelete={() => removeFoodById(food.id)}
              onRowPress={() => onOpenDetail?.(rowId)}
              openSwipeId={openSwipeFoodId}
              setOpenSwipeId={setOpenSwipeFoodId}
            >
              <View style={[styles.solidsReviewRowInner, { backgroundColor: colors.inputBg }]}>
                <View style={[styles.solidsReviewIcon, { backgroundColor: colorMix(solids.primary, colors.inputBg || '#F5F5F7', 20) }]}>
                  {iconAsset ? (
                    <Image source={iconAsset} style={styles.solidsReviewIconImage} resizeMode="contain" />
                  ) : food.emoji ? (
                    <Text style={styles.solidsReviewEmoji}>{food.emoji}</Text>
                  ) : (
                    <SolidsIcon size={20} color={solids.primary} />
                  )}
                </View>

                <View style={styles.solidsReviewContent}>
                  <Text style={[styles.solidsReviewName, { color: colors.textPrimary }]}>{food.name}</Text>
                  {summaryParts.length > 0 && (
                    <View style={styles.solidsReviewMetaRow}>
                      {summaryParts.map((part, idx) => {
                        const MetaIcon = part.icon || null;
                        return (
                          <View key={part.key || `${rowId}-meta-${idx}`} style={styles.solidsReviewMetaItem}>
                            {idx > 0 ? <Text style={[styles.solidsReviewMetaDot, { color: colors.textTertiary }]}>•</Text> : null}
                            <View style={styles.solidsReviewMetaInner}>
                              {MetaIcon ? <MetaIcon size={14} color={colors.textTertiary} /> : null}
                              <Text style={[styles.solidsReviewMetaText, { color: colors.textTertiary }]}>{part.label}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                <ChevronRightIcon size={20} color={colors.textTertiary} />
              </View>
            </TimelineSwipeRow>
          );
        })}
      </View>
    </View>
  );
}

function SolidsDetailChip({ label, icon: Icon, selected, dim, onPress, colors, solids, iconOnly = false }) {
  const bg = selected ? solids.primary : colors.inputBg || '#F5F5F7';
  const color = selected ? colors.textOnAccent || '#fff' : colors.textSecondary;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        iconOnly ? styles.detailChipIconOnly : styles.detailChip,
        { backgroundColor: bg, opacity: dim ? 0.35 : 1 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <View style={styles.detailChipIconWrap}>
        {Icon ? <Icon size={iconOnly ? 28 : 24} color={color} /> : null}
      </View>
      {!iconOnly && <Text style={[styles.detailChipText, { color }]}>{label}</Text>}
    </Pressable>
  );
}

function SolidsReactionChip({ reaction, selected, dim, onPress, colors, solids }) {
  const bg = selected ? solids.primary : colors.inputBg || '#F5F5F7';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.detailChipIconOnly,
        { backgroundColor: bg, opacity: dim ? 0.35 : 1 },
        pressed && { opacity: 0.8 },
      ]}
    >
      <Text style={styles.detailReactionEmoji} allowFontScaling={false}>
        {reaction.emoji}
      </Text>
    </Pressable>
  );
}

function FeedTypeButton({ label, icon: Icon, selected, accent, onPress, colors, isDark }) {
  const inputBg = colors.inputBg || (isDark ? '#3C3E43' : '#F5F5F7');
  const bg = selected && !isDark ? colorMix(accent, inputBg, 16) : inputBg;
  const border = selected ? accent : colors.cardBorder || colors.borderSubtle || (isDark ? '#1A1A1A' : '#EBEBEB');
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
  const color = isActive ? accent : runningSide ? colors.textTertiary : colors.textSecondary;
  const bg = isActive ? colorMix(accent, colors.inputBg || '#F5F5F7', 16) : colors.inputBg || '#F5F5F7';
  const border = isActive ? accent : colors.cardBorder || colors.borderSubtle || 'transparent';

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

      <Pressable style={({ pressed }) => [styles.sideTimer, { backgroundColor: bg, borderColor: border }, pressed && { opacity: 0.7 }]} onPress={() => onPress(side)}>
        {isActive ? <PauseIcon size={28} color={color} /> : <PlayIcon size={28} color={color} />}
        <Text style={[styles.sideTime, { color }]}>{parts.str}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  // Content
  feedContent: {
    gap: 0,
  },

  modePanels: {
    position: 'relative',
  },

  modePanel: {
    width: '100%',
  },

  modePanelHidden: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    opacity: 0,
  },

  feedTypePicker: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 12,
    paddingBottom: 8,
  },

  feedTypeButton: {
    flex: 1,
    height: 60,
    borderRadius: 16,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },

  feedTypeLabel: {
    fontSize: 13,
    fontWeight: '600',
  },

  nursingTotal: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    marginBottom: 4,
  },

  durationText: {
    fontSize: 40,
    fontWeight: '700',
    lineHeight: 40,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },

  unit: {
    fontSize: 30,
    fontWeight: '300',
    lineHeight: 30,
    includeFontPadding: false,
  },

  sideTimers: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 56,
    paddingTop: 0,
    paddingBottom: 4,
    marginBottom: 0,
  },

  sideTimerWrap: {
    position: 'relative',
    alignItems: 'center',
  },

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

  sideTime: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },

  // Solids tiles
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
  foodTileImage: {
    width: 28,
    height: 28,
    transform: [{ scale: 1.65 }],
  },

  foodTileLabel: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    maxWidth: '90%',
  },

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
    flex: 1,
    minHeight: 0,
  },
  solidsBrowseScroll: {
    flex: 1,
    minHeight: 0,
  },

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
    gap: 0,
  },

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
  solidsReviewIconImage: {
    width: 20,
    height: 20,
    transform: [{ scale: 1.65 }],
  },

  solidsReviewContent: {
    flex: 1,
  },

  solidsReviewName: {
    fontSize: 16,
    fontWeight: '500',
  },
  solidsReviewMetaRow: {
    marginTop: 4,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  solidsReviewMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  solidsReviewMetaDot: {
    paddingHorizontal: 6,
    fontSize: 12,
    lineHeight: 12,
  },
  solidsReviewMetaInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  solidsReviewMetaText: {
    fontSize: 12,
  },

  detailTrayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailTrayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  detailTrayFoodIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTrayFoodIconImage: {
    width: 16,
    height: 16,
    transform: [{ scale: 1.65 }],
  },
  detailTrayFoodEmoji: {
    fontSize: 16,
    lineHeight: 16,
  },
  detailTrayHeaderTitle: {
    fontSize: 17,
    fontWeight: '600',
    flexShrink: 1,
  },
  detailTrayDoneText: {
    fontSize: 17,
    fontWeight: '600',
  },
  detailTrayBody: {
    paddingHorizontal: 16,
  },
  detailSection: {
    marginTop: 24,
  },
  detailSectionLabel: {
    fontSize: 12,
    marginBottom: 12,
  },
  detailChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    paddingBottom: 4,
  },
  detailChip: {
    borderRadius: 12,
    minWidth: 64,
    minHeight: 58,
    paddingHorizontal: 8,
    paddingVertical: 12,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  detailChipIconOnly: {
    borderRadius: 12,
    minWidth: 52,
    minHeight: 52,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailChipIconWrap: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  detailChipText: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 13,
  },
  detailReactionEmoji: {
    fontSize: 32,
    lineHeight: 34,
    includeFontPadding: false,
  },
  // Add row
  addonsBlock: {
    marginTop: 12,
    paddingBottom: 6,
  },

  addRow: {
    flexDirection: 'row',
    gap: 12,
    paddingTop: 0,
    paddingBottom: 0,
  },

  addItem: {
    flex: 1,
    paddingVertical: 12,
  },

  addText: {
    fontSize: 16,
  },

  // CTA
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

  headerDoneText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});
