import React, { createContext, useContext, useMemo } from 'react';
import { THEME_TOKENS } from '../../../shared/config/theme';

const ThemeContext = createContext(null);

const resolveAccent = (accent, isDark) => {
  if (!accent) return accent;
  if (!isDark) return accent;
  return {
    ...accent,
    primary: accent.dark || accent.primary,
  };
};

/**
 * ThemeProvider — provides resolved theme colors to all child components.
 *
 * Props:
 *   themeKey  – e.g. 'theme1' (default), 'theme2', etc.
 *   isDark    – dark mode flag (default false)
 *
 * Hardcoded to theme1/light for now.
 * Wire to Firebase settings later to make it dynamic.
 */
export function ThemeProvider({ themeKey = 'theme1', isDark = false, children }) {
  const value = useMemo(() => {
    const base = isDark ? THEME_TOKENS.DARK_MODE : THEME_TOKENS.LIGHT_MODE;
    const colorTheme = THEME_TOKENS.COLOR_THEMES[themeKey] || THEME_TOKENS.COLOR_THEMES.theme1;
    const bottle = resolveAccent(colorTheme.bottle, isDark);
    const nursing = resolveAccent(colorTheme.nursing, isDark);
    const sleep = resolveAccent(colorTheme.sleep, isDark);
    const diaper = resolveAccent(colorTheme.diaper, isDark);
    const solids = resolveAccent(colorTheme.solids, isDark);
    const shadows = isDark
      ? { ...THEME_TOKENS.SHADOWS, ...THEME_TOKENS.SHADOWS_DARK }
      : THEME_TOKENS.SHADOWS;

    return {
      themeKey,
      isDark,
      colors: {
        ...base,
        brandIcon: base.brandIcon ?? (isDark ? '#FF99AA' : '#FF4D79'),
      },
      bottle,
      nursing,
      sleep,
      diaper,
      solids,
      spacing: THEME_TOKENS.SPACING,
      sheetLayout: THEME_TOKENS.SHEET_LAYOUT,
      typography: THEME_TOKENS.TYPOGRAPHY,
      radius: THEME_TOKENS.RADIUS,
      shadows,
    };
  }, [themeKey, isDark]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

export default ThemeContext;
