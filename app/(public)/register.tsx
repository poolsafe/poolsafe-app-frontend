import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

export default function RegisterScreen() {
  const router = useRouter();

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Cadastro"
        subtitle="Nova conta de responsável"
        showBack={true}
        onBack={() => router.back()}
      />

      <RoutePlaceholder
        title="Tela de Cadastro"
        targetSlice="Fatia 2 — Persistência, cadastro, login e sessão"
        description="O formulário de criação de conta de responsável, validação de regras de senha com Zod e chamada ao endpoint POST /auth/register serão implementados na Fatia 2."
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
