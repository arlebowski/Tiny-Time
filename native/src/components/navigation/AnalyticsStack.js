import React, { createContext, useCallback, useContext, useMemo } from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AnalyticsScreen from '../../screens/AnalyticsScreen';
import AnalyticsDetailScreen from '../../screens/AnalyticsDetailScreen';
import { useTheme } from '../../context/ThemeContext';

const Stack = createNativeStackNavigator();

const AnalyticsStackContext = createContext(null);
const useAnalyticsStack = () => useContext(AnalyticsStackContext);

function AnalyticsRoute({ navigation }) {
  const ctx = useAnalyticsStack();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, paddingTop: ctx.topInset, backgroundColor: colors.appBg }}>
      {ctx.header}
      <AnalyticsScreen
        onCardTap={(type) => navigation.navigate('AnalyticsDetail', { type })}
        activityVisibility={ctx.activityVisibility}
      />
    </View>
  );
}

function DetailRoute({ route, navigation }) {
  const ctx = useAnalyticsStack();
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, paddingTop: ctx.topInset, backgroundColor: colors.appBg }}>
      <AnalyticsDetailScreen
        type={route.params?.type || 'bottle'}
        onBack={() => navigation.goBack()}
      />
    </View>
  );
}

export default function AnalyticsStack({
  navigationRef,
  topInset,
  header,
  onDetailOpenChange,
  activityVisibility,
}) {
  const handleStateChange = useCallback((state) => {
    const isDetailOpen = (state?.routes?.length ?? 1) > 1;
    onDetailOpenChange?.(isDetailOpen);
  }, [onDetailOpenChange]);

  const contextValue = useMemo(() => ({
    topInset,
    header,
    activityVisibility,
  }), [topInset, header, activityVisibility]);

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
