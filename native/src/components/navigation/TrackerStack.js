import React, { createContext, useCallback, useContext } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TrackerScreen from '../../screens/TrackerScreen';
import DetailScreen from '../../screens/DetailScreen';

const Stack = createNativeStackNavigator();

// Context so screen components can access AppShell callbacks without route params
const TrackerStackContext = createContext(null);
const useTrackerStack = () => useContext(TrackerStackContext);

// Stable screen components (defined outside to avoid remounting)

function TrackerRoute({ navigation }) {
  const ctx = useTrackerStack();
  return (
    <View style={{ flex: 1 }}>
      {ctx.header}
      <TrackerScreen
        entranceToken={ctx.entranceToken}
        onOpenSheet={ctx.onOpenSheet}
        onCardTap={(filterType) => {
          navigation.navigate('Detail', { initialFilter: filterType || 'all' });
        }}
        onRequestToggleActivitySheet={ctx.onRequestToggleActivitySheet}
        activityVisibility={ctx.activityVisibility}
        activityOrder={ctx.activityOrder}
      />
    </View>
  );
}

function DetailRoute({ route, navigation }) {
  const ctx = useTrackerStack();
  return (
    <DetailScreen
      initialFilter={route.params?.initialFilter || 'all'}
      onBack={() => navigation.goBack()}
      onOpenSheet={ctx.onOpenSheet}
      onEditCard={ctx.onEditCard}
      onDeleteCard={ctx.onDeleteCard}
      timelineRefreshRef={ctx.timelineRefreshRef}
      activityVisibility={ctx.activityVisibility}
    />
  );
}

export default function TrackerStack({
  navigationRef,
  header,
  onOpenSheet,
  onRequestToggleActivitySheet,
  activityVisibility,
  activityOrder,
  onEditCard,
  onDeleteCard,
  timelineRefreshRef,
  onDetailOpenChange,
  entranceSeed = 0,
}) {
  const contextValue = React.useMemo(() => ({
    header,
    onOpenSheet,
    onRequestToggleActivitySheet,
    activityVisibility,
    activityOrder,
    onEditCard,
    onDeleteCard,
    timelineRefreshRef,
    entranceToken: entranceSeed,
  }), [
    header,
    onOpenSheet,
    onRequestToggleActivitySheet,
    activityVisibility,
    activityOrder,
    onEditCard,
    onDeleteCard,
    timelineRefreshRef,
    entranceSeed,
  ]);

  const handleStateChange = useCallback((state) => {
    const isDetailOpen = (state?.routes?.length ?? 1) > 1;
    onDetailOpenChange?.(isDetailOpen);
  }, [onDetailOpenChange]);

  return (
    <TrackerStackContext.Provider value={contextValue}>
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
          <Stack.Screen name="Tracker" component={TrackerRoute} />
          <Stack.Screen name="Detail" component={DetailRoute} />
        </Stack.Navigator>
      </NavigationContainer>
    </TrackerStackContext.Provider>
  );
}
