import React, { createContext, useContext, useMemo } from 'react';
import { getThemeColors, THEME_TOKENS } from '../../../shared/config/theme';

const ThemeContext = createContext(null);

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

    return {
      themeKey,
      isDark,
      colors: base,
      bottle: colorTheme.bottle,
      nursing: colorTheme.nursing,
      sleep: colorTheme.sleep,
      diaper: colorTheme.diaper,
      solids: colorTheme.solids,
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
