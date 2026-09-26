import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

export default function AlertDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Detalhes do Alerta"
        subtitle={`Identificador de rota: ${id || 'preview'}`}
        showBack={true}
        onBack={() => router.back()}
      />

      <RoutePlaceholder
        title="Detalhe do Alerta (Casca)"
        targetSlice="Fatia 7 — Histórico, alertas e evidências"
        description="Esta tela sobrepõe a barra de navegação inferior para foco e visualização de evidência. A consulta dos dados autorizados, timestamp, câmera de origem e frame de evidência seguro via API Node.js serão implementados na Fatia 7."
        devActions={
          <View style={styles.buttonGroup}>
            <AppButton
              variant="secondary"
              title="Retornar à tela anterior"
              icon="arrow-left"
              onPress={() => router.back()}
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
