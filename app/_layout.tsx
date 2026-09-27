import '../global.css';

import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, useRouter, useSegments } from 'expo-router';
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
import { AuthProvider, useAuth, AuthStatus } from '@/providers/AuthContext';
import { AppText } from '@/components/primitives/AppText';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppButton } from '@/components/primitives/AppButton';
import { AppCard } from '@/components/primitives/AppCard';
import { spacing } from '@/theme/tokens';

export default function RootLayout() {
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
        <AuthProvider>
          <RootContent fontsLoaded={fontsLoaded} fontError={fontError} />
        </AuthProvider>
      </ThemeProvider>
    </QueryProvider>
  );
}

function useProtectedRoute(status: AuthStatus) {
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Não redireciona enquanto a restauração estiver em andamento ou em contingência recuperável
    if (status === 'initializing' || status === 'recoverable_failure') {
      return;
    }

    const firstSegment = segments[0];
    const inAppGroup = firstSegment === '(app)';
    const inPublicGroup = firstSegment === '(public)';

    if (status === 'unauthenticated' && inAppGroup) {
      router.replace('/(public)/login');
    } else if (status === 'authenticated' && inPublicGroup) {
      router.replace('/(app)/(tabs)');
    }
  }, [status, segments, router]);
}

function RootContent({
  fontsLoaded,
  fontError,
}: {
  fontsLoaded: boolean;
  fontError: Error | null;
}) {
  const { colors, isDark } = useTheme();
  const { status, recoverableError, retryRestore, logout } = useAuth();

  useProtectedRoute(status);

  // Enquanto as fontes ou a sessão inicial estiverem carregando, exibe indicador de carregamento
  // evitando que a tela de login pisque antes do término da restauração
  const isInitializing = (!fontsLoaded && !fontError) || status === 'initializing';

  if (isInitializing) {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <ActivityIndicator size="large" color={colors.primary} />
        <AppText variant="small" colorRole="textMuted" style={styles.loadingText}>
          Carregando PoolSafe...
        </AppText>
      </View>
    );
  }

  // Falha recuperável durante restauração: preserva a sessão salva e permite nova tentativa
  if (status === 'recoverable_failure') {
    return (
      <View style={[styles.centerContainer, { backgroundColor: colors.background, padding: spacing[4] }]}>
        <StatusBar style={isDark ? 'light' : 'dark'} />
        <AppCard variant="glass" style={styles.errorCard}>
          <AppText variant="heading2" style={styles.errorTitle}>
            Falha de Conexão
          </AppText>

          <AppBanner
            variant="warning"
            icon="wifi-off"
            message={
              recoverableError?.detail ||
              'Não foi possível validar sua sessão junto ao servidor local. Verifique sua conexão e tente novamente.'
            }
          />

          <View style={styles.errorActions}>
            <AppButton
              variant="primary"
              title="Tentar novamente"
              icon="refresh-cw"
              fullWidth={true}
              onPress={retryRestore}
            />
            <AppButton
              variant="ghost"
              title="Acessar com outra conta"
              icon="log-in"
              fullWidth={true}
              onPress={async () => {
                await logout();
              }}
            />
          </View>
        </AppCard>
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
  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: spacing[3],
  },
  errorCard: {
    width: '100%',
    maxWidth: 420,
    padding: spacing[4],
  },
  errorTitle: {
    marginBottom: spacing[2],
  },
  errorActions: {
    marginTop: spacing[4],
    gap: spacing[2],
  },
});
