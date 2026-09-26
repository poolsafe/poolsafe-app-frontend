import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

export default function HistoryScreen() {
  const router = useRouter();

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader title="Histórico" subtitle="Alertas registrados" />

      <RoutePlaceholder
        title="Histórico de Alertas"
        targetSlice="Fatia 7 — Histórico, alertas e evidências"
        description="A listagem ordenada por data com paginação por cursor, filtros e consumo do endpoint GET /alerts serão implementados na Fatia 7."
        devActions={
          <View style={styles.buttonGroup}>
            <AppButton
              variant="primary"
              title="Pré-visualizar detalhe vazio de alerta"
              icon="external-link"
              onPress={() =>
                router.push({
                  pathname: '/(app)/alerts/[id]',
                  params: { id: 'preview' },
                })
              }
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
