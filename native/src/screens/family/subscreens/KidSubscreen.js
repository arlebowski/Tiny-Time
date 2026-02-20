import React from 'react';
import { View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import TTInputRow from '../../../components/shared/TTInputRow';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  EditIcon,
  BabyIcon,
  CameraIcon,
  SettingsIcon,
  DaySleepWindowIcon,
} from '../../../components/icons';

export default function KidSubscreen({
  s,
  Card,
  colors,
  activeTheme,
  selectedKidName,
  selectedKidLoading,
  babyPhotoUrl,
  selectedKidData,
  selectedKidSettings,
  tempBabyName,
  tempWeight,
  formatAgeFromDate,
  onBack,
  onPhotoClick,
  onBabyNameChange,
  onBabyNameFocus,
  onBabyNameBlur,
  onWeightChange,
  onWeightFocus,
  onWeightBlur,
  onOpenFeedingUnit,
  onOpenDaySleep,
  onOpenActivityVisibility,
  onDeleteKid,
}) {
  return (
    <>
      <View style={[s.profileHeader, { borderBottomColor: colors.cardBorder || 'transparent' }]}>
        <View style={s.profileHeaderCol}>
          <Pressable onPress={onBack} hitSlop={8} style={s.profileBackButton}>
            <ChevronLeftIcon size={20} color={colors.textSecondary} />
            <Text style={[s.profileBackText, { color: colors.textSecondary }]}>Back</Text>
          </Pressable>
        </View>
        <View style={[s.profileHeaderCol, s.profileHeaderCenter, s.familyHeaderTitleSlot]}>
          <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>{selectedKidName}</Text>
        </View>
        <View style={[s.profileHeaderCol, s.profileHeaderRight]} />
      </View>

      {selectedKidLoading ? (
        <View style={s.loadingContainer}>
          <ActivityIndicator color={colors.textSecondary} />
        </View>
      ) : (
        <Card style={s.profileMainCard}>
          <View style={s.profileAvatarUpload}>
            <Pressable onPress={onPhotoClick} style={s.photoWrap}>
              <View style={[s.photoCircle, { backgroundColor: colors.inputBg }]}> 
                {babyPhotoUrl ? (
                  <Image source={{ uri: babyPhotoUrl }} style={s.photoImage} />
                ) : (
                  <View style={[s.photoPlaceholder, { backgroundColor: activeTheme?.bottle?.soft || colors.subtleSurface }]}>
                    <BabyIcon size={48} color={activeTheme?.bottle?.primary || colors.textTertiary} />
                  </View>
                )}
              </View>
              <View style={[s.cameraBadge, { backgroundColor: activeTheme?.bottle?.primary || colors.primaryBrand, borderColor: colors.cardBg }]}>
                <CameraIcon size={16} color="#ffffff" />
              </View>
            </Pressable>
            <Text style={[s.profileAvatarHint, { color: colors.textSecondary }]}>Tap to change photo</Text>
          </View>

          <View style={s.profileFieldsWrap}>
            <TTInputRow
              label="Name"
              type="text"
              icon={EditIcon}
              value={tempBabyName !== null ? tempBabyName : (selectedKidData?.name || '')}
              placeholder="Baby"
              onChange={onBabyNameChange}
              onFocus={onBabyNameFocus}
              onBlur={onBabyNameBlur}
            />
            <TTInputRow
              label="Birth date"
              type="datetime"
              icon={EditIcon}
              rawValue={selectedKidData?.birthDate ? new Date(selectedKidData.birthDate).toISOString() : null}
              placeholder={
                selectedKidData?.birthDate
                  ? `${new Date(selectedKidData.birthDate).toLocaleDateString()} \u2022 ${formatAgeFromDate(selectedKidData.birthDate)}`
                  : 'Not set'
              }
              formatDateTime={(iso) => {
                const d = new Date(iso);
                const dateLabel = d.toLocaleDateString();
                const ageLabel = formatAgeFromDate(d);
                return ageLabel ? `${dateLabel} \u2022 ${ageLabel}` : dateLabel;
              }}
            />
            <TTInputRow
              label="Current weight (lbs)"
              type="text"
              icon={EditIcon}
              value={tempWeight !== null ? tempWeight : (selectedKidSettings.babyWeight?.toString() || '')}
              placeholder="Not set"
              onChange={onWeightChange}
              onFocus={onWeightFocus}
              onBlur={onWeightBlur}
            />
          </View>
        </Card>
      )}

      <Card style={s.cardGap}>
        <Pressable onPress={onOpenFeedingUnit} style={({ pressed }) => [s.appearanceEntryRow, pressed && { opacity: 0.75 }]}>
          <View style={s.appearanceEntryLeft}>
            <View style={[s.appearanceEntryIcon, { backgroundColor: colors.inputBg }]}>
              <Text style={s.appearanceEntryIconLabel}>🍼</Text>
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Feeding Unit</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>This child's unit</Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <Text style={[s.feedUnitValue, { color: colors.textSecondary }]}>{selectedKidSettings.preferredVolumeUnit === 'ml' ? 'ml' : 'oz'}</Text>
            <ChevronRightIcon size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Card>

      <Card style={s.cardGap}>
        <Pressable onPress={onOpenDaySleep} style={({ pressed }) => [s.appearanceEntryRow, pressed && { opacity: 0.75 }]}>
          <View style={s.appearanceEntryLeft}>
            <View style={s.appearanceEntryIcon}>
              <DaySleepWindowIcon size={24} color={colors.textPrimary} />
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Day Sleep Window</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>Set day vs night sleep timing</Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <ChevronRightIcon size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Card>

      <Card style={s.cardGap}>
        <Pressable onPress={onOpenActivityVisibility} style={({ pressed }) => [s.appearanceEntryRow, pressed && { opacity: 0.75 }]}>
          <View style={s.appearanceEntryLeft}>
            <View style={s.appearanceEntryIcon}>
              <SettingsIcon size={24} color={colors.textPrimary} />
            </View>
            <View>
              <Text style={[s.appearanceEntryTitle, { color: colors.textPrimary }]}>Activity Visibility</Text>
              <Text style={[s.appearanceEntrySubtitle, { color: colors.textSecondary }]}>Show & hide tracker activities</Text>
            </View>
          </View>
          <View style={s.appearanceEntryRight}>
            <ChevronRightIcon size={16} color={colors.textSecondary} />
          </View>
        </Pressable>
      </Card>

      <Card style={s.cardGap}>
        <Pressable
          onPress={onDeleteKid}
          style={({ pressed }) => [s.accountBtn, { backgroundColor: colors.errorSoft }, pressed && { opacity: 0.7 }]}
        >
          <Text style={[s.accountBtnText, { color: colors.error }]}>Delete Kid</Text>
        </Pressable>
        <Text style={[s.deleteKidWarning, { color: colors.textSecondary }]}>This removes the child and their data from Tiny Tracker. It cannot be undone.</Text>
      </Card>

      <View style={{ height: 40 }} />
    </>
  );
}
