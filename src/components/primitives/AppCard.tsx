import React from 'react';
import { View, ViewProps, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { radius, spacing } from '@/theme/tokens';

export type CardVariant = 'default' | 'raised' | 'glass';

export interface AppCardProps extends ViewProps {
  variant?: CardVariant;
  padding?: number;
  borderRadius?: number;
  style?: ViewStyle;
  children: React.ReactNode;
}

/**
 * Primitiva de card aquático do PoolSafe.
 *
 * Oferece três variações de profundidade e contraste:
 * - default: superfícies de conteúdo principal
 * - raised: superfícies elevadas e menus
 * - glass: painel translúcido aquático com borda sutil, sem depender de blur nativo.
 */
export function AppCard({
  variant = 'default',
  padding = spacing[4],
  borderRadius = radius.large,
  style,
  children,
  ...rest
}: AppCardProps) {
  const { colors } = useTheme();

  let backgroundColor: string;
  let borderColor: string;

  switch (variant) {
    case 'raised':
      backgroundColor = colors.surfaceRaised;
      borderColor = colors.border;
      break;
    case 'glass':
      backgroundColor = colors.surfaceGlass;
      borderColor = colors.borderSubtle;
      break;
    case 'default':
    default:
      backgroundColor = colors.surface;
      borderColor = colors.border;
      break;
  }

  const containerStyle: ViewStyle = {
    backgroundColor,
    borderColor,
    borderWidth: 1,
    borderRadius,
    padding,
  };

  return (
    <View style={[styles.card, containerStyle, style]} {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    // Sem overflow: 'hidden' para evitar que o Fabric crie ReactClippingViewGroup
    // suscetível a erros de addViewAt durante transições no Android
  },
});
