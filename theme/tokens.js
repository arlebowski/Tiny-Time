(() => {
  window.TT = window.TT || {};

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
          bottle: { name: "Bottle", primary: "#e6749c", soft: "#f5c7d7", dark: "#a85874" },
          nursing: { name: "Nursing", primary: "#5db899", soft: "#bee3d6", dark: "#4b8772" },
          sleep: { name: "Sleep", primary: "#6ba9dd", soft: "#c4ddf1", dark: "#547da0" },
          diaper: { name: "Diaper", primary: "#9b7ba8", soft: "#d7cadc", dark: "#745e7d" },
          solids: { name: "Solids", primary: "#deaf51", soft: "#f2dfba", dark: "#a18143" }
        },
        theme: {
          light: { bg: "#F5F5F7", card: "#FFFFFF", field: "#F5F5F7" },
          dark: { bg: "#000000", card: "#1C1C1E", field: "#2C2C2E" }
        }
      },
      theme3: {
        name: "Theme 3",
        cards: {
          bottle: { name: "Bottle", primary: "#f56666", soft: "#fbc2c2", dark: "#b05050" },
          nursing: { name: "Nursing", primary: "#b88fd9", soft: "#e3d2f0", dark: "#8e74a2" },
          sleep: { name: "Sleep", primary: "#bba652", soft: "#e4dbba", dark: "#ac984a" },
          diaper: { name: "Diaper", primary: "#7b8ff4", soft: "#cad2fb", dark: "#5e6caf" },
          solids: { name: "Solids", primary: "#5db899", soft: "#bee3d6", dark: "#4b8772" }
        },
        theme: {
          light: { bg: "#F5F5F7", card: "#FFFFFF", field: "#F5F5F7" },
          dark: { bg: "#000000", card: "#1C1C1E", field: "#2C2C2E" }
        }
      },
      theme4: {
        name: "Theme 4",
        cards: {
          bottle: { name: "Bottle", primary: "#98ae76", soft: "#d6dfc8", dark: "#76865e" },
          nursing: { name: "Nursing", primary: "#1d8fc3", soft: "#a9d9e4", dark: "#2e7a93" },
          sleep: { name: "Sleep", primary: "#e98378", soft: "#f6cdc9", dark: "#a35c54" },
          diaper: { name: "Diaper", primary: "#e1b04d", soft: "#f3dfb8", dark: "#9e7b36" },
          solids: { name: "Solids", primary: "#9a7daf", soft: "#d7cbdf", dark: "#816d8f" }
        },
        theme: {
          light: { bg: "#F5F5F7", card: "#FFFFFF", field: "#F5F5F7" },
          dark: { bg: "#000000", card: "#1C1C1E", field: "#2C2C2E" }
        }
      }
    },

    BACKGROUND_THEMES: {
      light: {
        "health-gray": {
          appBg: "rgba(255, 255, 255, 1)",
          cardBg: "rgba(251, 248, 239, 1)",
          cardBorder: "transparent"
        }
      },
      dark: {
        "health-gray": {
          appBg: "rgba(31, 32, 34, 1)",
          cardBg: "rgba(42, 43, 48, 1)",
          cardBorder: "transparent"
        }
      }
    },

    LIGHT_MODE_TOKENS: {
      "health-gray": {
        inputBg: "rgba(251, 248, 239, 1)",
        subtleSurface: "rgba(0,0,0,0.03)",
        surfaceSubtle: "rgba(0,0,0,0.03)",
        surfaceSelected: "rgba(0,0,0,0.08)",
        surfaceHover: "rgba(0,0,0,0.03)",
        progressTrack: "rgba(0,0,0,0.03)",
        timelineItemBg: "rgba(251, 248, 239, 1)",
        timelineTrackBg: "rgba(251, 248, 239, 1)",
        halfsheetBg: "rgba(255, 255, 255, 1)",
        wheelpickerBar: "rgba(0,0,0,0.03)",
        iconBg: "rgba(251, 248, 239, 1)",
        inputBorder: "rgba(0,0,0,0.08)",
        divider: "rgba(0,0,0,0.08)",
        trackerCardBg: "rgba(251, 248, 239, 1)",
        segTrack: "rgba(0,0,0,0.03)",
        segPill: "#ffffff",
        swipeRowBg: "#F7F7F7",
        selectedSurface: "rgba(0,0,0,0.08)",
        plusBg: "#000000",
        plusFg: "#ffffff",
        textPrimary: "rgba(0,0,0,0.87)",
        textSecondary: "rgba(0,0,0,0.60)",
        textTertiary: "rgba(0,0,0,0.38)",
        textDisabled: "rgba(0,0,0,0.28)",
        textOnAccent: "#ffffff",
        tapableBg: "rgba(0,0,0,0.05)",
        overlayScrim: "rgba(0, 0, 0, 0.3)",
        overlayScrimStrong: "rgba(0,0,0,0.6)",
        shadowSoft: "0 -4px 20px rgba(0, 0, 0, 0.1)",
        shadowFloating: "0 4px 12px rgba(0,0,0,0.15)",
        textShadow: "0 2px 8px rgba(0,0,0,0.15)",
        bgHover: "rgba(0,0,0,0.03)",
        borderSubtle: "rgba(0,0,0,0.08)",
        borderStrong: "rgba(0,0,0,0.16)",
        outlineStrong: "#333333",
        navDisabled: "rgba(0,0,0,0.24)",
        navDivider: "rgb(243, 244, 246)",
        navPillBorder: "rgba(0,0,0,0.12)",
        navShadow: "0 -1px 3px rgba(0,0,0,0.1)",
        segmentedTrackBg: "rgba(255,255,255,0.2)",
        segmentedShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        segmentedOnBg: "#ffffff",
        segmentedOnText: "rgba(0,0,0,0.87)",
        segmentedOffText: "rgba(255,255,255,0.8)",
        primaryActionBg: "#4b9c7e",
        primaryActionBgActive: "#4b9c7e",
        primaryActionShadow: "0 10px 25px rgba(37,99,235,0.25)",
        primaryActionShadowActive: "0 10px 25px rgba(0,0,0,0.25)",
        primaryActionText: "#ffffff",
        primaryBrand: "#4b9c7e",
        primaryBrandSoft: "rgba(75, 156, 126, 0.18)",
        primaryBrandStrong: "#4b9c7e",
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
        pulseHighlight: "rgba(255, 255, 255, 0.5)",
        highlightIndigoSoft: "rgba(75, 156, 126, 0.22)",
        trayBg: "#ffffff",
        trayShadow: "0 -10px 28px rgba(0,0,0,0.18)",
        trayDivider: "rgba(0,0,0,0.06)"
      }
    },

    DARK_MODE_TOKENS: {
      inputBg: "#3C3E43",
      subtleSurface: "rgba(255,255,255,0.05)",
      surfaceSubtle: "rgba(255,255,255,0.05)",
      surfaceSelected: "#2A2B30",
      surfaceHover: "rgba(255,255,255,0.08)",
      progressTrack: "rgba(255,255,255,0.05)",
      timelineTrackBg: "rgba(255,255,255,0.05)",
      wheelpickerBar: "rgba(255,255,255,0.05)",
      iconBg: "#3C3E43",
      inputBorder: "rgba(255,255,255,0.10)",
      divider: "rgba(255,255,255,0.10)",
      segTrack: "rgba(255,255,255,0.05)",
      segPill: "rgba(255,255,255,0.12)",
      swipeRowBg: "#272727",
      selectedSurface: "#2A2B30",
      plusBg: "#ffffff",
      plusFg: "#000000",
      textPrimary: "rgba(255,255,255,0.87)",
      textSecondary: "rgba(255,255,255,0.60)",
      textTertiary: "rgba(255,255,255,0.38)",
      textDisabled: "rgba(255,255,255,0.26)",
      textOnAccent: "#ffffff",
      tapableBg: "rgba(255, 255, 255, 0.1)",
      overlayScrim: "rgba(0, 0, 0, 0.45)",
      overlayScrimStrong: "rgba(0,0,0,0.6)",
      shadowSoft: "0 -4px 20px rgba(0, 0, 0, 0.35)",
      shadowFloating: "0 4px 12px rgba(0,0,0,0.35)",
      textShadow: "0 2px 8px rgba(0,0,0,0.35)",
      bgHover: "rgba(255,255,255,0.08)",
      borderSubtle: "rgba(255,255,255,0.10)",
      borderStrong: "rgba(255,255,255,0.16)",
      outlineStrong: "#ffffff",
      navDisabled: "rgba(255,255,255,0.28)",
      navDivider: "rgba(255,255,255,0.06)",
      navPillBorder: "rgba(255,255,255,0.18)",
      navShadow: "none",
      segmentedTrackBg: "rgba(255,255,255,0.2)",
      segmentedShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.35)",
      segmentedOnBg: "#ffffff",
      segmentedOnText: "rgba(0,0,0,0.87)",
      segmentedOffText: "rgba(255,255,255,0.8)",
      primaryActionBg: "#52b57a",
      primaryActionBgActive: "#52b57a",
      primaryActionShadow: "0 10px 25px rgba(37,99,235,0.25)",
      primaryActionShadowActive: "0 10px 25px rgba(0,0,0,0.35)",
      primaryActionText: "#ffffff",
      primaryBrand: "#52b57a",
      primaryBrandSoft: "rgba(82, 181, 122, 0.18)",
      primaryBrandStrong: "#52b57a",
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
      highlightIndigoSoft: "rgba(82, 181, 122, 0.22)",
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
