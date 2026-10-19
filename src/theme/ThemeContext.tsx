import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';

import { darkColors, lightColors, ColorTokens } from './colors';
import {
  type ThemeMode,
  loadStoredThemeMode,
  saveStoredThemeMode,
} from './theme-storage';
import type { SecureStoreDriver } from '../services/auth/secure-storage';

export type AppTheme = 'dark' | 'light';
export type { ThemeMode } from './theme-storage';

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
  driver?: SecureStoreDriver;
}

/**
 * Provider de tema do PoolSafe.
 *
 * Suporta modo automático do sistema ou seleção explícita (escuro / claro / white).
 * O tema escuro atua como padrão e fallback garantido.
 * A preferência do usuário é persistida em armazenamento seguro e restaurada na inicialização.
 */
export function ThemeProvider({
  children,
  initialMode = 'system',
  driver,
}: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [themeMode, setThemeModeState] = React.useState<ThemeMode>(initialMode);
  const userHasExplicitlyChangedRef = React.useRef(false);

  // Restaura preferência salva na inicialização sem sobrescrever interação recente
  React.useEffect(() => {
    let isMounted = true;
    void loadStoredThemeMode(driver).then((storedMode) => {
      if (!isMounted) return;
      if (!userHasExplicitlyChangedRef.current) {
        setThemeModeState(storedMode);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [driver]);

  const setThemeMode = React.useCallback(
    (mode: ThemeMode) => {
      userHasExplicitlyChangedRef.current = true;
      setThemeModeState(mode);
      void saveStoredThemeMode(mode, driver);
    },
    [driver],
  );

  const toggleTheme = React.useCallback(() => {
    userHasExplicitlyChangedRef.current = true;
    setThemeModeState((prev) => {
      let next: ThemeMode;
      if (prev === 'light') next = 'dark';
      else if (prev === 'dark') next = 'light';
      else next = systemColorScheme === 'light' ? 'dark' : 'light';

      void saveStoredThemeMode(next, driver);
      return next;
    });
  }, [systemColorScheme, driver]);

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
  }, [systemColorScheme, themeMode, toggleTheme, setThemeMode]);

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
