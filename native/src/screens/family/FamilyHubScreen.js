import React from 'react';
import { View, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useFamilyScreen } from '../../context/FamilyScreenContext';
import { useAuth } from '../../context/AuthContext';
import FamilyHubSubscreen from './subscreens/FamilyHubSubscreen';
import { useAds } from '../../context/AdsContext';

export default function FamilyHubScreen() {
  const navigation = useNavigation();
  const { colors, radius } = useTheme();
  const ctx = useFamilyScreen();
  const { deletedFamilies, undoDeleteFamily, dismissDeletedFamily } = useAuth();
  const { openRemoveAds } = useAds();

  return (
    <View style={{ flex: 1 }}>
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
          radius={radius}
          activeTheme={ctx.activeTheme}
          currentUser={ctx.currentUser}
          familyInfo={ctx.familyInfo}
          members={ctx.members}
          families={ctx.families}
          familyId={ctx.familyId}
          setFamilyId={ctx.setFamilyId}
          showDevSetupToggle={ctx.showDevSetupToggle}
          forceSetupPreview={ctx.forceSetupPreview}
          forceLoginPreview={ctx.forceLoginPreview}
          forceTooltipPreview={ctx.forceTooltipPreview}
          onToggleForceSetupPreview={ctx.onToggleForceSetupPreview}
          onToggleForceLoginPreview={ctx.onToggleForceLoginPreview}
          onToggleForceTooltipPreview={ctx.onToggleForceTooltipPreview}
          onDevShowCommunityModal={ctx.onDevShowCommunityModal}
          onDevShowPartnerModal={ctx.onDevShowPartnerModal}
          onOpenProfile={() => navigation.navigate('Profile')}
          onOpenAppearance={ctx.openAppearanceSheet}
          onOpenRemoveAds={openRemoveAds}
          onOpenFamily={() => navigation.navigate('FamilyMembers')}
          onOpenAddFamily={ctx.openAddFamilySheet}
          deletedFamilies={deletedFamilies}
          onUndoDeleteFamily={undoDeleteFamily}
          onDismissDeletedFamily={dismissDeletedFamily}
        />
      </ScrollView>
    </View>
  );
}
