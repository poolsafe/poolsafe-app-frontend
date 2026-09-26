import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

export default function CameraDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Detalhes da Câmera"
        subtitle={`Identificador de rota: ${id || 'preview'}`}
        showBack={true}
        onBack={() => router.back()}
      />

      <RoutePlaceholder
        title="Detalhe da Câmera (Casca)"
        targetSlice="Fatia 5 — Câmeras autorizadas / Fatia 6 — Monitoramento"
        description="Esta tela sobrepõe a barra de navegação inferior. A consulta do status da câmera via API Node.js, histórico de alertas recentes e controle de ativação/pausa com reautenticação serão implementados nas Fatias 5 e 6."
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
