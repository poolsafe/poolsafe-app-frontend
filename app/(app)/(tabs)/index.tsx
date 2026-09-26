import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="PoolSafe"
        subtitle="Painel de monitoramento"
        showThemeToggle={true}
      />

      <RoutePlaceholder
        title="Painel Principal (Home)"
        targetSlice="Fatia 4 — Home"
        description="O resumo operacional consolidado, contagem de câmeras online, indicador de estado de monitoramento e atalho para o alerta mais recente serão implementados na Fatia 4."
        devActions={
          <View style={styles.buttonGroup}>
            <AppButton
              variant="secondary"
              title="Ir para Aba de Câmeras"
              icon="video"
              onPress={() => router.push('/(app)/(tabs)/cameras')}
            />
            <AppButton
              variant="secondary"
              title="Ir para Aba de Histórico"
              icon="clock"
              onPress={() => router.push('/(app)/(tabs)/history')}
            />
          </View>
        }
      />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    gap: spacing[2],
  },
});
