import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Feather from '@expo/vector-icons/Feather';

import { useTheme } from '@/theme/useTheme';
import { ColorTokens } from '@/theme/colors';

export type FeatherIconName = keyof typeof Feather.glyphMap;

export interface AppIconProps {
  name: FeatherIconName;
  size?: 16 | 20 | 24 | number;
  color?: string;
  colorRole?: keyof ColorTokens;
  /**
   * Se verdadeiro, o ícone é puramente visual e ignorado por leitores de tela.
   * Ícones com significado próprio devem ser mantidos como false ou contidos
   * dentro de um controle (como AppButton) com accessibilityLabel.
   */
  decorative?: boolean;
  accessibilityLabel?: string;
  style?: ViewStyle;
}

/**
 * Abstração de ícones lineares do PoolSafe baseada exclusivamente na família Feather.
 *
 * Mapeamento conceitual do design system (docs/design-system.md seção 12):
 * - Home: 'home'
 * - Histórico: 'clock' | 'bell'
 * - Câmeras: 'video' | 'camera'
 * - Definições: 'settings' | 'sliders'
 * - Monitoramento ativo: 'shield' | 'activity'
 * - Alerta de risco: 'alert-triangle'
 * - Detalhe/Voltar: 'arrow-left'
 * - Ações contextuais: 'refresh-cw', 'chevron-right', 'eye', 'eye-off'
 */
export function AppIcon({
  name,
  size = 24,
  color,
  colorRole,
  decorative = true,
  accessibilityLabel,
  style,
}: AppIconProps) {
  const { colors } = useTheme();

  const iconColor = color || (colorRole ? colors[colorRole] : colors.textPrimary);

  return (
    <View
      accessible={!decorative && !!accessibilityLabel}
      accessibilityRole={!decorative && accessibilityLabel ? 'image' : 'none'}
      accessibilityLabel={decorative ? undefined : accessibilityLabel}
      aria-hidden={decorative}
      style={[styles.container, style]}
    >
      <Feather name={name} size={size} color={iconColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
