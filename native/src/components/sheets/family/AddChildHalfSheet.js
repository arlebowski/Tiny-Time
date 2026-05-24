import React, { useState } from 'react';
import { View, Pressable, Text, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HalfSheet from '../HalfSheet';
import TTInputRow from '../../shared/TTInputRow';
import TTPhotoRow from '../../shared/TTPhotoRow';
import { DatePickerTray } from '../../shared/Wheelpickers';
import { localDateToMs } from '../../../utils/dateTime';

export default function AddChildHalfSheet({
  sheetRef,
  s,
  colors,
  activeTheme,
  savingChild,
  newBabyName,
  newBabyBirthDate,
  newChildPhotoUris,
  onClose,
  onCreate,
  onNameChange,
  onBirthDateChange,
  onAddPhoto,
  onRemovePhoto,
}) {
  const insets = useSafeAreaInsets();
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false);

  const birthDateValue = newBabyBirthDate?.trim() || null;

  return (
    <HalfSheet
      sheetRef={sheetRef}
      title="Add Child"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      onClose={onClose}
      snapPoints={[]}
      enableDynamicSizing
      maxDynamicContentSize={Dimensions.get('window').height * 0.9}
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
            const ms = localDateToMs(iso);
            if (ms == null) return '';
            const d = new Date(ms);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
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
