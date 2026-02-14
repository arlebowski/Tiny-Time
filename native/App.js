import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { ThemeProvider } from './src/context/ThemeContext';

// Screens
import TrackerScreen from './src/screens/TrackerScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';

// ── Colors from web/theme/tokens.js ──
// Light mode: LIGHT_BASE + LIGHT_MODE_TOKENS
const COLORS = {
  appBg: '#FAF6EB',         // LIGHT_BASE.appBg — header, nav, page bg
  textPrimary: '#212121',   // LIGHT_BASE.textPrimary
  textSecondary: '#666666', // LIGHT_BASE.textSecondary
  textTertiary: '#9E9E9E',  // LIGHT_BASE.textTertiary
  brandIcon: '#FF4D79',     // LIGHT_MODE_TOKENS.brandIcon
  feedSoft: '#fbb3be',      // theme1.bottle.soft — kid avatar placeholder
  plusBg: '#1A1A1A',        // LIGHT_MODE_TOKENS.plusBg (tokens.js:190)
  plusFg: '#FFFFFF',         // LIGHT_MODE_TOKENS.plusFg (tokens.js:191)
  segTrack: '#F0EBE0',      // LIGHT_MODE_TOKENS.segTrack = LIGHT_BASE.track
  borderSubtle: '#EBEBEB',  // LIGHT_BASE.borderSubtle
};

// ── SVG Icons (exact ports from web/components/shared/icons.js) ──

// web icons.js:323-330 — TodayIcon regular weight (outline)
const TodayIconOutline = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm72,88a64,64,0,1,1-64-64A64.07,64.07,0,0,1,192,128Zm-16,0a48,48,0,1,0-48,48A48.05,48.05,0,0,0,176,128ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z" />
  </Svg>
);

// web icons.js:333-338 — TodayIcon fill weight (solid) — selected state
const TodayIconFill = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M120,40V16a8,8,0,0,1,16,0V40a8,8,0,0,1-16,0Zm8,24a64,64,0,1,0,64,64A64.07,64.07,0,0,0,128,64ZM58.34,69.66A8,8,0,0,0,69.66,58.34l-16-16A8,8,0,0,0,42.34,53.66Zm0,116.68-16,16a8,8,0,0,0,11.32,11.32l16-16a8,8,0,0,0-11.32-11.32ZM192,72a8,8,0,0,0,5.66-2.34l16-16a8,8,0,0,0-11.32-11.32l-16,16A8,8,0,0,0,192,72Zm5.66,114.34a8,8,0,0,0-11.32,11.32l16,16a8,8,0,0,0,11.32-11.32ZM48,128a8,8,0,0,0-8-8H16a8,8,0,0,0,0,16H40A8,8,0,0,0,48,128Zm80,80a8,8,0,0,0-8,8v24a8,8,0,0,0,16,0V216A8,8,0,0,0,128,208Zm112-88H216a8,8,0,0,0,0,16h24a8,8,0,0,0,0-16Z" />
  </Svg>
);

// web icons.js:342-346 — TrendsIcon regular weight (outline)
const TrendsIconOutline = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M240,56v64a8,8,0,0,1-16,0V75.31l-82.34,82.35a8,8,0,0,1-11.32,0L96,123.31,29.66,189.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0L136,140.69,212.69,64H168a8,8,0,0,1,0-16h64A8,8,0,0,1,240,56Z" />
  </Svg>
);

// web icons.js:347-351 — TrendsIcon fill weight — selected state
const TrendsIconFill = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M240,56v64a8,8,0,0,1-13.66,5.66L200,99.31l-58.34,58.35a8,8,0,0,1-11.32,0L96,123.31,29.66,189.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0L136,140.69,188.69,88,162.34,61.66A8,8,0,0,1,168,48h64A8,8,0,0,1,240,56Z" />
  </Svg>
);

// web script.js:4013-4025 — Brand logo (seedling SVG, 26.4x26.4)
const BrandLogo = ({ size = 26.4, color = '#FF4D79' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M205.41,159.07a60.9,60.9,0,0,1-31.83,8.86,71.71,71.71,0,0,1-27.36-5.66A55.55,55.55,0,0,0,136,194.51V224a8,8,0,0,1-8.53,8,8.18,8.18,0,0,1-7.47-8.25V211.31L81.38,172.69A52.5,52.5,0,0,1,63.44,176a45.82,45.82,0,0,1-23.92-6.67C17.73,156.09,6,125.62,8.27,87.79a8,8,0,0,1,7.52-7.52c37.83-2.23,68.3,9.46,81.5,31.25A46,46,0,0,1,103.74,140a4,4,0,0,1-6.89,2.43l-19.2-20.1a8,8,0,0,0-11.31,11.31l53.88,55.25c.06-.78.13-1.56.21-2.33a68.56,68.56,0,0,1,18.64-39.46l50.59-53.46a8,8,0,0,0-11.31-11.32l-49,51.82a4,4,0,0,1-6.78-1.74c-4.74-17.48-2.65-34.88,6.4-49.82,17.86-29.48,59.42-45.26,111.18-42.22a8,8,0,0,1,7.52,7.52C250.67,99.65,234.89,141.21,205.41,159.07Z" />
  </Svg>
);

// web script.js:3999 — ChevronDownIcon (Phosphor caret-down)
const ChevronDownIcon = ({ size = 20, color = '#9E9E9E' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z" />
  </Svg>
);

// web script.js:4118 — ShareIconPhosphor (Phosphor share/upload)
const ShareIcon = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M216,112v96a16,16,0,0,1-16,16H56a16,16,0,0,1-16-16V112A16,16,0,0,1,56,96H80a8,8,0,0,1,0,16H56v96H200V112H176a8,8,0,0,1,0-16h24A16,16,0,0,1,216,112ZM93.66,69.66,120,43.31V136a8,8,0,0,0,16,0V43.31l26.34,26.35a8,8,0,0,0,11.32-11.32l-40-40a8,8,0,0,0-11.32,0l-40,40A8,8,0,0,0,93.66,69.66Z" />
  </Svg>
);

// web script.js:4140 — HomeIcon (Phosphor house, outline)
const HomeIcon = ({ size = 24, color = '#000' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M219.31,108.68l-80-80a16,16,0,0,0-22.62,0l-80,80A15.87,15.87,0,0,0,32,120v96a8,8,0,0,0,8,8H96a8,8,0,0,0,8-8V160h48v56a8,8,0,0,0,8,8h56a8,8,0,0,0,8-8V120A15.87,15.87,0,0,0,219.31,108.68ZM208,208H168V152a8,8,0,0,0-8-8H96a8,8,0,0,0-8,8v56H48V120l80-80,80,80Z" />
  </Svg>
);

// web FloatingTrackerMenu.js:314-328 — Plus icon SVG
const PlusIcon = ({ size = 21.6, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 256 256" fill={color}>
    <Path d="M228,128a12,12,0,0,1-12,12H140v76a12,12,0,0,1-24,0V140H40a12,12,0,0,1,0-24h76V40a12,12,0,0,1,24,0v76h76A12,12,0,0,1,228,128Z" />
  </Svg>
);

// ── Header (web: script.js lines 3941-4201) ──
// Web: sticky top-0 z-[1200], bg var(--tt-header-bg) = appBg
// Inner: pt-4 pb-6 px-4, grid grid-cols-3 items-center
function AppHeader() {
  return (
    <View style={headerStyles.container}>
      <View style={headerStyles.inner}>
        {/* LEFT: Kid picker (web lines 3955-4006) */}
        {/* Web: button > avatar(36x36 rounded-full) + name(text-2xl font-extrabold leading-none) + ChevronDown(w-5 h-5) */}
        <Pressable style={headerStyles.kidPicker}>
          <View style={headerStyles.avatar} />
          <Text style={headerStyles.kidName}>Levi</Text>
          <ChevronDownIcon size={20} color={COLORS.textTertiary} />
        </Pressable>

        {/* MIDDLE: Brand logo (web lines 4008-4026) */}
        {/* Web: svg 26.4x26.4, color var(--tt-brand-icon) = #FF4D79 */}
        <View style={headerStyles.logoContainer}>
          <BrandLogo size={26.4} color={COLORS.brandIcon} />
        </View>

        {/* RIGHT: Share + Home (web lines 4102-4147) */}
        {/* Web: flex items-center justify-end gap-0.5 */}
        {/* Each button: w-11 h-11 flex items-center justify-center rounded-xl */}
        {/* Icons: w-6 h-6, color var(--tt-text-primary) */}
        <View style={headerStyles.rightButtons}>
          <Pressable style={headerStyles.iconButton}>
            <ShareIcon size={24} color={COLORS.textPrimary} />
          </Pressable>
          <Pressable style={headerStyles.iconButton}>
            <HomeIcon size={24} color={COLORS.textPrimary} />
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  // Web: bg var(--tt-header-bg) = #FAF6EB
  container: {
    backgroundColor: COLORS.appBg,
  },
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
  // Web: w-[36px] h-[36px] rounded-full, bg var(--tt-feed-soft) = #fbb3be
  avatar: {
    width: 36,             // w-[36px]
    height: 36,            // h-[36px]
    borderRadius: 18,      // rounded-full
    backgroundColor: COLORS.feedSoft,
  },
  // Web: text-2xl font-extrabold leading-none, color var(--tt-text-primary) = #212121
  // fontFamily: -apple-system, BlinkMacSystemFont, "SF Pro Display"...
  kidName: {
    fontSize: 24,          // text-2xl
    fontWeight: '800',     // font-extrabold
    color: COLORS.textPrimary,
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

// ── Bottom Nav (web: script.js lines 4377-4469) ──
// Web: fixed bottom-0, bg var(--tt-nav-bg) = appBg, minHeight 80px, paddingTop 10px
// Inner: max-w-2xl mx-auto relative flex items-center justify-between px-4 py-3
// Each tab: flex-1 py-2 flex flex-col items-center gap-1, transform translateY(-15px)
// Icons: w-6 h-6, selected = fill weight, unselected = outline weight
// Labels: text-xs font-light, color var(--tt-text-primary)
function BottomNav({ activeTab, onTabChange, onPlusPress }) {
  return (
    <View style={navStyles.container}>
      <View style={navStyles.inner}>
        {/* Track tab (web lines 4399-4428) */}
        <Pressable
          style={navStyles.tab}
          onPress={() => onTabChange('tracker')}
        >
          {activeTab === 'tracker'
            ? <TodayIconFill size={24} color={COLORS.textPrimary} />
            : <TodayIconOutline size={24} color={COLORS.textPrimary} />
          }
          <Text style={navStyles.tabLabel}>Track</Text>
        </Pressable>

        {/* Plus spacer (web lines 4430-4437) */}
        <View style={navStyles.tabSpacer} />

        {/* Trends tab (web lines 4438-4468) */}
        <Pressable
          style={navStyles.tab}
          onPress={() => onTabChange('trends')}
        >
          {activeTab === 'trends'
            ? <TrendsIconFill size={24} color={COLORS.textPrimary} />
            : <TrendsIconOutline size={24} color={COLORS.textPrimary} />
          }
          <Text style={navStyles.tabLabel}>Trends</Text>
        </Pressable>
      </View>

      {/* Floating + button (web FloatingTrackerMenu.js:272-329) */}
      {/* Web: position fixed, bottom: calc(safe-area + 36px), left: 50%, translateX(-50%) */}
      {/* 64x64 circle, bg var(--tt-plus-bg) = #1A1A1A, fg #FFFFFF */}
      {/* shadow var(--tt-shadow-floating) = 0 4px 12px rgba(0,0,0,0.15) */}
      <Pressable
        style={({ pressed }) => [
          navStyles.plusButton,
          pressed && navStyles.plusButtonPressed,
        ]}
        onPress={onPlusPress}
      >
        <PlusIcon size={21.6} color={COLORS.plusFg} />
      </Pressable>
    </View>
  );
}

const navStyles = StyleSheet.create({
  // Web: bg var(--tt-nav-bg) = #FAF6EB, minHeight 80px, paddingTop 10px
  // overflow visible so gradient + plus button show above container
  container: {
    backgroundColor: COLORS.appBg,
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
  // Web: text-xs font-light, color var(--tt-text-primary) = #212121
  tabLabel: {
    fontSize: 12,          // text-xs
    fontWeight: '300',     // font-light
    color: COLORS.textPrimary,
  },
  // Floating plus (web FloatingTrackerMenu.js:296-311)
  // Web: position fixed, bottom: calc(safe-area + 36px), left: 50%, translateX(-50%)
  // 64x64 circle, bg #1A1A1A, shadow 0 4px 12px rgba(0,0,0,0.15), z-index 1000
  // In native: bottom 36 from nav container bottom (safe area handled by SafeAreaView)
  plusButton: {
    position: 'absolute',
    bottom: 36,            // web: calc(safe-area + 36px) → 36 above nav bottom
    left: '50%',
    marginLeft: -32,       // half of 64 to center (translateX(-50%) equivalent)
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.plusBg,  // #1A1A1A (light mode)
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,          // web: z-index 1000
    // Web: var(--tt-shadow-floating) = 0 4px 12px rgba(0,0,0,0.15)
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  plusButtonPressed: {
    transform: [{ scale: 0.95 }],  // web: whileTap scale 0.95
  },
});

// ── App Root ──
export default function App() {
  const [activeTab, setActiveTab] = useState('tracker');

  return (
    <ThemeProvider themeKey="theme1" isDark={false}>
      <SafeAreaProvider>
        <SafeAreaView style={appStyles.safe} edges={['top', 'left', 'right']}>
          <AppHeader />
          {/* Page content (web lines 4203-4250) */}
          {/* Web: px-4 pb-5 on appBg, tab shown/hidden via display */}
          <View style={appStyles.content}>
            {activeTab === 'tracker' && <TrackerScreen />}
            {activeTab === 'trends' && <AnalyticsScreen />}

            {/* Gradient fade above nav (web script.js:4352-4366) */}
            {/* Web: separate fixed div, height 100px, pointer-events none */}
            {/* background: linear-gradient(to top, appBg 0%, appBg 30%, transparent 100%) */}
            {/* Sits at bottom of content area, fading content into nav bg */}
            <LinearGradient
              colors={['#FAF6EB00', '#FAF6EBFF', '#FAF6EBFF']}
              locations={[0, 0.7, 1]}
              style={appStyles.fadeGradient}
              pointerEvents="none"
            />
          </View>
        </SafeAreaView>

        <SafeAreaView edges={['bottom']} style={appStyles.bottomSafe}>
          <BottomNav
            activeTab={activeTab}
            onTabChange={setActiveTab}
            onPlusPress={() => console.log('Quick add pressed')}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}

const appStyles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: COLORS.appBg,
  },
  content: {
    flex: 1,
  },
  // Web script.js:4352-4366 — gradient fade above nav
  // height: 100px, pointer-events: none
  // linear-gradient(to top, appBg 0%, appBg 30%, transparent 100%)
  fadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 75,            // web: 100px but ~27px hidden behind nav, ~73px visible
  },
  bottomSafe: {
    backgroundColor: COLORS.appBg,
    overflow: 'visible',   // allow gradient + plus button to render above nav
    zIndex: 50,            // web: z-50 on bottom nav
  },
});
