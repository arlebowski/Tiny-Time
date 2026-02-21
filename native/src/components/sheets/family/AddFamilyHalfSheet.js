import React from 'react';
import { View, Pressable, Text } from 'react-native';
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
      footer={(
        <View style={s.addChildFooter}>
          <Pressable
            onPress={onCreate}
            disabled={savingFamily || authLoading}
            style={({ pressed }) => [
              s.addChildSubmit,
              { backgroundColor: colors.primaryActionBg, opacity: (savingFamily || authLoading) ? 0.5 : (pressed ? 0.85 : 1) },
            ]}
          >
            <Text style={[s.addChildSubmitText, { color: colors.primaryActionText }]}>{savingFamily ? 'Saving...' : 'Add Family'}</Text>
          </Pressable>
        </View>
      )}
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
      <View style={s.addChildPhotoToCtaSpacer} />
    </HalfSheet>
  );
}
