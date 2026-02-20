import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import TTInputRow from '../../../components/shared/TTInputRow';
import { ChevronLeftIcon, CameraIcon, EditIcon } from '../../../components/icons';

export default function ProfileSubscreen({
  s,
  Card,
  colors,
  activeTheme,
  currentUser,
  profilePhotoUrl,
  profileNameDraft,
  profileEmailDraft,
  hasProfileChanges,
  savingProfile,
  onBack,
  onProfilePhoto,
  onProfileNameChange,
  onProfileEmailChange,
  onSaveProfile,
  onSignOut,
  onDeleteAccount,
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
          <Text style={[s.profileHeaderMonthLabel, { color: colors.textPrimary }]}>My Profile</Text>
        </View>
        <View style={[s.profileHeaderCol, s.profileHeaderRight]} />
      </View>

      <Card style={s.profileMainCard}>
        <View style={s.profileAvatarUpload}>
          <Pressable onPress={onProfilePhoto} style={s.photoWrap}>
            <View style={[s.photoCircle, { backgroundColor: colors.inputBg }]}>
              {profilePhotoUrl ? (
                <Image source={{ uri: profilePhotoUrl }} style={s.photoImage} />
              ) : (
                <View style={[s.photoPlaceholder, { backgroundColor: activeTheme?.bottle?.soft || colors.subtleSurface }]}>
                  <Text style={[s.profileInitial, { color: activeTheme?.bottle?.primary || colors.textPrimary }]}>
                    {(profileNameDraft || currentUser.displayName || currentUser.email || '?').charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <View
              style={[
                s.cameraBadge,
                {
                  backgroundColor: activeTheme?.bottle?.primary || colors.primaryBrand,
                  borderColor: colors.cardBg,
                },
              ]}
            >
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
            value={profileNameDraft}
            placeholder="Your name"
            onChange={onProfileNameChange}
          />
          <TTInputRow
            label="Email"
            type="text"
            icon={EditIcon}
            value={profileEmailDraft}
            placeholder="name@example.com"
            onChange={onProfileEmailChange}
          />
        </View>
      </Card>

      {hasProfileChanges ? (
        <Pressable
          onPress={onSaveProfile}
          disabled={savingProfile}
          style={({ pressed }) => [
            s.profileSaveButton,
            { backgroundColor: colors.primaryActionBg, opacity: savingProfile ? 0.6 : 1 },
            pressed && !savingProfile && { opacity: 0.8 },
          ]}
        >
          <Text style={[s.accountBtnText, { color: colors.primaryActionText }]}>
            {savingProfile ? 'Saving...' : 'Save Changes'}
          </Text>
        </Pressable>
      ) : null}

      <Text style={[s.profileSectionLabel, s.profileAccountLabel, { color: colors.textTertiary }]}>ACCOUNT</Text>

      <Card>
        <View style={s.accountBody}>
          <Pressable
            onPress={onSignOut}
            style={({ pressed }) => [
              s.accountBtn,
              { backgroundColor: colors.errorSoft },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[s.accountBtnText, { color: colors.error }]}>Sign Out</Text>
          </Pressable>
          <Pressable
            onPress={onDeleteAccount}
            style={({ pressed }) => [
              s.deleteAccountBtn,
              pressed && { opacity: 0.65 },
            ]}
          >
            <Text style={[s.deleteAccountBtnText, { color: colors.textSecondary }]}>Delete My Account</Text>
          </Pressable>
        </View>
      </Card>

      <View style={{ height: 40 }} />
    </>
  );
}
