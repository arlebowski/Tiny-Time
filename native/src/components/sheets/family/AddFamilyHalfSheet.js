import React, { useState } from 'react';
import { View, Pressable, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HalfSheet from '../HalfSheet';
import TTInputRow from '../../shared/TTInputRow';
import TTPhotoRow from '../../shared/TTPhotoRow';
import { DatePickerTray } from '../../shared/Wheelpickers';

export default function AddFamilyHalfSheet({
  sheetRef,
  s,
  colors,
  activeTheme,
  savingFamily,
  joiningFamily,
  authLoading,
  addFamilyMode,
  familyInviteCode,
  newFamilyName,
  newFamilyBabyName,
  newFamilyBirthDate,
  newFamilyWeight,
  newFamilyPhotoUris,
  onClose,
  onCreate,
  onJoin,
  onModeChange,
  onInviteCodeChange,
  onFamilyNameChange,
  onBabyNameChange,
  onBirthDateChange,
  onWeightChange,
  onAddPhoto,
  onRemovePhoto,
}) {
  const insets = useSafeAreaInsets();
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false);
  const mode = addFamilyMode === 'join' ? 'join' : 'create';
  const normalizedInviteCode = String(familyInviteCode || '').trim().toUpperCase();
  const canSubmitCreate = Boolean(
    String(newFamilyName || '').trim()
      && String(newFamilyBabyName || '').trim()
      && String(newFamilyBirthDate || '').trim()
  );
  const canSubmitJoin = Boolean(normalizedInviteCode);
  const isBusy = savingFamily || joiningFamily || authLoading;
  const ctaDisabled = isBusy || (mode === 'create' ? !canSubmitCreate : !canSubmitJoin);
  const ctaLabel = mode === 'create'
    ? (savingFamily ? 'Saving...' : 'Add Family')
    : (joiningFamily ? 'Joining...' : 'Join Family');

  const birthDateValue = (() => {
    if (!newFamilyBirthDate?.trim()) return null;
    const d = new Date(newFamilyBirthDate.trim());
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  })();
  return (
    <HalfSheet
      sheetRef={sheetRef}
      title="Add Family"
      accentColor={activeTheme?.bottle?.primary || colors.primaryBrand}
      onClose={onClose}
      snapPoints={['72%']}
      enableDynamicSizing={false}
      scrollable
      useFullWindowOverlay={false}
    >
      <View style={[s.addChildSectionSpacer, { paddingBottom: 6 }]}>
        <View style={{ flexDirection: 'row', gap: 8, backgroundColor: colors.inputBg, borderRadius: 12, padding: 4 }}>
          <Pressable
            onPress={() => onModeChange?.('create')}
            style={({ pressed }) => [
              { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
              mode === 'create' ? { backgroundColor: colors.cardBg } : null,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: mode === 'create' ? '600' : '500' }}>Create</Text>
          </Pressable>
          <Pressable
            onPress={() => onModeChange?.('join')}
            style={({ pressed }) => [
              { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
              mode === 'join' ? { backgroundColor: colors.cardBg } : null,
              pressed ? { opacity: 0.85 } : null,
            ]}
          >
            <Text style={{ color: colors.textPrimary, fontSize: 14, fontWeight: mode === 'join' ? '600' : '500' }}>Join with Code</Text>
          </Pressable>
        </View>
      </View>

      {mode === 'create' ? (
        <>
          <View style={s.addChildSectionSpacer}>
            <TTInputRow insideBottomSheet label="Family Name" type="text" value={newFamilyName} onChange={onFamilyNameChange} placeholder="Our Family" showIcon={false} showChevron={false} enableTapAnimation showLabel />
          </View>
          <View style={s.addChildSectionSpacer}>
            <TTInputRow insideBottomSheet label="Child's Name" type="text" value={newFamilyBabyName} onChange={onBabyNameChange} placeholder="Emma" showIcon={false} showChevron={false} enableTapAnimation showLabel />
          </View>
          <View style={s.addChildSectionSpacer}>
            <TTInputRow
              insideBottomSheet
              label="Birth date"
              type="datetime"
              rawValue={birthDateValue}
              value={newFamilyBirthDate}
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
        </>
      ) : (
        <View style={s.addChildSectionSpacer}>
          <TTInputRow
            insideBottomSheet
            label="Invite Code"
            type="text"
            value={familyInviteCode}
            onChange={(value) => onInviteCodeChange?.(String(value || '').toUpperCase())}
            placeholder="ABC123"
            showIcon={false}
            showChevron={false}
            enableTapAnimation
            showLabel
          />
        </View>
      )}

      <View style={[s.inlineCtaWrap, { paddingBottom: (insets?.bottom || 0) + 12 }]}>
        <Pressable
          onPress={mode === 'create' ? onCreate : onJoin}
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
            {ctaLabel}
          </Text>
        </Pressable>
      </View>
    </HalfSheet>
  );
}
