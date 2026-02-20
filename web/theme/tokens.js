(() => {
  window.TT = window.TT || {};

  // Base palettes (hex-only)
  // LIGHT: appBg=app background, card=primary cards, cardAlt=sheet/timeline track,
  // field=inputs, track=segmented track/selection, subtle=hairline surfaces,
  // selected=selected surface, border*=borders, text*=text colors.
  const LIGHT_BASE = {
    appBg: "#FAF6EB",
    card: "#FFFFFF",
    cardAlt: "#FCF9F0",
    field: "#F5F5F7",
    track: "#F0EBE0",
    subtle: "#F7F7F7",
    selected: "#EBEBEB",
    borderSubtle: "#EBEBEB",
    borderStrong: "#D6D6D6",
    textPrimary: "#212121",
    textSecondary: "#666666",
    textTertiary: "#9E9E9E",
    textDisabled: "#B8B8B8"
  };

  // DARK: appBg=app background, card=primary cards, field=inputs,
  // track=segmented track/selection, pill=segmented pill, subtle=hairline surfaces,
  // selected=selected surface, border*=borders, text*=text colors.
  const DARK_BASE = {
    appBg: "#1A1A1A",
    card: "#2A2B30",
    field: "#3C3E43",
    track: "#2A2B30",
    pill: "#3C3E43",
    subtle: "#35373C",
    selected: "#2A2B30",
    borderSubtle: "#1A1A1A",
    borderStrong: "#292929",
    textPrimary: "#FFFFFF",
    textSecondary: "#A2AAAF",
    textTertiary: "#8B9299",
    textDisabled: "#424242"
  };

  const THEME_TOKENS = {
    DEFAULT_APPEARANCE: {
      darkMode: false
    },

    DEFAULT_THEME_KEY: "theme1",
    COLOR_THEME_ORDER: ["theme1", "theme2", "theme3", "theme4"],
    COLOR_THEMES: {
      theme1: {
        name: "Theme 1",
        cards: {
          bottle: { name: "Bottle", primary: "#f5425d", soft: "#fbb3be", dark: "#f5667d" },
          nursing: { name: "Nursing", primary: "#8259cf", soft: "#cdbdec", dark: "#a685de" },
          sleep: { name: "Sleep", primary: "#277dc4", soft: "#a9cbe8", dark: "#5397d6" },
          diaper: { name: "Diaper", primary: "#c99c4f", soft: "#e9d7b9", dark: "#dbb878" },
          solids: { name: "Solids", primary: "#4bab51", soft: "#b7ddb9", dark: "#7db881" }
        },
        theme: {
          light: { bg: "#F5F5F7", card: "#FFFFFF", field: "#F5F5F7" },
          dark: { bg: "#000000", card: "#1C1C1E", field: "#2C2C2E" }
        }
      },
      theme2: {
        name: "Theme 2",
        cards: {
          bottle: { name: "Bottle", primary: "#6ba9dd", soft: "#c4ddf1", dark: "#6798c2" },
          nursing: { name: "Nursing", primary: "#e6749c", soft: "#f5c7d7", dark: "#cb6b8d" },
          sleep: { name: "Sleep", primary: "#5db899", soft: "#bee3d6", dark: "#62aa91" },
          diaper: { name: "Diaper", primary: "#9b7ba8", soft: "#d7cadc", dark: "#91779d" },
          solids: { name: "Solids", primary: "#deaf51", soft: "#f2dfba", dark: "#c59e54" }
        },
        theme: {
          light: { bg: "#F5F5F7", card: "#FFFFFF", field: "#F5F5F7" },
          dark: { bg: "#000000", card: "#1C1C1E", field: "#2C2C2E" }
        }
      },
      theme3: {
        name: "Theme 3",
        cards: {
          bottle: { name: "Bottle", primary: "#f56666", soft: "#fbc2c2", dark: "#d96666" },
          nursing: { name: "Nursing", primary: "#b88fd9", soft: "#e3d2f0", dark: "#a586bd" },
          sleep: { name: "Sleep", primary: "#bba652", soft: "#e4dbba", dark: "#cdb557" },
          diaper: { name: "Diaper", primary: "#7b8ff4", soft: "#cad2fb", dark: "#7182d3" },
          solids: { name: "Solids", primary: "#5db899", soft: "#bee3d6", dark: "#62aa91" }
        },
        theme: {
          light: { bg: "#F5F5F7", card: "#FFFFFF", field: "#F5F5F7" },
          dark: { bg: "#000000", card: "#1C1C1E", field: "#2C2C2E" }
        }
      },
      theme4: {
        name: "Theme 4",
        cards: {
          bottle: { name: "Bottle", primary: "#98ae76", soft: "#d6dfc8", dark: "#92a575" },
          nursing: { name: "Nursing", primary: "#1d8fc3", soft: "#a9d9e4", dark: "#419cb9" },
          sleep: { name: "Sleep", primary: "#e98378", soft: "#f6cdc9", dark: "#c9756b" },
          diaper: { name: "Diaper", primary: "#e1b04d", soft: "#f3dfb8", dark: "#c49a47" },
          solids: { name: "Solids", primary: "#9a7daf", soft: "#d7cbdf", dark: "#9b83ac" }
        },
        theme: {
          light: { bg: "#F5F5F7", card: "#FFFFFF", field: "#F5F5F7" },
          dark: { bg: "#000000", card: "#1C1C1E", field: "#2C2C2E" }
        }
      }
    },

    BACKGROUND_THEMES: {
      light: {
        appBg: LIGHT_BASE.appBg,
        cardBg: LIGHT_BASE.card,
        cardBorder: "transparent"
      },
      dark: {
        appBg: DARK_BASE.appBg,
        cardBg: DARK_BASE.card,
        cardBorder: "transparent"
      }
    },

    LIGHT_MODE_TOKENS: {
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
        subtleSurface: LIGHT_BASE.subtle,
        surfaceSubtle: LIGHT_BASE.subtle,
        surfaceSelected: LIGHT_BASE.selected,
        surfaceHover: LIGHT_BASE.subtle,
        progressTrack: LIGHT_BASE.subtle,
        wheelpickerBar: LIGHT_BASE.subtle,
        segTrack: LIGHT_BASE.track,
        segPill: "#ffffff",
        selectedSurface: LIGHT_BASE.track,
        swipeRowBg: "#F7F7F7",

        // Text
        textPrimary: LIGHT_BASE.textPrimary,
        textSecondary: LIGHT_BASE.textSecondary,
        textTertiary: LIGHT_BASE.textTertiary,
        textDisabled: LIGHT_BASE.textDisabled,
        textOnAccent: "#ffffff",

        // Borders + dividers
        divider: LIGHT_BASE.borderSubtle,
        borderSubtle: LIGHT_BASE.borderSubtle,
        borderStrong: LIGHT_BASE.borderStrong,
        outlineStrong: "#333333",

        // Chrome + shadows
        tapableBg: "rgba(0,0,0,0.05)",
        overlayScrim: "rgba(0, 0, 0, 0.3)",
        overlayScrimStrong: "rgba(0,0,0,0.6)",
        shadowSoft: "0 -4px 20px rgba(0, 0, 0, 0.1)",
        shadowFloating: "0 4px 12px rgba(0,0,0,0.15)",
        textShadow: "0 2px 8px rgba(0,0,0,0.15)",
        bgHover: LIGHT_BASE.subtle,

        // Nav chrome
        navDisabled: "rgba(0,0,0,0.24)",
        navDivider: "rgb(243, 244, 246)",
        navPillBorder: "rgba(0,0,0,0.12)",
        navShadow: "0 -1px 3px rgba(0,0,0,0.1)",

        // Segmented control (legacy + new)
        segmentedTrackBg: "rgba(255,255,255,0.2)",
        segmentedShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        segmentedOnBg: "#ffffff",
        segmentedOnText: "rgba(0,0,0,0.87)",
        segmentedOffText: "rgba(255,255,255,0.8)",

        // Primary/CTA
        primaryActionBg: "#1A1A1A",
        primaryActionBgActive: "#1A1A1A",
        primaryActionShadow: "0 10px 25px rgba(37,99,235,0.25)",
        primaryActionShadowActive: "0 10px 25px rgba(0,0,0,0.25)",
        primaryActionText: "#ffffff",
        primaryBrand: "#1A1A1A",
        primaryBrandSoft: "rgba(26, 26, 26, 0.14)",
        primaryBrandStrong: "#1A1A1A",
        plusBg: "#1A1A1A",
        plusFg: "#FFFFFF",
        brandIcon: "#FF4D79",

        // System colors
        recoveryBg: "#F2F2F7",
        error: "#ef4444",
        errorSoft: "rgba(239, 68, 68, 0.1)",
        positive: "#34C759",
        positiveSoft: "rgba(52, 199, 89, 0.15)",
        positiveAlt: "#00BE68",
        positiveAltSoft: "rgba(0, 190, 104, 0.15)",
        negative: "#FF2D55",
        negativeSoft: "rgba(255, 45, 85, 0.15)",
        negativeWarm: "#FF6037",
        negativeWarmSoft: "rgba(255, 96, 55, 0.15)",

        // Highlights + trays
        pulseHighlight: "rgba(255, 255, 255, 0.5)",
        highlightSoft: "rgba(75, 156, 126, 0.22)",
        trayBg: "#ffffff",
        trayShadow: "0 -10px 28px rgba(0,0,0,0.18)",
        trayDivider: "rgba(0,0,0,0.06)"
    },

    DARK_MODE_TOKENS: {
      // Inputs + fields
      inputBg: DARK_BASE.field,
      iconBg: DARK_BASE.field,
      inputBorder: DARK_BASE.borderSubtle,

      // Surfaces (cards, sheets, timeline)
      timelineTrackBg: DARK_BASE.subtle,

      // Subtle surfaces + tracks
      subtleSurface: DARK_BASE.subtle,
      surfaceSubtle: DARK_BASE.subtle,
      surfaceSelected: DARK_BASE.selected,
      surfaceHover: "rgba(255,255,255,0.08)",
      progressTrack: DARK_BASE.subtle,
      wheelpickerBar: DARK_BASE.subtle,
      segTrack: DARK_BASE.card,
      segPill: DARK_BASE.pill,
      selectedSurface: DARK_BASE.selected,
      swipeRowBg: "#272727",

      // Text
      textPrimary: DARK_BASE.textPrimary,
      textSecondary: DARK_BASE.textSecondary,
      textTertiary: DARK_BASE.textTertiary,
      textDisabled: DARK_BASE.textDisabled,
      textOnAccent: "#ffffff",

      // Borders + dividers
      divider: DARK_BASE.borderSubtle,
      borderSubtle: DARK_BASE.borderSubtle,
      borderStrong: DARK_BASE.borderStrong,
      outlineStrong: "#ffffff",

      // Chrome + shadows
      tapableBg: "rgba(255, 255, 255, 0.1)",
      overlayScrim: "rgba(0, 0, 0, 0.45)",
      overlayScrimStrong: "rgba(0,0,0,0.6)",
      shadowSoft: "0 -4px 20px rgba(0, 0, 0, 0.35)",
      shadowFloating: "0 4px 12px rgba(0,0,0,0.35)",
      textShadow: "0 2px 8px rgba(0,0,0,0.35)",
      bgHover: "rgba(255,255,255,0.08)",

      // Nav chrome
      navDisabled: "rgba(255,255,255,0.28)",
      navDivider: "rgba(255,255,255,0.06)",
      navPillBorder: "rgba(255,255,255,0.18)",
      navShadow: "none",

      // Segmented control (legacy + new)
      segmentedTrackBg: "rgba(255,255,255,0.2)",
      segmentedShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.35)",
      segmentedOnBg: "#ffffff",
      segmentedOnText: "rgba(0,0,0,0.87)",
      segmentedOffText: "rgba(255,255,255,0.8)",

      // Primary/CTA
      plusBg: "#ffffff",
      plusFg: "#000000",
      primaryActionBg: "#FFFFFF",
      primaryActionBgActive: "#FFFFFF",
      primaryActionShadow: "0 10px 25px rgba(37,99,235,0.25)",
      primaryActionShadowActive: "0 10px 25px rgba(0,0,0,0.35)",
      primaryActionText: "#000000",
      primaryBrand: "#FFFFFF",
      primaryBrandSoft: "rgba(255, 255, 255, 0.14)",
      primaryBrandStrong: "#FFFFFF",
      brandIcon: "#FF4D79",
      recoveryBg: "#0F0F10",
      error: "#ef4444",
      errorSoft: "rgba(239, 68, 68, 0.15)",
      positive: "#34C759",
      positiveSoft: "rgba(52, 199, 89, 0.2)",
      positiveAlt: "#00BE68",
      positiveAltSoft: "rgba(0, 190, 104, 0.2)",
      negative: "#FF2D55",
      negativeSoft: "rgba(255, 45, 85, 0.2)",
      negativeWarm: "#FF6037",
      negativeWarmSoft: "rgba(255, 96, 55, 0.2)",
      pulseHighlight: "rgba(255, 255, 255, 0.5)",
      highlightSoft: "rgba(82, 181, 122, 0.22)",
      trayBg: "#222224",
      trayShadow: "0 -10px 28px rgba(0,0,0,0.35)",
      trayDivider: "rgba(255,255,255,0.08)"
    },

    

    ANALYTICS_CATEGORY_COLORS: {
      daily: "#3B82F6",
      sleep: "#4F46E5",
      eating: "#EC4899"
    },

    GOOGLE_COLORS: {
      blue: "#4285F4",
      green: "#34A853",
      yellow: "#FBBC05",
      red: "#EA4335"
    }
  };

  window.TT.themeTokens = THEME_TOKENS;
})();
