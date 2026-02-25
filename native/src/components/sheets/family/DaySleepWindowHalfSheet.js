import React, { useState } from 'react';
import { View, Text } from 'react-native';
import HalfSheet from '../HalfSheet';
import TTInputRow from '../../shared/TTInputRow';
import { EditIcon } from '../../icons';
import { TimePickerTray } from '../../shared/Wheelpickers';
import { THEME_TOKENS } from '../../../../../shared/config/theme';

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;

function minutesToIso(mins) {
  const m = ((Number(mins) % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const min = m % 60;
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setHours(h, min, 0, 0);
  return d.toISOString();
}

function isoToMinutes(iso) {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.getHours() * 60 + d.getMinutes();
  } catch {
    return null;
  }
}

export default function DaySleepWindowHalfSheet({
  sheetRef,
  s,
  colors,
  activeTheme,
  dayStart,
  dayEnd,
  minutesToLabel,
  onDaySleepWindowChange = null,
}) {
  const [startPickerOpen, setStartPickerOpen] = useState(false);
  const [endPickerOpen, setEndPickerOpen] = useState(false);

  const startValueIso = minutesToIso(dayStart);
  const endValueIso = minutesToIso(dayEnd);
  return (
    <HalfSheet
      sheetRef={sheetRef}
      title="Day Sleep Window"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      snapPoints={['92%']}
      enableDynamicSizing
      scrollable
    >
      <Text style={[s.sleepDescription, { color: colors.textSecondary }]}>Sleep that starts between these times counts as <Text style={{ fontFamily: FWB.medium, color: colors.textPrimary }}>Day Sleep</Text> (naps). Everything else counts as <Text style={{ fontFamily: FWB.medium, color: colors.textPrimary }}>Night Sleep</Text>.</Text>

      <View style={s.sleepInputRow}>
        <View style={s.sleepInputHalf}>
          <TTInputRow insideBottomSheet
            label="Start"
            type="datetime"
            icon={EditIcon}
            rawValue={startValueIso}
            placeholder={minutesToLabel(dayStart)}
            formatDateTime={(iso) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : minutesToLabel(dayStart))}
            onOpenPicker={() => setStartPickerOpen(true)}
            onChange={(iso) => {
              const mins = isoToMinutes(iso);
              if (mins != null && typeof onDaySleepWindowChange === 'function') onDaySleepWindowChange(mins, dayEnd);
            }}
          />
          <TimePickerTray
            isOpen={startPickerOpen}
            onClose={() => setStartPickerOpen(false)}
            value={startValueIso}
            onChange={(iso) => {
              const mins = isoToMinutes(iso);
              if (mins != null && typeof onDaySleepWindowChange === 'function') onDaySleepWindowChange(mins, dayEnd);
            }}
            title="Start time"
          />
        </View>
        <View style={s.sleepInputHalf}>
          <TTInputRow insideBottomSheet
            label="End"
            type="datetime"
            icon={EditIcon}
            rawValue={endValueIso}
            placeholder={minutesToLabel(dayEnd)}
            formatDateTime={(iso) => (iso ? new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' }) : minutesToLabel(dayEnd))}
            onOpenPicker={() => setEndPickerOpen(true)}
            onChange={(iso) => {
              const mins = isoToMinutes(iso);
              if (mins != null && typeof onDaySleepWindowChange === 'function') onDaySleepWindowChange(dayStart, mins);
            }}
          />
          <TimePickerTray
            isOpen={endPickerOpen}
            onClose={() => setEndPickerOpen(false)}
            value={endValueIso}
            onChange={(iso) => {
              const mins = isoToMinutes(iso);
              if (mins != null && typeof onDaySleepWindowChange === 'function') onDaySleepWindowChange(dayStart, mins);
            }}
            title="End time"
          />
        </View>
      </View>

      <View style={s.sliderContainer}>
        <View style={[s.sliderTrack, { backgroundColor: colors.inputBg, borderColor: colors.cardBorder || colors.borderSubtle }]}> 
          <View
            style={[
              s.sliderRange,
              {
                left: `${(Math.min(dayStart, dayEnd) / 1440) * 100}%`,
                width: `${(Math.abs(dayEnd - dayStart) / 1440) * 100}%`,
                backgroundColor: activeTheme?.sleep?.soft || colors.highlightSoft,
              },
            ]}
          />
          <View style={[s.sliderHandle, { left: `${(dayStart / 1440) * 100}%`, backgroundColor: colors.cardBg, borderColor: colors.cardBorder || colors.borderSubtle }]} />
          <View style={[s.sliderHandle, { left: `${(dayEnd / 1440) * 100}%`, backgroundColor: colors.cardBg, borderColor: colors.cardBorder || colors.borderSubtle }]} />
        </View>
        <View style={s.sliderLabels}>
          {['6AM', '9AM', '12PM', '3PM', '6PM', '9PM'].map((label) => (
            <Text key={label} style={[s.sliderLabel, { color: colors.textTertiary }]}>{label}</Text>
          ))}
        </View>
      </View>
      <View style={s.feedUnitSheetSpacer} />
    </HalfSheet>
  );
}
