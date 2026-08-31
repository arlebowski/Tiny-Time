/**
 * NativeAdCard — presentational native ad shell.
 * Theme-token derived. NativeAsset children must be direct (no wrapper Views).
 */
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;

function getAdsModule() {
  try {
    return require('react-native-google-mobile-ads');
  } catch {
    return null;
  }
}

export default function NativeAdCard({
  nativeAd,
  variant = 'home',
  onRemoveAdsPress,
}) {
  const { colors, radius } = useTheme();
  const ads = getAdsModule();
  if (!ads || !nativeAd) return null;

  const { NativeAdView, NativeAsset, NativeAssetType } = ads;
  const isTimeline = variant === 'timeline';
  const cardRadius = isTimeline ? (radius?.xl ?? 16) : (radius?.['2xl'] ?? 18);
  const iconSize = isTimeline ? 40 : 46;

  return (
    <NativeAdView
      nativeAd={nativeAd}
      style={[
        styles.root,
        {
          backgroundColor: colors.subtleSurface || colors.cardBg,
          borderColor: colors.borderSubtle,
          borderRadius: cardRadius,
        },
      ]}
    >
      <View style={styles.topRow}>
        <Text
          style={[
            styles.badge,
            {
              color: colors.textTertiary,
              backgroundColor: colors.segTrack || colors.track,
            },
          ]}
        >
          {isTimeline ? 'AD' : 'SPONSORED'}
        </Text>
        <Pressable
          onPress={onRemoveAdsPress}
          hitSlop={8}
          style={({ pressed }) => [pressed && { opacity: 0.7 }]}
        >
          <Text style={[styles.removeLink, { color: colors.textTertiary }]}>
            Remove ads {'\u2715'}
          </Text>
        </Pressable>
      </View>

      <View style={styles.body}>
        {nativeAd.icon ? (
          <NativeAsset assetType={NativeAssetType.ICON}>
            <Image
              source={{ uri: nativeAd.icon.url }}
              style={[styles.icon, { width: iconSize, height: iconSize, borderRadius: 10 }]}
            />
          </NativeAsset>
        ) : (
          <View
            style={[
              styles.iconPlaceholder,
              {
                width: iconSize,
                height: iconSize,
                backgroundColor: colors.segTrack || colors.track,
              },
            ]}
          />
        )}

        <View style={styles.copy}>
          {nativeAd.headline ? (
            <NativeAsset assetType={NativeAssetType.HEADLINE}>
              <Text
                style={[styles.headline, { color: colors.textPrimary }]}
                numberOfLines={2}
              >
                {nativeAd.headline}
              </Text>
            </NativeAsset>
          ) : null}
          {nativeAd.advertiser ? (
            <NativeAsset assetType={NativeAssetType.ADVERTISER}>
              <Text
                style={[styles.advertiser, { color: colors.textTertiary }]}
                numberOfLines={1}
              >
                {nativeAd.advertiser}
              </Text>
            </NativeAsset>
          ) : null}
        </View>

        {nativeAd.callToAction ? (
          <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
            <Text
              style={[
                styles.cta,
                {
                  backgroundColor: colors.segTrack || colors.track,
                  color: colors.textPrimary,
                },
              ]}
              numberOfLines={1}
            >
              {nativeAd.callToAction}
            </Text>
          </NativeAsset>
        ) : null}
      </View>
    </NativeAdView>
  );
}

const styles = StyleSheet.create({
  root: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  badge: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: 'hidden',
    fontFamily: FWB.bold,
  },
  removeLink: {
    fontSize: 12,
    fontFamily: FWB.normal,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 46,
    height: 46,
  },
  iconPlaceholder: {
    borderRadius: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  headline: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    fontFamily: FWB.semibold,
  },
  advertiser: {
    fontSize: 12,
    marginTop: 2,
    fontFamily: FWB.normal,
  },
  cta: {
    fontSize: 12,
    fontWeight: '600',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    overflow: 'hidden',
    fontFamily: FWB.semibold,
  },
});
