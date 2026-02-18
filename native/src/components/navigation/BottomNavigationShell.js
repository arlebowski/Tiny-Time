import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import {
  TodayIcon,
  TodayIconFill,
  TrendsIcon,
  TrendsIconFill,
} from '../icons';
import FloatingTrackerMenu from '../sheets/FloatingTrackerMenu';

function BottomNav({
  activeTab,
  onTabChange,
  navMinHeight,
  navBackgroundHeight,
  navTopPadding,
  tabShiftY,
  navRowVerticalPadding,
  navItemVerticalPadding,
}) {
  const { colors } = useTheme();
  const tabColor = colors.textPrimary;

  return (
    <View
      style={[
        styles.navContainer,
        {
          backgroundColor: colors.appBg,
          minHeight: navMinHeight,
          paddingTop: navTopPadding,
        },
        navBackgroundHeight == null ? null : { height: navBackgroundHeight },
      ]}
    >
      <View style={[styles.navInner, { paddingVertical: navRowVerticalPadding }]}>
        <Pressable
          style={[
            styles.tab,
            { transform: [{ translateY: tabShiftY }], paddingVertical: navItemVerticalPadding },
          ]}
          onPress={() => onTabChange('tracker')}
        >
          {activeTab === 'tracker'
            ? <TodayIconFill size={24} color={tabColor} />
            : <TodayIcon size={24} color={tabColor} />
          }
          <Text style={[styles.tabLabel, { color: tabColor }]}>Track</Text>
        </Pressable>

        <View
          style={[
            styles.tabSpacer,
            { transform: [{ translateY: tabShiftY }], paddingVertical: navItemVerticalPadding },
          ]}
        />

        <Pressable
          style={[
            styles.tab,
            { transform: [{ translateY: tabShiftY }], paddingVertical: navItemVerticalPadding },
          ]}
          onPress={() => onTabChange('trends')}
        >
          {activeTab === 'trends'
            ? <TrendsIconFill size={24} color={tabColor} />
            : <TrendsIcon size={24} color={tabColor} />
          }
          <Text style={[styles.tabLabel, { color: tabColor }]}>Trends</Text>
        </Pressable>

      </View>
    </View>
  );
}

export default function BottomNavigationShell({
  appBg,
  activeTab,
  onTabChange,
  onTrackerSelect,
  visibleTypes,
  lastFeedVariant,
  navMinHeight = 80,
  navBackgroundHeight,
  navTopPadding = 10,
  tabShiftY = -15,
  plusBottomOffset = 36,
  navRowVerticalPadding = 12,
  navItemVerticalPadding = 8,
  bottomInsetPadding,
}) {
  const insets = useSafeAreaInsets();
  const resolvedBottomInset = bottomInsetPadding == null ? insets.bottom : bottomInsetPadding;

  return (
    <>
      <SafeAreaView edges={[]} style={[styles.bottomSafe, { backgroundColor: appBg, paddingBottom: resolvedBottomInset }]}>
        <BottomNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          navMinHeight={navMinHeight}
          navBackgroundHeight={navBackgroundHeight}
          navTopPadding={navTopPadding}
          tabShiftY={tabShiftY}
          navRowVerticalPadding={navRowVerticalPadding}
          navItemVerticalPadding={navItemVerticalPadding}
        />
      </SafeAreaView>

      <FloatingTrackerMenu
        onSelect={onTrackerSelect}
        visibleTypes={visibleTypes}
        lastFeedVariant={lastFeedVariant}
        bottomOffset={plusBottomOffset}
      />
    </>
  );
}

const styles = StyleSheet.create({
  bottomSafe: {
    overflow: 'visible',
    zIndex: 50,
  },
  navContainer: {
    overflow: 'visible',
  },
  navInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  tabSpacer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '300',
  },
});
