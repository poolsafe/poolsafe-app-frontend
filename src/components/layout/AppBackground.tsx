import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/theme/useTheme';
import { gradients } from '@/theme/tokens';

export type SafeAreaEdge = 'top' | 'bottom' | 'left' | 'right';

export interface AppBackgroundProps {
  children?: React.ReactNode;
  /**
   * Define quais bordas receberão padding automático da safe area.
   * - Em telas com Bottom Navigation, use ['top', 'left', 'right'] para evitar espaçamento duplicado no rodapé.
   * - Em modais e telas de detalhe completas, use ['top', 'bottom', 'left', 'right'].
   */
  edges?: SafeAreaEdge[];
  style?: ViewStyle;
  contentStyle?: ViewStyle;
}

/**
 * Fundo aquático compartilhado do PoolSafe.
 *
 * Renderiza um gradiente vertical profundo atrás do conteúdo e controla
 * as safe areas de forma granular para evitar padding duplo com a Bottom Navigation.
 */
export function AppBackground({
  children,
  edges = ['top', 'bottom', 'left', 'right'],
  style,
  contentStyle,
}: AppBackgroundProps) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const gradientColors = isDark ? gradients.dark.background : gradients.light.background;

  const safePadding: ViewStyle = {
    paddingTop: edges.includes('top') ? insets.top : 0,
    paddingBottom: edges.includes('bottom') ? insets.bottom : 0,
    paddingLeft: edges.includes('left') ? insets.left : 0,
    paddingRight: edges.includes('right') ? insets.right : 0,
  };

  return (
    <View style={[styles.container, style]}>
      {/* Gradiente em camada de fundo */}
      <LinearGradient
        colors={[gradientColors[0], gradientColors[1]]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decoração aquática estática sutil (bolhas discretas em baixa opacidade) */}
      <View style={[StyleSheet.absoluteFill, styles.decorations]} pointerEvents="none">
        <View
          style={[
            styles.bubble,
            styles.bubbleTopRight,
            { backgroundColor: isDark ? 'rgba(0, 217, 232, 0.05)' : 'rgba(0, 123, 141, 0.04)' },
          ]}
        />
        <View
          style={[
            styles.bubble,
            styles.bubbleBottomLeft,
            { backgroundColor: isDark ? 'rgba(0, 217, 232, 0.03)' : 'rgba(0, 123, 141, 0.03)' },
          ]}
        />
      </View>

      {/* Conteúdo respeitando as bordas configuradas */}
      <View style={[styles.content, safePadding, contentStyle]}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  decorations: {
    // Sem overflow: 'hidden' para evitar criação de ReactClippingViewGroup no Fabric Android
  },
  content: {
    flex: 1,
  },
  bubble: {
    position: 'absolute',
    borderRadius: 999,
  },
  bubbleTopRight: {
    width: 220,
    height: 220,
    top: -40,
    right: -60,
  },
  bubbleBottomLeft: {
    width: 280,
    height: 280,
    bottom: 20,
    left: -80,
  },
});
