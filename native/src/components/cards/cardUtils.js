import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// ── Comparison chicklet colors ──
// From web/theme/tokens.js LIGHT_MODE_TOKENS (lines 198-203)
// These are global — not theme-dependent.
export const CHICKLET_COLORS = {
  positive: '#34C759',                       // tokens.js:198
  positiveSoft: 'rgba(52, 199, 89, 0.15)',   // tokens.js:199
  negative: '#FF2D55',                       // tokens.js:202
  negativeSoft: 'rgba(255, 45, 85, 0.15)',   // tokens.js:203
};

/**
 * formatRelativeTime — exact port of web TrackerCard.js:747-758.
 */
export const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (remainingMinutes === 0) return `${hours}h ago`;
  return `${hours}h ${remainingMinutes}m ago`;
};

/**
 * formatRelativeTimeNoAgo — web TrackerCard.js:764-772.
 * Used by sleep card for "Awake Xh Ym" status.
 */
export const formatRelativeTimeNoAgo = (timestamp) => {
  if (!timestamp) return '';
  const now = Date.now();
  const diff = now - timestamp;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;
  if (remainingMinutes === 0) return `${hours}h`;
  return `${hours}h ${remainingMinutes}m`;
};

/**
 * formatVolume — exact port of web formatVolumeValue (TrackerCard.js:324-329)
 * + formatV2Number (TrackerCard.js:274-280).
 */
export const formatVolume = (valueOz, unit) => {
  const v = Number(valueOz);
  if (!Number.isFinite(v)) return '0';
  if (unit === 'ml') return String(Math.round(v * 29.5735));
  const rounded = Math.round(v);
  if (Math.abs(v - rounded) < 1e-9) return String(rounded);
  return v.toFixed(1);
};

/**
 * formatV2Number — exact port of web TrackerCard.js:274-280.
 * Used by solids (food count), sleep (hours), diaper (change count).
 */
export const formatV2Number = (n) => {
  const x = Number(n);
  if (!Number.isFinite(x)) return '0';
  const rounded = Math.round(x);
  if (Math.abs(x - rounded) < 1e-9) return String(rounded);
  return x.toFixed(1);
};

/**
 * formatElapsedHmsTT — exact port of web TrackerCard.js:158-180.
 * Returns { h, m, s, showH, showM, showS, hStr, mStr, sStr, str }.
 * Used by NursingCard for the Xh Ym Zs big number display.
 */
export const formatElapsedHmsTT = (ms) => {
  const totalSec = Math.floor(Math.max(0, Number(ms) || 0) / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad2 = (n) => String(Math.max(0, n)).padStart(2, '0');

  if (h > 0) {
    const hStr = h >= 10 ? pad2(h) : String(h);
    const mStr = pad2(m);
    const sStr = pad2(s);
    return { h, m, s, showH: true, showM: true, showS: true, hStr, mStr, sStr, str: `${hStr}h ${mStr}m ${sStr}s` };
  }

  if (m > 0) {
    const mStr = m >= 10 ? pad2(m) : String(m);
    const sStr = pad2(s);
    return { h: 0, m, s, showH: false, showM: true, showS: true, mStr, sStr, str: `${mStr}m ${sStr}s` };
  }

  const sStr = s < 10 ? String(s) : pad2(s);
  return { h: 0, m: 0, s, showH: false, showM: false, showS: true, sStr, str: `${sStr}s` };
};

/**
 * ComparisonChicklet — exact port of web TrackerCard.js:503-543.
 *
 * Web layout: inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
 *             text-[13px] font-semibold tabular-nums flex-shrink-0
 * Web colors: positive (#34C759) / positiveSoft for positive delta
 *             negative (#FF2D55) / negativeSoft for negative delta
 *             textTertiary / subtle for even
 */
export const ComparisonChicklet = ({ comparison, volumeUnit, evenTextColor, evenBgColor, formatValue }) => {
  if (!comparison || comparison.delta == null) return null;

  const rawDelta = Number(comparison.delta || 0);
  const absDelta = Math.abs(rawDelta);
  const epsilon = Number.isFinite(comparison.evenEpsilon) ? comparison.evenEpsilon : 0.05;
  const isEven = absDelta < epsilon;
  const unitSuffix = comparison.unit ? ` ${comparison.unit}` : '';

  const formattedValue = formatValue
    ? formatValue(absDelta)
    : formatVolume(absDelta, volumeUnit);
  const label = isEven ? 'Even' : `${formattedValue}${unitSuffix}`;

  const chipColor = isEven
    ? evenTextColor
    : (rawDelta >= 0 ? CHICKLET_COLORS.positive : CHICKLET_COLORS.negative);
  const chipBg = isEven
    ? evenBgColor
    : (rawDelta >= 0 ? CHICKLET_COLORS.positiveSoft : CHICKLET_COLORS.negativeSoft);
  const arrow = rawDelta >= 0 ? '↑' : '↓';

  return (
    <View style={[chipStyles.chip, { backgroundColor: chipBg }]}>
      {!isEven ? (
        <Text style={[chipStyles.arrow, { color: chipColor }]}>{arrow}</Text>
      ) : null}
      <Text style={[chipStyles.label, { color: chipColor }]}>{label}</Text>
    </View>
  );
};

const chipStyles = StyleSheet.create({
  // Web: inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,                       // gap-1.5
    paddingHorizontal: 10,        // px-2.5
    paddingVertical: 4,           // py-1
    borderRadius: 8,              // rounded-lg
    flexShrink: 0,                // flex-shrink-0
  },
  // Web: UpArrowIcon/DownArrowIcon w-4 h-4
  arrow: {
    fontSize: 14,                 // w-4 h-4
    fontWeight: '600',
  },
  // Web: text-[13px] font-semibold tabular-nums
  label: {
    fontSize: 13,                 // text-[13px]
    fontWeight: '600',            // font-semibold
    fontVariant: ['tabular-nums'],
  },
});
