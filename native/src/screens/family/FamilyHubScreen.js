import React from 'react';
import { View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useFamilyScreen } from '../../context/FamilyScreenContext';
import FamilyHubSubscreen from './subscreens/FamilyHubSubscreen';

export default function FamilyHubScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const ctx = useFamilyScreen();

  return (
    <View style={{ flex: 1 }}>
      {ctx.header}
      <ScrollView
        style={{ flex: 1, backgroundColor: colors.appBg }}
        contentContainerStyle={{ paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <FamilyHubSubscreen
          s={ctx.s}
          Card={ctx.Card}
          colors={colors}
          activeTheme={ctx.activeTheme}
          currentUser={ctx.currentUser}
          familyInfo={ctx.familyInfo}
          members={ctx.members}
          showDevSetupToggle={ctx.showDevSetupToggle}
          forceSetupPreview={ctx.forceSetupPreview}
          forceLoginPreview={ctx.forceLoginPreview}
          onToggleForceSetupPreview={ctx.onToggleForceSetupPreview}
          onToggleForceLoginPreview={ctx.onToggleForceLoginPreview}
          onOpenProfile={() => navigation.navigate('Profile')}
          onOpenAppearance={ctx.openAppearanceSheet}
          onOpenFamily={() => navigation.navigate('FamilyMembers')}
          onOpenAddFamily={ctx.openAddFamilySheet}
        />
      </ScrollView>
    </View>
  );
}
