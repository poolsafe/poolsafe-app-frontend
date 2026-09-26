import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, ColorTokens } from './colors';

export type AppTheme = 'dark' | 'light';
export type ThemeMode = 'system' | 'dark' | 'light';

export interface ThemeContextValue {
  theme: AppTheme;
  themeMode: ThemeMode;
  colors: ColorTokens;
  isDark: boolean;
  setThemeMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}

/**
 * Provider de tema do PoolSafe.
 *
 * Suporta modo automático do sistema ou seleção explícita (escuro / claro / white).
 * O tema escuro atua como padrão e fallback garantido.
 */
export function ThemeProvider({ children, initialMode = 'system' }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeMode] = React.useState<ThemeMode>(initialMode);

  const toggleTheme = React.useCallback(() => {
    setThemeMode((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'light';
      return systemColorScheme === 'light' ? 'dark' : 'light';
    });
  }, [systemColorScheme]);

  const value = useMemo<ThemeContextValue>(() => {
    let resolvedTheme: AppTheme;
    if (themeMode === 'system') {
      resolvedTheme = systemColorScheme === 'light' ? 'light' : 'dark';
    } else {
      resolvedTheme = themeMode;
    }

    const isLight = resolvedTheme === 'light';
    const colors = isLight ? lightColors : darkColors;

    return {
      theme: resolvedTheme,
      themeMode,
      colors,
      isDark: !isLight,
      setThemeMode,
      toggleTheme,
    };
  }, [systemColorScheme, themeMode, toggleTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback defensivo com tema escuro se usado fora do provider
    return {
      theme: 'dark',
      themeMode: 'system',
      colors: darkColors,
      isDark: true,
      setThemeMode: () => {},
      toggleTheme: () => {},
    };
  }
  return context;
}
