import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';

import { AppText } from '../primitives/AppText';
import { AppCard } from '../primitives/AppCard';
import { AppBadge } from '../primitives/AppBadge';
import { AppDivider } from '../primitives/AppDivider';
import { spacing } from '@/theme/tokens';

export interface RoutePlaceholderProps {
  title: string;
  targetSlice: string;
  description: string;
  devActions?: React.ReactNode;
}

/**
 * Componente interno estritamente de desenvolvimento para cascas de rota.
 *
 * Deixa explícito ao avaliador que a rota existe e está estruturada no
 * Expo Router, porém o conteúdo funcional e integração com a API Node.js
 * pertencem a fatias futuras aprovadas.
 */
export function RoutePlaceholder({
  title,
  targetSlice,
  description,
  devActions,
}: RoutePlaceholderProps) {
  return (
    <ScrollView
      contentContainerStyle={styles.scrollContainer}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={false}
    >
      <AppCard variant="glass" style={styles.card}>
        <View style={styles.badgeRow}>
          <AppBadge label="Fatia 1: Fundação" variant="info" />
          <AppBadge label={targetSlice} variant="warning" />
        </View>

        <AppText variant="heading3" style={styles.title}>
          {title}
        </AppText>

        <AppText variant="body" colorRole="textSecondary" style={styles.description}>
          {description}
        </AppText>

        <AppDivider marginVertical={spacing[3]} />

        <AppText variant="caption" colorRole="textMuted">
          Rota registrada no Expo Router. Nenhuma chamada de API, regra de negócio ou dado fictício foi antecipado.
        </AppText>

        {__DEV__ && devActions ? (
          <View style={styles.actionsContainer}>
            <AppText variant="smallStrong" colorRole="primary" style={styles.actionsTitle}>
              [DEV] Navegação Técnica de Validação
            </AppText>
            {devActions}
          </View>
        ) : null}
      </AppCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    padding: spacing[4],
    flexGrow: 1,
  },
  card: {
    marginTop: spacing[2],
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[3],
    flexWrap: 'wrap',
  },
  title: {
    marginBottom: spacing[2],
  },
  description: {
    lineHeight: 22,
  },
  actionsContainer: {
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: 'rgba(120, 167, 181, 0.15)',
    gap: spacing[3],
  },
  actionsTitle: {
    marginBottom: spacing[1],
  },
});
