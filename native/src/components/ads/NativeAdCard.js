/**
 * NativeAdCard — presentational native ad shell.
 *
 * Layout rule: NativeAdView is a native view and mismeasures padding
 * (doubles top/left, clips the right edge), so all card chrome lives on an
 * outer RN View and NativeAdView is a plain full-width container.
 *
 * The "Remove ads" control is deliberately OUTSIDE NativeAdView: taps inside
 * it get swallowed by the ad view and would register as ad clicks.
 */
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
const ICON_SIZE = 44;

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
  const { colors, radius, shadows } = useTheme();
  const ads = getAdsModule();
  if (!ads || !nativeAd) return null;

  const { NativeAdView, NativeAsset, NativeAssetType } = ads;
  const isTimeline = variant === 'timeline';

  return (
    <View
      style={[
        styles.card,
        isTimeline ? styles.cardTimeline : styles.cardHome,
        {
          backgroundColor: colors.cardBg,
          // Timeline rows use xl (16); home tracker cards use 2xl (18).
          borderRadius: isTimeline
            ? radius?.xl ?? 16
            : radius?.['2xl'] ?? 18,
          ...(shadows?.card || null),
        },
      ]}
    >
      {/* Outside NativeAdView so the control isn't swallowed as an ad click. */}
      <View style={[styles.topRow, isTimeline && styles.topRowTimeline]}>
        <Text
          style={[
            isTimeline ? styles.inlineAdBadge : styles.badge,
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
          hitSlop={12}
          style={({ pressed }) => [pressed && { opacity: 0.6 }]}
        >
          <Text
            style={[
              isTimeline ? styles.removeLinkTimeline : styles.removeLink,
              { color: colors.textSecondary },
            ]}
          >
            Remove ads {'\u2715'}
          </Text>
        </Pressable>
      </View>

      <NativeAdView nativeAd={nativeAd} style={styles.adView}>
        <View style={styles.body}>
          {nativeAd.icon ? (
            <NativeAsset assetType={NativeAssetType.ICON}>
              <Image source={{ uri: nativeAd.icon.url }} style={styles.iconBox} />
            </NativeAsset>
          ) : (
            <View
              style={[
                styles.iconBox,
                { backgroundColor: colors.segTrack || colors.track },
              ]}
            />
          )}

          <View style={styles.copy}>
            {nativeAd.headline ? (
              <NativeAsset assetType={NativeAssetType.HEADLINE}>
                <Text
                  style={[
                    isTimeline ? styles.headlineTimeline : styles.headline,
                    { color: colors.textPrimary },
                  ]}
                  numberOfLines={isTimeline ? 1 : 2}
                >
                  {nativeAd.headline}
                </Text>
              </NativeAsset>
            ) : null}

            {!isTimeline && nativeAd.advertiser ? (
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
                    borderColor: colors.borderSubtle || 'rgba(0,0,0,0.10)',
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
    </View>
  );
}

const styles = StyleSheet.create({
  // Match TrackerCard chrome: p-5 + radius 2xl + shadows.card.
  // Do not set overflow:hidden — it clips the iOS card shadow.
  card: {},
  cardHome: {
    padding: 20,
  },
  // Match TimelineItem padding (16). NativeAdView measures ~5pt taller than
  // its content, so shave the bottom to keep the card optically even.
  cardTimeline: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  adView: {
    width: '100%',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  topRowTimeline: {
    marginBottom: 10,
  },
  badge: {
    fontSize: 10,
    letterSpacing: 0.6,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    overflow: 'hidden',
    fontFamily: FWB.bold,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  removeLink: {
    fontSize: 13,
    fontFamily: FWB.normal,
  },
  removeLinkTimeline: {
    fontSize: 12,
    fontFamily: FWB.normal,
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 10,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  headline: {
    fontSize: 15,
    lineHeight: 19,
    fontFamily: FWB.semibold,
  },
  headlineTimeline: {
    fontSize: 14,
    lineHeight: 18,
    fontFamily: FWB.semibold,
  },
  inlineAdBadge: {
    fontSize: 10,
    letterSpacing: 0.4,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
    overflow: 'hidden',
    fontFamily: FWB.bold,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
  advertiser: {
    fontSize: 13,
    marginTop: 3,
    fontFamily: FWB.normal,
  },
  cta: {
    fontSize: 13,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 14,
    paddingVertical: 9,
    overflow: 'hidden',
    fontFamily: FWB.semibold,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
});
