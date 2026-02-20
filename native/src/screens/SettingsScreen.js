import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME_TOKENS } from '../../../shared/config/theme';

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Settings Tab</Text>
    </View>
  );
}

const FW = THEME_TOKENS.TYPOGRAPHY.fontWeight;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAF6EB',
  },
  text: {
    fontSize: 24,
    fontWeight: FW.semibold,
    color: '#212121',
  },
});
