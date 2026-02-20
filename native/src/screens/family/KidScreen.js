import React from 'react';
import { ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { useFamilyScreen } from '../../context/FamilyScreenContext';
import KidSubscreen from './subscreens/KidSubscreen';

export default function KidScreen() {
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
      <KidSubscreen
        s={ctx.s}
        Card={ctx.Card}
        colors={colors}
        activeTheme={ctx.activeTheme}
        selectedKidName={ctx.selectedKidName}
        selectedKidLoading={ctx.selectedKidLoading}
        babyPhotoUrl={ctx.babyPhotoUrl}
        selectedKidData={ctx.selectedKidData}
        selectedKidSettings={ctx.selectedKidSettings}
        tempBabyName={ctx.tempBabyName}
        tempWeight={ctx.tempWeight}
        formatAgeFromDate={ctx.formatAgeFromDate}
        onBack={() => navigation.goBack()}
        onPhotoClick={ctx.handlePhotoClick}
        onBabyNameChange={ctx.handleBabyNameChange}
        onBabyNameFocus={() => ctx.setEditingName(true)}
        onBabyNameBlur={ctx.handleUpdateBabyName}
        onWeightChange={ctx.handleWeightChange}
        onWeightFocus={() => ctx.setEditingWeight(true)}
        onWeightBlur={ctx.handleUpdateWeight}
        onOpenFeedingUnit={ctx.openFeedingUnitSheet}
        onOpenDaySleep={ctx.openDaySleepSheet}
        onOpenActivityVisibility={ctx.handleOpenActivityVisibility}
        onDeleteKid={ctx.handleRequestDeleteKid}
      />
    </ScrollView>
  );
}
