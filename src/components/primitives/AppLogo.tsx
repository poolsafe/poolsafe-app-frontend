import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  StyleProp,
  ImageStyle,
  ViewStyle,
} from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { logoTokens } from '@/theme/tokens';

export const LOGO_ASPECT_RATIO = logoTokens.aspectRatio;

const LOGO_DARK = require('../../../assets/poolsafe-logo-dark.png');
const LOGO_LIGHT = require('../../../assets/poolsafe-logo-light.png');

export interface AppLogoProps {
  /** Altura desejada para o logo (a largura é calculada automaticamente mantendo a proporção). */
  height?: number;
  /** Largura desejada para o logo (a altura é calculada automaticamente se height não for definida). */
  width?: number;
  /** Força um tema específico (light ou dark) independente do tema ativo no app. */
  theme?: 'light' | 'dark';
  /**
   * Compensa o espaçamento transparente original do arquivo PNG (5% nas laterais e ~8% vertical),
   * garantindo que o texto visível 'PoolSafe' fique perfeitamente alinhado à esquerda
   * com o subtítulo e elementos do cabeçalho. Padrão: true.
   */
  trimPadding?: boolean;
  /** Rótulo de acessibilidade para leitores de tela. Padrão: 'PoolSafe'. */
  accessibilityLabel?: string;
  /** Estilos diretos para o elemento de Imagem. */
  style?: StyleProp<ImageStyle>;
  /** Estilos para o container externo que engloba o logo. */
  containerStyle?: StyleProp<ViewStyle>;
}

/**
 * Logotipo estilizado da marca PoolSafe com suporte nativo a temas (Light / Dark)
 * e dimensionamento proporcional e responsivo entre diferentes resoluções e telas.
 */
export function AppLogo({
  height: customHeight,
  width: customWidth,
  theme: themeOverride,
  trimPadding = true,
  accessibilityLabel = 'PoolSafe',
  style,
  containerStyle,
}: AppLogoProps) {
  const { isDark } = useTheme();
  const { width: windowWidth } = useWindowDimensions();

  // Seleção automática do ativo conforme o tema
  const activeIsDark = themeOverride ? themeOverride === 'dark' : isDark;
  const logoSource = activeIsDark ? LOGO_DARK : LOGO_LIGHT;

  // Cálculo proporcional responsivo caso não seja especificado tamanho fixo
  let targetHeight: number;
  let targetWidth: number;

  if (customHeight && customWidth) {
    targetHeight = customHeight;
    targetWidth = customWidth;
  } else if (customHeight) {
    targetHeight = customHeight;
    targetWidth = Math.round(customHeight * LOGO_ASPECT_RATIO);
  } else if (customWidth) {
    targetWidth = customWidth;
    targetHeight = Math.round(customWidth / LOGO_ASPECT_RATIO);
  } else {
    // Escala padrão proporcional aos breakpoints de tela:
    // - Telas compactas (< 360dp, ex: pequenos Androids / iPhone SE 1ª ger): 28dp
    // - Telas regulares de smartphone (360dp - 767dp): 32dp (equivalente visual à escala de heading2)
    // - Telas maiores / tablets (>= 768dp): 36dp
    if (windowWidth < 360) {
      targetHeight = 28;
    } else if (windowWidth >= 768) {
      targetHeight = 36;
    } else {
      targetHeight = 32;
    }
    targetWidth = Math.round(targetHeight * LOGO_ASPECT_RATIO);
  }

  // Compensação das margens transparentes da imagem para alinhamento tipográfico óptico
  const trimLeftOffset = trimPadding ? -Math.round(targetWidth * 0.05) : 0;
  const trimVerticalOffset = trimPadding ? -Math.round(targetHeight * 0.08) : 0;

  return (
    <View
      style={[
        styles.container,
        trimPadding && {
          marginLeft: trimLeftOffset,
          marginVertical: trimVerticalOffset,
        },
        containerStyle,
      ]}
    >
      <Image
        source={logoSource}
        accessible={true}
        accessibilityRole="image"
        accessibilityLabel={accessibilityLabel}
        resizeMode="contain"
        style={[
          {
            width: targetWidth,
            height: targetHeight,
            aspectRatio: LOGO_ASPECT_RATIO,
          },
          style,
        ]}
      />
    </View>
  );
}

export const BrandLogo = AppLogo;

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
});
