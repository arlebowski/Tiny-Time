import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Screens
import TrackerScreen from './src/screens/TrackerScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import FamilyScreen from './src/screens/FamilyScreen';

// Sheets
import DiaperSheet from './src/components/sheets/DiaperSheet';
import SleepSheet from './src/components/sheets/SleepSheet';
import FeedSheet from './src/components/sheets/FeedSheet';
import DetailScreen from './src/screens/DetailScreen';
import BottomNavigationShell from './src/components/navigation/BottomNavigationShell';

// Icons (1:1 from web/components/shared/icons.js)
// Web uses HomeIcon (not HouseIcon) for header
import {
  BrandLogo,
  ChevronDownIcon,
  ShareIcon,
  HomeIcon,
} from './src/components/icons';

// Bottom nav tuning:
// NAV_MIN_HEIGHT makes the entire bottom nav bar taller or shorter.
const NAV_MIN_HEIGHT = 50;
// NAV_TOP_PADDING adds/removes empty space at the top inside the nav bar.
const NAV_TOP_PADDING = 4;
// NAV_CLUSTER_OFFSET_Y moves Track, Plus, and Trends together:
// positive = lower on screen, negative = higher on screen.
const NAV_CLUSTER_OFFSET_Y = 10;
// Base vertical positions for tabs and plus. Usually keep these fixed.
const BASE_TAB_SHIFT_Y = -4;
const BASE_PLUS_BOTTOM_OFFSET = 24;
// Final values passed into BottomNavigationShell.
const NAV_TAB_SHIFT_Y = BASE_TAB_SHIFT_Y + NAV_CLUSTER_OFFSET_Y;
const NAV_PLUS_BOTTOM_OFFSET = BASE_PLUS_BOTTOM_OFFSET - NAV_CLUSTER_OFFSET_Y;
// NAV_FADE_HEIGHT controls only the gradient thickness above the nav.
// It does not change nav height.
const NAV_FADE_HEIGHT = 20;

// ── Header (web: script.js lines 3941-4201) ──
// Web: sticky top-0 z-[1200], bg var(--tt-header-bg) = appBg
// Inner: pt-4 pb-6 px-4, grid grid-cols-3 items-center
function AppHeader({ onFamilyPress }) {
  const { colors, bottle } = useTheme();
  return (
    <View style={[headerStyles.container, { backgroundColor: colors.appBg }]}>
      <View style={headerStyles.inner}>
        {/* LEFT: Kid picker (web lines 3955-4006) */}
        {/* Web: outer span bg var(--tt-input-bg), inner (no photo) bg var(--tt-feed-soft) = bottle.soft */}
        <Pressable style={headerStyles.kidPicker}>
          <View style={[headerStyles.avatar, { backgroundColor: colors.inputBg }]}>
            <View style={[headerStyles.avatarInner, { backgroundColor: bottle.soft }]} />
          </View>
          <Text style={[headerStyles.kidName, { color: colors.textPrimary }]}>Levi</Text>
          <ChevronDownIcon size={20} color={colors.textTertiary} />
        </Pressable>

        {/* MIDDLE: Brand logo (web lines 4008-4026) */}
        {/* Web: color var(--tt-brand-icon) = #FF4D79 */}
        <View style={headerStyles.logoContainer}>
          <BrandLogo size={26.4} color={colors.brandIcon} />
        </View>

        {/* RIGHT: Share + Home/Family (web lines 4102-4147) */}
        {/* Web: hover:bg-[var(--tt-seg-track)] — native uses segTrack on press */}
        <View style={headerStyles.rightButtons}>
          <Pressable style={({ pressed }) => [headerStyles.iconButton, pressed && { backgroundColor: colors.segTrack }]}>
            <ShareIcon size={24} color={colors.textPrimary} />
          </Pressable>
          <Pressable
            onPress={onFamilyPress}
            style={({ pressed }) => [headerStyles.iconButton, pressed && { backgroundColor: colors.segTrack }]}
          >
            <HomeIcon size={24} color={colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {},
  // Web: pt-4 pb-6 px-4, grid grid-cols-3 items-center
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,        // pt-4
    paddingBottom: 24,     // pb-6
    paddingHorizontal: 16, // px-4
  },
  // Web: flex items-center gap-[10px]
  kidPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,               // gap-[10px]
  },
  // Web: w-[36px] h-[36px] rounded-full overflow-hidden, outer bg var(--tt-input-bg)
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
  },
  // Web: inner (no photo) bg var(--tt-feed-soft) = bottle.soft
  avatarInner: {
    width: '100%',
    height: '100%',
  },
  // Web: text-2xl font-extrabold leading-none, color var(--tt-text-primary)
  kidName: {
    fontSize: 24,          // text-2xl
    fontWeight: '800',     // font-extrabold
    ...Platform.select({
      ios: { fontFamily: 'System' },
    }),
  },
  // Web: flex items-center justify-center
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Web: flex items-center justify-end gap-0.5
  rightButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,                // gap-0.5
  },
  // Web: w-11 h-11 flex items-center justify-center rounded-xl
  iconButton: {
    width: 44,             // w-11
    height: 44,            // h-11
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,      // rounded-xl
  },
});

// ── App shell (uses theme for all colors) ──
function AppShell({ activeTab, onTabChange, themeKey, isDark, onThemeChange, onDarkModeChange }) {
  const { colors } = useTheme();
  const appBg = colors.appBg;

  const diaperRef = useRef(null);
  const sleepRef = useRef(null);
  const feedRef = useRef(null);

  const feedTypeRef = useRef('bottle');
  const [lastFeedVariant, setLastFeedVariant] = useState('bottle');
  const [editEntry, setEditEntry] = useState(null);
  const timelineRefreshRef = useRef(null);
  const [detailFilter, setDetailFilter] = useState(null);
  const [analyticsDetailOpen, setAnalyticsDetailOpen] = useState(false);
  const [analyticsResetSignal, setAnalyticsResetSignal] = useState(0);

  const handleCardTap = useCallback((filterType) => {
    setDetailFilter(filterType);
  }, []);

  const handleDetailBack = useCallback(() => {
    setDetailFilter(null);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('tt_last_feed_variant').then((stored) => {
      if (stored === 'nursing' || stored === 'bottle') setLastFeedVariant(stored);
    }).catch(() => {});
  }, []);

  const handleTrackerSelect = useCallback((type) => {
    if (type === 'diaper') diaperRef.current?.present?.();
    else if (type === 'sleep') sleepRef.current?.present?.();
    else if (['bottle', 'nursing', 'solids'].includes(type)) {
      feedTypeRef.current = type;
      feedRef.current?.present?.();
    }
  }, []);

  const handleFeedAdded = useCallback((entry) => {
    if (entry?.type === 'bottle' || entry?.type === 'nursing') {
      setLastFeedVariant(entry.type);
      AsyncStorage.setItem('tt_last_feed_variant', entry.type).catch(() => {});
    }
  }, []);

  const handleEditCard = useCallback((card) => {
    if (!card) return;
    const entry = { ...card };
    entry.notes = card.note ?? card.notes ?? '';
    entry.photoURLs = card.photoURLs ?? [];
    if (card.type === 'feed') {
      if (card.feedType === 'bottle') {
        entry.ounces = card.amount ?? card.ounces;
      } else if (card.feedType === 'nursing') {
        entry.timestamp = card.timestamp ?? card.startTime;
      }
      feedTypeRef.current = card.feedType || 'bottle';
    } else if (card.type === 'sleep') {
      entry.startTime = card.startTime;
      entry.endTime = card.endTime;
    } else if (card.type === 'diaper') {
      entry.timestamp = card.timestamp;
      entry.isWet = !!card.isWet;
      entry.isPoo = !!card.isPoo;
      entry.isDry = !card.isWet && !card.isPoo;
    }
    setEditEntry(entry);
    if (card.type === 'feed') {
      feedRef.current?.present?.();
    } else if (card.type === 'sleep') {
      sleepRef.current?.present?.();
    } else if (card.type === 'diaper') {
      diaperRef.current?.present?.();
    }
  }, []);

  const handleCloseFeed = useCallback(() => {
    setEditEntry(null);
    feedRef.current?.dismiss?.();
    setTimeout(() => timelineRefreshRef.current?.(), 0);
  }, []);

  const handleCloseSleep = useCallback(() => {
    setEditEntry(null);
    sleepRef.current?.dismiss?.();
    setTimeout(() => timelineRefreshRef.current?.(), 0);
  }, []);

  const handleCloseDiaper = useCallback(() => {
    setEditEntry(null);
    diaperRef.current?.dismiss?.();
    setTimeout(() => timelineRefreshRef.current?.(), 0);
  }, []);

  const handleTabChange = useCallback((nextTab) => {
    if (nextTab === activeTab && nextTab === 'trends') {
      setAnalyticsResetSignal((s) => s + 1);
      setAnalyticsDetailOpen(false);
      return;
    }
    if (nextTab !== activeTab) {
      onTabChange(nextTab);
      if (nextTab !== 'trends') {
        setAnalyticsDetailOpen(false);
      }
    }
  }, [activeTab, onTabChange]);

  return (
    <>
      <SafeAreaView style={[appStyles.safe, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
        {detailFilter == null && !(activeTab === 'trends' && analyticsDetailOpen) ? <AppHeader onFamilyPress={() => handleTabChange('family')} /> : null}
        <View style={appStyles.content}>
          {detailFilter != null ? (
            <DetailScreen
              initialFilter={detailFilter}
              onBack={handleDetailBack}
              onOpenSheet={handleTrackerSelect}
              onEditCard={handleEditCard}
              onDeleteCard={null}
              timelineRefreshRef={timelineRefreshRef}
            />
          ) : (
            <>
              {activeTab === 'tracker' && (
                <TrackerScreen
                  onOpenSheet={handleTrackerSelect}
                  onCardTap={handleCardTap}
                  onEditCard={handleEditCard}
                  onDeleteCard={null}
                  timelineRefreshRef={timelineRefreshRef}
                />
              )}
              {activeTab === 'trends' && (
                <AnalyticsScreen
                  onDetailOpenChange={setAnalyticsDetailOpen}
                  resetSignal={analyticsResetSignal}
                />
              )}
              {activeTab === 'family' && (
                <FamilyScreen
                  themeKey={themeKey}
                  onThemeChange={onThemeChange}
                  isDark={isDark}
                  onDarkModeChange={onDarkModeChange}
                />
              )}
            </>
          )}

          {/* Gradient fade above nav (web script.js:4352-4366) */}
          <LinearGradient
            colors={[`${appBg}FF`, `${appBg}FF`, `${appBg}00`]}
            locations={[0, 0.3, 1]}
            start={{ x: 0.5, y: 1 }}
            end={{ x: 0.5, y: 0 }}
            style={appStyles.fadeGradient}
            pointerEvents="none"
          />
        </View>
      </SafeAreaView>

      <BottomNavigationShell
        appBg={appBg}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onTrackerSelect={handleTrackerSelect}
        lastFeedVariant={lastFeedVariant}
        navMinHeight={NAV_MIN_HEIGHT}
        navTopPadding={NAV_TOP_PADDING}
        tabShiftY={NAV_TAB_SHIFT_Y}
        plusBottomOffset={NAV_PLUS_BOTTOM_OFFSET}
      />

      <DiaperSheet
        sheetRef={diaperRef}
        entry={editEntry?.type === 'diaper' ? editEntry : null}
        onClose={handleCloseDiaper}
      />
      <SleepSheet
        sheetRef={sleepRef}
        entry={editEntry?.type === 'sleep' ? editEntry : null}
        onClose={handleCloseSleep}
      />
      <FeedSheet
        sheetRef={feedRef}
        feedTypeRef={feedTypeRef}
        entry={editEntry?.type === 'feed' ? editEntry : null}
        onAdd={handleFeedAdded}
        onClose={handleCloseFeed}
      />
    </>
  );
}

// ── App Root ──
export default function App() {
  const [activeTab, setActiveTab] = useState('tracker');
  const [themeKey, setThemeKey] = useState('theme1');
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('tt_theme_key'),
      AsyncStorage.getItem('tt_dark_mode'),
    ]).then(([storedTheme, storedDark]) => {
      if (storedTheme) setThemeKey(storedTheme);
      if (storedDark !== null) setIsDark(storedDark === 'true');
    }).catch(() => {});
  }, []);

  const handleThemeChange = useCallback((nextKey) => {
    setThemeKey(nextKey);
    AsyncStorage.setItem('tt_theme_key', nextKey).catch(() => {});
  }, []);

  const handleDarkModeChange = useCallback((nextIsDark) => {
    setIsDark(nextIsDark);
    AsyncStorage.setItem('tt_dark_mode', String(nextIsDark)).catch(() => {});
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider themeKey={themeKey} isDark={isDark}>
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
          <BottomSheetModalProvider>
            <AppShell
              activeTab={activeTab}
              onTabChange={setActiveTab}
              themeKey={themeKey}
              isDark={isDark}
              onThemeChange={handleThemeChange}
              onDarkModeChange={handleDarkModeChange}
            />
          </BottomSheetModalProvider>
        </SafeAreaProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const appStyles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  // Visual fade above the nav; thickness is controlled by NAV_FADE_HEIGHT.
  fadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: NAV_FADE_HEIGHT,
  },
});
