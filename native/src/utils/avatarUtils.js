/**
 * Deterministic avatar colors + initial from baby name.
 */
import React from 'react';
import { View, Text, Image, Platform, StyleSheet } from 'react-native';

const PALETTE = [
  { bg: '#F3D5C0', fg: '#7A4A2B' },
  { bg: '#FBD0DA', fg: '#8B2A4A' },
  { bg: '#D9E5C5', fg: '#3F5A2A' },
  { bg: '#CFE0F0', fg: '#1F4A75' },
  { bg: '#EAD9F0', fg: '#553070' },
  { bg: '#F4E0BD', fg: '#7A5520' },
];

export function avatarFor(name) {
  const n = (name || '').trim();
  const initial = n ? n[0].toUpperCase() : '·';
  let hash = 0;
  for (let i = 0; i < n.length; i += 1) {
    hash = (hash * 31 + n.charCodeAt(i)) >>> 0;
  }
  return { initial, ...PALETTE[hash % PALETTE.length] };
}

const FRAUNCES = Platform.OS === 'android' ? 'Fraunces-Soft-Bold' : 'Fraunces';

/**
 * Circular avatar: photo if photoUri, else generated initial + palette.
 */
export function BabyAvatar({ name, size = 52, photoUri = null, style }) {
  const half = size / 2;
  const { initial, bg, fg } = avatarFor(name);
  const fontSize = Math.round(size * 0.45);

  if (photoUri) {
    return (
      <Image
        source={{ uri: photoUri }}
        style={[
          {
            width: size,
            height: size,
            borderRadius: half,
          },
          style,
        ]}
      />
    );
  }

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: half,
          backgroundColor: bg,
        },
        style,
      ]}
    >
      <Text style={{ fontFamily: FRAUNCES, fontSize, color: fg, fontWeight: '700' }}>
        {initial}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
