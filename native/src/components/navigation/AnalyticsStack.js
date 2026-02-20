import React, { useCallback } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AnalyticsScreen from '../../screens/AnalyticsScreen';
import AnalyticsDetailScreen from '../../screens/AnalyticsDetailScreen';

const Stack = createNativeStackNavigator();

function AnalyticsRoute({ navigation, activityVisibility }) {
  return (
    <AnalyticsScreen
      onCardTap={(type) => navigation.navigate('AnalyticsDetail', { type })}
      activityVisibility={activityVisibility}
    />
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
}) {
  const handleStateChange = useCallback((state) => {
    const isDetailOpen = (state?.routes?.length ?? 1) > 1;
    onDetailOpenChange?.(isDetailOpen);
  }, [onDetailOpenChange]);

  const analyticsScreen = useCallback(
    (props) => <AnalyticsRoute {...props} activityVisibility={activityVisibility} />,
    [activityVisibility]
  );

  return (
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
        <Stack.Screen name="Analytics" component={analyticsScreen} />
        <Stack.Screen name="AnalyticsDetail" component={DetailRoute} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
