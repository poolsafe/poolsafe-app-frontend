import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

export default function LoginScreen() {
  const router = useRouter();

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader title="PoolSafe" subtitle="Acesso ao sistema" />

      <RoutePlaceholder
        title="Tela de Login"
        targetSlice="Fatia 2 — Persistência, cadastro, login e sessão"
        description="A autenticação por e-mail e senha, validação de schema com Zod, integração com a API Node.js e armazenamento seguro de tokens em SecureStore serão implementados na Fatia 2."
        devActions={
          <View style={styles.buttonGroup}>
            <AppButton
              variant="secondary"
              title="Ir para Cadastro"
              icon="user-plus"
              onPress={() => router.push('/(public)/register')}
            />
            <AppButton
              variant="ghost"
              title="Solicitar Recuperação de Senha"
              icon="help-circle"
              onPress={() => router.push('/(public)/forgot-password')}
            />
            <AppButton
              variant="primary"
              title="Explorar Shell Autenticado (Dev)"
              icon="arrow-right"
              onPress={() => router.push('/(app)/(tabs)')}
            />
            <AppButton
              variant="ghost"
              title="Voltar ao Gateway Dev"
              icon="corner-up-left"
              onPress={() => router.replace('/')}
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
