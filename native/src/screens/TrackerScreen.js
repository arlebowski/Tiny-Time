import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function TrackerScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Tracker Tab</Text>
      <Text style={styles.subtitle}>Feed, Sleep, Diaper tracking</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF6EB',
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
    color: '#212121',
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
});
