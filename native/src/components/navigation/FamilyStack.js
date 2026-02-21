import React, { createContext, useCallback, useContext } from 'react';
import { View, Text, Pressable, Modal } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { FamilyScreenProvider, useFamilyScreen } from '../../context/FamilyScreenContext';
import { useTheme } from '../../context/ThemeContext';
import FamilyHubScreen from '../../screens/family/FamilyHubScreen';
import ProfileScreen from '../../screens/family/ProfileScreen';
import FamilyMembersScreen from '../../screens/family/FamilyMembersScreen';
import KidScreen from '../../screens/family/KidScreen';
import AppearanceHalfSheet from '../../components/sheets/family/AppearanceHalfSheet';
import FeedingUnitHalfSheet from '../../components/sheets/family/FeedingUnitHalfSheet';
import DaySleepWindowHalfSheet from '../../components/sheets/family/DaySleepWindowHalfSheet';
import AddChildHalfSheet from '../../components/sheets/family/AddChildHalfSheet';
import AddFamilyHalfSheet from '../../components/sheets/family/AddFamilyHalfSheet';

const Stack = createNativeStackNavigator();

const FamilyNavContext = createContext({ topInset: 0, header: null });

function FamilyHubRoute() {
  const { topInset, header } = useContext(FamilyNavContext);
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, paddingTop: topInset, backgroundColor: colors.appBg }}>
      {header}
      <FamilyHubScreen />
    </View>
  );
}

function SubRoute({ Component }) {
  const { topInset } = useContext(FamilyNavContext);
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, paddingTop: topInset, backgroundColor: colors.appBg }}>
      <Component />
    </View>
  );
}

function ProfileRoute() { return <SubRoute Component={ProfileScreen} />; }
function FamilyMembersRoute() { return <SubRoute Component={FamilyMembersScreen} />; }
function KidRoute() { return <SubRoute Component={KidScreen} />; }

// Sheets + delete modal rendered outside the navigator but inside the provider
function FamilySheets() {
  const ctx = useFamilyScreen();
  const { colors, s } = ctx;

  return (
    <>
      <FeedingUnitHalfSheet
        sheetRef={ctx.feedingUnitSheetRef}
        s={s}
        colors={colors}
        activeTheme={ctx.activeTheme}
        segmentedTrackColor={ctx.segmentedTrackColor}
        value={ctx.selectedKidSettings?.preferredVolumeUnit === 'ml' ? 'ml' : 'oz'}
        onChange={ctx.handleVolumeUnitChange}
      />
      <DaySleepWindowHalfSheet
        sheetRef={ctx.daySleepSheetRef}
        s={s}
        colors={colors}
        activeTheme={ctx.activeTheme}
        dayStart={ctx.dayStart}
        dayEnd={ctx.dayEnd}
        minutesToLabel={ctx.minutesToLabel}
      />
      <AppearanceHalfSheet
        sheetRef={ctx.appearanceSheetRef}
        s={s}
        colors={colors}
        activeTheme={ctx.activeTheme}
        isDark={ctx.isDark}
        segmentedTrackColor={ctx.segmentedTrackColor}
        colorThemeOrder={ctx.colorThemeOrder}
        activeThemeKey={ctx.activeThemeKey}
        resolveTheme={ctx.resolveTheme}
        onThemeChange={ctx.handleThemeChange}
        onDarkModeChange={ctx.handleDarkModeChange}
      />
      <AddChildHalfSheet
        sheetRef={ctx.addChildSheetRef}
        s={s}
        colors={colors}
        activeTheme={ctx.activeTheme}
        savingChild={ctx.savingChild}
        newBabyName={ctx.newBabyName}
        newBabyBirthDate={ctx.newBabyBirthDate}
        newBabyWeight={ctx.newBabyWeight}
        newChildPhotoUris={ctx.newChildPhotoUris}
        onClose={() => {
          if (!ctx.savingChild) ctx.resetAddChildForm();
        }}
        onCreate={ctx.handleCreateChild}
        onNameChange={ctx.setNewBabyName}
        onBirthDateChange={ctx.setNewBabyBirthDate}
        onWeightChange={ctx.setNewBabyWeight}
        onAddPhoto={ctx.handleAddChildPhoto}
        onRemovePhoto={ctx.handleRemoveChildPhoto}
      />
      <AddFamilyHalfSheet
        sheetRef={ctx.addFamilySheetRef}
        s={s}
        colors={colors}
        activeTheme={ctx.activeTheme}
        savingFamily={ctx.savingFamily}
        authLoading={ctx.authLoading}
        newFamilyName={ctx.newFamilyName}
        newFamilyBabyName={ctx.newFamilyBabyName}
        newFamilyBirthDate={ctx.newFamilyBirthDate}
        newFamilyWeight={ctx.newFamilyWeight}
        newFamilyPhotoUris={ctx.newFamilyPhotoUris}
        onClose={() => {
          if (!ctx.savingFamily) ctx.resetAddFamilyForm();
        }}
        onCreate={ctx.handleCreateFamilyFromSheet}
        onFamilyNameChange={ctx.setNewFamilyName}
        onBabyNameChange={ctx.setNewFamilyBabyName}
        onBirthDateChange={ctx.setNewFamilyBirthDate}
        onWeightChange={ctx.setNewFamilyWeight}
        onAddPhoto={ctx.handleAddFamilyPhoto}
        onRemovePhoto={ctx.handleRemoveFamilyPhoto}
      />
      {ctx.kidPendingDelete ? (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => ctx.setKidPendingDelete(null)}
        >
          <Pressable
            style={s.modalOverlay}
            onPress={() => ctx.setKidPendingDelete(null)}
          >
            <Pressable
              style={[s.deleteModal, { backgroundColor: colors.timelineItemBg || colors.card }]}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={[s.deleteTitle, { color: colors.textPrimary }]}>
                Delete Kid?
              </Text>
              <Text style={[s.deleteMessage, { color: colors.textSecondary }]}>
                Are you sure you want to delete {ctx.kidPendingDelete.name}?
              </Text>
              <View style={s.deleteActions}>
                <Pressable
                  style={[s.deleteBtn, s.cancelBtn, { backgroundColor: colors.subtleSurface ?? colors.subtle }]}
                  onPress={() => ctx.setKidPendingDelete(null)}
                >
                  <Text style={[s.deleteBtnText, { color: colors.textPrimary }]}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[s.deleteBtn, s.confirmBtn, { backgroundColor: colors.error }]}
                  onPress={ctx.handleConfirmDeleteKid}
                >
                  <Text style={[s.deleteBtnText, { color: colors.textOnAccent }]}>Delete</Text>
                </Pressable>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

function FamilyStackNavigator({ navigationRef, topInset, header, onDetailOpenChange }) {
  const navContextValue = React.useMemo(() => ({ topInset, header }), [topInset, header]);
  const handleStateChange = useCallback((state) => {
    const isDetailOpen = (state?.routes?.length ?? 1) > 1;
    onDetailOpenChange?.(isDetailOpen);
  }, [onDetailOpenChange]);

  return (
    <FamilyNavContext.Provider value={navContextValue}>
      <NavigationContainer
        independent
        ref={navigationRef}
        onStateChange={handleStateChange}
      >
        <Stack.Navigator
          screenOptions={{
            headerShown: false,
            animation: 'default',
            gestureEnabled: true,
          }}
        >
          <Stack.Screen name="FamilyHub" component={FamilyHubRoute} />
          <Stack.Screen name="Profile" component={ProfileRoute} />
          <Stack.Screen name="FamilyMembers" component={FamilyMembersRoute} />
          <Stack.Screen name="Kid" component={KidRoute} />
        </Stack.Navigator>
      </NavigationContainer>
    </FamilyNavContext.Provider>
  );
}

export default function FamilyStack({
  navigationRef,
  topInset,
  header,
  user,
  kidId,
  familyId,
  kids,
  onKidChange,
  requestAddChild,
  onRequestAddChildHandled,
  themeKey,
  onThemeChange,
  isDark,
  onDarkModeChange,
  showDevSetupToggle,
  forceSetupPreview,
  forceLoginPreview,
  onToggleForceSetupPreview,
  onToggleForceLoginPreview,
  onRequestToggleActivitySheet,
  onDetailOpenChange,
  onInvitePartner,
  onSignOut,
}) {
  return (
    <FamilyScreenProvider
      user={user}
      kidId={kidId}
      familyId={familyId}
      kids={kids}
      onKidChange={onKidChange}
      requestAddChild={requestAddChild}
      onRequestAddChildHandled={onRequestAddChildHandled}
      themeKey={themeKey}
      onThemeChange={onThemeChange}
      isDark={isDark}
      onDarkModeChange={onDarkModeChange}
      showDevSetupToggle={showDevSetupToggle}
      forceSetupPreview={forceSetupPreview}
      forceLoginPreview={forceLoginPreview}
      onToggleForceSetupPreview={onToggleForceSetupPreview}
      onToggleForceLoginPreview={onToggleForceLoginPreview}
      onRequestToggleActivitySheet={onRequestToggleActivitySheet}
      onDetailOpenChange={onDetailOpenChange}
      onInvitePartner={onInvitePartner}
      onSignOut={onSignOut}
    >
      <FamilyStackNavigator
        navigationRef={navigationRef}
        topInset={topInset}
        header={header}
        onDetailOpenChange={onDetailOpenChange}
      />
      <FamilySheets />
    </FamilyScreenProvider>
  );
}
