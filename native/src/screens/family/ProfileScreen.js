import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useFamilyScreen } from '../../context/FamilyScreenContext';
import ProfileSubscreen from './subscreens/ProfileSubscreen';

export default function ProfileScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const ctx = useFamilyScreen();

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.appBg }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <ProfileSubscreen
        s={ctx.s}
        Card={ctx.Card}
        colors={colors}
        activeTheme={ctx.activeTheme}
        currentUser={ctx.currentUser}
        profilePhotoUrl={ctx.profilePhotoUrl}
        profileNameDraft={ctx.profileNameDraft}
        profileEmailDraft={ctx.profileEmailDraft}
        hasProfileChanges={ctx.hasProfileChanges}
        savingProfile={ctx.savingProfile}
        onBack={() => navigation.goBack()}
        onProfilePhoto={ctx.handleProfilePhotoClick}
        onProfileNameChange={ctx.setProfileNameDraft}
        onProfileEmailChange={ctx.setProfileEmailDraft}
        onSaveProfile={ctx.handleSaveProfile}
        onSignOut={ctx.handleSignOut}
        onDeleteAccount={ctx.handleDeleteAccount}
      />
    </ScrollView>
  );
}
