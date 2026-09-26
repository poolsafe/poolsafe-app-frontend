import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

export default function CamerasScreen() {
  const router = useRouter();

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader title="Câmeras" subtitle="Dispositivos associados" />

      <RoutePlaceholder
        title="Câmeras Autorizadas"
        targetSlice="Fatia 5 — Câmeras autorizadas"
        description="A listagem de câmeras associadas administrativamente à conta, status de conectividade (online/offline) e atalhos para controle serão implementados na Fatia 5."
        devActions={
          <View style={styles.buttonGroup}>
            <AppButton
              variant="primary"
              title="Pré-visualizar detalhe vazio de câmera"
              icon="external-link"
              onPress={() =>
                router.push({
                  pathname: '/(app)/cameras/[id]',
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
