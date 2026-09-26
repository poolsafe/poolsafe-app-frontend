import '../global.css';

import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import {
  useFonts,
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
} from '@expo-google-fonts/inter';
import { JetBrainsMono_600SemiBold } from '@expo-google-fonts/jetbrains-mono';

import { QueryProvider } from '@/providers/QueryClientProvider';
import { ThemeProvider, useTheme } from '@/theme/ThemeContext';
import { AppText } from '@/components/primitives/AppText';

export default function RootLayout() {
  // Carregamento resiliente das fontes oficiais com fallback automático
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    JetBrainsMono_600SemiBold,
  });

  return (
    <QueryProvider>
      <ThemeProvider>
        <RootContent fontsLoaded={fontsLoaded} fontError={fontError} />
      </ThemeProvider>
    </QueryProvider>
  );
}

function RootContent({
  fontsLoaded,
  fontError,
}: {
  fontsLoaded: boolean;
  fontError: Error | null;
}) {
  const { colors, isDark } = useTheme();

  // Enquanto as fontes carregam, exibe uma tela de carregamento visual simples
  // sem bloquear indefinidamente (se houver erro ou timeout, renderiza com fallback nativo)
  if (!fontsLoaded && !fontError) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText
          variant="small"
          colorRole="textMuted"
          style={styles.loadingText}
        >
          Carregando PoolSafe...
        </AppText>
      </View>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
          animation: 'none',
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(public)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
  },
});
