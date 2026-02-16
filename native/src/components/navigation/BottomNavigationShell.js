import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../context/ThemeContext';
import {
  TodayIcon,
  TodayIconFill,
  TrendsIcon,
  TrendsIconFill,
} from '../icons';
import FloatingTrackerMenu from '../sheets/FloatingTrackerMenu';

function BottomNav({ activeTab, onTabChange, navMinHeight, navTopPadding, tabShiftY }) {
  const { colors } = useTheme();
  const tabColor = colors.textPrimary;

  return (
    <View style={[styles.navContainer, { backgroundColor: colors.appBg, minHeight: navMinHeight, paddingTop: navTopPadding }]}>
      <View style={styles.navInner}>
        <Pressable style={[styles.tab, { transform: [{ translateY: tabShiftY }] }]} onPress={() => onTabChange('tracker')}>
          {activeTab === 'tracker'
            ? <TodayIconFill size={24} color={tabColor} />
            : <TodayIcon size={24} color={tabColor} />
          }
          <Text style={[styles.tabLabel, { color: tabColor }]}>Track</Text>
        </Pressable>

        <View style={[styles.tabSpacer, { transform: [{ translateY: tabShiftY }] }]} />

        <Pressable style={[styles.tab, { transform: [{ translateY: tabShiftY }] }]} onPress={() => onTabChange('trends')}>
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
  lastFeedVariant,
  navMinHeight = 80,
  navTopPadding = 10,
  tabShiftY = -15,
  plusBottomOffset = 36,
}) {
  return (
    <>
      <SafeAreaView edges={['bottom']} style={[styles.bottomSafe, { backgroundColor: appBg }]}>
        <BottomNav
          activeTab={activeTab}
          onTabChange={onTabChange}
          navMinHeight={navMinHeight}
          navTopPadding={navTopPadding}
          tabShiftY={tabShiftY}
        />
      </SafeAreaView>

      <FloatingTrackerMenu
        onSelect={onTrackerSelect}
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
    paddingVertical: 12,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
  },
  tabSpacer: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '300',
  },
});
