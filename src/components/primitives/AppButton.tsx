import React from 'react';
import {
  Pressable,
  PressableProps,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
  View,
} from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { AppIcon, FeatherIconName } from './AppIcon';
import { radius, layout, spacing } from '@/theme/tokens';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon';

export interface AppButtonProps extends Omit<PressableProps, 'style' | 'children'> {
  title?: string;
  variant?: ButtonVariant;
  icon?: FeatherIconName;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: ViewStyle;
}

/**
 * Primitiva de botão do design system PoolSafe.
 *
 * Garante alvo de toque mínimo de 44x44 dp, altura entre 48 e 52 dp para ações
 * de texto, feedback ao pressionar, preservação de largura durante carregamento
 * e bloqueio contra toques duplicados durante estados de loading.
 */
export function AppButton({
  title,
  variant = 'primary',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
  onPress,
  ...rest
}: AppButtonProps) {
  const { colors, isDark } = useTheme();

  const isInteractive = !disabled && !loading;

  // Resolução de cores e estilos por variante
  let backgroundColor: string = 'transparent';
  let borderColor: string = 'transparent';
  let borderWidth = 0;
  let textColor: string = colors.textPrimary;
  let pressedBgColor: string | undefined;

  switch (variant) {
    case 'primary':
      backgroundColor = colors.primary;
      textColor = isDark ? '#041728' : '#FFFFFF';
      pressedBgColor = colors.primaryPressed;
      break;
    case 'secondary':
      backgroundColor = colors.surfaceRaised;
      borderColor = colors.border;
      borderWidth = 1;
      textColor = colors.textPrimary;
      pressedBgColor = colors.surface;
      break;
    case 'ghost':
      backgroundColor = 'transparent';
      textColor = colors.primary;
      pressedBgColor = colors.primarySoft;
      break;
    case 'danger':
      backgroundColor = colors.danger;
      textColor = '#FFFFFF';
      pressedBgColor = isDark ? '#D93256' : '#941B3D';
      break;
    case 'icon':
      backgroundColor = 'transparent';
      textColor = colors.textPrimary;
      pressedBgColor = colors.surfaceRaised;
      break;
  }

  if (disabled) {
    if (variant === 'primary' || variant === 'danger') {
      backgroundColor = colors.surfaceRaised;
      textColor = colors.textDisabled;
    } else if (variant === 'secondary') {
      borderColor = colors.borderSubtle;
      textColor = colors.textDisabled;
    } else {
      textColor = colors.textDisabled;
    }
  }

  const isIconButton = variant === 'icon' || (!title && !!icon);

  const containerStyle: ViewStyle = {
    backgroundColor,
    borderColor,
    borderWidth,
    borderRadius: isIconButton ? radius.full : radius.medium,
    minHeight: layout.touchTargetMin,
    minWidth: layout.touchTargetMin,
    height: isIconButton ? layout.touchTargetMin : layout.buttonHeight,
    paddingHorizontal: isIconButton ? 0 : spacing[5],
    alignSelf: fullWidth ? 'stretch' : 'auto',
    opacity: disabled ? 0.6 : 1,
  };

  const a11yLabel = accessibilityLabel || title || (icon ? `Ação ${icon}` : 'Botão');

  return (
    <Pressable
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={a11yLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{
        disabled: !isInteractive,
        busy: loading,
      }}
      disabled={!isInteractive}
      onPress={isInteractive ? onPress : undefined}
      style={({ pressed }) => [
        { alignSelf: fullWidth ? 'stretch' : 'auto' },
        style,
      ]}
      {...rest}
    >
      {({ pressed }) => (
        // collapsable={false}: o estilo pressionado (opacity/transform/background) alterna esta View
        // entre "achatada" (flattened) e não achatada. No Android/Fabric, se isso ocorrer no mesmo
        // frame em que a tela está sendo removida (ex.: botão Voltar), o Fabric re-parenta os filhos
        // enquanto react-native-screens mantém o pai antigo (startViewTransition) e ocorre o crash
        // "addViewAt: failed to insert view ... already has a parent". Ver react-native-screens#4677.
        <View
          collapsable={false}
          style={[
            styles.base,
            containerStyle,
            pressed && isInteractive && {
              backgroundColor: pressedBgColor || backgroundColor,
              opacity: 0.9,
              transform: [{ scale: 0.98 }],
            },
          ]}
        >
          {loading ? (
            <View collapsable={false} style={styles.loadingContainer}>
              <ActivityIndicator color={textColor} size="small" />
            </View>
          ) : (
            <View collapsable={false} style={styles.contentRow}>
              {icon && iconPosition === 'left' && (
                <View collapsable={false} style={title ? styles.iconLeft : undefined}>
                  <AppIcon name={icon} size={isIconButton ? 20 : 18} color={textColor} decorative={true} />
                </View>
              )}

              {title ? (
                <AppText
                  variant="bodyStrong"
                  color={textColor}
                  style={styles.text}
                  numberOfLines={1}
                >
                  {title}
                </AppText>
              ) : null}

              {icon && iconPosition === 'right' && (
                <View collapsable={false} style={title ? styles.iconRight : undefined}>
                  <AppIcon name={icon} size={isIconButton ? 20 : 18} color={textColor} decorative={true} />
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[4],
  },
  text: {
    textAlign: 'center',
  },
  iconLeft: {
    marginRight: spacing[2],
  },
  iconRight: {
    marginLeft: spacing[2],
  },
});
