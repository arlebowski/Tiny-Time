/**
 * NativeAdCard — presentational native ad shell.
 *
 * NativeAdView must tightly wrap every advertiser asset (icon, headline,
 * advertiser, CTA). Card chrome and "Remove ads" stay outside so those taps
 * are not billed as ad clicks, and so empty padding is not clickable
 * white space (AdMob native advanced policy).
 *
 * Do not animate/transform this tree: AdMob's validator compares asset
 * frames to NativeAdView bounds in window space.
 *
 * Clicks are the SDK's: GADNativeAdView handles taps over its registered
 * assets. Nothing inside it may be interactive, and the card padding around
 * it stays non-clickable (AdMob forbids clickable white space).
 */
import React from 'react';
import { View, Text, Image, Pressable, StyleSheet, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { THEME_TOKENS } from '../../../../shared/config/theme';

const FWB = THEME_TOKENS.TYPOGRAPHY.fontFamilyByWeight;
const ICON_SIZE = 44;
const CTA_MAX_WIDTH = 96;
// AdMob converts each asset frame into NativeAdView coordinates and requires
// strict containment. An asset flush with the ad view edge fails that check as
// soon as the card lands on a fractional offset, so keep every asset inset.
const ASSET_INSET = 2;
const TIMELINE_ROW_HEIGHT = ICON_SIZE;
// Reserves a two-line headline (2 x 19) plus the advertiser line, so a short
// test headline and a full-length one render at the same height.
const HOME_ROW_HEIGHT = 56;

/** Body heights by placement, so the loading skeleton reserves the same space. */
export const AD_BODY_HEIGHT = {
  home: HOME_ROW_HEIGHT + ASSET_INSET * 2,
  timeline: TIMELINE_ROW_HEIGHT + ASSET_INSET * 2,
};

/**
 * Ad cards share the content card surface; the badge marks them as sponsored.
 * `bone` (badge pill, icon placeholder, skeleton shimmer) must contrast with
 * that surface in both themes — `segTrack` equals `cardBg` in dark mode, which
 * is what made the badge and shimmer invisible there.
 */
export function getAdSurface(colors) {
  return {
    surface: colors.cardBg,
    bone: colors.subtleSurface || colors.segTrack,
  };
}

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
  // Fabric GADNativeAdView stretches to fill an unbounded parent (timeline
  // FlatList + layout animation). Pin the body to a whole-pixel height so
  // the card cannot grow on each layout pass.
  const rowHeight = isTimeline ? TIMELINE_ROW_HEIGHT : HOME_ROW_HEIGHT;
  const bodyHeight = rowHeight + ASSET_INSET * 2;
  const { surface, bone } = getAdSurface(colors);

  return (
    <View
      style={[
        styles.card,
        isTimeline ? styles.cardTimeline : styles.cardHome,
        {
          backgroundColor: surface,
          borderRadius: isTimeline
            ? radius?.xl ?? 16
            : radius?.['2xl'] ?? 18,
          ...(shadows?.card || null),
        },
      ]}
    >
      <View style={[styles.topRow, isTimeline && styles.topRowTimeline]}>
        <Text
          style={[
            isTimeline ? styles.inlineAdBadge : styles.badge,
            {
              color: colors.textSecondary,
              backgroundColor: bone,
            },
          ]}
        >
          {isTimeline ? 'AD' : 'SPONSORED'}
        </Text>
        <Pressable
          onPress={onRemoveAdsPress}
          hitSlop={16}
          style={({ pressed }) => [
            styles.removeHit,
            pressed && { opacity: 0.6 },
          ]}
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

      <View
        style={[
          styles.adViewShell,
          { height: bodyHeight },
        ]}
        collapsable={false}
      >
        <NativeAdView
          nativeAd={nativeAd}
          collapsable={false}
          style={[styles.adView, { height: bodyHeight }]}
        >
          {/*
            Every registered asset stays inset from the ad view edges.
            pointerEvents="none" is required: the SDK only clears
            userInteractionEnabled on registered asset views, so an
            interactive RN container here would absorb the tap and
            GADNativeAdView would never receive the click.
          */}
          <View
            style={[styles.body, { height: bodyHeight }]}
            collapsable={false}
            pointerEvents="none"
          >
            {nativeAd.icon ? (
              <NativeAsset assetType={NativeAssetType.ICON}>
                <View style={styles.iconBox} collapsable={false}>
                  <Image
                    source={{ uri: nativeAd.icon.url }}
                    style={styles.iconImage}
                  />
                </View>
              </NativeAsset>
            ) : (
              <View
                style={[styles.iconBox, { backgroundColor: bone }]}
              />
            )}

            <View style={styles.copy} collapsable={false}>
              {nativeAd.headline ? (
                <NativeAsset assetType={NativeAssetType.HEADLINE}>
                  <View
                    style={
                      isTimeline ? styles.headlineBoxTimeline : styles.headlineBox
                    }
                    collapsable={false}
                  >
                    <Text
                      style={[
                        isTimeline ? styles.headlineTimeline : styles.headline,
                        { color: colors.textPrimary },
                      ]}
                      numberOfLines={isTimeline ? 1 : 2}
                    >
                      {nativeAd.headline}
                    </Text>
                  </View>
                </NativeAsset>
              ) : null}

              {!isTimeline && nativeAd.advertiser ? (
                <NativeAsset assetType={NativeAssetType.ADVERTISER}>
                  <View style={styles.advertiserBox} collapsable={false}>
                    <Text
                      style={[styles.advertiser, { color: colors.textTertiary }]}
                      numberOfLines={1}
                    >
                      {nativeAd.advertiser}
                    </Text>
                  </View>
                </NativeAsset>
              ) : null}
            </View>

            {nativeAd.callToAction ? (
              <NativeAsset assetType={NativeAssetType.CALL_TO_ACTION}>
                <View
                  style={[styles.cta, { backgroundColor: colors.textPrimary }]}
                  collapsable={false}
                >
                  <Text
                    style={[styles.ctaLabel, { color: colors.appBg }]}
                    numberOfLines={1}
                  >
                    {nativeAd.callToAction}
                  </Text>
                </View>
              </NativeAsset>
            ) : null}
          </View>
        </NativeAdView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {},
  cardHome: {
    padding: 20,
  },
  cardTimeline: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  // Height-capped so Fabric's GADNativeAdView cannot stretch to fill an
  // unbounded parent (timeline FlatList) and grow on each layout pass.
  adViewShell: {
    width: '100%',
    overflow: 'hidden',
  },
  adView: {
    width: '100%',
    overflow: 'hidden',
  },
  // zIndex keeps this above NativeAdView for hit-testing. The SDK's ad view is
  // a later sibling and is interactive across its whole frame, so without this
  // it can shadow the Remove ads tap.
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    zIndex: 1,
  },
  removeHit: {
    paddingVertical: 4,
    paddingLeft: 8,
  },
  topRowTimeline: {
    marginBottom: 6,
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
    padding: ASSET_INSET,
    overflow: 'hidden',
  },
  iconBox: {
    width: ICON_SIZE,
    height: ICON_SIZE,
    borderRadius: 10,
    overflow: 'hidden',
  },
  iconImage: {
    width: ICON_SIZE,
    height: ICON_SIZE,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  headlineBox: {
    height: 38,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headlineBoxTimeline: {
    height: 18,
    justifyContent: 'center',
    overflow: 'hidden',
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
  advertiserBox: {
    marginTop: 2,
    height: 16,
    overflow: 'hidden',
  },
  advertiser: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FWB.normal,
  },
  cta: {
    flexShrink: 0,
    maxWidth: CTA_MAX_WIDTH,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
    overflow: 'hidden',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 13,
    lineHeight: 16,
    fontFamily: FWB.semibold,
    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
  },
});
