import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FamilyScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Family Tab</Text>
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
});
