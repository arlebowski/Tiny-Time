/**
 * Design tokens for React Native
 * 1:1 port from web/theme/tokens.js + spacing, typography, radius, shadow scales
 */

// Base palettes (hex-only) — from web LIGHT_BASE / DARK_BASE
const LIGHT_BASE = {
  appBg: '#FAF6EB',
  card: '#FFFFFF',
  cardAlt: '#FCF9F0',
  field: '#F5F5F7',
  track: '#F0EBE0',
  subtle: '#F7F7F7',
  selected: '#EBEBEB',
  borderSubtle: '#EBEBEB',
  borderStrong: '#D6D6D6',
  textPrimary: '#212121',
  textSecondary: '#666666',
  textTertiary: '#9E9E9E',
  textDisabled: '#B8B8B8',
};

const DARK_BASE = {
  appBg: '#1A1A1A',
  card: '#2A2B30',
  field: '#3C3E43',
  track: '#2A2B30',
  pill: '#3C3E43',
  subtle: '#35373C',
  selected: '#2A2B30',
  borderSubtle: '#1A1A1A',
  borderStrong: '#292929',
  textPrimary: '#FFFFFF',
  textSecondary: '#A2AAAF',
  textTertiary: '#8B9299',
  textDisabled: '#424242',
};

export const THEME_TOKENS = {
  DEFAULT_APPEARANCE: {
    darkMode: false,
  },

  DEFAULT_THEME_KEY: 'theme1',
  COLOR_THEME_ORDER: ['theme1', 'theme2', 'theme3', 'theme4'],

  BACKGROUND_THEMES: {
    light: {
      appBg: LIGHT_BASE.appBg,
      cardBg: LIGHT_BASE.card,
      cardBorder: 'transparent',
    },
    dark: {
      appBg: DARK_BASE.appBg,
      cardBg: DARK_BASE.card,
      cardBorder: 'transparent',
    },
  },

  // Full light mode tokens (LIGHT_MODE_TOKENS from web)
  LIGHT_MODE: {
    // App + cards
    appBg: LIGHT_BASE.appBg,
    cardBg: LIGHT_BASE.card,
    cardBorder: 'transparent',
    cardAlt: LIGHT_BASE.cardAlt,

    // Inputs + fields
    inputBg: LIGHT_BASE.field,
    iconBg: LIGHT_BASE.field,
    inputBorder: LIGHT_BASE.borderSubtle,

    // Surfaces (cards, sheets, timeline)
    trackerCardBg: LIGHT_BASE.card,
    timelineItemBg: LIGHT_BASE.card,
    timelineTrackBg: LIGHT_BASE.cardAlt,
    halfsheetBg: LIGHT_BASE.card,

    // Subtle surfaces + tracks
    subtle: LIGHT_BASE.subtle,
    track: LIGHT_BASE.track,
    subtleSurface: LIGHT_BASE.subtle,
    surfaceSubtle: LIGHT_BASE.subtle,
    surfaceSelected: LIGHT_BASE.selected,
    surfaceHover: LIGHT_BASE.subtle,
    progressTrack: LIGHT_BASE.subtle,
    wheelpickerBar: LIGHT_BASE.subtle,
    segTrack: LIGHT_BASE.track,
    segPill: '#ffffff',
    selected: LIGHT_BASE.selected,
    selectedSurface: LIGHT_BASE.track,
    swipeRowBg: '#F7F7F7',

    // Text
    textPrimary: LIGHT_BASE.textPrimary,
    textSecondary: LIGHT_BASE.textSecondary,
    textTertiary: LIGHT_BASE.textTertiary,
    textDisabled: LIGHT_BASE.textDisabled,
    textOnAccent: '#ffffff',

    // Borders + dividers
    divider: LIGHT_BASE.borderSubtle,
    borderSubtle: LIGHT_BASE.borderSubtle,
    borderStrong: LIGHT_BASE.borderStrong,
    outlineStrong: '#333333',

    // Chrome + overlays
    tapableBg: 'rgba(0,0,0,0.05)',
    overlayScrim: 'rgba(0, 0, 0, 0.3)',
    overlayScrimStrong: 'rgba(0,0,0,0.6)',
    bgHover: LIGHT_BASE.subtle,

    // Nav chrome
    navDisabled: 'rgba(0,0,0,0.24)',
    navDivider: 'rgb(243, 244, 246)',
    navPillBorder: 'rgba(0,0,0,0.12)',

    // Segmented control
    segmentedTrackBg: 'rgba(255,255,255,0.2)',
    segmentedOnBg: '#ffffff',
    segmentedOnText: 'rgba(0,0,0,0.87)',
    segmentedOffText: 'rgba(255,255,255,0.8)',

    // Primary/CTA
    primaryActionBg: '#1A1A1A',
    primaryActionBgActive: '#1A1A1A',
    primaryActionText: '#ffffff',
    primaryBrand: '#1A1A1A',
    primaryBrandSoft: 'rgba(26, 26, 26, 0.14)',
    primaryBrandStrong: '#1A1A1A',
    plusBg: '#1A1A1A',
    plusFg: '#FFFFFF',
    brandIcon: '#FF4D79',

    // System colors
    recoveryBg: '#F2F2F7',
    error: '#ef4444',
    errorSoft: 'rgba(239, 68, 68, 0.1)',
    positive: '#34C759',
    positiveSoft: 'rgba(52, 199, 89, 0.15)',
    positiveBg: '#34C759',
    positiveSoftBg: 'rgba(52, 199, 89, 0.15)',
    positiveAlt: '#00BE68',
    positiveAltSoft: 'rgba(0, 190, 104, 0.15)',
    negative: '#FF2D55',
    negativeSoft: 'rgba(255, 45, 85, 0.15)',
    negativeBg: '#FF2D55',
    negativeSoftBg: 'rgba(255, 45, 85, 0.15)',
    negativeWarm: '#FF6037',
    negativeWarmSoft: 'rgba(255, 96, 55, 0.15)',

    // Highlights + trays
    pulseHighlight: 'rgba(255, 255, 255, 0.5)',
    highlightSoft: 'rgba(75, 156, 126, 0.22)',
    trayBg: '#ffffff',
    trayDivider: 'rgba(0,0,0,0.06)',
  },

  // Full dark mode tokens (DARK_MODE_TOKENS from web)
  DARK_MODE: {
    // App + cards
    appBg: DARK_BASE.appBg,
    cardBg: DARK_BASE.card,
    cardBorder: 'transparent',
    cardAlt: DARK_BASE.card,

    // Inputs + fields
    inputBg: DARK_BASE.field,
    iconBg: DARK_BASE.field,
    inputBorder: DARK_BASE.borderSubtle,

    // Surfaces (cards, sheets, timeline)
    trackerCardBg: DARK_BASE.card,
    timelineItemBg: DARK_BASE.card,
    timelineTrackBg: DARK_BASE.subtle,
    halfsheetBg: DARK_BASE.card,

    // Subtle surfaces + tracks
    subtle: DARK_BASE.subtle,
    track: DARK_BASE.track,
    pill: DARK_BASE.pill,
    subtleSurface: DARK_BASE.subtle,
    surfaceSubtle: DARK_BASE.subtle,
    surfaceSelected: DARK_BASE.selected,
    surfaceHover: 'rgba(255,255,255,0.08)',
    progressTrack: DARK_BASE.subtle,
    wheelpickerBar: DARK_BASE.subtle,
    segTrack: DARK_BASE.card,
    segPill: DARK_BASE.pill,
    selected: DARK_BASE.selected,
    selectedSurface: DARK_BASE.selected,
    swipeRowBg: '#272727',

    // Text
    textPrimary: DARK_BASE.textPrimary,
    textSecondary: DARK_BASE.textSecondary,
    textTertiary: DARK_BASE.textTertiary,
    textDisabled: DARK_BASE.textDisabled,
    textOnAccent: '#ffffff',

    // Borders + dividers
    divider: DARK_BASE.borderSubtle,
    borderSubtle: DARK_BASE.borderSubtle,
    borderStrong: DARK_BASE.borderStrong,
    outlineStrong: '#ffffff',

    // Chrome + overlays
    tapableBg: 'rgba(255, 255, 255, 0.1)',
    overlayScrim: 'rgba(0, 0, 0, 0.45)',
    overlayScrimStrong: 'rgba(0,0,0,0.6)',
    bgHover: 'rgba(255,255,255,0.08)',

    // Nav chrome
    navDisabled: 'rgba(255,255,255,0.28)',
    navDivider: 'rgba(255,255,255,0.06)',
    navPillBorder: 'rgba(255,255,255,0.18)',

    // Segmented control
    segmentedTrackBg: 'rgba(255,255,255,0.2)',
    segmentedOnBg: '#ffffff',
    segmentedOnText: 'rgba(0,0,0,0.87)',
    segmentedOffText: 'rgba(255,255,255,0.8)',

    // Primary/CTA
    primaryActionBg: '#FFFFFF',
    primaryActionBgActive: '#FFFFFF',
    primaryActionText: '#000000',
    primaryBrand: '#FFFFFF',
    primaryBrandSoft: 'rgba(255, 255, 255, 0.14)',
    primaryBrandStrong: '#FFFFFF',
    plusBg: '#ffffff',
    plusFg: '#000000',
    brandIcon: '#FF99AA',

    // System colors
    recoveryBg: '#0F0F10',
    error: '#ef4444',
    errorSoft: 'rgba(239, 68, 68, 0.15)',
    positive: '#34C759',
    positiveSoft: 'rgba(52, 199, 89, 0.2)',
    positiveBg: '#2a9d47',
    positiveSoftBg: 'rgba(42, 157, 71, 0.28)',
    positiveAlt: '#00BE68',
    positiveAltSoft: 'rgba(0, 190, 104, 0.2)',
    negative: '#FF2D55',
    negativeSoft: 'rgba(255, 45, 85, 0.2)',
    negativeBg: '#e01e4a',
    negativeSoftBg: 'rgba(224, 30, 74, 0.28)',
    negativeWarm: '#FF6037',
    negativeWarmSoft: 'rgba(255, 96, 55, 0.2)',

    // Highlights + trays
    pulseHighlight: 'rgba(255, 255, 255, 0.5)',
    highlightSoft: 'rgba(82, 181, 122, 0.22)',
    trayBg: '#222224',
    trayDivider: 'rgba(255,255,255,0.08)',
  },

  // Color themes (4 themes from web COLOR_THEMES)
  // Flattened: theme1.bottle instead of theme1.cards.bottle for RN convenience
  COLOR_THEMES: {
    theme1: {
      name: 'Theme 1',
      bottle: { name: 'Bottle', primary: '#f5425d', soft: '#fbb3be', dark: '#f5667d' },
      nursing: { name: 'Nursing', primary: '#8259cf', soft: '#cdbdec', dark: '#a685de' },
      sleep: { name: 'Sleep', primary: '#277dc4', soft: '#a9cbe8', dark: '#5397d6' },
      diaper: { name: 'Diaper', primary: '#c99c4f', soft: '#e9d7b9', dark: '#dbb878' },
      solids: { name: 'Solids', primary: '#4bab51', soft: '#b7ddb9', dark: '#7db881' },
    },
    theme2: {
      name: 'Theme 2',
      bottle: { name: 'Bottle', primary: '#6ba9dd', soft: '#c4ddf1', dark: '#6798c2' },
      nursing: { name: 'Nursing', primary: '#e6749c', soft: '#f5c7d7', dark: '#cb6b8d' },
      sleep: { name: 'Sleep', primary: '#5db899', soft: '#bee3d6', dark: '#62aa91' },
      diaper: { name: 'Diaper', primary: '#9b7ba8', soft: '#d7cadc', dark: '#91779d' },
      solids: { name: 'Solids', primary: '#deaf51', soft: '#f2dfba', dark: '#c59e54' },
    },
    theme3: {
      name: 'Theme 3',
      bottle: { name: 'Bottle', primary: '#f56666', soft: '#fbc2c2', dark: '#d96666' },
      nursing: { name: 'Nursing', primary: '#b88fd9', soft: '#e3d2f0', dark: '#a586bd' },
      sleep: { name: 'Sleep', primary: '#bba652', soft: '#e4dbba', dark: '#cdb557' },
      diaper: { name: 'Diaper', primary: '#7b8ff4', soft: '#cad2fb', dark: '#7182d3' },
      solids: { name: 'Solids', primary: '#5db899', soft: '#bee3d6', dark: '#62aa91' },
    },
    theme4: {
      name: 'Theme 4',
      bottle: { name: 'Bottle', primary: '#98ae76', soft: '#d6dfc8', dark: '#92a575' },
      nursing: { name: 'Nursing', primary: '#1d8fc3', soft: '#a9d9e4', dark: '#419cb9' },
      sleep: { name: 'Sleep', primary: '#e98378', soft: '#f6cdc9', dark: '#c9756b' },
      diaper: { name: 'Diaper', primary: '#e1b04d', soft: '#f3dfb8', dark: '#c49a47' },
      solids: { name: 'Solids', primary: '#9a7daf', soft: '#d7cbdf', dark: '#9b83ac' },
    },
  },

  // Analytics category colors
  ANALYTICS_CATEGORY_COLORS: {
    daily: '#3B82F6',
    sleep: '#4F46E5',
    eating: '#EC4899',
  },

  // Google brand colors
  GOOGLE_COLORS: {
    blue: '#4285F4',
    green: '#34A853',
    yellow: '#FBBC05',
    red: '#EA4335',
  },

  // ── Sheet layout tokens (vertical gaps between content sections) ──
  SHEET_LAYOUT: {
    sectionGap: 14,   // between major content blocks (time, amount, type picker, notes)
    fieldGap: 8,      // between adjacent form fields (TTInputRow → AmountStepper)
  },

  // ── Spacing scale (Tailwind-inspired, px values) ──
  SPACING: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    8: 32,
    10: 40,
    12: 48,
    16: 64,
    20: 80,
    24: 96,
    36: 144,
  },

  // ── Typography scale ──
  TYPOGRAPHY: {
    fontFamily: 'SF-Pro',
    fontFamilyKidName: 'Fraunces',
    fontVariationSettingsKidName: '"wght" 700, "SOFT" 23, "WONK" 1, "opsz" 63',
    fontSize: {
      xs: 12,
      sm: 13,
      base: 14,
      md: 15,
      lg: 17,
      xl: 18,
      '2xl': 20,
      '3xl': 28,
      '4xl': 32,
      '5xl': 48,
    },
    fontWeight: {
      light: '300',
      normal: '400',
      medium: '500',
      semibold: '600',
      bold: '700',
    },
    // RN ignores fontWeight with custom fonts; use fontFamilyByWeight instead
    fontFamilyByWeight: {
      light: 'SF-Pro-Text-Light',
      normal: 'SF-Pro-Text-Regular',
      medium: 'SF-Pro-Text-Medium',
      semibold: 'SF-Pro-Text-Semibold',
      bold: 'SF-Pro-Text-Bold',
    },
    lineHeight: {
      none: 1,
      tight: 1.25,
      snug: 1.375,
      normal: 1.5,
      relaxed: 1.625,
      loose: 2,
    },
  },

  // ── Border radius (Tailwind-inspired) ──
  RADIUS: {
    none: 0,
    sm: 4,
    md: 6,
    lg: 8,
    xl: 16,
    '2xl': 18,
    '3xl': 24,
    icon: 20,
    thumb: 12,
    full: 9999,
  },

  // ── Shadow presets (React Native format) ──
  // Web CSS → RN: shadowOffset {x,y}, shadowRadius, shadowOpacity, shadowColor
  SHADOWS: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    // shadowSoft: "0 -4px 20px rgba(0, 0, 0, 0.1)"
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
      elevation: 8,
    },
    // shadowFloating: "0 4px 12px rgba(0,0,0,0.15)"
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 8,
    },
    // segmentedShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
    segmented: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 2,
    },
    // navShadow: "0 -1px 3px rgba(0,0,0,0.1)"
    nav: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -1 },
      shadowOpacity: 0.1,
      shadowRadius: 3,
      elevation: 2,
    },
    // trayShadow: "0 -10px 28px rgba(0,0,0,0.18)"
    tray: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.18,
      shadowRadius: 28,
      elevation: 16,
    },
    // primaryActionShadow: "0 10px 25px rgba(37,99,235,0.25)"
    primaryAction: {
      shadowColor: '#2563eb',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.25,
      shadowRadius: 25,
      elevation: 12,
    },
    // card (shadow-sm): "0 1px 3px rgba(0,0,0,0.06)"
    card: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 2,
    },
  },

  // Mode-specific shadow values (for dark mode variants)
  SHADOWS_DARK: {
    soft: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.35,
      shadowRadius: 20,
      elevation: 8,
    },
    floating: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 12,
      elevation: 8,
    },
    segmented: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.35,
      shadowRadius: 2,
      elevation: 2,
    },
    nav: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    tray: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -10 },
      shadowOpacity: 0.35,
      shadowRadius: 28,
      elevation: 16,
    },
  },
};

/**
 * Get resolved theme colors for a given mode and theme key.
 * Merges base mode tokens with color theme (bottle, nursing, etc.).
 */
export const getThemeColors = (isDark = false, themeKey = 'theme1') => {
  const base = isDark ? THEME_TOKENS.DARK_MODE : THEME_TOKENS.LIGHT_MODE;
  const colorTheme = THEME_TOKENS.COLOR_THEMES[themeKey] || THEME_TOKENS.COLOR_THEMES.theme1;
  const resolveAccent = (accent) => {
    if (!accent) return accent;
    if (!isDark) return accent;
    return {
      ...accent,
      primary: accent.dark || accent.primary,
    };
  };

  return {
    ...base,
    bottle: resolveAccent(colorTheme.bottle),
    nursing: resolveAccent(colorTheme.nursing),
    sleep: resolveAccent(colorTheme.sleep),
    diaper: resolveAccent(colorTheme.diaper),
    solids: resolveAccent(colorTheme.solids),
  };
};
