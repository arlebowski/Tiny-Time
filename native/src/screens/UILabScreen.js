import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function UILabScreen({ onClose }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.container, { backgroundColor: colors.appBg }]}>
      <View style={[styles.card, { backgroundColor: colors.cardBg }]}>
        <Text style={[styles.text, { color: colors.textPrimary }]}>UI Lab</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Feature flags & testing</Text>
        <Pressable
          onPress={onClose}
          style={({ pressed }) => [
            styles.closeBtn,
            { backgroundColor: colors.primaryActionBg },
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={[styles.closeBtnText, { color: colors.primaryActionText }]}>Back to Family</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  text: {
    fontSize: 24,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  closeBtn: {
    marginTop: 20,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  closeBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
