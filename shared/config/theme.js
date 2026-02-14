// Design tokens for React Native
// Ported from web/theme/tokens.js

export const THEME_TOKENS = {
  // Light mode base colors
  LIGHT_MODE: {
    appBg: '#FAF6EB',
    cardBg: '#FFFFFF',
    cardAlt: '#FCF9F0',
    inputBg: '#F5F5F7',
    track: '#F0EBE0',
    subtle: '#F7F7F7',
    selected: '#EBEBEB',
    borderSubtle: '#EBEBEB',
    borderStrong: '#D6D6D6',
    textPrimary: '#212121',
    textSecondary: '#666666',
    textTertiary: '#9E9E9E',
    textDisabled: '#B8B8B8',
  },

  // Dark mode base colors
  DARK_MODE: {
    appBg: '#1A1A1A',
    cardBg: '#2A2B30',
    inputBg: '#3C3E43',
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
  },

  // Color themes (4 themes from your web app)
  COLOR_THEMES: {
    theme1: {
      name: 'Theme 1',
      bottle: { primary: '#f5425d', soft: '#fbb3be', dark: '#f5667d' },
      nursing: { primary: '#8259cf', soft: '#cdbdec', dark: '#a685de' },
      sleep: { primary: '#277dc4', soft: '#a9cbe8', dark: '#5397d6' },
      diaper: { primary: '#c99c4f', soft: '#e9d7b9', dark: '#dbb878' },
      solids: { primary: '#4bab51', soft: '#b7ddb9', dark: '#7db881' },
    },
    theme2: {
      name: 'Theme 2',
      bottle: { primary: '#6ba9dd', soft: '#c4ddf1', dark: '#6798c2' },
      nursing: { primary: '#e6749c', soft: '#f5c7d7', dark: '#cb6b8d' },
      sleep: { primary: '#5db899', soft: '#bee3d6', dark: '#62aa91' },
      diaper: { primary: '#9b7ba8', soft: '#d7cadc', dark: '#91779d' },
      solids: { primary: '#deaf51', soft: '#f2dfba', dark: '#c59e54' },
    },
    theme3: {
      name: 'Theme 3',
      bottle: { primary: '#f56666', soft: '#fbc2c2', dark: '#d96666' },
      nursing: { primary: '#b88fd9', soft: '#e3d2f0', dark: '#a586bd' },
      sleep: { primary: '#bba652', soft: '#e4dbba', dark: '#cdb557' },
      diaper: { primary: '#7b8ff4', soft: '#cad2fb', dark: '#7182d3' },
      solids: { primary: '#5db899', soft: '#bee3d6', dark: '#62aa91' },
    },
    theme4: {
      name: 'Theme 4',
      bottle: { primary: '#98ae76', soft: '#d6dfc8', dark: '#92a575' },
      nursing: { primary: '#1d8fc3', soft: '#a9d9e4', dark: '#419cb9' },
      sleep: { primary: '#e98378', soft: '#f6cdc9', dark: '#c9756b' },
      diaper: { primary: '#e1b04d', soft: '#f3dfb8', dark: '#c49a47' },
      solids: { primary: '#9a7daf', soft: '#d7cbdf', dark: '#9b83ac' },
    },
  },

  DEFAULT_THEME_KEY: 'theme1',
};

// Helper to get current theme colors based on mode and theme key
export const getThemeColors = (isDark = false, themeKey = 'theme1') => {
  const base = isDark ? THEME_TOKENS.DARK_MODE : THEME_TOKENS.LIGHT_MODE;
  const colorTheme = THEME_TOKENS.COLOR_THEMES[themeKey] || THEME_TOKENS.COLOR_THEMES.theme1;
  
  return {
    ...base,
    ...colorTheme,
  };
};
