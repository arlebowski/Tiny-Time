import React from 'react';
import { View, Text } from 'react-native';
import HalfSheet from '../HalfSheet';
import SegmentedToggle from '../../shared/SegmentedToggle';

export default function FeedingUnitHalfSheet({
  sheetRef,
  s,
  colors,
  activeTheme,
  segmentedTrackColor,
  value,
  onChange,
}) {
  return (
    <HalfSheet
      sheetRef={sheetRef}
      title="Feeding Unit"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      snapPoints={['92%']}
      enableDynamicSizing
      scrollable
    >
      <Text style={[s.feedUnitSheetDescription, { color: colors.textSecondary }]}>Choose how to log bottles for this child.</Text>
      <SegmentedToggle
        value={value}
        options={[{ value: 'oz', label: 'oz' }, { value: 'ml', label: 'ml' }]}
        onChange={onChange}
        variant="body"
        size="medium"
        trackColor={segmentedTrackColor}
      />
      <View style={s.feedUnitSheetSpacer} />
    </HalfSheet>
  );
}
