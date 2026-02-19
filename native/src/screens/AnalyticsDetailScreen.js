import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import SegmentedToggle from '../components/shared/SegmentedToggle';
import { DetailHistoryBars } from '../components/shared/analyticsCharts';
import {
  BottleIcon,
  NursingIcon,
  SolidsIcon,
  SleepIcon,
  DiaperIcon,
  ChevronLeftIcon,
} from '../components/icons';
import { aggregateSleepByDay, dateKeyLocal } from '../components/shared/analyticsHelpers';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const getTimeframeMeta = (timeframe) => {
  if (timeframe === 'day') return { numDays: 3, labelText: '3-day avg' };
  if (timeframe === 'week') return { numDays: 7, labelText: '7-day avg' };
  return { numDays: 30, labelText: '30-day avg' };
};

const getTodayStart = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};

const getPeriod = ({ allUniqueDays, numDays }) => {
  const todayStart = getTodayStart();
  const excludeToday = allUniqueDays > numDays;
  if (excludeToday) {
    return { periodStart: todayStart - numDays * MS_PER_DAY, periodEnd: todayStart };
  }
  const periodEnd = todayStart + MS_PER_DAY;
  return { periodStart: periodEnd - numDays * MS_PER_DAY, periodEnd };
};

const formatDayLabel = (ts) =>
  new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const formatIntervalParts = (minutes) => {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.round(Math.abs(minutes) % 60);
  return { hours, mins };
};

function IntervalText({ minutes, color, unitColor }) {
  const { hours, mins } = formatIntervalParts(minutes);
  if (hours === 0) {
    return (
      <Text style={[styles.statValue, { color }]}>
        {mins}
        <Text style={[styles.inlineUnit, { color: unitColor }]}>m</Text>
      </Text>
    );
  }
  return (
    <Text style={[styles.statValue, { color }]}>
      {hours}
      <Text style={[styles.inlineUnit, { color: unitColor }]}>h</Text> {mins}
      <Text style={[styles.inlineUnit, { color: unitColor }]}>m</Text>
    </Text>
  );
}

function StatCard({ title, valueNode, subLabel, bgColor, titleColor, valueColor, subColor }) {
  return (
    <View style={[styles.statCard, { backgroundColor: bgColor }]}>
      <Text style={[styles.statTitle, { color: titleColor }]}>{title}</Text>
      {typeof valueNode === 'string' || typeof valueNode === 'number' ? (
        <Text style={[styles.statValue, { color: valueColor }]}>{valueNode}</Text>
      ) : (
        valueNode
      )}
      <Text style={[styles.statSub, { color: subColor }]}>{subLabel}</Text>
    </View>
  );
}

export default function AnalyticsDetailScreen({ type, sourceData, onBack }) {
  const { colors, bottle, nursing, solids, sleep, diaper } = useTheme();
  const [timeframe, setTimeframe] = useState('week');
  const preferredVolumeUnit = sourceData?.preferredVolumeUnit === 'ml' ? 'ml' : 'oz';
  const formatFeedValue = (oz, digits = 1) => {
    const valueOz = Number(oz || 0);
    if (!Number.isFinite(valueOz)) return (0).toFixed(digits);
    if (preferredVolumeUnit === 'ml') return String(Math.round(valueOz * 29.5735));
    return valueOz.toFixed(digits);
  };

  const cfg = useMemo(() => {
    if (type === 'bottle') return { key: 'bottle', title: 'Bottle', color: bottle.primary, Icon: BottleIcon };
    if (type === 'nursing') return { key: 'nursing', title: 'Nursing', color: nursing.primary, Icon: NursingIcon };
    if (type === 'solids') return { key: 'solids', title: 'Solids', color: solids.primary, Icon: SolidsIcon };
    if (type === 'sleep') return { key: 'sleep', title: 'Sleep', color: sleep.primary, Icon: SleepIcon };
    return { key: 'diaper', title: 'Diaper', color: diaper.primary, Icon: DiaperIcon };
  }, [type, bottle.primary, nursing.primary, solids.primary, sleep.primary, diaper.primary]);

  const stats = useMemo(() => {
    const { numDays, labelText } = getTimeframeMeta(timeframe);

    if (type === 'bottle') {
      const feedings = sourceData?.allFeedings || [];
      const allUniqueDays = new Set(feedings.map((f) => new Date(f.timestamp).toDateString())).size;
      const { periodStart, periodEnd } = getPeriod({ allUniqueDays, numDays });
      const recent = feedings
        .filter((f) => f.timestamp >= periodStart && f.timestamp < periodEnd)
        .sort((a, b) => a.timestamp - b.timestamp);
      const totalVolume = recent.reduce((sum, f) => sum + Number(f.ounces || 0), 0);
      const daysInPeriod = Math.ceil((periodEnd - periodStart) / MS_PER_DAY);
      let intervalSum = 0;
      for (let i = 1; i < recent.length; i += 1) {
        intervalSum += (recent[i].timestamp - recent[i - 1].timestamp) / (1000 * 60);
      }
      const buckets = [];
      for (let d = new Date(periodStart); d.getTime() < periodEnd; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const key = dayStart.getTime();
        const inDay = recent.filter((f) => {
          const fd = new Date(f.timestamp);
          fd.setHours(0, 0, 0, 0);
          return fd.getTime() === key;
        });
        const vol = inDay.reduce((s, f) => s + Number(f.ounces || 0), 0);
        buckets.push({
          key: String(key),
          dateLabel: formatDayLabel(key),
          value: vol,
          valueLabel: formatFeedValue(vol, 1),
          count: inDay.length,
        });
      }
      return {
        labelText,
        cards: [
          {
            title: `${preferredVolumeUnit === 'ml' ? 'Ml' : 'Oz'} / Feed`,
            value: formatFeedValue((recent.length ? totalVolume / recent.length : 0), 1),
            unit: preferredVolumeUnit,
          },
          {
            title: `${preferredVolumeUnit === 'ml' ? 'Ml' : 'Oz'} / Day`,
            value: formatFeedValue((daysInPeriod ? totalVolume / daysInPeriod : 0), 1),
            unit: preferredVolumeUnit,
          },
          { title: 'Bottles / Day', value: (daysInPeriod ? recent.length / daysInPeriod : 0).toFixed(1), unit: '' },
          { title: 'Interval', interval: recent.length > 1 ? intervalSum / (recent.length - 1) : 0 },
        ],
        historyTitle: 'Volume History',
        historyItems: buckets,
        maxValue: Math.max(...buckets.map((b) => b.value), 1),
        countFormatter: (item) => `${item.count} bottles`,
        valueSuffix: preferredVolumeUnit,
      };
    }

    if (type === 'nursing') {
      const sessions = sourceData?.allNursingSessions || [];
      const getTs = (s) => Number(s.timestamp || s.startTime || 0);
      const getDurSec = (s) => Number(s.leftDurationSec || 0) + Number(s.rightDurationSec || 0);
      const allUniqueDays = new Set(sessions.map((s) => new Date(getTs(s)).toDateString())).size;
      const { periodStart, periodEnd } = getPeriod({ allUniqueDays, numDays });
      const recent = sessions
        .filter((s) => {
          const ts = getTs(s);
          return ts >= periodStart && ts < periodEnd;
        })
        .sort((a, b) => getTs(a) - getTs(b));
      const totalSec = recent.reduce((sum, s) => sum + getDurSec(s), 0);
      const daysInPeriod = Math.ceil((periodEnd - periodStart) / MS_PER_DAY);
      let intervalSum = 0;
      for (let i = 1; i < recent.length; i += 1) {
        intervalSum += (getTs(recent[i]) - getTs(recent[i - 1])) / (1000 * 60);
      }
      const buckets = [];
      for (let d = new Date(periodStart); d.getTime() < periodEnd; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const key = dayStart.getTime();
        const inDay = recent.filter((s) => {
          const sd = new Date(getTs(s));
          sd.setHours(0, 0, 0, 0);
          return sd.getTime() === key;
        });
        const hours = inDay.reduce((sum, s) => sum + getDurSec(s) / 3600, 0);
        buckets.push({
          key: String(key),
          dateLabel: formatDayLabel(key),
          value: hours,
          valueLabel: Number(hours).toFixed(1),
          count: inDay.length,
        });
      }
      return {
        labelText,
        cards: [
          { title: 'Avg / Session', value: (recent.length ? totalSec / recent.length / 3600 : 0).toFixed(1), unit: 'hrs' },
          { title: 'Total / Day', value: (daysInPeriod ? totalSec / daysInPeriod / 3600 : 0).toFixed(1), unit: 'hrs' },
          { title: 'Sessions / Day', value: (daysInPeriod ? recent.length / daysInPeriod : 0).toFixed(1), unit: '' },
          { title: 'Interval', interval: recent.length > 1 ? intervalSum / (recent.length - 1) : 0 },
        ],
        historyTitle: 'Nursing History',
        historyItems: buckets,
        maxValue: Math.max(...buckets.map((b) => b.value), 1),
        countFormatter: (item) => `${item.count} sessions`,
        valueSuffix: 'h',
      };
    }

    if (type === 'solids') {
      const sessions = sourceData?.allSolidsSessions || [];
      const getTs = (s) => Number(s.timestamp || 0);
      const getFoods = (s) => (Array.isArray(s.foods) ? s.foods.length : 0);
      const allUniqueDays = new Set(sessions.map((s) => new Date(getTs(s)).toDateString())).size;
      const { periodStart, periodEnd } = getPeriod({ allUniqueDays, numDays });
      const recent = sessions
        .filter((s) => {
          const ts = getTs(s);
          return ts >= periodStart && ts < periodEnd;
        })
        .sort((a, b) => getTs(a) - getTs(b));
      const totalFoods = recent.reduce((sum, s) => sum + getFoods(s), 0);
      const daysInPeriod = Math.ceil((periodEnd - periodStart) / MS_PER_DAY);
      let intervalSum = 0;
      for (let i = 1; i < recent.length; i += 1) {
        intervalSum += (getTs(recent[i]) - getTs(recent[i - 1])) / (1000 * 60);
      }
      const buckets = [];
      for (let d = new Date(periodStart); d.getTime() < periodEnd; d.setDate(d.getDate() + 1)) {
        const dayStart = new Date(d);
        dayStart.setHours(0, 0, 0, 0);
        const key = dayStart.getTime();
        const inDay = recent.filter((s) => {
          const sd = new Date(getTs(s));
          sd.setHours(0, 0, 0, 0);
          return sd.getTime() === key;
        });
        const foods = inDay.reduce((sum, s) => sum + getFoods(s), 0);
        buckets.push({
          key: String(key),
          dateLabel: formatDayLabel(key),
          value: foods,
          valueLabel: Number(foods).toFixed(0),
          count: inDay.length,
        });
      }
      return {
        labelText,
        cards: [
          { title: 'Foods / Session', value: (recent.length ? totalFoods / recent.length : 0).toFixed(1), unit: '' },
          { title: 'Foods / Day', value: (daysInPeriod ? totalFoods / daysInPeriod : 0).toFixed(1), unit: '' },
          { title: 'Meals / Day', value: (daysInPeriod ? recent.length / daysInPeriod : 0).toFixed(1), unit: '' },
          { title: 'Interval', interval: recent.length > 1 ? intervalSum / (recent.length - 1) : 0 },
        ],
        historyTitle: 'Solids History',
        historyItems: buckets,
        maxValue: Math.max(...buckets.map((b) => b.value), 1),
        countFormatter: (item) => `${item.count} meals`,
        valueSuffix: 'foods',
      };
    }

    if (type === 'sleep') {
      const sleepSessions = sourceData?.sleepSessions || [];
      const sleepSettings = sourceData?.sleepSettings || null;
      const byDay = aggregateSleepByDay(sleepSessions, sleepSettings);
      const allUniqueDays = Object.keys(byDay).filter((k) => (byDay[k]?.totalHrs || 0) > 0 || (byDay[k]?.count || 0) > 0).length;
      const { periodStart, periodEnd } = getPeriod({ allUniqueDays, numDays });

      const keys = [];
      for (let d = new Date(periodStart); d.getTime() < periodEnd; d.setDate(d.getDate() + 1)) {
        keys.push(dateKeyLocal(d.getTime()));
      }
      let totalHrs = 0;
      let dayHrs = 0;
      let nightHrs = 0;
      let count = 0;
      const buckets = keys.map((k) => {
        const v = byDay[k] || {};
        totalHrs += Number(v.totalHrs || 0);
        dayHrs += Number(v.dayHrs || 0);
        nightHrs += Number(v.nightHrs || 0);
        count += Number(v.count || 0);
        const date = (() => {
          const [y, m, d] = String(k).split('-').map(Number);
          return new Date(y, (m || 1) - 1, d || 1);
        })();
        return {
          key: k,
          dateLabel: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          value: Number(v.totalHrs || 0),
          valueLabel: Number(v.totalHrs || 0).toFixed(1),
          count: Number(v.count || 0),
        };
      });
      const daysInPeriod = keys.length || 1;
      return {
        labelText,
        cards: [
          { title: 'Hours / Day', value: (totalHrs / daysInPeriod).toFixed(1), unit: 'hrs' },
          { title: 'Sleeps / Day', value: (count / daysInPeriod).toFixed(1), unit: '' },
          { title: 'Day Sleep', value: (dayHrs / daysInPeriod).toFixed(1), unit: 'hrs' },
          { title: 'Night Sleep', value: (nightHrs / daysInPeriod).toFixed(1), unit: 'hrs' },
        ],
        historyTitle: 'Sleep history',
        historyItems: buckets,
        maxValue: Math.max(...buckets.map((b) => b.value), 1),
        countFormatter: (item) => `${item.count} sleeps`,
        valueSuffix: 'h',
      };
    }

    const changes = sourceData?.allDiaperChanges || [];
    const getTs = (c) => Number(c.timestamp || 0);
    const allUniqueDays = new Set(changes.map((c) => new Date(getTs(c)).toDateString())).size;
    const { periodStart, periodEnd } = getPeriod({ allUniqueDays, numDays });
    const recent = changes
      .filter((c) => {
        const ts = getTs(c);
        return ts >= periodStart && ts < periodEnd;
      })
      .sort((a, b) => getTs(a) - getTs(b));
    const totalChanges = recent.length;
    const totalWet = recent.filter((c) => !!c.isWet).length;
    const totalPoo = recent.filter((c) => !!c.isPoo).length;
    const daysInPeriod = Math.ceil((periodEnd - periodStart) / MS_PER_DAY);
    let intervalSum = 0;
    for (let i = 1; i < recent.length; i += 1) {
      intervalSum += (getTs(recent[i]) - getTs(recent[i - 1])) / (1000 * 60);
    }
    const buckets = [];
    for (let d = new Date(periodStart); d.getTime() < periodEnd; d.setDate(d.getDate() + 1)) {
      const dayStart = new Date(d);
      dayStart.setHours(0, 0, 0, 0);
      const key = dayStart.getTime();
      const inDay = recent.filter((c) => {
        const cd = new Date(getTs(c));
        cd.setHours(0, 0, 0, 0);
        return cd.getTime() === key;
      });
      buckets.push({
        key: String(key),
        dateLabel: formatDayLabel(key),
        value: inDay.length,
        valueLabel: String(inDay.length),
        count: inDay.length,
      });
    }
    return {
      labelText,
      cards: [
        { title: 'Changes / Day', value: (daysInPeriod ? totalChanges / daysInPeriod : 0).toFixed(1), unit: '' },
        { title: 'Wet / Day', value: (daysInPeriod ? totalWet / daysInPeriod : 0).toFixed(1), unit: '' },
        { title: 'Poop / Day', value: (daysInPeriod ? totalPoo / daysInPeriod : 0).toFixed(1), unit: '' },
        { title: 'Interval', interval: recent.length > 1 ? intervalSum / (recent.length - 1) : 0 },
      ],
      historyTitle: 'Diaper History',
      historyItems: buckets,
      maxValue: Math.max(...buckets.map((b) => b.value), 1),
      countFormatter: () => null,
      valueSuffix: '',
    };
  }, [timeframe, type, sourceData, preferredVolumeUnit]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.appBg }]}>
      <View style={[styles.header, { borderBottomColor: colors.cardBorder || 'transparent' }]}>
        <View style={styles.headerCol}>
          <Pressable style={styles.backBtn} onPress={onBack}>
            <ChevronLeftIcon size={20} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
          </Pressable>
        </View>
        <View style={[styles.headerCol, styles.headerCenter]}>
          <View style={styles.titleWrap}>
            <cfg.Icon
              size={20}
              color={cfg.color}
              style={cfg.key === 'bottle' ? { transform: [{ rotate: '20deg' }] } : null}
            />
            <Text style={[styles.title, { color: cfg.color }]}>{cfg.title}</Text>
          </View>
        </View>
        <View style={[styles.headerCol, styles.headerRight]} />
      </View>

      <View style={styles.toggleWrap}>
        <SegmentedToggle
          value={timeframe}
          onChange={setTimeframe}
          options={[
            { value: 'day', label: '3D' },
            { value: 'week', label: '7D' },
            { value: 'month', label: '30D' },
          ]}
          variant="body"
          size="medium"
          fullWidth
        />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.grid}>
          {stats.cards.slice(0, 2).map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              valueNode={
                card.interval != null ? (
                  <IntervalText minutes={card.interval} color={cfg.color} unitColor={colors.textTertiary} />
                ) : card.unit ? (
                  <Text style={[styles.statValue, { color: cfg.color }]}>
                    {card.value}
                    <Text style={[styles.inlineUnit, { color: colors.textTertiary }]}>{card.unit}</Text>
                  </Text>
                ) : (
                  card.value
                )
              }
              subLabel={stats.labelText}
              bgColor={colors.cardBg}
              titleColor={colors.textSecondary}
              valueColor={cfg.color}
              subColor={colors.textTertiary}
            />
          ))}
        </View>

        <View style={[styles.grid, styles.gridMt]}>
          {stats.cards.slice(2, 4).map((card) => (
            <StatCard
              key={card.title}
              title={card.title}
              valueNode={
                card.interval != null ? (
                  <IntervalText minutes={card.interval} color={cfg.color} unitColor={colors.textTertiary} />
                ) : card.unit ? (
                  <Text style={[styles.statValue, { color: cfg.color }]}>
                    {card.value}
                    <Text style={[styles.inlineUnit, { color: colors.textTertiary }]}>{card.unit}</Text>
                  </Text>
                ) : (
                  card.value
                )
              }
              subLabel={stats.labelText}
              bgColor={colors.cardBg}
              titleColor={colors.textSecondary}
              valueColor={cfg.color}
              subColor={colors.textTertiary}
            />
          ))}
        </View>

        <View style={[styles.historyCard, { backgroundColor: colors.cardBg }]}>
          <Text style={[styles.historyTitle, { color: colors.textSecondary }]}>{stats.historyTitle}</Text>
          {stats.historyItems.length > 0 ? (
            <DetailHistoryBars
              items={stats.historyItems}
              maxValue={stats.maxValue}
              barColor={cfg.color}
              valueSuffix={stats.valueSuffix}
              countFormatter={stats.countFormatter}
              dateColor={colors.textSecondary}
              metaColor={colors.textTertiary}
            />
          ) : (
            <Text style={[styles.noData, { color: colors.textTertiary }]}>No data to display</Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
  },
  headerCol: { flex: 1, justifyContent: 'center' },
  headerCenter: { alignItems: 'center' },
  headerRight: { alignItems: 'flex-end' },
  backBtn: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
  },
  backText: { fontSize: 15, fontWeight: '500' },
  titleWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  title: { fontSize: 18, fontWeight: '600', lineHeight: 24 },
  toggleWrap: { paddingTop: 12, paddingBottom: 8, paddingHorizontal: 16 },
  content: { paddingHorizontal: 16, paddingBottom: 50 },
  grid: { flexDirection: 'row', gap: 16 },
  gridMt: { marginTop: 16 },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    gap: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  statTitle: { fontSize: 15, fontWeight: '600' },
  statValue: {
    fontSize: 30,
    fontWeight: '700',
    lineHeight: 30,
    marginBottom: -8,
    includeFontPadding: false,
  },
  inlineUnit: {
    fontSize: 20,
    fontWeight: '400',
    lineHeight: 20,
    marginLeft: 4,
    includeFontPadding: false,
  },
  statSub: { fontSize: 12, fontWeight: '400', lineHeight: 12 },
  historyCard: {
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  historyTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6, textAlign: 'center' },
  historyRow: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 8,
  },
  historyCol: {
    width: 60,
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  historyBarWrap: {
    height: 180,
    width: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  historyBar: {
    width: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  historyValue: { color: '#fff', fontWeight: '600', fontSize: 12 },
  historyValueSuffix: { fontSize: 10, opacity: 0.7, marginLeft: 2 },
  historyDate: { fontSize: 12, fontWeight: '500' },
  historyMeta: { fontSize: 12 },
  noData: { textAlign: 'center', paddingVertical: 32 },
});
