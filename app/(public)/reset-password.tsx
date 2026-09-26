import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

export default function ResetPasswordScreen() {
  const router = useRouter();

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Redefinir Senha"
        subtitle="Definir nova credencial"
        showBack={true}
        onBack={() => router.back()}
      />

      <RoutePlaceholder
        title="Redefinição de Senha"
        targetSlice="Fatia 3 — Recuperação de acesso e conta"
        description="A definição da nova senha com token de uso único (conforme POST /auth/reset-password) e consequente revogação de todas as sessões anteriores será implementada na Fatia 3."
        devActions={
          <View style={styles.buttonGroup}>
            <AppButton
              variant="secondary"
              title="Voltar para Login"
              icon="log-in"
              onPress={() => router.push('/(public)/login')}
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
