import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Animated, Easing } from 'react-native';
import Svg, { Rect, Line, Text as SvgText } from 'react-native-svg';
import { ChevronRightIcon } from '../icons';
import { dateKeyLocal, formatV2Number } from './analyticsHelpers';
import { THEME_TOKENS } from '../../../../shared/config/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

const getDayAbbrev = (date) => {
  const day = date.getDay();
  const abbrevs = ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'];
  return abbrevs[day];
};

const ensure7Days = (items, valueKey) => {
  const next = [...items];
  const now = new Date();
  if (next.length === 0) {
    for (let i = 6; i >= 0; i -= 1) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      next.push({
        day: getDayAbbrev(d),
        [valueKey]: 0,
        isToday: i === 0,
      });
    }
    return next;
  }
  while (next.length < 7) {
    const d = new Date(now);
    d.setDate(now.getDate() - (7 - next.length - 1));
    next.push({
      day: getDayAbbrev(d),
      [valueKey]: 0,
      isToday: next.length === 6,
    });
  }
  return next;
};

function BaseBarChart({
  data = [],
  average = 0,
  barColor,
  mutedBarColor,
  tertiaryText,
  secondaryText,
  valueKey,
  title,
  unit,
  valueFormatter = null,
  isVisible = true,
}) {
  const todayKey = dateKeyLocal(Date.now());

  const chartData = useMemo(() => {
    const shaped = data.map((entry) => ({
      day: entry.date ? getDayAbbrev(entry.date) : '',
      [valueKey]: entry[valueKey] || 0,
      isToday: entry.key === todayKey,
    }));
    return ensure7Days(shaped, valueKey);
  }, [data, todayKey, valueKey]);

  const maxValue = Math.max(...chartData.map((d) => d[valueKey]), average, 1);
  const chartHeight = 130;
  const barWidth = 32;
  const barGap = 16;
  const colWidth = barWidth + barGap;
  const totalWidth = (chartData.length - 1) * colWidth + barWidth;
  const refLineY = chartHeight - (average / maxValue) * chartHeight;
  const animValsRef = useRef([]);
  const hasAnimatedRef = useRef(false);
  const barsLen = chartData.length;

  if (animValsRef.current.length !== barsLen) {
    animValsRef.current = Array.from({ length: barsLen }, () => new Animated.Value(0));
  }

  useEffect(() => {
    if (!isVisible || hasAnimatedRef.current) return;
    hasAnimatedRef.current = true;
    const timings = animValsRef.current.map((val, index) =>
      Animated.timing(val, {
        toValue: 1,
        duration: 820,
        delay: index * 36,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
        useNativeDriver: false,
      })
    );
    Animated.parallel(timings).start();
  }, [barsLen, isVisible]);

  return (
    <View style={styles.chartRoot}>
      <View style={styles.metricWrap}>
        <Text style={[styles.metricTitle, { color: tertiaryText }]}>{title}</Text>
        <View style={styles.metricRow}>
          <Text style={[styles.metricValue, { color: barColor }]}>
            {valueFormatter ? valueFormatter(average) : formatV2Number(average)}
          </Text>
          {unit ? <Text style={[styles.metricUnit, { color: secondaryText }]}>{unit}</Text> : null}
        </View>
      </View>

      <View style={styles.svgWrap}>
        <Svg
          width="100%"
          height={155}
          viewBox={`0 0 ${totalWidth} ${chartHeight + 25}`}
          preserveAspectRatio="xMidYMax meet"
        >
          {chartData.map((bar, index) => {
            const x = index * colWidth;
            const height = (bar[valueKey] / maxValue) * chartHeight;
            const y = chartHeight - height;
            const progress = animValsRef.current[index];
            const animatedHeight = progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, height],
            });
            const animatedY = progress.interpolate({
              inputRange: [0, 1],
              outputRange: [chartHeight, y],
            });
            return (
              <AnimatedRect
                key={`bar-${String(index)}`}
                x={x}
                y={animatedY}
                width={barWidth}
                height={animatedHeight}
                fill={bar.isToday ? barColor : mutedBarColor}
                rx={6}
                ry={6}
              />
            );
          })}
          {chartData.map((bar, index) => {
            const x = index * colWidth + barWidth / 2;
            return (
              <SvgText
                key={`label-${String(index)}`}
                x={x}
                y={chartHeight + 18}
                textAnchor="middle"
                fill={tertiaryText}
                fontSize={12}
                fontWeight={FW.medium}
              >
                {bar.day}
              </SvgText>
            );
          })}
          <Line
            x1={0}
            y1={refLineY}
            x2={totalWidth}
            y2={refLineY}
            stroke={barColor}
            strokeWidth={3}
            opacity={0.85}
          />
        </Svg>
      </View>
    </View>
  );
}

export function HighlightCard({
  icon,
  label,
  categoryColor,
  onPress,
  cardBg,
  chevronColor,
  children,
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.card, cardBg ? { backgroundColor: cardBg } : null, pressed && styles.cardPressed]}
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {icon}
          <Text style={[styles.headerLabel, { color: categoryColor }]}>{label}</Text>
        </View>
        <ChevronRightIcon size={20} color={chevronColor || '#9E9E9E'} />
      </View>
      <View style={styles.chartContainer}>{children}</View>
    </Pressable>
  );
}

export function SleepChart({
  data = [],
  average = 0,
  sleepColor,
  mutedBarColor,
  tertiaryText,
  secondaryText,
  isVisible = true,
}) {
  return (
    <BaseBarChart
      data={data.map((d) => ({ ...d, value: d.totalHrs || 0 }))}
      average={average}
      barColor={sleepColor}
      mutedBarColor={mutedBarColor}
      tertiaryText={tertiaryText}
      secondaryText={secondaryText}
      valueKey="value"
      title="Average sleep"
      unit="hrs"
      isVisible={isVisible}
    />
  );
}

export function FeedingChart({
  data = [],
  average = 0,
  volumeUnit = 'oz',
  feedColor,
  mutedBarColor,
  tertiaryText,
  secondaryText,
  isVisible = true,
}) {
  const unit = volumeUnit === 'ml' ? 'ml' : 'oz';
  const formatAverage = (valueOz) => {
    const oz = Number(valueOz || 0);
    if (!Number.isFinite(oz)) return '0';
    if (unit === 'ml') return String(Math.round(oz * 29.5735));
    return formatV2Number(oz);
  };

  return (
    <BaseBarChart
      data={data.map((d) => ({ ...d, value: d.volume || 0 }))}
      average={average}
      barColor={feedColor}
      mutedBarColor={mutedBarColor}
      tertiaryText={tertiaryText}
      secondaryText={secondaryText}
      valueKey="value"
      title="Average intake"
      unit={unit}
      valueFormatter={formatAverage}
      isVisible={isVisible}
    />
  );
}

export function SimpleBarChart({
  data = [],
  average = 0,
  barColor,
  mutedBarColor,
  tertiaryText,
  secondaryText,
  unit = '',
  title = 'Average',
  valueFormatter = null,
  isVisible = true,
}) {
  return (
    <BaseBarChart
      data={data}
      average={average}
      barColor={barColor}
      mutedBarColor={mutedBarColor}
      tertiaryText={tertiaryText}
      secondaryText={secondaryText}
      valueKey="value"
      title={title}
      unit={unit}
      valueFormatter={valueFormatter}
      isVisible={isVisible}
    />
  );
}

export function DetailHistoryBars({
  items,
  maxValue,
  barColor,
  valueSuffix = '',
  countFormatter,
  dateColor,
  metaColor,
}) {
  const scrollRef = useRef(null);
  const animValsRef = useRef([]);
  if (animValsRef.current.length !== items.length) {
    animValsRef.current = Array.from({ length: items.length }, () => new Animated.Value(0));
  }

  useEffect(() => {
    const vals = animValsRef.current;
    vals.forEach((v) => v.setValue(0));
    Animated.parallel(
      vals.map((v, i) =>
        Animated.timing(v, {
          toValue: 1,
          duration: 500,
          delay: i * 30,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        })
      )
    ).start();
  }, [items.length]);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
    }, 0);
    return () => clearTimeout(t);
  }, [items]);

  return (
    <View style={styles.detailHistoryWrap}>
      <Animated.ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.detailHistoryRow,
          { minWidth: items.length * 60 + (items.length - 1) * 16 },
        ]}
        onContentSizeChange={() => scrollRef.current?.scrollToEnd?.({ animated: true })}
      >
        {items.map((item, index) => {
          const value = Number(item.value || 0);
          const ratio = maxValue > 0 ? value / maxValue : 0;
          const targetHeight = Math.max(30, ratio * 160);
          const animHeight = animValsRef.current[index].interpolate({
            inputRange: [0, 1],
            outputRange: [30, targetHeight],
          });
          const meta = countFormatter ? countFormatter(item) : null;
          return (
            <View key={item.key} style={styles.detailHistoryCol}>
              <View style={styles.detailHistoryBarWrap}>
                <Animated.View
                  style={[
                    styles.detailHistoryBar,
                    {
                      backgroundColor: barColor,
                      height: animHeight,
                    },
                  ]}
                >
                  <Text style={styles.detailHistoryValue}>
                    {item.valueLabel}
                    {valueSuffix ? <Text style={styles.detailHistoryValueSuffix}>{valueSuffix}</Text> : null}
                  </Text>
                </Animated.View>
              </View>
              <Text style={[styles.detailHistoryDate, { color: dateColor }]}>{item.dateLabel}</Text>
              {meta ? <Text style={[styles.detailHistoryMeta, { color: metaColor }]}>{meta}</Text> : null}
            </View>
          );
        })}
      </Animated.ScrollView>
    </View>
  );
}

const FW = THEME_TOKENS.TYPOGRAPHY.fontWeight;
const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  cardPressed: {
    opacity: 0.96,
    transform: [{ scale: 0.992 }],
  },
  header: {
    height: 24,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerLabel: {
    fontSize: 17.6,
    lineHeight: 24,
    fontWeight: FW.semibold,
  },
  chartContainer: {
    height: 240,
  },
  chartRoot: {
    flex: 1,
    justifyContent: 'space-between',
  },
  metricWrap: {
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    fontWeight: FW.medium,
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  metricValue: {
    fontSize: 40,
    lineHeight: 40,
    fontWeight: FW.bold,
    includeFontPadding: false,
  },
  metricUnit: {
    transform: [{ translateY: -1 }],
    fontSize: 17.6,
    lineHeight: 17.6,
    fontWeight: FW.normal,
    includeFontPadding: false,
  },
  svgWrap: {
    marginTop: 8,
    marginHorizontal: -4,
    height: 150,
    justifyContent: 'flex-end',
    alignItems: 'stretch',
  },
  detailHistoryWrap: { position: 'relative' },
  detailHistoryRow: {
    flexDirection: 'row',
    gap: 16,
    paddingBottom: 8,
  },
  detailHistoryCol: {
    width: 60,
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  detailHistoryBarWrap: {
    height: 180,
    width: 60,
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  detailHistoryBar: {
    width: 60,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 8,
  },
  detailHistoryValue: { color: '#fff', fontWeight: FW.semibold, fontSize: 12 },
  detailHistoryValueSuffix: { fontSize: 10, opacity: 0.7, marginLeft: 2 },
  detailHistoryDate: { fontSize: 12, fontWeight: FW.medium },
  detailHistoryMeta: { fontSize: 12 },
});
