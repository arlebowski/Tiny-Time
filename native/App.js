import React, { useState, useRef, useCallback, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Screens
import TrackerScreen from './src/screens/TrackerScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';

// Sheets
import DiaperSheet from './src/components/sheets/DiaperSheet';
import SleepSheet from './src/components/sheets/SleepSheet';
import FeedSheet from './src/components/sheets/FeedSheet';
import FloatingTrackerMenu from './src/components/sheets/FloatingTrackerMenu';

// Icons (1:1 from web/components/shared/icons.js)
// Web uses HomeIcon (not HouseIcon) for header
import {
  TodayIcon,
  TodayIconFill,
  TrendsIcon,
  TrendsIconFill,
  BrandLogo,
  ChevronDownIcon,
  ShareIcon,
  HomeIcon,
} from './src/components/icons';

// ── Header (web: script.js lines 3941-4201) ──
// Web: sticky top-0 z-[1200], bg var(--tt-header-bg) = appBg
// Inner: pt-4 pb-6 px-4, grid grid-cols-3 items-center
function AppHeader() {
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

        {/* RIGHT: Share + Home (web lines 4102-4147) */}
        {/* Web: hover:bg-[var(--tt-seg-track)] — native uses segTrack on press */}
        <View style={headerStyles.rightButtons}>
          <Pressable style={({ pressed }) => [headerStyles.iconButton, pressed && { backgroundColor: colors.segTrack }]}>
            <ShareIcon size={24} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={({ pressed }) => [headerStyles.iconButton, pressed && { backgroundColor: colors.segTrack }]}>
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

// ── Bottom Nav (web: script.js 4392-4466 when using FloatingTrackerMenu) ──
// Web: Track | spacer | Trends. Plus floats separately via FloatingTrackerMenu (not in nav row)
function BottomNav({ activeTab, onTabChange }) {
  const { colors } = useTheme();
  const tabColor = colors.textPrimary;

  return (
    <View style={[navStyles.container, { backgroundColor: colors.appBg }]}>
      <View style={navStyles.inner}>
        {/* Track tab */}
        <Pressable style={navStyles.tab} onPress={() => onTabChange('tracker')}>
          {activeTab === 'tracker'
            ? <TodayIconFill size={24} color={tabColor} />
            : <TodayIcon size={24} color={tabColor} />
          }
          <Text style={[navStyles.tabLabel, { color: tabColor }]}>Track</Text>
        </Pressable>

        {/* Plus spacer — web: flex-1, plus floats above via FloatingTrackerMenu */}
        <View style={navStyles.tabSpacer} />

        {/* Trends tab */}
        <Pressable style={navStyles.tab} onPress={() => onTabChange('trends')}>
          {activeTab === 'trends'
            ? <TrendsIconFill size={24} color={tabColor} />
            : <TrendsIcon size={24} color={tabColor} />
          }
          <Text style={[navStyles.tabLabel, { color: tabColor }]}>Trends</Text>
        </Pressable>
      </View>
    </View>
  );
}

const navStyles = StyleSheet.create({
  // Web: minHeight 80px, paddingTop 10px, paddingBottom env(safe-area)
  container: {
    minHeight: 80,
    paddingTop: 10,
    overflow: 'visible',
  },
  // Web: flex items-center justify-between px-4 py-3 — Track | Plus | Trends in one row
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // px-4
    paddingVertical: 12,   // py-3
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
    transform: [{ translateY: -15 }],
  },
  tabSpacer: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -15 }],
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '300',
  },
});

// ── App shell (uses theme for all colors) ──
function AppShell({ activeTab, onTabChange }) {
  const { colors } = useTheme();
  const appBg = colors.appBg;

  const diaperRef = useRef(null);
  const sleepRef = useRef(null);
  const feedRef = useRef(null);

  const feedTypeRef = useRef('bottle');
  const [lastFeedVariant, setLastFeedVariant] = useState('bottle');

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

  return (
    <>
      <SafeAreaView style={[appStyles.safe, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
        <AppHeader />
        <View style={appStyles.content}>
          {activeTab === 'tracker' && <TrackerScreen onOpenSheet={handleTrackerSelect} />}
          {activeTab === 'trends' && <AnalyticsScreen />}

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

      <SafeAreaView edges={['bottom']} style={[appStyles.bottomSafe, { backgroundColor: appBg }]}>
        <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
      </SafeAreaView>

      <FloatingTrackerMenu onSelect={handleTrackerSelect} lastFeedVariant={lastFeedVariant} />

      <DiaperSheet sheetRef={diaperRef} onClose={() => diaperRef.current?.dismiss?.()} />
      <SleepSheet sheetRef={sleepRef} onClose={() => sleepRef.current?.dismiss?.()} />
      <FeedSheet sheetRef={feedRef} feedTypeRef={feedTypeRef} onAdd={handleFeedAdded} onClose={() => feedRef.current?.dismiss?.()} />
    </>
  );
}

// ── App Root ──
export default function App() {
  const [activeTab, setActiveTab] = useState('tracker');

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider themeKey="theme1" isDark={false}>
        <SafeAreaProvider>
          <BottomSheetModalProvider>
            <AppShell
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onPlusPress={() => {}}
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
  // Web: 100px total but overlaps nav; effective visible fade ~70px over content
  fadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
  },
  bottomSafe: {
    overflow: 'visible',
    zIndex: 50,
  },
});
