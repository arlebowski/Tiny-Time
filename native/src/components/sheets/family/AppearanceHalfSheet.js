import React from 'react';
import { View, Text, Pressable } from 'react-native';
import HalfSheet from '../HalfSheet';
import SegmentedToggle from '../../shared/SegmentedToggle';

export default function AppearanceHalfSheet({
  sheetRef,
  s,
  colors,
  activeTheme,
  isDark,
  segmentedTrackColor,
  colorThemeOrder,
  activeThemeKey,
  resolveTheme,
  onThemeChange,
  onDarkModeChange,
}) {
  return (
    <HalfSheet
      sheetRef={sheetRef}
      title="Appearance"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      snapPoints={['92%']}
      enableDynamicSizing
      scrollable
    >
      <View style={s.sectionBody}>
        <View>
          <Text style={[s.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Dark Mode</Text>
          <SegmentedToggle
            value={isDark ? 'dark' : 'light'}
            options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
            onChange={onDarkModeChange}
            variant="body"
            size="medium"
            trackColor={segmentedTrackColor}
          />
        </View>

        <View style={[s.themeSection, s.appearanceThemeSection]}>
          <Text style={[s.fieldLabel, { color: colors.textSecondary, marginBottom: 8 }]}>Color Theme</Text>
          <View style={s.themeGrid}>
            {colorThemeOrder.map((key) => {
              const t = resolveTheme(key);
              if (!t) return null;
              const isSelected = activeThemeKey === key;
              const swatchOrder = ['bottle', 'nursing', 'sleep', 'diaper', 'solids'];
              return (
                <Pressable
                  key={key}
                  onPress={() => onThemeChange(key)}
                  style={[
                    s.themeButton,
                    {
                      backgroundColor: isSelected ? colors.subtleSurface : colors.cardBg,
                      borderColor: isSelected ? colors.outlineStrong : (colors.cardBorder || colors.borderSubtle),
                    },
                  ]}
                >
                  <Text style={[s.themeName, { color: colors.textPrimary }]}>{t.name || key}</Text>
                  <View style={s.swatchRow}>
                    {swatchOrder.map((cardKey) => {
                      const accent = t[cardKey]?.primary || 'transparent';
                      return (
                        <View
                          key={`${key}-${cardKey}`}
                          style={[s.swatch, { backgroundColor: accent, borderColor: colors.cardBorder || colors.borderSubtle }]}
                        />
                      );
                    })}
                  </View>
                </Pressable>
              );
            })}
          </View>
        </View>
        <View style={s.appearanceSheetSpacer} />
      </View>
    </HalfSheet>
  );
}
