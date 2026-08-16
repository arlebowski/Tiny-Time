import React, { useState } from 'react';
import { View, Text, Pressable, Image, ActivityIndicator } from 'react-native';
import TTInputRow from '../../../components/shared/TTInputRow';
import ChevronRightIcon from '../../../components/icons/ChevronRightIcon';
import {
  ChevronLeftIcon,
  EditIcon,
  BabyIcon,
  CameraIcon,
  SettingsIcon,
  DaySleepWindowIcon,
} from '../../../components/icons';
import { DatePickerTray } from '../../../components/shared/Wheelpickers';
import { localDateToMs, timestampToDateOnlyIso } from '../../../utils/dateTime';

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
  savingKidName,
  formatAgeFromDate,
  onBack,
  onPhotoClick,
  onBabyNameChange,
  onBabyNameFocus,
  onBabyNameBlur,
  onOpenFeedingUnit,
  onOpenDaySleep,
  onOpenActivityVisibility,
  onDeleteKid,
  onBirthDateChange = null,
}) {
  const [birthDatePickerOpen, setBirthDatePickerOpen] = useState(false);

  const birthDateValue = selectedKidData?.birthDate
    ? timestampToDateOnlyIso(selectedKidData.birthDate) || null
    : null;
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
          <ActivityIndicator color={colors.brandIcon} />
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
              trailingAction={
                tempBabyName !== null &&
                String(tempBabyName || '').trim() !== String(selectedKidData?.name || '').trim() ? (
                  <Pressable
                    onPress={onBabyNameBlur}
                    disabled={savingKidName}
                    style={({ pressed }) => [
                      s.profileSaveCtaSubtle,
                      {
                        borderColor: colors.primaryActionBg,
                        backgroundColor: savingKidName ? colors.subtleSurface : 'transparent',
                        opacity: savingKidName ? 0.8 : pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={[s.profileSaveCtaSubtleText, { color: colors.primaryActionBg }]}>
                      {savingKidName ? 'Saving…' : 'Save'}
                    </Text>
                  </Pressable>
                ) : undefined
              }
            />
            <TTInputRow
              label="Birth date"
              type="datetime"
              icon={EditIcon}
              rawValue={birthDateValue}
              placeholder={
                selectedKidData?.birthDate
                  ? `${new Date(selectedKidData.birthDate).toLocaleDateString()} \u2022 ${formatAgeFromDate(selectedKidData.birthDate)}`
                  : 'Not set'
              }
              formatDateTime={(iso) => {
                if (!iso) return '';
                const ms = localDateToMs(iso);
                if (ms == null) return '';
                const d = new Date(ms);
                const dateLabel = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                const ageLabel = formatAgeFromDate(ms);
                return ageLabel ? `${dateLabel} \u2022 ${ageLabel}` : dateLabel;
              }}
              onOpenPicker={() => setBirthDatePickerOpen(true)}
              onChange={(iso) => {
                if (typeof onBirthDateChange === 'function') onBirthDateChange(iso);
              }}
            />
            <DatePickerTray
              isOpen={birthDatePickerOpen}
              onClose={() => setBirthDatePickerOpen(false)}
              value={birthDateValue || undefined}
              onChange={(iso) => {
                if (typeof onBirthDateChange === 'function') onBirthDateChange(iso);
              }}
              title="Birth Date"
              minYear={new Date().getFullYear() - 6}
              maxYear={new Date().getFullYear()}
            />
          </View>
        </Card>
      )}

      <Card style={s.cardGap} onPress={onOpenFeedingUnit}>
        <View style={s.appearanceEntryRow}>
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
            <ChevronRightIcon size={20} color={colors.textTertiary} />
          </View>
        </View>
      </Card>

      <Card style={s.cardGap} onPress={onOpenDaySleep}>
        <View style={s.appearanceEntryRow}>
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
            <ChevronRightIcon size={20} color={colors.textTertiary} />
          </View>
        </View>
      </Card>

      <Card style={s.cardGap} onPress={onOpenActivityVisibility}>
        <View style={s.appearanceEntryRow}>
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
            <ChevronRightIcon size={20} color={colors.textTertiary} />
          </View>
        </View>
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
