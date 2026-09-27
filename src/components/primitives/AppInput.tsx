import React, { useState, forwardRef } from 'react';
import {
  View,
  TextInput,
  TextInputProps,
  StyleSheet,
  Pressable,
  ViewStyle,
  Platform,
} from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { AppIcon, FeatherIconName } from './AppIcon';
import { radius, spacing, layout, fontFamilies } from '@/theme/tokens';

export interface AppInputProps extends TextInputProps {
  label: string;
  error?: string;
  helperText?: string;
  icon?: FeatherIconName;
  isPassword?: boolean;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Primitiva de campo de entrada do design system PoolSafe.
 *
 * Características:
 * - Label persistente (nunca substituído por placeholder)
 * - Altura mínima compatível com área de toque (layout.buttonHeight: 48dp)
 * - Bordas refinadas para foco, erro e repouso
 * - Ícone contextual opcional à esquerda
 * - Botão alternador de visibilidade de senha à direita
 * - Mensagens claras de apoio ou validação
 */
export const AppInput = forwardRef<TextInput, AppInputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      isPassword = false,
      disabled = false,
      containerStyle,
      onFocus,
      onBlur,
      testID,
      style,
      ...rest
    },
    ref,
  ) => {
    const { colors } = useTheme();
    const [isFocused, setIsFocused] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const inputRef = React.useRef<TextInput>(null);
    React.useImperativeHandle(ref, () => inputRef.current as TextInput);

    const hasError = !!error;

    // Resolução de cores de borda e fundo
    let borderColor = colors.border;
    if (hasError) {
      borderColor = colors.danger;
    } else if (isFocused) {
      borderColor = colors.primary;
    }

    const backgroundColor = colors.surfaceRaised;
    const textColor = disabled ? colors.textDisabled : colors.textPrimary;
    const placeholderColor = colors.textMuted;

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
      // No Android, a alternação de secureTextEntry reinicia a conexão nativa com o teclado (IME).
      // Re-focar o TextInput de forma assíncrona assegura que o teclado continue aberto e responsivo.
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    };

    return (
      <View style={[styles.wrapper, containerStyle]}>
        <AppText variant="smallStrong" colorRole="textPrimary" style={styles.label}>
          {label}
        </AppText>

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor,
              borderColor,
              opacity: disabled ? 0.6 : 1,
            },
          ]}
        >
          {icon && (
            <View style={styles.leftIcon}>
              <AppIcon
                name={icon}
                size={18}
                color={hasError ? colors.danger : isFocused ? colors.primary : colors.textMuted}
                decorative={true}
              />
            </View>
          )}

          <TextInput
            ref={inputRef}
            testID={testID}
            editable={!disabled}
            showSoftInputOnFocus={!disabled}
            placeholderTextColor={placeholderColor}
            secureTextEntry={isPassword && !showPassword}
            style={[
              styles.input,
              {
                color: textColor,
                fontFamily: fontFamilies.inter.regular,
              },
              style,
            ]}
            onFocus={(e) => {
              setIsFocused(true);
              onFocus?.(e);
            }}
            onBlur={(e) => {
              setIsFocused(false);
              onBlur?.(e);
            }}
            {...rest}
          />

          {isPassword && (
            <Pressable
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              accessibilityHint="Alterna a exibição em texto claro da sua senha"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              onPress={togglePasswordVisibility}
              style={styles.rightAction}
            >
              <AppIcon
                name={showPassword ? 'eye-off' : 'eye'}
                size={18}
                color={colors.textMuted}
                decorative={true}
              />
            </Pressable>
          )}
        </View>

        {hasError ? (
          <AppText variant="caption" colorRole="danger" style={styles.feedbackText}>
            {error}
          </AppText>
        ) : helperText ? (
          <AppText variant="caption" colorRole="textMuted" style={styles.feedbackText}>
            {helperText}
          </AppText>
        ) : null}
      </View>
    );
  },
);

AppInput.displayName = 'AppInput';

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing[2],
    width: '100%',
  },
  label: {
    marginBottom: spacing[2],
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: layout.buttonHeight,
    minHeight: layout.touchTargetMin,
    borderWidth: 1,
    borderRadius: radius.medium,
    paddingHorizontal: spacing[3],
  },
  leftIcon: {
    marginRight: spacing[2],
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 16,
    paddingVertical: 0,
    ...Platform.select({
      android: {
        textAlignVertical: 'center',
      },
    }),
  },
  rightAction: {
    padding: spacing[1],
    marginLeft: spacing[2],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: layout.touchTargetMin,
    minWidth: layout.touchTargetMin,
  },
  feedbackText: {
    marginTop: spacing[1],
    paddingHorizontal: 2,
  },
});
