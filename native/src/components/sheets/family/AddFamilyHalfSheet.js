import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HalfSheet from '../HalfSheet';
import TTInputRow from '../../shared/TTInputRow';
import TTPhotoRow from '../../shared/TTPhotoRow';

export default function AddFamilyHalfSheet({
  sheetRef,
  s,
  colors,
  activeTheme,
  savingFamily,
  authLoading,
  newFamilyName,
  newFamilyBabyName,
  newFamilyBirthDate,
  newFamilyWeight,
  newFamilyPhotoUris,
  onClose,
  onCreate,
  onFamilyNameChange,
  onBabyNameChange,
  onBirthDateChange,
  onWeightChange,
  onAddPhoto,
  onRemovePhoto,
}) {
  const insets = useSafeAreaInsets();
  const ctaDisabled = savingFamily || authLoading;
  return (
    <HalfSheet
      sheetRef={sheetRef}
      title="Add Family"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      onClose={onClose}
      snapPoints={['76%']}
      initialSnapIndex={0}
      enableDynamicSizing={false}
      scrollable
      useFullWindowOverlay={false}
    >
      <View style={s.addChildSectionSpacer}>
        <TTInputRow insideBottomSheet label="Family Name" type="text" value={newFamilyName} onChange={onFamilyNameChange} placeholder="Our Family" showIcon={false} showChevron={false} enableTapAnimation showLabel />
      </View>
      <View style={s.addChildSectionSpacer}>
        <TTInputRow insideBottomSheet label="Child's Name" type="text" value={newFamilyBabyName} onChange={onBabyNameChange} placeholder="Emma" showIcon={false} showChevron={false} enableTapAnimation showLabel />
      </View>
      <View style={s.addChildSectionSpacer}>
        <TTInputRow insideBottomSheet label="Birth date" type="text" value={newFamilyBirthDate} onChange={onBirthDateChange} placeholder="Add..." showIcon={false} showChevron={false} enableTapAnimation showLabel />
      </View>
      <View style={s.addChildSectionSpacer}>
        <TTInputRow insideBottomSheet label="Current weight (lbs)" type="text" value={newFamilyWeight} onChange={onWeightChange} placeholder="Add..." showIcon={false} showChevron={false} enableTapAnimation showLabel />
      </View>
      <TTPhotoRow
        expanded
        showTitle
        title="Add a photo"
        existingPhotos={[]}
        newPhotos={newFamilyPhotoUris}
        onAddPhoto={onAddPhoto}
        onRemovePhoto={onRemovePhoto}
        onPreviewPhoto={() => {}}
        containerStyle={s.addChildPhotoSection}
      />
      <View style={[s.inlineCtaWrap, { paddingBottom: (insets?.bottom || 0) + 12 }]}>
        <Pressable
          onPress={onCreate}
          disabled={ctaDisabled}
          style={({ pressed }) => [
            s.addChildSubmit,
            {
              backgroundColor: ctaDisabled
                ? (activeTheme?.bottle?.dark || colors.primaryActionBg)
                : (activeTheme?.bottle?.primary || colors.primaryBrand),
              opacity: ctaDisabled ? 0.7 : 1,
            },
            pressed && !ctaDisabled && { opacity: 0.9 },
          ]}
        >
          <Text style={[s.addChildSubmitText, !activeTheme?.bottle && { color: colors.primaryActionText }]}>
            {savingFamily ? 'Saving...' : 'Add Family'}
          </Text>
        </Pressable>
      </View>
    </HalfSheet>
  );
}
