import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Screens
import TrackerScreen from './src/screens/TrackerScreen';
import AnalyticsScreen from './src/screens/AnalyticsScreen';

const Tab = createBottomTabNavigator();

// Custom floating add button component
function FloatingAddButton({ onPress }) {
  return (
    <TouchableOpacity
      style={styles.floatingButton}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Ionicons name="add" size={32} color="#212121" />
    </TouchableOpacity>
  );
}

export default function App() {
  const handleQuickAdd = () => {
    console.log('Quick add pressed');
    // TODO: Open quick add modal
  };

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarActiveTintColor: '#277dc4',
          tabBarInactiveTintColor: '#9E9E9E',
          tabBarStyle: styles.tabBar,
          headerStyle: {
            backgroundColor: '#1A1A1A',
          },
          headerTintColor: '#FFFFFF',
        }}
      >
        <Tab.Screen
          name="Track"
          component={TrackerScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="sunny" size={size} color={color} />
            ),
          }}
        />
        
        {/* Empty placeholder for center button */}
        <Tab.Screen
          name="Add"
          component={View}
          options={{
            tabBarButton: () => (
              <FloatingAddButton onPress={handleQuickAdd} />
            ),
          }}
        />
        
        <Tab.Screen
          name="Trends"
          component={AnalyticsScreen}
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="trending-up" size={size} color={color} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#1A1A1A',
    borderTopColor: '#2A2B30',
    height: 90,
    paddingBottom: 20,
  },
  floatingButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -30,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
