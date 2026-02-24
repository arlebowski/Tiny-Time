import React, { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HalfSheet from '../HalfSheet';
import TTInputRow from '../../shared/TTInputRow';
import TTPhotoRow from '../../shared/TTPhotoRow';
import { DatePickerTray } from '../../shared/Wheelpickers';

export default function AddChildHalfSheet({
  sheetRef,
  s,
  colors,
  activeTheme,
  savingChild,
  newBabyName,
  newBabyBirthDate,
  newBabyWeight,
  newChildPhotoUris,
  onClose,
  onCreate,
  onNameChange,
  onBirthDateChange,
  onWeightChange,
  onAddPhoto,
  onRemovePhoto,
}) {
  const insets = useSafeAreaInsets();
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false);

  const birthDateValue = (() => {
    if (!newBabyBirthDate?.trim()) return null;
    const d = new Date(newBabyBirthDate.trim());
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  })();

  return (
    <HalfSheet
      sheetRef={sheetRef}
      title="Add Child"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      onClose={onClose}
      snapPoints={['76%']}
      initialSnapIndex={0}
      enableDynamicSizing={false}
      scrollable
      useFullWindowOverlay={false}
    >
      <View style={s.addChildSectionSpacer}>
        <TTInputRow insideBottomSheet label="Child's Name" type="text" value={newBabyName} onChange={onNameChange} placeholder="Emma" showIcon={false} showChevron={false} enableTapAnimation showLabel />
      </View>
      <View style={s.addChildSectionSpacer}>
        <TTInputRow
          insideBottomSheet
          label="Birth date"
          type="datetime"
          rawValue={birthDateValue}
          value={newBabyBirthDate}
          onChange={(iso) => onBirthDateChange(iso || '')}
          placeholder="Tap to select"
          showIcon={false}
          showChevron={false}
          enableTapAnimation
          showLabel
          formatDateTime={(iso) => {
            if (!iso) return '';
            const d = new Date(iso);
            return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
          }}
          onOpenPicker={() => setBirthDatePickerOpen(true)}
        />
      </View>
      <DatePickerTray
        isOpen={birthDatePickerOpen}
        onClose={() => setBirthDatePickerOpen(false)}
        value={birthDateValue || undefined}
        onChange={(iso) => onBirthDateChange(iso || '')}
        title="Birth Date"
        minYear={new Date().getFullYear() - 6}
        maxYear={new Date().getFullYear()}
      />
      <View style={s.addChildSectionSpacer}>
        <TTInputRow insideBottomSheet label="Current weight (lbs)" type="text" value={newBabyWeight} onChange={onWeightChange} placeholder="Add..." showIcon={false} showChevron={false} enableTapAnimation showLabel />
      </View>
      <TTPhotoRow
        expanded
        showTitle
        title="Add a photo"
        existingPhotos={[]}
        newPhotos={newChildPhotoUris}
        onAddPhoto={onAddPhoto}
        onRemovePhoto={onRemovePhoto}
        onPreviewPhoto={() => {}}
        containerStyle={s.addChildPhotoSection}
      />
      <View style={[s.inlineCtaWrap, { paddingBottom: (insets?.bottom || 0) + 12 }]}>
        <Pressable
          onPress={onCreate}
          disabled={savingChild}
          style={({ pressed }) => [
            s.addChildSubmit,
            {
              backgroundColor: savingChild
                ? (activeTheme?.bottle?.dark || colors.primaryActionBg)
                : (activeTheme?.bottle?.primary || colors.primaryBrand),
              opacity: savingChild ? 0.7 : 1,
            },
            pressed && !savingChild && { opacity: 0.9 },
          ]}
        >
          <Text style={[s.addChildSubmitText, !activeTheme?.bottle && { color: colors.primaryActionText }]}>
            {savingChild ? 'Saving...' : 'Add Child'}
          </Text>
        </Pressable>
      </View>
    </HalfSheet>
  );
}
