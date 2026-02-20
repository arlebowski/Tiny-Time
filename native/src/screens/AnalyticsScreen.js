import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, Text, View, StyleSheet } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import {
  BottleIcon,
  NursingIcon,
  SolidsIcon,
  SleepIcon,
  DiaperIcon,
} from '../components/icons';
import { useData } from '../context/DataContext';
import { aggregateSleepByDay, avg, dateKeyLocal } from '../components/shared/analyticsHelpers';
import {
  HighlightCard,
  FeedingChart,
  SleepChart,
  SimpleBarChart,
} from '../components/shared/analyticsCharts';
import {
  normalizeActivityVisibility,
  hasAtLeastOneActivityEnabled,
} from '../constants/activityVisibility';


const parseDateKeyToDate = (key) => {
  const parts = String(key || '').split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (!y || !m || !d) return new Date();
  return new Date(y, m - 1, d);
};

const getLastNDaysKeys = (n) => {
  const now = new Date();
  const keys = [];
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.push(dateKeyLocal(d.getTime()));
  }
  return keys;
};

export default function AnalyticsScreen({ onCardTap, activityVisibility }) {
  const { colors, bottle, nursing, solids, sleep, diaper } = useTheme();
  const [scrollY, setScrollY] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const [cardLayouts, setCardLayouts] = useState({});
  const [visibleCards, setVisibleCards] = useState({
    bottle: false,
    nursing: false,
    solids: false,
    sleep: false,
    diaper: false,
  });

  const visibility = useMemo(
    () => normalizeActivityVisibility(activityVisibility),
    [activityVisibility]
  );

  const {
    feedings: rawFeedings,
    nursingSessions: rawNursing,
    solidsSessions: rawSolids,
    diaperChanges: rawDiapers,
    sleepSessions: rawSleep,
    kidSettings,
  } = useData();
  const preferredVolumeUnit = kidSettings?.preferredVolumeUnit === 'ml' ? 'ml' : 'oz';

  const sourceData = useMemo(() => {
    const allFeedings = (rawFeedings || []).map((f) => ({
      timestamp: f.timestamp,
      ounces: Number(f.ounces || 0),
    }));
    const allNursingSessions = (rawNursing || []).map((s) => ({
      timestamp: s.timestamp || s.startTime,
      leftDurationSec: Number(s.leftDurationSec || 0),
      rightDurationSec: Number(s.rightDurationSec || 0),
    }));
    const allSolidsSessions = (rawSolids || []).map((s) => ({
      timestamp: s.timestamp,
      foods: s.foods || [],
    }));
    const allDiaperChanges = (rawDiapers || []).map((c) => ({
      timestamp: c.timestamp,
      isWet: !!c.isWet,
      isPoo: !!c.isPoo,
    }));
    const sleepSessions = (rawSleep || [])
      .filter((s) => s.startTime && s.endTime)
      .map((s) => ({ startTime: s.startTime, endTime: s.endTime }));

    return {
      allFeedings,
      allNursingSessions,
      allSolidsSessions,
      allDiaperChanges,
      sleepSessions,
      sleepSettings: { sleepDayStart: 7 * 60, sleepDayEnd: 19 * 60 },
      preferredVolumeUnit,
    };
  }, [rawFeedings, rawNursing, rawSolids, rawDiapers, rawSleep, preferredVolumeUnit]);

  const hasAnyAnalyticsData = useMemo(
    () =>
      sourceData.allFeedings.length > 0
      || sourceData.sleepSessions.length > 0
      || sourceData.allNursingSessions.length > 0
      || sourceData.allSolidsSessions.length > 0
      || sourceData.allDiaperChanges.length > 0,
    [sourceData]
  );

  const feedingChartData = useMemo(() => {
    const map = {};
    sourceData.allFeedings.forEach((f) => {
      const ts = Number(f?.timestamp);
      if (!Number.isFinite(ts)) return;
      const key = dateKeyLocal(ts);
      if (!map[key]) map[key] = { volume: 0, count: 0 };
      map[key].volume += Number(f?.ounces || 0);
      map[key].count += 1;
    });
    return getLastNDaysKeys(7).map((key) => ({
      key,
      date: parseDateKeyToDate(key),
      volume: map[key]?.volume || 0,
      count: map[key]?.count || 0,
    }));
  }, [sourceData.allFeedings]);

  const feedingChartAverage = useMemo(() => {
    const total = feedingChartData.reduce((sum, d) => sum + (d.volume || 0), 0);
    return feedingChartData.length ? total / feedingChartData.length : 0;
  }, [feedingChartData]);

  const nursingChartData = useMemo(() => {
    const map = {};
    sourceData.allNursingSessions.forEach((s) => {
      const ts = Number(s?.timestamp || s?.startTime || 0);
      if (!Number.isFinite(ts)) return;
      const key = dateKeyLocal(ts);
      const hours = (Number(s?.leftDurationSec || 0) + Number(s?.rightDurationSec || 0)) / 3600;
      if (!map[key]) map[key] = { value: 0, count: 0 };
      map[key].value += hours;
      map[key].count += 1;
    });
    return getLastNDaysKeys(7).map((key) => ({
      key,
      date: parseDateKeyToDate(key),
      value: map[key]?.value || 0,
      count: map[key]?.count || 0,
    }));
  }, [sourceData.allNursingSessions]);

  const nursingChartAverage = useMemo(() => {
    const total = nursingChartData.reduce((sum, d) => sum + (d.value || 0), 0);
    return nursingChartData.length ? total / nursingChartData.length : 0;
  }, [nursingChartData]);

  const solidsChartData = useMemo(() => {
    const map = {};
    sourceData.allSolidsSessions.forEach((s) => {
      const ts = Number(s?.timestamp || 0);
      if (!Number.isFinite(ts)) return;
      const key = dateKeyLocal(ts);
      const foods = Array.isArray(s?.foods) ? s.foods.length : 0;
      if (!map[key]) map[key] = { value: 0, count: 0 };
      map[key].value += foods;
      map[key].count += 1;
    });
    return getLastNDaysKeys(7).map((key) => ({
      key,
      date: parseDateKeyToDate(key),
      value: map[key]?.value || 0,
      count: map[key]?.count || 0,
    }));
  }, [sourceData.allSolidsSessions]);

  const solidsChartAverage = useMemo(() => {
    const total = solidsChartData.reduce((sum, d) => sum + (d.value || 0), 0);
    return solidsChartData.length ? total / solidsChartData.length : 0;
  }, [solidsChartData]);

  const diaperChartData = useMemo(() => {
    const map = {};
    sourceData.allDiaperChanges.forEach((c) => {
      const ts = Number(c?.timestamp || 0);
      if (!Number.isFinite(ts)) return;
      const key = dateKeyLocal(ts);
      if (!map[key]) map[key] = { value: 0 };
      map[key].value += 1;
    });
    return getLastNDaysKeys(7).map((key) => ({
      key,
      date: parseDateKeyToDate(key),
      value: map[key]?.value || 0,
    }));
  }, [sourceData.allDiaperChanges]);

  const diaperChartAverage = useMemo(() => {
    const total = diaperChartData.reduce((sum, d) => sum + (d.value || 0), 0);
    return diaperChartData.length ? total / diaperChartData.length : 0;
  }, [diaperChartData]);

  const sleepChartData = useMemo(() => {
    const byDay = aggregateSleepByDay(sourceData.sleepSessions, sourceData.sleepSettings);
    return getLastNDaysKeys(7).map((key) => ({
      key,
      date: parseDateKeyToDate(key),
      totalHrs: byDay[key]?.totalHrs || 0,
      dayHrs: byDay[key]?.dayHrs || 0,
      nightHrs: byDay[key]?.nightHrs || 0,
      count: byDay[key]?.count || 0,
    }));
  }, [sourceData.sleepSessions, sourceData.sleepSettings]);

  const sleepChartAverage = useMemo(
    () => avg(sleepChartData.map((d) => d.totalHrs || 0)),
    [sleepChartData]
  );

  const setCardLayout = useCallback((key, y, height) => {
    setCardLayouts((prev) => {
      const current = prev[key];
      if (current && current.y === y && current.height === height) return prev;
      return { ...prev, [key]: { y, height } };
    });
  }, []);

  useEffect(() => {
    if (!viewportHeight) return;
    setVisibleCards((prev) => {
      let changed = false;
      const next = { ...prev };
      Object.keys(next).forEach((key) => {
        if (next[key]) return;
        const layout = cardLayouts[key];
        if (!layout?.height) return;
        const viewportTop = scrollY;
        const viewportBottom = scrollY + viewportHeight;
        const cardTop = layout.y;
        const cardBottom = layout.y + layout.height;
        const overlap = Math.max(0, Math.min(cardBottom, viewportBottom) - Math.max(cardTop, viewportTop));
        const visibleRatio = overlap / layout.height;
        if (visibleRatio >= 0.2) {
          next[key] = true;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [cardLayouts, scrollY, viewportHeight]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.appBg }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
      onScroll={(e) => setScrollY(e.nativeEvent.contentOffset.y)}
      scrollEventThrottle={16}
    >
      {!hasAnyAnalyticsData ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No analytics data yet. Start logging activities to see analytics!
          </Text>
        </View>
      ) : !hasAtLeastOneActivityEnabled(visibility) ? (
        <View style={[styles.emptyCard, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
            No activities visible. Enable activities in settings to see analytics.
          </Text>
        </View>
      ) : (
        <>
          {visibility.bottle && (
          <View onLayout={(e) => setCardLayout('bottle', e.nativeEvent.layout.y, e.nativeEvent.layout.height)}>
            <HighlightCard
              icon={<BottleIcon size={20} color={bottle.primary} style={{ transform: [{ rotate: '20deg' }] }} />}
              label="Bottle"
              categoryColor={bottle.primary}
              cardBg={colors.trackerCardBg || colors.cardBg}
              chevronColor={colors.textTertiary}
              onPress={() => onCardTap('bottle')}
            >
              <FeedingChart
                data={feedingChartData}
                average={feedingChartAverage}
                volumeUnit={preferredVolumeUnit}
                feedColor={bottle.primary}
                mutedBarColor={colors.subtleSurface || colors.subtle}
                tertiaryText={colors.textTertiary}
                secondaryText={colors.textSecondary}
                isVisible={visibleCards.bottle}
              />
            </HighlightCard>
          </View>
          )}

          {visibility.nursing && (
          <View onLayout={(e) => setCardLayout('nursing', e.nativeEvent.layout.y, e.nativeEvent.layout.height)}>
            <HighlightCard
              icon={<NursingIcon size={20} color={nursing.primary} />}
              label="Nursing"
              categoryColor={nursing.primary}
              cardBg={colors.trackerCardBg || colors.cardBg}
              chevronColor={colors.textTertiary}
              onPress={() => onCardTap('nursing')}
            >
              <SimpleBarChart
                data={nursingChartData}
                average={nursingChartAverage}
                barColor={nursing.primary}
                mutedBarColor={colors.subtleSurface || colors.subtle}
                tertiaryText={colors.textTertiary}
                secondaryText={colors.textSecondary}
                unit="hrs"
                title="Average nursing"
                isVisible={visibleCards.nursing}
              />
            </HighlightCard>
          </View>
          )}

          {visibility.solids && (
          <View onLayout={(e) => setCardLayout('solids', e.nativeEvent.layout.y, e.nativeEvent.layout.height)}>
            <HighlightCard
              icon={<SolidsIcon size={20} color={solids.primary} />}
              label="Solids"
              categoryColor={solids.primary}
              cardBg={colors.trackerCardBg || colors.cardBg}
              chevronColor={colors.textTertiary}
              onPress={() => onCardTap('solids')}
            >
              <SimpleBarChart
                data={solidsChartData}
                average={solidsChartAverage}
                barColor={solids.primary}
                mutedBarColor={colors.subtleSurface || colors.subtle}
                tertiaryText={colors.textTertiary}
                secondaryText={colors.textSecondary}
                unit="foods"
                title="Average solids"
                isVisible={visibleCards.solids}
              />
            </HighlightCard>
          </View>
          )}

          {visibility.sleep && (
          <View onLayout={(e) => setCardLayout('sleep', e.nativeEvent.layout.y, e.nativeEvent.layout.height)}>
            <HighlightCard
              icon={<SleepIcon size={20} color={sleep.primary} />}
              label="Sleep"
              categoryColor={sleep.primary}
              cardBg={colors.trackerCardBg || colors.cardBg}
              chevronColor={colors.textTertiary}
              onPress={() => onCardTap('sleep')}
            >
              <SleepChart
                data={sleepChartData}
                average={sleepChartAverage}
                sleepColor={sleep.primary}
                mutedBarColor={colors.subtleSurface || colors.subtle}
                tertiaryText={colors.textTertiary}
                secondaryText={colors.textSecondary}
                isVisible={visibleCards.sleep}
              />
            </HighlightCard>
          </View>
          )}

          {visibility.diaper && (
          <View onLayout={(e) => setCardLayout('diaper', e.nativeEvent.layout.y, e.nativeEvent.layout.height)}>
            <HighlightCard
              icon={<DiaperIcon size={20} color={diaper.primary} />}
              label="Diaper"
              categoryColor={diaper.primary}
              cardBg={colors.trackerCardBg || colors.cardBg}
              chevronColor={colors.textTertiary}
              onPress={() => onCardTap('diaper')}
            >
              <SimpleBarChart
                data={diaperChartData}
                average={diaperChartAverage}
                barColor={diaper.primary}
                mutedBarColor={colors.subtleSurface || colors.subtle}
                tertiaryText={colors.textTertiary}
                secondaryText={colors.textSecondary}
                title="Average diapers"
                isVisible={visibleCards.diaper}
              />
            </HighlightCard>
          </View>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 50,
    gap: 12,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: 32,
  },
});
