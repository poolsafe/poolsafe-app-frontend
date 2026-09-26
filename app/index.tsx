import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { useRouter, Redirect } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppButton } from '@/components/primitives/AppButton';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppDivider } from '@/components/primitives/AppDivider';
import { spacing } from '@/theme/tokens';

/**
 * Rota de Inicialização / Gateway Temporário de Desenvolvimento (Fatia 1).
 *
 * Em builds que não sejam de desenvolvimento (!__DEV__), redireciona
 * imediatamente para a tela pública de login.
 *
 * Em desenvolvimento (__DEV__), atua como portal técnico para alternar
 * e auditar os dois fluxos estruturais (Público e Shell Autenticado) sem
 * falsificar sessões nem antecipar lógica de autenticação.
 */
export default function InitialGatewayScreen() {
  const router = useRouter();

  // Em produção ou build fora de desenvolvimento, redireciona diretamente ao login
  if (!__DEV__) {
    return <Redirect href="/(public)/login" />;
  }

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="PoolSafe"
        subtitle="Gateway de Desenvolvimento (Fatia 1)"
      />

      <ScrollView contentContainerStyle={styles.scrollContent} removeClippedSubviews={false}>
        <AppCard variant="glass" style={styles.card}>
          <View style={styles.badgeRow}>
            <AppBadge label="Modo Dev" variant="warning" icon="code" />
            <AppBadge label="Fatia 1: Fundação" variant="info" icon="layers" />
          </View>

          <AppText variant="heading3" style={styles.title}>
            Validação de Fundação Visual e Navegação
          </AppText>

          <AppText variant="body" colorRole="textSecondary" style={styles.description}>
            Este ambiente permite auditar a navegação, temas, componentes e safe areas sem
            fingir que existe uma sessão ativa. A autenticação real e persistência serão
            implementadas na Fatia 2.
          </AppText>

          <AppDivider marginVertical={spacing[4]} />

          <AppText variant="smallStrong" colorRole="primary" style={styles.sectionLabel}>
            Rotas Disponíveis para Auditoria:
          </AppText>

          <View style={styles.buttonList}>
            <AppButton
              variant="primary"
              title="Explorar Shell Autenticado (Bottom Tabs)"
              icon="layout"
              onPress={() => router.push('/(app)/(tabs)')}
            />

            <AppButton
              variant="secondary"
              title="Explorar Telas Públicas (Login / Cadastro)"
              icon="users"
              onPress={() => router.push('/(public)/login')}
            />
          </View>
        </AppCard>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing[4],
    flexGrow: 1,
    justifyContent: 'center',
  },
  card: {
    padding: spacing[4],
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  title: {
    marginBottom: spacing[2],
  },
  description: {
    lineHeight: 22,
  },
  sectionLabel: {
    marginBottom: spacing[3],
  },
  buttonList: {
    gap: spacing[3],
  },
});
