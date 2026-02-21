import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AnalyticsScreen from '../../screens/AnalyticsScreen';
import AnalyticsDetailScreen from '../../screens/AnalyticsDetailScreen';

const Stack = createNativeStackNavigator();

const AnalyticsStackContext = createContext(null);
const useAnalyticsStack = () => useContext(AnalyticsStackContext);

function AnalyticsRoute({ navigation }) {
  const ctx = useAnalyticsStack();
  return (
    <View style={{ flex: 1 }}>
      {ctx.header}
      <AnalyticsScreen
        onCardTap={(type) => navigation.navigate('AnalyticsDetail', { type })}
        activityVisibility={ctx.activityVisibility}
      />
    </View>
  );
}

function DetailRoute({ route, navigation }) {
  return (
    <AnalyticsDetailScreen
      type={route.params?.type || 'bottle'}
      onBack={() => navigation.goBack()}
    />
  );
}

export default function AnalyticsStack({
  navigationRef,
  onDetailOpenChange,
  activityVisibility,
  header,
}) {
  const handleStateChange = useCallback((state) => {
    const isDetailOpen = (state?.routes?.length ?? 1) > 1;
    onDetailOpenChange?.(isDetailOpen);
  }, [onDetailOpenChange]);

  const contextValue = useMemo(() => ({
    header,
    activityVisibility,
  }), [header, activityVisibility]);

  return (
    <AnalyticsStackContext.Provider value={contextValue}>
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
          <Stack.Screen name="Analytics" component={AnalyticsRoute} />
          <Stack.Screen name="AnalyticsDetail" component={DetailRoute} />
        </Stack.Navigator>
      </NavigationContainer>
    </AnalyticsStackContext.Provider>
  );
}
