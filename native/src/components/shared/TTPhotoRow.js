// TTPhotoRow — 1:1 from web/components/shared/TTPhotoRow.js

import React from 'react';
import { View, Text, Pressable, Image, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';
import { XIcon, PlusIcon } from '../icons';

export default function TTPhotoRow({
  expanded = false,
  onExpand,
  title = 'Photos',
  showTitle = true,
  existingPhotos = [],
  newPhotos = [],
  onAddPhoto,
  onRemovePhoto,
  onPreviewPhoto,
  addLabel = '+ Add photos',
  addHint = 'Add',
  showAddHint = false,
  addTileBorder = false,
  containerClassName = '',
  containerStyle = null,
}) {
  const { colors } = useTheme();

  if (!expanded) {
    return (
      <Pressable
        onPress={() => { if (typeof onExpand === 'function') onExpand(); }}
        style={({ pressed }) => [
          styles.collapsed,
          pressed && { opacity: 0.7 },
          containerStyle,
        ]}
      >
        <Text style={[styles.addLabel, { color: colors.textTertiary }]}>{addLabel}</Text>
      </Pressable>
    );
  }

  return (
    <View style={[styles.expanded, containerStyle]}>
      {showTitle && (
        <View style={styles.titleWrap}>
          <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        </View>
      )}
      <View style={styles.photoList}>
        {(existingPhotos || []).map((photoUrl, i) => (
          <View
            key={`existing-${i}`}
            style={[
              styles.photoTile,
              { backgroundColor: colors.inputBg, borderColor: colors.cardBorder || colors.borderSubtle },
            ]}
          >
            <Pressable
              style={styles.photoImageWrap}
              onPress={() => { if (typeof onPreviewPhoto === 'function') onPreviewPhoto(photoUrl); }}
            >
              <Image source={{ uri: photoUrl }} style={styles.photoImage} resizeMode="cover" />
            </Pressable>
            <Pressable
              style={styles.removeBtn}
              onPress={(e) => {
                if (typeof onRemovePhoto === 'function') onRemovePhoto(i, true);
              }}
            >
              <XIcon size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        {(newPhotos || []).map((photo, i) => (
          <View
            key={`new-${i}`}
            style={[
              styles.photoTile,
              { backgroundColor: colors.inputBg, borderColor: colors.cardBorder || colors.borderSubtle },
            ]}
          >
            <Pressable
              style={styles.photoImageWrap}
              onPress={() => { if (typeof onPreviewPhoto === 'function') onPreviewPhoto(photo); }}
            >
              <Image source={{ uri: photo }} style={styles.photoImage} resizeMode="cover" />
            </Pressable>
            <Pressable
              style={styles.removeBtn}
              onPress={(e) => {
                if (typeof onRemovePhoto === 'function') onRemovePhoto(i, false);
              }}
            >
              <XIcon size={14} color="#fff" />
            </Pressable>
          </View>
        ))}
        <Pressable
          onPress={() => { if (typeof onAddPhoto === 'function') onAddPhoto(); }}
          style={({ pressed }) => [
            styles.addTile,
            { backgroundColor: colors.inputBg, borderColor: addTileBorder ? (colors.cardBorder || colors.borderSubtle) : 'transparent' },
            showAddHint && styles.addTileColumn,
            pressed && { opacity: 0.8 },
          ]}
        >
          <PlusIcon size={24} color={colors.textTertiary} />
          {showAddHint && (
            <Text style={[styles.addHint, { color: colors.textTertiary }]}>{addHint}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
const styles = StyleSheet.create({
  collapsed: {
    paddingVertical: 12,
  },
  addLabel: {
    fontSize: 16,
    fontFamily: FWB.normal,
  },
  expanded: {
    paddingVertical: 12,
  },
  titleWrap: {
    marginBottom: 12,
  },
  title: {
    fontSize: 12,
    fontFamily: FWB.normal,
  },
  photoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  photoTile: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  photoImageWrap: {
    width: '100%',
    height: '100%',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  removeBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  addTile: {
    width: 80,
    height: 80,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTileColumn: {
    flexDirection: 'column',
    gap: 4,
  },
  addHint: {
    fontSize: 11,
    fontFamily: FWB.normal,
  },
});
