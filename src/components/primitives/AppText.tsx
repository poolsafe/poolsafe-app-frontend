import React from 'react';
import { Text, TextProps, StyleSheet, TextStyle, Platform } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { typography, TypographyVariant } from '@/theme/tokens';
import { ColorTokens } from '@/theme/colors';

export type TextColorRole = keyof ColorTokens;

export interface AppTextProps extends TextProps {
  variant?: TypographyVariant;
  colorRole?: TextColorRole;
  color?: string;
  align?: 'auto' | 'left' | 'right' | 'center' | 'justify';
  children: React.ReactNode;
}

/**
 * Primitiva tipográfica acessível do PoolSafe.
 *
 * Suporta as 11 variantes tipográficas canônicas do design system,
 * mapeando os pesos de Inter (ou JetBrains Mono na variante telemetry)
 * com fallback nativo caso as fontes personalizadas não estejam disponíveis.
 *
 * Suporta redimensionamento acessível de fontes sem truncamento prematuro.
 */
export function AppText({
  variant = 'body',
  colorRole = 'textPrimary',
  color,
  align,
  style,
  allowFontScaling = true,
  children,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();

  const variantStyle = typography[variant];
  const textColor = color || colors[colorRole];

  // Configuração de fallback seguro caso a fonte do sistema seja exigida
  const fallbackFontFamily =
    variant === 'telemetry'
      ? Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' })
      : Platform.select({ ios: 'System', android: 'sans-serif', default: 'sans-serif' });

  const resolvedStyle: TextStyle = {
    fontSize: variantStyle.fontSize,
    lineHeight: variantStyle.lineHeight,
    fontWeight: variantStyle.fontWeight,
    fontFamily: variantStyle.fontFamily || fallbackFontFamily,
    color: textColor,
    textAlign: align,
    letterSpacing: 'letterSpacing' in variantStyle ? variantStyle.letterSpacing : undefined,
  };

  return (
    <Text
      allowFontScaling={allowFontScaling}
      style={[resolvedStyle, style]}
      {...rest}
    >
      {children}
    </Text>
  );
}
