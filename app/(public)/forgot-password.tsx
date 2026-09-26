import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Recuperação de Senha"
        subtitle="Solicitação de instruções"
        showBack={true}
        onBack={() => router.back()}
      />

      <RoutePlaceholder
        title="Solicitar Recuperação de Senha"
        targetSlice="Fatia 3 — Recuperação de acesso e conta"
        description="O fluxo de solicitação de redefinição por e-mail com resposta genérica não enumerável (conforme POST /auth/forgot-password) será implementado na Fatia 3."
        devActions={
          <View style={styles.buttonGroup}>
            <AppButton
              variant="secondary"
              title="Ir para Redefinir Senha (Simulação de Rota)"
              icon="key"
              onPress={() => router.push('/(public)/reset-password')}
            />
            <AppButton
              variant="ghost"
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
