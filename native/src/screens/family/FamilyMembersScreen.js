import React, { useCallback } from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useFamilyScreen } from '../../context/FamilyScreenContext';
import FamilySubscreen from './subscreens/FamilySubscreen';

export default function FamilyMembersScreen() {
  const navigation = useNavigation();
  const { colors } = useTheme();
  const ctx = useFamilyScreen();

  const handleOpenKid = useCallback((kid) => {
    ctx.prepareKidSubpage(kid);
    navigation.navigate('Kid');
  }, [ctx, navigation]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.appBg }}
      contentContainerStyle={{ paddingHorizontal: 16 }}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <FamilySubscreen
        s={ctx.s}
        Card={ctx.Card}
        colors={colors}
        activeTheme={ctx.activeTheme}
        kids={ctx.kids}
        kidId={ctx.kidId}
        members={ctx.members}
        familyInfo={ctx.familyInfo}
        familyNameDraft={ctx.familyNameDraft}
        familyOwnerUid={ctx.familyOwnerUid}
        currentUser={ctx.currentUser}
        isFamilyOwner={ctx.isFamilyOwner}
        savingFamilyName={ctx.savingFamilyName}
        onBack={() => navigation.goBack()}
        onFamilyNameChange={ctx.setFamilyNameDraft}
        onSaveFamilyName={ctx.handleSaveFamilyName}
        onOpenKid={handleOpenKid}
        onOpenAddChild={ctx.openAddChildSheet}
        onRemoveMember={ctx.handleRemoveMember}
        onInvitePartner={() => ctx.onInvitePartner?.()}
        formatAgeFromDate={ctx.formatAgeFromDate}
        formatMonthDay={ctx.formatMonthDay}
      />
    </ScrollView>
  );
}
