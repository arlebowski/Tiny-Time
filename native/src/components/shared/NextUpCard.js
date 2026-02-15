// NextUpCard Component (v4)
// Displays the next feed/sleep state using mockup messaging logic
// 1:1 from web/components/shared/NextUpCard.js

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SleepIcon } from '../icons';

const __ttNextUpToDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === 'number') {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const __ttNextUpFormatDuration = (milliseconds) => {
  const totalMinutes = Math.floor(milliseconds / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} min`;
};

const __ttNextUpFormatTime = (date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutesStr}${ampm}`;
};

const __ttNextUpFormatSleepTimer = (milliseconds) => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours >= 1) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes < 1) {
    return `${seconds}s`;
  }
  return `${minutes}m ${seconds}s`;
};

export default function NextUpCard({
  babyState = 'awake',
  sleepStartTime = null,
  nextEvent = null,
  onWakeUp = () => {},
  onLogFeed = () => {},
  onStartSleep = () => {},
  style = null,
}) {
  const { colors } = useTheme();
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    const interval = babyState === 'sleeping' ? 1000 : 30000;
    const id = setInterval(() => {
      setNowMs(Date.now());
    }, interval);
    return () => clearInterval(id);
  }, [babyState]);

  const resolvedSleepStart = __ttNextUpToDate(sleepStartTime);
  const resolvedNextEvent = (() => {
    if (!nextEvent) return null;
    const scheduledTime = __ttNextUpToDate(nextEvent.scheduledTime || nextEvent.time);
    if (!scheduledTime) return null;
    const type = nextEvent.type === 'feed' ? 'feed' : 'sleep';
    const label = nextEvent.label || (type === 'feed' ? 'Feed' : 'Nap');
    return { type, scheduledTime, label };
  })();

  const stateData = (() => {
    const now = new Date(nowMs);

    // STATE 1: Baby is sleeping
    if (babyState === 'sleeping') {
      const sleepStart = resolvedSleepStart || now;
      const sleepDuration = Math.max(0, now - sleepStart);

      // Always show the next event while sleeping if it exists
      let showNextEvent = false;
      let nextEventText = '';
      if (resolvedNextEvent && resolvedNextEvent.scheduledTime) {
        const scheduledTimeStr = __ttNextUpFormatTime(resolvedNextEvent.scheduledTime);
        const label = resolvedNextEvent.label;
        showNextEvent = true;
        nextEventText = `${label} around ${scheduledTimeStr}`;
      }

      return {
        state: 'sleeping',
        duration: __ttNextUpFormatSleepTimer(sleepDuration),
        nextEvent: showNextEvent ? nextEventText : null,
        buttonText: 'Wake Up',
        buttonAction: onWakeUp
      };
    }

    // STATES 2-4: Baby is awake, check next event
    if (resolvedNextEvent && resolvedNextEvent.scheduledTime) {
      const timeUntilEvent = resolvedNextEvent.scheduledTime - now;
      const minutesUntilEvent = Math.floor(timeUntilEvent / (1000 * 60));
      const isFeed = resolvedNextEvent.type === 'feed';
      const label = resolvedNextEvent.label || (isFeed ? 'Feed' : 'Nap');

      // Format scheduled time
      const scheduledTimeStr = __ttNextUpFormatTime(resolvedNextEvent.scheduledTime);

      // STATE 2 or 3: Event is ready (within 10 min or overdue)
      if (minutesUntilEvent <= 10) {
        let durationText;
        let subText;

        if (minutesUntilEvent < 0) {
          // Overdue
          const minutesOverdue = Math.abs(minutesUntilEvent);
          durationText = `${label} ${minutesOverdue} min ago`;
          subText = `Around ${scheduledTimeStr}`;
        } else {
          // Coming up soon
          durationText = `${label} in ${minutesUntilEvent} min`;
          subText = `Around ${scheduledTimeStr}`;
        }

        return {
          state: isFeed ? 'feedReady' : 'sleepReady',
          duration: durationText,
          nextEvent: subText,
          buttonText: isFeed ? 'Log Feed' : 'Start Sleep',
          buttonAction: isFeed ? onLogFeed : onStartSleep
        };
      }

      // STATE 4: Event is upcoming (more than 10 min away)
      return {
        state: 'upcoming',
        duration: `${label} in ${__ttNextUpFormatDuration(timeUntilEvent)}`,
        nextEvent: `Around ${scheduledTimeStr}`,
        buttonText: null,
        buttonAction: null
      };
    }

    return null;
  })();

  if (!stateData) return null;

  const rootStyle = [
    styles.root,
    styles[`root_${stateData.state}`],
    { backgroundColor: colors.inputBg || colors.cardBg },
    style
  ];

  return (
    <View style={rootStyle}>
      <View style={styles.content}>
        <View style={styles.row}>
          <View style={styles.durationRow}>
            {stateData.state === 'sleeping' && (
              <View style={styles.sleepIconWrap}>
                <SleepIcon size={20} color={colors.textPrimary} strokeWidth={1.5} />
              </View>
            )}
            <Text style={[styles.duration, { color: colors.textPrimary }]}>{stateData.duration}</Text>
            {stateData.state === 'sleeping' && (
              <View style={styles.zzz}>
                <Text style={[styles.zzzText, { color: colors.textSecondary }]}>z</Text>
                <Text style={[styles.zzzText, { color: colors.textSecondary }]}>Z</Text>
                <Text style={[styles.zzzText, { color: colors.textSecondary }]}>z</Text>
              </View>
            )}
          </View>
          {stateData.buttonText && (
            <Pressable
              style={({ pressed }) => [styles.cta, pressed && { opacity: 0.8 }]}
              onPress={stateData.buttonAction}
              accessibilityLabel={stateData.buttonText}
            >
              <Text style={[styles.ctaText, { color: colors.textPrimary }]}>{stateData.buttonText}</Text>
            </Pressable>
          )}
        </View>
        {stateData.nextEvent && (
          <Text style={[styles.subtext, { color: colors.textSecondary }]}>{stateData.nextEvent}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 8,
  },
  root_sleeping: {},
  root_feedReady: {},
  root_sleepReady: {},
  root_upcoming: {},
  content: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sleepIconWrap: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  duration: {
    fontSize: 16,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  zzz: {
    flexDirection: 'row',
    marginLeft: 4,
  },
  zzzText: {
    fontSize: 14,
    fontWeight: '400',
  },
  cta: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: '600',
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
  subtext: {
    fontSize: 12,
    marginTop: 4,
    ...Platform.select({ ios: { fontFamily: 'System' } }),
  },
});
