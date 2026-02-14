import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';

// Screens
import TrackerScreen from './src/screens/TrackerScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';

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
  PlusIcon,
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

// ── Bottom Nav (web: script.js lines 4377-4469, FloatingTrackerMenu.js:296-311) ──
// Web: both tabs use textPrimary; plus at bottom 70px (FTM position)
function BottomNav({ activeTab, onTabChange, onPlusPress }) {
  const { colors, shadows } = useTheme();
  const tabColor = colors.textPrimary; // Web uses textPrimary for both selected and unselected

  return (
    <View style={[navStyles.container, { backgroundColor: colors.appBg }]}>
      <View style={navStyles.inner}>
        {/* Track tab (web lines 4399-4428) */}
        <Pressable
          style={navStyles.tab}
          onPress={() => onTabChange('tracker')}
        >
          {activeTab === 'tracker'
            ? <TodayIconFill size={24} color={tabColor} />
            : <TodayIcon size={24} color={tabColor} />
          }
          <Text style={[navStyles.tabLabel, { color: tabColor }]}>Track</Text>
        </Pressable>

        {/* Plus spacer (web lines 4430-4437) */}
        <View style={navStyles.tabSpacer} />

        {/* Trends tab (web lines 4438-4468) */}
        <Pressable
          style={navStyles.tab}
          onPress={() => onTabChange('trends')}
        >
          {activeTab === 'trends'
            ? <TrendsIconFill size={24} color={tabColor} />
            : <TrendsIcon size={24} color={tabColor} />
          }
          <Text style={[navStyles.tabLabel, { color: tabColor }]}>Trends</Text>
        </Pressable>
      </View>

      {/* Floating + button (web FloatingTrackerMenu.js:296-311) */}
      {/* Web: 64x64 circle, bottom 70px from viewport, bg plusBg, fg plusFg, shadow-floating */}
      <Pressable
        style={({ pressed }) => [
          navStyles.plusButton,
          { backgroundColor: colors.plusBg },
          shadows.floating,
          pressed && navStyles.plusButtonPressed,
        ]}
        onPress={onPlusPress}
      >
        <PlusIcon size={21.6} color={colors.plusFg} />
      </Pressable>
    </View>
  );
}

const navStyles = StyleSheet.create({
  // Web: minHeight 80px, paddingTop 10px, overflow visible for gradient + plus
  container: {
    minHeight: 80,
    paddingTop: 10,
    overflow: 'visible',
  },
  // Web: flex items-center justify-between px-4 py-3
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16, // px-4
    paddingVertical: 12,   // py-3
  },
  // Web: flex-1 py-2 flex flex-col items-center gap-1, transform translateY(-15px)
  tab: {
    flex: 1,
    paddingVertical: 8,    // py-2
    alignItems: 'center',
    gap: 4,                // gap-1
    transform: [{ translateY: -15 }],  // web: translateY(-15px)
  },
  // Web: plus spacer — flex-1 py-2, translateY(-15px)
  tabSpacer: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -15 }],
  },
  // Web: text-xs font-light (color from theme)
  tabLabel: {
    fontSize: 12,          // text-xs
    fontWeight: '300',     // font-light
  },
  // Floating plus (web FloatingTrackerMenu.js:296-311)
  // Web: 64x64 circle, bottom: calc(env(safe-area-inset-bottom) + 70px) → 70px from nav bottom
  plusButton: {
    position: 'absolute',
    bottom: 70,
    left: '50%',
    marginLeft: -32,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  plusButtonPressed: {
    transform: [{ scale: 0.95 }],  // web: whileTap scale 0.95
  },
});

// ── App shell (uses theme for all colors) ──
function AppShell({ activeTab, onTabChange, onPlusPress }) {
  const { colors } = useTheme();
  const appBg = colors.appBg;

  return (
    <>
      <SafeAreaView style={[appStyles.safe, { backgroundColor: appBg }]} edges={['top', 'left', 'right']}>
        <AppHeader />
        <View style={appStyles.content}>
          {activeTab === 'tracker' && <TrackerScreen />}
          {activeTab === 'trends' && <AnalyticsScreen />}

          {/* Gradient fade above nav (web script.js:4352-4366) */}
          {/* linear-gradient(to top, appBg 0%, appBg 30%, transparent 100%) */}
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
        <BottomNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          onPlusPress={onPlusPress}
        />
      </SafeAreaView>
    </>
  );
}

// ── App Root ──
export default function App() {
  const [activeTab, setActiveTab] = useState('tracker');

  return (
    <ThemeProvider themeKey="theme1" isDark={false}>
      <SafeAreaProvider>
        <AppShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onPlusPress={() => console.log('Quick add pressed')}
        />
      </SafeAreaProvider>
    </ThemeProvider>
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
