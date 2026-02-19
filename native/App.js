import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Share, Alert, ActivityIndicator, Image, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView, initialWindowMetrics, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { LinearGradient } from 'expo-linear-gradient';
import Popover from 'react-native-popover-view';
import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { DataProvider, useData } from './src/context/DataContext';
import { createStorageAdapter } from './src/services/storageAdapter';

// Screens
import TrackerScreen from './src/screens/TrackerScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';
import FamilyScreen from './src/screens/FamilyScreen';
import LoginScreen from './src/screens/LoginScreen';
import SetupScreen from './src/screens/SetupScreen';

// Sheets
import DiaperSheet from './src/components/sheets/DiaperSheet';
import SleepSheet from './src/components/sheets/SleepSheet';
import FeedSheet from './src/components/sheets/FeedSheet';
import ActivityVisibilitySheet from './src/components/sheets/ActivityVisibilitySheet';
import DetailScreen from './src/screens/DetailScreen';
import BottomNavigationShell from './src/components/navigation/BottomNavigationShell';
import {
  normalizeActivityVisibility,
  normalizeActivityOrder,
  hasAtLeastOneActivityEnabled,
  DEFAULT_ACTIVITY_ORDER,
} from './src/constants/activityVisibility';

// Icons (1:1 from web/components/shared/icons.js)
// Web uses HomeIcon (not HouseIcon) for header
import {
  BrandLogo,
  ChevronDownIcon,
  ShareIcon,
  HomeIcon,
  LinkIcon,
  PersonAddIcon,
  KidSelectorOnIcon,
  KidSelectorOffIcon,
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
const APP_SHARE_BASE_URL = 'https://tinytracker.app';
const HIDDEN_ACTIVITY_VISIBILITY = {
  bottle: false,
  nursing: false,
  solids: false,
  sleep: false,
  diaper: false,
};
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
  const { colors, bottle } = useTheme();
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
          <Text style={[headerStyles.kidName, { color: colors.textPrimary }]}>{kidName}</Text>
          <ChevronDownIcon
            size={20}
            color={colors.textTertiary}
            style={showKidMenu ? headerStyles.kidChevronOpen : undefined}
          />
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
        <BrandLogo size={26.4} color={colors.brandIcon} />
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,               // gap-[10px]
  },
  kidChevronOpen: {
    transform: [{ rotate: '180deg' }],
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
  // Brand logo overlay — same centering logic as plus btn: left 50% + offset
  logoOverlay: {
    position: 'absolute',
    left: '50%',
    marginLeft: -13.2,     // half of icon size 26.4 (matches plus: marginLeft -32 for 64px)
    top: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ translateY: -6 }], // align with content row (padding 16 top vs 24 bottom)
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
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
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
    ...Platform.select({
      ios: { fontFamily: 'System' },
    }),
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
    fontWeight: '500',
    ...Platform.select({
      ios: { fontFamily: 'System' },
    }),
  },
  kidMenuAddItem: {
    height: 44,            // h-11
    paddingHorizontal: 12, // px-3
    justifyContent: 'center',
    borderTopWidth: 1,
  },
  kidMenuAddText: {
    fontSize: 14,
    fontWeight: '500',
    ...Platform.select({
      ios: { fontFamily: 'System' },
    }),
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
    trackerBootstrapReady,
    lastBottleAmountOz,
    firestoreService,
    activeSleep,
    updateKidSettings,
  } = useData();

  const handleSignOut = useCallback(() => authSignOut(), [authSignOut]);

  const diaperRef = useRef(null);
  const sleepRef = useRef(null);
  const feedRef = useRef(null);
  const activityVisibilityRef = useRef(null);

  const feedTypeRef = useRef('bottle');
  const [lastFeedVariant, setLastFeedVariant] = useState('bottle');
  const [editEntry, setEditEntry] = useState(null);
  const timelineRefreshRef = useRef(null);
  const [detailFilter, setDetailFilter] = useState(null);
  const [analyticsDetailOpen, setAnalyticsDetailOpen] = useState(false);
  const [analyticsResetSignal, setAnalyticsResetSignal] = useState(0);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [shareAnchor, setShareAnchor] = useState(null);
  const shareButtonRef = useRef(null);
  const [showKidMenu, setShowKidMenu] = useState(false);
  const [kidAnchor, setKidAnchor] = useState(null);
  const kidButtonRef = useRef(null);
  const [headerRequestedAddChild, setHeaderRequestedAddChild] = useState(false);
  const [activityVisibility, setActivityVisibility] = useState(() => ({ ...HIDDEN_ACTIVITY_VISIBILITY }));
  const [activityOrder, setActivityOrder] = useState(() => DEFAULT_ACTIVITY_ORDER.slice());
  const [isActivitySheetOpen, setIsActivitySheetOpen] = useState(false);

  // Create storage adapter for sheets
  const storage = useMemo(
    () => (familyId && kidId ? createStorageAdapter(familyId, kidId) : null),
    [familyId, kidId]
  );

  // Derive user info from real data
  const familyUser = user ? { uid: user.uid, displayName: user.displayName, email: user.email, photoURL: user.photoURL } : null;

  const handleCardTap = useCallback((filterType) => {
    setShowShareMenu(false);
    setShowKidMenu(false);
    setKidAnchor(null);
    setDetailFilter(filterType);
  }, []);

  const handleDetailBack = useCallback(() => {
    setShowShareMenu(false);
    setShowKidMenu(false);
    setKidAnchor(null);
    setDetailFilter(null);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('tt_last_feed_variant').then((stored) => {
      if (stored === 'nursing' || stored === 'bottle') setLastFeedVariant(stored);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!trackerBootstrapReady) return;
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
    trackerBootstrapReady,
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
    setShowKidMenu(false);
    setKidAnchor(null);
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

    let link;
    try {
      const code = await firestoreService.createInvite(resolvedKidId);
      link = `${APP_SHARE_BASE_URL}/?invite=${encodeURIComponent(code)}`;
    } catch {
      Alert.alert('Failed to create invite.');
      return;
    }

    if (Share?.share) {
      try {
        await Share.share({
          title: 'Join me on Tiny Tracker',
          message: `Come join me so we can track together. ${link}`,
          url: link,
        });
        return;
      } catch {
        return;
      }
    }

    Alert.alert('Copy this invite link:', link);
  }, [familyId, kidId, kids, firestoreService]);

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
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        setShareAnchor({ x, y, width, height });
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

    const node = kidButtonRef.current;
    if (node && typeof node.measureInWindow === 'function') {
      node.measureInWindow((x, y, width, height) => {
        setKidAnchor({ x, y, width, height });
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

  return (
    <>
      <SafeAreaView
        style={[appStyles.safe, { backgroundColor: appBg, paddingTop: topInset }]}
        edges={['left', 'right']}
      >
        {detailFilter == null && !(activeTab === 'trends' && analyticsDetailOpen)
          ? (
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
          )
          : null}
        <View style={appStyles.content}>
          {detailFilter != null ? (
            <DetailScreen
              initialFilter={detailFilter}
              onBack={handleDetailBack}
              onOpenSheet={handleTrackerSelect}
              onEditCard={handleEditCard}
              onDeleteCard={handleDeleteCard}
              timelineRefreshRef={timelineRefreshRef}
              activityVisibility={activityVisibility}
            />
          ) : (
            <>
              {activeTab === 'tracker' && (
                <TrackerScreen
                  onOpenSheet={handleTrackerSelect}
                  onCardTap={handleCardTap}
                  onRequestToggleActivitySheet={handleToggleActivitySheet}
                  activityVisibility={activityVisibility}
                  activityOrder={activityOrder}
                  onEditCard={handleEditCard}
                  onDeleteCard={handleDeleteCard}
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
                  onSignOut={handleSignOut}
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
      <Popover
        isVisible={showKidMenu}
        from={kidAnchor || kidButtonRef}
        onRequestClose={() => {
          setShowKidMenu(false);
          setKidAnchor(null);
        }}
        placement="bottom"
        verticalOffset={6}
        arrowSize={{ width: 0, height: 0 }}
        popoverStyle={[
          headerStyles.shareMenu,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
          },
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
        verticalOffset={6}
        arrowSize={{ width: 0, height: 0 }}
        popoverStyle={[
          headerStyles.shareMenu,
          {
            backgroundColor: colors.cardBg,
            borderColor: colors.cardBorder,
          },
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
}) {
  const { user, loading, needsSetup, familyId, kidId } = useAuth();
  const { colors } = useTheme();
  const [activeTab, setActiveTab] = useState('tracker');

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.appBg }}>
        <ActivityIndicator size="large" color={colors.brandIcon} />
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
        />
      </BottomSheetModalProvider>
    </DataProvider>
  );
}

// ── App Root ──
export default function App() {
  const [themeKey, setThemeKey] = useState('theme1');
  const [isDark, setIsDark] = useState(() => Appearance.getColorScheme() === 'dark');
  const [forceSetupPreview, setForceSetupPreview] = useState(false);
  const [forceLoginPreview, setForceLoginPreview] = useState(false);
  const [appearanceHydrated, setAppearanceHydrated] = useState(false);
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

  const handleThemeChange = useCallback((nextKey) => {
    setThemeKey(nextKey);
    AsyncStorage.setItem('tt_theme_key', nextKey).catch(() => {});
  }, []);

  const handleDarkModeChange = useCallback((nextIsDark) => {
    setIsDark(nextIsDark);
    AsyncStorage.setItem('tt_dark_mode', String(nextIsDark)).catch(() => {});
  }, []);

  // Prevent first-frame light flash by waiting for persisted appearance.
  if (!appearanceHydrated) {
    return (
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: isDark ? '#0A0A0A' : '#FAFAFA' }} />
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider themeKey={themeKey} isDark={isDark}>
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
            />
          </AuthProvider>
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
    bottom: NAV_FADE_BOTTOM_OFFSET,
    left: 0,
    right: 0,
    height: NAV_FADE_HEIGHT,
  },
});
