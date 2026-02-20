import React from 'react';
import { View, Text } from 'react-native';
import HalfSheet from '../HalfSheet';
import TTInputRow from '../../shared/TTInputRow';
import { EditIcon } from '../../icons';
import { THEME_TOKENS } from '../../../../../shared/config/theme';

const FW = THEME_TOKENS.TYPOGRAPHY.fontWeight;

export default function DaySleepWindowHalfSheet({
  sheetRef,
  s,
  colors,
  activeTheme,
  dayStart,
  dayEnd,
  minutesToLabel,
}) {
  return (
    <HalfSheet
      sheetRef={sheetRef}
      title="Day Sleep Window"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      snapPoints={['92%']}
      enableDynamicSizing
      scrollable
    >
      <Text style={[s.sleepDescription, { color: colors.textSecondary }]}>Sleep that starts between these times counts as <Text style={{ fontWeight: FW.medium, color: colors.textPrimary }}>Day Sleep</Text> (naps). Everything else counts as <Text style={{ fontWeight: FW.medium, color: colors.textPrimary }}>Night Sleep</Text>.</Text>

      <View style={s.sleepInputRow}>
        <View style={s.sleepInputHalf}>
          <TTInputRow
            label="Start"
            type="datetime"
            icon={EditIcon}
            rawValue={null}
            placeholder={minutesToLabel(dayStart)}
            formatDateTime={() => minutesToLabel(dayStart)}
          />
        </View>
        <View style={s.sleepInputHalf}>
          <TTInputRow
            label="End"
            type="datetime"
            icon={EditIcon}
            rawValue={null}
            placeholder={minutesToLabel(dayEnd)}
            formatDateTime={() => minutesToLabel(dayEnd)}
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
