import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Share, Alert, Image, Appearance, Animated, Easing, LogBox, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Font from 'expo-font';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import Popover from 'react-native-popover-view';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider, useData } from './src/context/DataContext';
import { createStorageAdapter } from './src/services/storageAdapter';

LogBox.ignoreLogs([
  'This method is deprecated (as well as all React Native Firebase namespaced API)',
]);

// Screens
import AnalyticsStack from './src/components/navigation/AnalyticsStack';
import FamilyStack from './src/components/navigation/FamilyStack';
import LoginScreen from './src/screens/LoginScreen';
import SetupScreen from './src/screens/SetupScreen';

// Sheets
import DiaperSheet from './src/components/sheets/DiaperSheet';
import SleepSheet from './src/components/sheets/SleepSheet';
import FeedSheet from './src/components/sheets/FeedSheet';
import ActivityVisibilitySheet from './src/components/sheets/ActivityVisibilitySheet';
import BottomNavigationShell from './src/components/navigation/BottomNavigationShell';
import { StackActions } from '@react-navigation/native';
import TrackerStack from './src/components/navigation/TrackerStack';
import {
  normalizeActivityVisibility,
  normalizeActivityOrder,
  hasAtLeastOneActivityEnabled,
  DEFAULT_ACTIVITY_ORDER,
} from './src/constants/activityVisibility';

// Icons (1:1 from web/components/shared/icons.js)
// Web uses HomeIcon (not HouseIcon) for header
import {
  ChevronDownIcon,
  ShareIcon,
  HomeIcon,
  LinkIcon,
  PersonAddIcon,
  KidSelectorOnIcon,
  KidSelectorOffIcon,
  SpinnerIcon,
} from './src/components/icons';

// Bottom nav tuning:
// NAV_MIN_HEIGHT makes the entire bottom nav bar taller or shorter.
const NAV_MIN_HEIGHT = 0;
// NAV_BG_HEIGHT controls only the visible nav background block height.
// Use `null` to size automatically from content, or a number (e.g. 56).
const NAV_BG_HEIGHT = 56;
// NAV_TOP_PADDING adds/removes empty space at the top inside the nav bar.
const NAV_TOP_PADDING = 4;
// NAV_ROW_VERTICAL_PADDING controls vertical padding around the whole tab row.
const NAV_ROW_VERTICAL_PADDING = 15;
// NAV_ITEM_VERTICAL_PADDING controls vertical padding inside each tab/spacer cell.
const NAV_ITEM_VERTICAL_PADDING = 8;
// NAV_BOTTOM_INSET_PADDING controls extra space below nav for device safe area.
// Use `null` for automatic device inset, or a number like 0 to force a specific value.
const NAV_BOTTOM_INSET_PADDING = null;
// NAV_BUTTONS_OFFSET_Y is the single knob for button position vs nav bar.
// positive = move Track/Plus/Trends lower, negative = move them higher.
const NAV_BUTTONS_OFFSET_Y = -16;
// Optional fine-tuning only for the center plus button.
const NAV_PLUS_FINE_TUNE_Y = -32;
// Base values (usually leave these as-is).
const NAV_BASE_TAB_SHIFT_Y = -4;
const NAV_BASE_PLUS_BOTTOM_OFFSET = 24;
// Final values passed into BottomNavigationShell.
const NAV_TAB_SHIFT_Y = NAV_BASE_TAB_SHIFT_Y + NAV_BUTTONS_OFFSET_Y;
const NAV_PLUS_BOTTOM_OFFSET = NAV_BASE_PLUS_BOTTOM_OFFSET - NAV_BUTTONS_OFFSET_Y + NAV_PLUS_FINE_TUNE_Y;
// NAV_FADE_HEIGHT controls only the gradient thickness above the nav.
// It does not change nav height.
const NAV_FADE_HEIGHT = 50;
// NAV_FADE_BOTTOM_OFFSET moves gradient anchor relative to nav top line.
// positive = move fade up, negative = let fade start lower (into nav area).
const NAV_FADE_BOTTOM_OFFSET = 0;
const LAUNCH_SPLASH_MIN_MS = 900;
const APP_SHARE_BASE_URL = 'https://tinytracker.app';
const APP_INSTALL_URL_PLACEHOLDER = '[APP STORE URL]';
const TIMELINE_EASE = Easing.bezier(0.16, 0, 0, 1);
const CHEVRON_ROTATE_MS = 260;
// ── Header (web: script.js lines 3941-4201) ──
// Web: sticky top-0 z-[1200], bg var(--tt-header-bg) = appBg
// Inner: pt-4 pb-6 px-4, grid grid-cols-3 items-center
function AppHeader({
  onFamilyPress,
  activeTab,
  showKidMenu,
  onToggleKidMenu,
  kidButtonRef,
  showShareMenu,
  onToggleShareMenu,
  onCloseShareMenu,
  onCloseKidMenu,
  shareButtonRef,
}) {
  const { colors, bottle, isDark } = useTheme();
  const { kidId, selectedKidSnapshot } = useAuth();
  const { kidData, kids } = useData();

  const selectedKid = useMemo(() => {
    if (Array.isArray(kids) && kids.length && kidId) {
      return kids.find((kid) => kid?.id === kidId) || kidData || selectedKidSnapshot || null;
    }
    if (kidData?.id && kidId && kidData.id !== kidId) return selectedKidSnapshot || null;
    return kidData || selectedKidSnapshot || null;
  }, [kids, kidData, kidId, selectedKidSnapshot]);
  const kidName = selectedKid?.name || 'Baby';
  const kidPhotoURL = selectedKid?.photoURL || null;
  const kidChevronProgress = useRef(new Animated.Value(showKidMenu ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(kidChevronProgress, {
      toValue: showKidMenu ? 1 : 0,
      duration: CHEVRON_ROTATE_MS,
      easing: TIMELINE_EASE,
      useNativeDriver: true,
    }).start();
  }, [showKidMenu, kidChevronProgress]);

  const kidChevronRotate = kidChevronProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={[headerStyles.container, { backgroundColor: colors.appBg }]}>
      <View style={headerStyles.inner}>
        {/* LEFT: Kid picker */}
        <Pressable
          ref={kidButtonRef}
          onPress={onToggleKidMenu}
          style={headerStyles.kidPicker}
        >
          <View style={[headerStyles.avatar, { backgroundColor: colors.inputBg }]}>
            {kidPhotoURL ? (
              <Image source={{ uri: kidPhotoURL }} style={headerStyles.avatarInner} />
            ) : (
              <View style={[headerStyles.avatarInner, { backgroundColor: bottle.soft }]} />
            )}
          </View>
          <Text style={[headerStyles.kidName, { color: colors.textPrimary }]} numberOfLines={1} ellipsizeMode="tail">
            {kidName}
          </Text>
          <Animated.View style={{ transform: [{ rotate: kidChevronRotate }] }}>
            <ChevronDownIcon size={20} color={colors.textTertiary} />
          </Animated.View>
        </Pressable>

        {/* RIGHT: Share + Home/Family (web lines 4102-4147) */}
        {/* Web: hover:bg-[var(--tt-seg-track)] — native uses segTrack on press */}
        <View style={headerStyles.rightButtons}>
          <Pressable
            ref={shareButtonRef}
            onPress={onToggleShareMenu}
            style={({ pressed }) => [
              headerStyles.iconButton,
              pressed && { backgroundColor: colors.segTrack },
            ]}
          >
            <ShareIcon
              size={24}
              color={colors.textPrimary}
              isTapped={showShareMenu}
              selectedWeight="fill"
            />
          </Pressable>
          <Pressable
            onPress={() => {
              onCloseShareMenu?.();
              onCloseKidMenu?.();
              onFamilyPress?.();
            }}
            style={({ pressed }) => [headerStyles.iconButton, pressed && { backgroundColor: colors.segTrack }]}
          >
            <HomeIcon
              size={24}
              color={colors.textPrimary}
              isSelected={activeTab === 'family'}
              selectedWeight="fill"
            />
          </Pressable>
        </View>
      </View>
      {/* Brand logo — rendered separately, centered on screen, aligned with header row (like plus btn) */}
      <View style={headerStyles.logoOverlay} pointerEvents="box-none">
        <Image
          source={isDark ? require('./assets/brandlogo-dark-68.png') : require('./assets/brandlogo-lt-68.png')}
          style={headerStyles.brandLogoImage}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const headerStyles = StyleSheet.create({
  container: {
    zIndex: 1200,
    position: 'relative',
  },
  // Web: pt-4 pb-6 px-4, grid grid-cols-2 items-center (logo is separate overlay)
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,        // typical iOS header spacing below safe area
    paddingBottom: 24,     // pb-6
    paddingHorizontal: 16, // px-4
  },
  // Web: flex items-center gap-[10px]
  kidPicker: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,               // gap-[10px]
    minWidth: 0,           // allow text to shrink and truncate before center logo
  },
  // Web: w-[36px] h-[36px] rounded-full overflow-hidden, outer bg var(--tt-input-bg)
  avatar: {
    width: 30,
    height: 30,
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
    flexShrink: 1,         // allow truncation when space is tight (before center logo)
    fontSize: 24,          // text-2xl
    fontWeight: '700',
    fontFamily: 'Fraunces',
    fontVariationSettings: '"wght" 700, "SOFT" 23, "WONK" 1, "opsz" 63',
  },
  // Brand logo overlay — same centering logic as plus btn: left 50% + offset
  logoOverlay: {
    position: 'absolute',
    left: '50%',
    marginLeft: -17,       // half of brand logo width (34px)
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -6 }], // align with content row (padding 16 top vs 24 bottom)
  },
  brandLogoImage: {
    width: 34,
    height: 34,
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
  shareMenu: {
    width: 224,            // w-56
    borderRadius: 16,      // rounded-2xl
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.10,
    shadowRadius: 16,
    elevation: 10,
  },
  shareMenuItem: {
    height: 44,            // h-11
    paddingHorizontal: 12, // px-3
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,                // gap-2
  },
  shareMenuText: {
    fontSize: 14,          // text-sm
    fontFamily: 'SF-Pro-Text-Regular',
  },
  kidMenuItem: {
    height: 44,            // h-11
    paddingHorizontal: 12, // px-3
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  kidMenuLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Fraunces',
    fontVariationSettings: '"wght" 700, "SOFT" 23, "WONK" 1, "opsz" 63',
  },
  kidMenuAddItem: {
    height: 44,            // h-11
    paddingHorizontal: 12, // px-3
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  kidMenuAddText: {
    fontSize: 14,
    fontFamily: 'SF-Pro-Text-Medium',
  },
});

// ── App shell (uses theme for all colors) ──
function AppShell({
  activeTab,
  onTabChange,
  themeKey,
  isDark,
  onThemeChange,
  onDarkModeChange,
  showDevSetupToggle,
  forceSetupPreview,
  forceLoginPreview,
  onToggleForceSetupPreview,
  onToggleForceLoginPreview,
  trackerEntranceSeed,
  trackerUiReady,
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const topInset = useMemo(() => {
    if (insets.top > 0) return insets.top;
    if (Platform.OS === 'ios') return Math.max(20, Constants.statusBarHeight || 0);
    return Math.max(0, Constants.statusBarHeight || 0);
  }, [insets.top]);
  const appBg = colors.appBg;
  const { user, familyId, kidId, setKidId, signOut: authSignOut } = useAuth();
  const {
    kidData,
    familyMembers,
    refresh,
    applyOptimisticEntry,
    kids,
    kidSettings,
    lastBottleAmountOz,
    firestoreService,
    activeSleep,
    updateKidSettings,
  } = useData();
  const preferredVolumeUnit = kidSettings?.preferredVolumeUnit === 'ml' ? 'ml' : 'oz';

  const handleSignOut = useCallback(() => authSignOut(), [authSignOut]);

  const diaperRef = useRef(null);
  const sleepRef = useRef(null);
  const feedRef = useRef(null);
  const activityVisibilityRef = useRef(null);
  const trackerNavRef = useRef(null);
  const familyNavRef = useRef(null);
  const analyticsNavRef = useRef(null);

  const feedTypeRef = useRef('bottle');
  const [lastFeedVariant, setLastFeedVariant] = useState('bottle');
  const [editEntry, setEditEntry] = useState(null);
  const timelineRefreshRef = useRef(null);
  const [isTrackerDetailOpen, setIsTrackerDetailOpen] = useState(false);
  const [analyticsDetailOpen, setAnalyticsDetailOpen] = useState(false);
  const [familyDetailOpen, setFamilyDetailOpen] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareAnchor, setShareAnchor] = useState(null);
  const shareButtonRef = useRef(null);
  const [showKidMenu, setShowKidMenu] = useState(false);
  const [kidAnchor, setKidAnchor] = useState(null);
  const kidButtonRef = useRef(null);
  const [headerRequestedAddChild, setHeaderRequestedAddChild] = useState(false);
  const [activityVisibility, setActivityVisibility] = useState(() => normalizeActivityVisibility(null));
  const [activityOrder, setActivityOrder] = useState(() => DEFAULT_ACTIVITY_ORDER.slice());
  const [isActivitySheetOpen, setIsActivitySheetOpen] = useState(false);
  // Create storage adapter for sheets
  const storage = useMemo(
    () => (familyId && kidId ? createStorageAdapter(familyId, kidId) : null),
    [familyId, kidId]
  );

  // Derive user info from real data
  const familyUser = user ? { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL } : null;

  useEffect(() => {
    AsyncStorage.getItem('tt_last_feed_variant').then((stored) => {
      if (stored === 'nursing' || stored === 'bottle') setLastFeedVariant(stored);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const hasPersistedVisibility =
      kidSettings?.activityVisibility &&
      typeof kidSettings.activityVisibility === 'object' &&
      Object.values(kidSettings.activityVisibility).some((value) => typeof value === 'boolean');

    setActivityVisibility(
      hasPersistedVisibility
        ? normalizeActivityVisibility(kidSettings.activityVisibility)
        : normalizeActivityVisibility(null)
    );
    setActivityOrder(normalizeActivityOrder(kidSettings?.activityOrder));
  }, [
    kidSettings?.activityVisibility,
    kidSettings?.activityOrder,
    kidId,
  ]);

  const handleTrackerSelect = useCallback((type) => {
    const visibilitySafe = normalizeActivityVisibility(activityVisibility);
    const isFeedEnabled = visibilitySafe.bottle || visibilitySafe.nursing || visibilitySafe.solids;
    setShowShareMenu(false);
    setShowKidMenu(false);
    setKidAnchor(null);
    if (type === 'diaper') {
      if (!visibilitySafe.diaper) return;
      diaperRef.current?.present?.();
    } else if (type === 'sleep') {
      if (!visibilitySafe.sleep) return;
      sleepRef.current?.present?.();
    } else if (['bottle', 'nursing', 'solids'].includes(type)) {
      if (!isFeedEnabled || visibilitySafe[type] === false) return;
      feedTypeRef.current = type;
      feedRef.current?.present?.();
    }
  }, [activityVisibility]);

  const handleFeedAdded = useCallback((entry) => {
    if (entry?.type === 'bottle' || entry?.type === 'nursing') {
      setLastFeedVariant(entry.type);
      AsyncStorage.setItem('tt_last_feed_variant', entry.type).catch(() => {});
    }
    if (entry) {
      applyOptimisticEntry(entry);
    }
  }, [applyOptimisticEntry]);

  const handleSleepAdded = useCallback((entry) => {
    if (entry) {
      applyOptimisticEntry(entry);
    }
  }, [applyOptimisticEntry]);

  const handleDiaperSaved = useCallback((entry) => {
    if (entry) {
      applyOptimisticEntry(entry);
    }
  }, [applyOptimisticEntry]);

  const handleToggleActivitySheet = useCallback(() => {
    setShowShareMenu(false);
    setShowKidMenu(false);
    setKidAnchor(null);
    setIsActivitySheetOpen(true);
    activityVisibilityRef.current?.present?.();
  }, []);

  const handleUpdateActivityVisibility = useCallback(async (payload) => {
    const visibilityNext = normalizeActivityVisibility(payload?.visibility || payload);
    const orderNext = normalizeActivityOrder(payload?.order);
    if (!hasAtLeastOneActivityEnabled(visibilityNext)) return;

    setActivityVisibility(visibilityNext);
    setActivityOrder(orderNext);
    try {
      await updateKidSettings({
        activityVisibility: visibilityNext,
        activityOrder: orderNext,
      });
    } catch (error) {
      console.warn('Failed to save activity visibility settings:', error);
    }
  }, [updateKidSettings]);

  const handlePreferredVolumeUnitChange = useCallback(async (nextUnit) => {
    const unit = nextUnit === 'ml' ? 'ml' : 'oz';
    if (unit === (kidSettings?.preferredVolumeUnit === 'ml' ? 'ml' : 'oz')) return;
    try {
      await updateKidSettings({ preferredVolumeUnit: unit });
    } catch (error) {
      console.warn('Failed to save preferred volume unit:', error);
    }
  }, [kidSettings?.preferredVolumeUnit, updateKidSettings]);

  useEffect(() => {
    const visibilitySafe = normalizeActivityVisibility(activityVisibility);
    if (visibilitySafe.sleep) return;
    if (!activeSleep?.id) return;
    firestoreService.endSleep(activeSleep.id).catch(() => {});
  }, [activityVisibility, activeSleep, firestoreService]);

  const handleEditCard = useCallback((card) => {
    if (!card) return;
    const entry = { ...card };
    entry.notes = card.note ?? card.notes ?? '';
    entry.photoURLs = card.photoURLs ?? [];
    if (card.type === 'feed') {
      if (card.feedType === 'bottle') {
        entry.ounces = card.ounces ?? card.amount;
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

  const handleDeleteCard = useCallback(async (card) => {
    if (!card?.id) return false;
    try {
      if (card.type === 'feed') {
        if (card.feedType === 'nursing') {
          await firestoreService.deleteNursingSession(card.id);
        } else if (card.feedType === 'solids') {
          await firestoreService.deleteSolidsSession(card.id);
        } else {
          await firestoreService.deleteFeeding(card.id);
        }
      } else if (card.type === 'sleep') {
        await firestoreService.deleteSleepSession(card.id);
      } else if (card.type === 'diaper') {
        await firestoreService.deleteDiaperChange(card.id);
      } else {
        return false;
      }
      await refresh();
      timelineRefreshRef.current?.();
      return true;
    } catch (error) {
      console.warn('Failed to delete timeline entry:', error);
      Alert.alert('Error', 'Failed to delete entry. Please try again.');
      return false;
    }
  }, [firestoreService, refresh]);

  const handleCloseFeed = useCallback(() => {
    setEditEntry(null);
  }, []);

  const handleCloseSleep = useCallback(() => {
    setEditEntry(null);
  }, []);

  const handleCloseDiaper = useCallback(() => {
    setEditEntry(null);
  }, []);

  const handleTabChange = useCallback((nextTab) => {
    setShowShareMenu(false);
    setShareAnchor(null);
    setShowKidMenu(false);
    setKidAnchor(null);
    if (nextTab === 'tracker' && activeTab === 'tracker' && isTrackerDetailOpen) {
      trackerNavRef.current?.dispatch(StackActions.popToTop());
      return;
    }
    if (nextTab === activeTab && nextTab === 'trends') {
      analyticsNavRef.current?.dispatch(StackActions.popToTop());
      return;
    }
    if (nextTab !== activeTab) {
      onTabChange(nextTab);
      if (nextTab !== 'trends') {
        setAnalyticsDetailOpen(false);
      }
    }
  }, [activeTab, isTrackerDetailOpen, onTabChange]);

  const handleGlobalShareApp = useCallback(async () => {
    const url = APP_SHARE_BASE_URL;
    const text = `Check out Tiny Tracker - track your baby's feedings and get insights! ${url}`;

    if (Share?.share) {
      try {
        await Share.share({
          title: 'Tiny Tracker',
          message: text,
          url,
        });
        return;
      } catch {
        return;
      }
    }

    Alert.alert('Copy this link:', url);
  }, []);

  const handleGlobalInvitePartner = useCallback(async () => {
    const resolvedKidId = kidId || (kids?.length ? kids[0]?.id : null);

    if (!familyId || !resolvedKidId) {
      Alert.alert('Something went wrong. Try refreshing.');
      return;
    }

    let code;
    try {
      code = await firestoreService.createInvite(resolvedKidId);
    } catch (error) {
      console.warn('Failed to create invite:', error);
      Alert.alert('Failed to create invite.');
      return;
    }

    const resolvedKid = (
      (Array.isArray(kids) && resolvedKidId
        ? kids.find((kid) => kid?.id === resolvedKidId)
        : null)
      || (kidData?.id === resolvedKidId ? kidData : null)
      || null
    );
    const rawKidName = String(resolvedKid?.name || '').trim();
    const possessiveKidName = rawKidName
      ? (rawKidName.toLowerCase().endsWith('s') ? `${rawKidName}'` : `${rawKidName}'s`)
      : 'your';
    const headerLine = rawKidName
      ? `Join ${possessiveKidName} family on Tiny Tracker.`
      : 'Join your family on Tiny Tracker.';
    const message = `${headerLine}\nInstall app: ${APP_INSTALL_URL_PLACEHOLDER}\nInvite code: ${code}`;

    if (Share?.share) {
      try {
        await Share.share({
          title: 'Join me on Tiny Tracker',
          message,
        });
        return;
      } catch {
        return;
      }
    }

    Alert.alert('Copy this invite info:', message);
  }, [familyId, kidId, kids, kidData, firestoreService]);

  const handleShareAppFromMenu = useCallback(async () => {
    await handleGlobalShareApp();
    setShowShareMenu(false);
    setShareAnchor(null);
  }, [handleGlobalShareApp]);

  const handleInvitePartnerFromMenu = useCallback(async () => {
    await handleGlobalInvitePartner();
    setShowShareMenu(false);
    setShareAnchor(null);
  }, [handleGlobalInvitePartner]);

  const handleToggleShareMenu = useCallback(() => {
    if (showShareMenu) {
      setShowShareMenu(false);
      setShareAnchor(null);
      return;
    }
    setShowKidMenu(false);
    setKidAnchor(null);

    const node = shareButtonRef.current;
    const POPOVER_WIDTH = 224;
    const PADDING = 16;
    const screenWidth = Dimensions.get('window').width;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        const headerBottom = y + height;
        // Right edge touches right internal padding; same y as kid picker
        setShareAnchor({
          x: screenWidth - PADDING - POPOVER_WIDTH,
          y: headerBottom - height,
          width: POPOVER_WIDTH,
          height,
        });
        setShowShareMenu(true);
      });
      return;
    }

    setShareAnchor(null);
    setShowShareMenu(true);
  }, [showShareMenu]);

  const handleToggleKidMenu = useCallback(() => {
    if (showKidMenu) {
      setShowKidMenu(false);
      setKidAnchor(null);
      return;
    }
    setShowShareMenu(false);
    setShareAnchor(null);

    // Use share button as canonical so both dropdowns align at same top
    const node = shareButtonRef.current;
    const POPOVER_WIDTH = 224;
    const PADDING = 16;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        const headerBottom = y + height;
        setKidAnchor({
          x: PADDING,
          y: headerBottom - height,
          width: POPOVER_WIDTH,
          height,
        });
        setShowKidMenu(true);
      });
      return;
    }

    setKidAnchor(null);
    setShowKidMenu(true);
  }, [showKidMenu]);

  const handleSelectKidFromMenu = useCallback((nextKidId) => {
    if (nextKidId && nextKidId !== kidId) {
      setKidId(nextKidId);
    }
    setShowKidMenu(false);
    setKidAnchor(null);
  }, [kidId, setKidId]);

  const handleAddChildFromMenu = useCallback(() => {
    setShowKidMenu(false);
    setKidAnchor(null);
    handleTabChange('family');
    setHeaderRequestedAddChild(true);
  }, [handleTabChange]);

  const handleTrackerDetailOpenChange = useCallback((isOpen) => {
    setIsTrackerDetailOpen(isOpen);
    if (isOpen) {
      setShowShareMenu(false);
      setShareAnchor(null);
      setShowKidMenu(false);
      setKidAnchor(null);
    }
  }, []);

  const trackerHeader = (
    <AppHeader
      onFamilyPress={() => handleTabChange('family')}
      activeTab={activeTab}
      showKidMenu={showKidMenu}
      onToggleKidMenu={handleToggleKidMenu}
      kidButtonRef={kidButtonRef}
      showShareMenu={showShareMenu}
      onToggleShareMenu={handleToggleShareMenu}
      onCloseShareMenu={() => {
        setShowShareMenu(false);
        setShareAnchor(null);
      }}
      onCloseKidMenu={() => {
        setShowKidMenu(false);
        setKidAnchor(null);
      }}
      shareButtonRef={shareButtonRef}
    />
  );

  // Render header once at top level so Popover refs always point to visible header
  // (fixes dropdown positioning on Analytics/Family when header was inside hidden stacks)
  const showHeader =
    (activeTab === 'tracker' && !isTrackerDetailOpen)
    || (activeTab === 'trends' && !analyticsDetailOpen)
    || (activeTab === 'family' && !familyDetailOpen);

  return (
    <>
      <SafeAreaView
        style={[appStyles.safe, { backgroundColor: appBg, paddingTop: topInset }]}
        edges={['left', 'right']}
      >
        {showHeader ? trackerHeader : null}
        <View style={appStyles.content}>
          <View style={{ flex: 1, display: activeTab === 'tracker' ? 'flex' : 'none' }}>
            {trackerUiReady ? (
              <TrackerStack
                navigationRef={trackerNavRef}
                onOpenSheet={handleTrackerSelect}
                onRequestToggleActivitySheet={handleToggleActivitySheet}
                activityVisibility={activityVisibility}
                activityOrder={activityOrder}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
                timelineRefreshRef={timelineRefreshRef}
                onDetailOpenChange={handleTrackerDetailOpenChange}
                entranceSeed={trackerEntranceSeed}
              />
            ) : (
              <View style={{ flex: 1, backgroundColor: appBg }} />
            )}
          </View>
          <View style={{ flex: 1, display: activeTab === 'trends' ? 'flex' : 'none' }}>
            <AnalyticsStack
              navigationRef={analyticsNavRef}
              onDetailOpenChange={setAnalyticsDetailOpen}
              activityVisibility={activityVisibility}
            />
          </View>
          <View style={{ flex: 1, display: activeTab === 'family' ? 'flex' : 'none' }}>
            <FamilyStack
              navigationRef={familyNavRef}
              onDetailOpenChange={setFamilyDetailOpen}
              user={familyUser}
              kidId={kidId}
              familyId={familyId}
              kids={kids}
              onKidChange={setKidId}
              requestAddChild={headerRequestedAddChild}
              onRequestAddChildHandled={() => setHeaderRequestedAddChild(false)}
              themeKey={themeKey}
              onThemeChange={onThemeChange}
              isDark={isDark}
              onDarkModeChange={onDarkModeChange}
              showDevSetupToggle={showDevSetupToggle}
              forceSetupPreview={forceSetupPreview}
              forceLoginPreview={forceLoginPreview}
              onToggleForceSetupPreview={onToggleForceSetupPreview}
              onToggleForceLoginPreview={onToggleForceLoginPreview}
              onRequestToggleActivitySheet={handleToggleActivitySheet}
              onInvitePartner={handleGlobalInvitePartner}
              onSignOut={handleSignOut}
            />
          </View>

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
      <Popover
        isVisible={showKidMenu}
        from={kidAnchor || kidButtonRef}
        onRequestClose={() => {
          setShowKidMenu(false);
          setKidAnchor(null);
        }}
        placement="bottom"
        offset={6}
        arrowSize={{ width: 0, height: 0 }}
        popoverStyle={[
          headerStyles.shareMenu,
          { backgroundColor: colors.cardBg },
        ]}
        backgroundStyle={{ backgroundColor: 'transparent' }}
      >
        {(kids || []).map((kid) => {
          const isCurrent = kid?.id === kidId;
          return (
            <Pressable
              key={kid?.id || 'unknown-kid'}
              onPress={() => handleSelectKidFromMenu(kid?.id)}
              style={({ pressed }) => [
                headerStyles.kidMenuItem,
                {
                  backgroundColor: isCurrent
                    ? (colors.subtleSurface || colors.segTrack)
                    : (pressed ? colors.segTrack : 'transparent'),
                },
              ]}
            >
              <Text
                numberOfLines={1}
                style={[headerStyles.kidMenuLabel, { color: colors.textPrimary }]}
              >
                {kid?.name || 'Baby'}
              </Text>
              {isCurrent ? (
                <KidSelectorOnIcon size={16} color={colors.textPrimary} />
              ) : (
                <KidSelectorOffIcon size={16} color={colors.cardBorder} />
              )}
            </Pressable>
          );
        })}
        <Pressable
          onPress={handleAddChildFromMenu}
          style={({ pressed }) => [
            headerStyles.kidMenuAddItem,
            {
              borderTopColor: colors.cardBorder,
              backgroundColor: pressed ? colors.segTrack : 'transparent',
            },
          ]}
        >
          <Text style={[headerStyles.kidMenuAddText, { color: colors.textPrimary }]}>+ Add child</Text>
        </Pressable>
      </Popover>
      <Popover
        isVisible={showShareMenu}
        from={shareAnchor || shareButtonRef}
        onRequestClose={() => {
          setShowShareMenu(false);
          setShareAnchor(null);
        }}
        placement="bottom"
        offset={6}
        arrowSize={{ width: 0, height: 0 }}
        popoverStyle={[
          headerStyles.shareMenu,
          { backgroundColor: colors.cardBg },
        ]}
        backgroundStyle={{ backgroundColor: 'transparent' }}
      >
        <Pressable
          onPress={handleShareAppFromMenu}
          style={({ pressed }) => [
            headerStyles.shareMenuItem,
            pressed && { backgroundColor: colors.segTrack },
          ]}
        >
          <LinkIcon size={16} color={colors.textPrimary} />
          <Text style={[headerStyles.shareMenuText, { color: colors.textPrimary }]}>Share app link</Text>
        </Pressable>
        <Pressable
          onPress={handleInvitePartnerFromMenu}
          style={({ pressed }) => [
            headerStyles.shareMenuItem,
            pressed && { backgroundColor: colors.segTrack },
          ]}
        >
          <PersonAddIcon size={16} color={colors.textPrimary} />
          <Text style={[headerStyles.shareMenuText, { color: colors.textPrimary }]}>Invite partner</Text>
        </Pressable>
      </Popover>

      <BottomNavigationShell
        appBg={appBg}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onTrackerSelect={handleTrackerSelect}
        visibleTypes={{
          feeding: activityVisibility.bottle || activityVisibility.nursing || activityVisibility.solids,
          sleep: activityVisibility.sleep,
          diaper: activityVisibility.diaper,
        }}
        lastFeedVariant={lastFeedVariant}
        navMinHeight={NAV_MIN_HEIGHT}
        navBackgroundHeight={NAV_BG_HEIGHT}
        navTopPadding={NAV_TOP_PADDING}
        navRowVerticalPadding={NAV_ROW_VERTICAL_PADDING}
        navItemVerticalPadding={NAV_ITEM_VERTICAL_PADDING}
        bottomInsetPadding={NAV_BOTTOM_INSET_PADDING}
        tabShiftY={NAV_TAB_SHIFT_Y}
        plusBottomOffset={NAV_PLUS_BOTTOM_OFFSET}
      />

      <DiaperSheet
        sheetRef={diaperRef}
        entry={editEntry?.type === 'diaper' ? editEntry : null}
        onClose={handleCloseDiaper}
        onSave={handleDiaperSaved}
        storage={storage}
      />
      <SleepSheet
        sheetRef={sleepRef}
        entry={editEntry?.type === 'sleep' ? editEntry : null}
        onClose={handleCloseSleep}
        onAdd={handleSleepAdded}
        storage={storage}
      />
      <FeedSheet
        sheetRef={feedRef}
        feedTypeRef={feedTypeRef}
        entry={editEntry?.type === 'feed' ? editEntry : null}
        onAdd={handleFeedAdded}
        onClose={handleCloseFeed}
        activityVisibility={activityVisibility}
        preferredVolumeUnit={preferredVolumeUnit}
        onPreferredVolumeUnitChange={handlePreferredVolumeUnitChange}
        lastBottleAmountOz={lastBottleAmountOz}
        storage={storage}
      />
      <ActivityVisibilitySheet
        sheetRef={activityVisibilityRef}
        onOpen={() => setIsActivitySheetOpen(true)}
        onClose={() => setIsActivitySheetOpen(false)}
        visibility={activityVisibility}
        order={activityOrder}
        onChange={handleUpdateActivityVisibility}
      />
    </>
  );
}

// ── Auth-gated content ──
function AuthGatedApp({
  themeKey,
  isDark,
  onThemeChange,
  onDarkModeChange,
  showDevSetupToggle,
  forceSetupPreview,
  forceLoginPreview,
  onToggleForceSetupPreview,
  onToggleForceLoginPreview,
  trackerEntranceSeed,
  trackerUiReady,
}) {
  const { user, loading, needsSetup, familyId, kidId } = useAuth();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('tracker');

  if (loading) {
    const brandColor = colors.brandIcon ?? (isDark ? '#FF99AA' : '#FF4D79');
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.appBg }}>
        <SpinnerIcon size={48} color={brandColor} />
      </View>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  if (showDevSetupToggle && forceLoginPreview) {
    return (
      <LoginScreen
        onDevExitPreview={() => onToggleForceLoginPreview(false)}
      />
    );
  }

  if (showDevSetupToggle && forceSetupPreview) {
    return (
      <SetupScreen
        onDevExitPreview={() => onToggleForceSetupPreview(false)}
      />
    );
  }

  if (needsSetup || !familyId || !kidId) {
    return <SetupScreen />;
  }

  return (
    <DataProvider>
      <BottomSheetModalProvider>
        <AppShell
          activeTab={activeTab}
          onTabChange={setActiveTab}
          themeKey={themeKey}
          isDark={isDark}
          onThemeChange={onThemeChange}
          onDarkModeChange={onDarkModeChange}
          showDevSetupToggle={showDevSetupToggle}
          forceSetupPreview={forceSetupPreview}
          forceLoginPreview={forceLoginPreview}
          onToggleForceSetupPreview={onToggleForceSetupPreview}
          onToggleForceLoginPreview={onToggleForceLoginPreview}
          trackerEntranceSeed={trackerEntranceSeed}
          trackerUiReady={trackerUiReady}
        />
      </BottomSheetModalProvider>
    </DataProvider>
  );
}

function LaunchSplashOverlay({
  opacity,
  logoOpacity,
  logoScale,
  logoFloat,
  isDark,
}) {
  const { colors } = useTheme();
  const lockupSource = isDark
    ? require('./assets/lockup-dk.png')
    : require('./assets/lockup-lt.png');
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        appStyles.launchSplash,
        {
          opacity,
          backgroundColor: colors.appBg,
        },
      ]}
    >
      <Animated.View
        style={[
          appStyles.launchSplashCenter,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }, { translateY: logoFloat }],
          },
        ]}
      >
        <Image
          source={lockupSource}
          style={appStyles.launchLockup}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

// ── App Root ──
export default function App() {
  const [fontsLoaded] = Font.useFonts({
    // SF-Pro-Text weights (fontWeight has no effect with custom fonts in RN)
    'SF-Pro': require('./assets/fonts/SF-Pro-Text-Regular.otf'),
    'SF-Pro-Text-Light': require('./assets/fonts/SF-Pro-Text-Light.otf'),
    'SF-Pro-Text-Regular': require('./assets/fonts/SF-Pro-Text-Regular.otf'),
    'SF-Pro-Text-Medium': require('./assets/fonts/SF-Pro-Text-Medium.otf'),
    'SF-Pro-Text-Semibold': require('./assets/fonts/SF-Pro-Text-Semibold.otf'),
    'SF-Pro-Text-Bold': require('./assets/fonts/SF-Pro-Text-Bold.otf'),
    Fraunces: require('./assets/fonts/Fraunces-VariableFont_SOFT,WONK,opsz,wght.ttf'),
  });
  const [themeKey, setThemeKey] = useState('theme1');
  const [isDark, setIsDark] = useState(() => Appearance.getColorScheme() === 'dark');
  const [forceSetupPreview, setForceSetupPreview] = useState(false);
  const [forceLoginPreview, setForceLoginPreview] = useState(false);
  const [appearanceHydrated, setAppearanceHydrated] = useState(false);
  const [showLaunchSplash, setShowLaunchSplash] = useState(true);
  const [trackerEntranceSeed, setTrackerEntranceSeed] = useState(0);
  const launchSplashOpacity = useRef(new Animated.Value(1)).current;
  const launchLogoOpacity = useRef(new Animated.Value(0)).current;
  const launchLogoScale = useRef(new Animated.Value(0.9)).current;
  const launchLogoFloat = useRef(new Animated.Value(0)).current;
  const launchStartedAtRef = useRef(Date.now());
  const showDevSetupToggle = __DEV__ && (Constants?.isDevice === false || Constants?.isDevice == null);

  const handleToggleForceSetupPreview = useCallback((nextValue) => {
    setForceSetupPreview(nextValue);
    if (nextValue) setForceLoginPreview(false);
  }, []);

  const handleToggleForceLoginPreview = useCallback((nextValue) => {
    setForceLoginPreview(nextValue);
    if (nextValue) setForceSetupPreview(false);
  }, []);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem('tt_theme_key'),
      AsyncStorage.getItem('tt_dark_mode'),
    ]).then(([storedTheme, storedDark]) => {
      if (storedTheme) setThemeKey(storedTheme);
      if (storedDark !== null) setIsDark(storedDark === 'true');
    }).catch(() => {
      // Keep fallback defaults if storage is unavailable.
    }).finally(() => {
      setAppearanceHydrated(true);
    });
  }, []);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(launchLogoOpacity, {
        toValue: 1,
        duration: 340,
        useNativeDriver: true,
      }),
      Animated.spring(launchLogoScale, {
        toValue: 1,
        speed: 16,
        bounciness: 7,
        useNativeDriver: true,
      }),
    ]).start();
  }, [launchLogoOpacity, launchLogoScale]);

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(launchLogoFloat, {
          toValue: -4,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(launchLogoFloat, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [launchLogoFloat]);

  useEffect(() => {
    if (!appearanceHydrated || !showLaunchSplash) return;
    const elapsed = Date.now() - launchStartedAtRef.current;
    const waitMs = Math.max(0, LAUNCH_SPLASH_MIN_MS - elapsed);
    const timeoutId = setTimeout(() => {
      Animated.timing(launchSplashOpacity, {
        toValue: 0,
        duration: 280,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          setShowLaunchSplash(false);
          setTrackerEntranceSeed((v) => v + 1);
        }
      });
    }, waitMs);
    return () => clearTimeout(timeoutId);
  }, [appearanceHydrated, showLaunchSplash, launchSplashOpacity]);

  const handleThemeChange = useCallback((nextKey) => {
    setThemeKey(nextKey);
    AsyncStorage.setItem('tt_theme_key', nextKey).catch(() => {});
  }, []);

  const handleDarkModeChange = useCallback((nextIsDark) => {
    setIsDark(nextIsDark);
    AsyncStorage.setItem('tt_dark_mode', String(nextIsDark)).catch(() => {});
  }, []);

  const ready = fontsLoaded && appearanceHydrated;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#FAFAFA' }}>
      {ready ? (
        <ThemeProvider themeKey={themeKey} isDark={isDark}>
          {/* Preload header logos so they decode during splash — avoids lag when header first appears */}
          <View style={preloadStyles.hidden} pointerEvents="none">
            <Image source={require('./assets/brandlogo-dark-68.png')} style={preloadStyles.img} />
            <Image source={require('./assets/brandlogo-lt-68.png')} style={preloadStyles.img} />
          </View>
          <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <AuthProvider>
              <AuthGatedApp
                themeKey={themeKey}
                isDark={isDark}
                onThemeChange={handleThemeChange}
                onDarkModeChange={handleDarkModeChange}
                showDevSetupToggle={showDevSetupToggle}
                forceSetupPreview={forceSetupPreview}
                forceLoginPreview={forceLoginPreview}
                onToggleForceSetupPreview={handleToggleForceSetupPreview}
                onToggleForceLoginPreview={handleToggleForceLoginPreview}
                trackerEntranceSeed={trackerEntranceSeed}
                trackerUiReady={!showLaunchSplash}
              />
            </AuthProvider>
            {showLaunchSplash ? (
              <LaunchSplashOverlay
                opacity={launchSplashOpacity}
                logoOpacity={launchLogoOpacity}
                logoScale={launchLogoScale}
                logoFloat={launchLogoFloat}
                isDark={isDark}
              />
            ) : null}
          </SafeAreaProvider>
        </ThemeProvider>
      ) : null}
    </GestureHandlerRootView>
  );
}

const preloadStyles = StyleSheet.create({
  hidden: { position: 'absolute', left: -9999, opacity: 0.01, width: 34, height: 34 },
  img: { width: 34, height: 34 },
});

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
    bottom: NAV_FADE_BOTTOM_OFFSET,
    left: 0,
    right: 0,
    height: NAV_FADE_HEIGHT,
  },
  launchSplash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  launchSplashCenter: {
    alignItems: 'center',
    position: 'relative',
  },
  launchLockup: {
    width: 260,
    height: 65,
  },
});
