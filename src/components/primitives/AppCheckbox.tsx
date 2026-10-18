import React from 'react';
import {
  Pressable,
  View,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { AppIcon } from './AppIcon';
import { AppBadge } from './AppBadge';
import { spacing, radius } from '@/theme/tokens';

export interface AppCheckboxProps {
  testID?: string;
  checked: boolean;
  onValueChange: (checked: boolean) => void;
  label: React.ReactNode;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'info' | 'success' | 'warning' | 'danger' | 'offline';
  error?: string;
  disabled?: boolean;
  containerStyle?: ViewStyle;
}

/**
 * Primitiva de caixa de seleção (Checkbox) do design system PoolSafe.
 *
 * Características:
 * - Área de toque acessível (mínimo 44x44);
 * - Feedback visual nos modos claro e escuro;
 * - Suporta rótulo textual ou nó JSX para inclusão de links;
 * - Distinção visual explícita com badge ("Obrigatório" vs "Opcional");
 * - collapsable={false} para estabilidade nativa no Android Fabric.
 */
export function AppCheckbox({
  testID,
  checked,
  onValueChange,
  label,
  subtitle,
  badgeText,
  badgeVariant = 'info',
  error,
  disabled = false,
  containerStyle,
}: AppCheckboxProps) {
  const { colors, isDark } = useTheme();

  return (
    <View collapsable={false} style={[styles.wrapper, containerStyle]}>
      <Pressable
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled }}
        disabled={disabled}
        onPress={() => onValueChange(!checked)}
        style={({ pressed }) => [
          styles.pressableContainer,
          pressed && !disabled && (isDark ? styles.pressedDark : styles.pressedLight),
          disabled && styles.disabled,
        ]}
      >
        <View
          collapsable={false}
          style={[
            styles.box,
            {
              borderColor: error
                ? colors.danger
                : checked
                  ? colors.primary
                  : isDark
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'rgba(0, 0, 0, 0.25)',
              backgroundColor: checked
                ? colors.primary
                : isDark
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'rgba(0, 0, 0, 0.02)',
            },
          ]}
        >
          {checked && (
            <AppIcon
              name="check"
              size={16}
              color={isDark ? '#001A24' : '#FFFFFF'}
              decorative={true}
            />
          )}
        </View>

        <View collapsable={false} style={styles.textContainer}>
          <View collapsable={false} style={styles.labelRow}>
            {typeof label === 'string' ? (
              <AppText variant="body" style={styles.label}>
                {label}
              </AppText>
            ) : (
              label
            )}
            {badgeText && (
              <AppBadge
                label={badgeText}
                variant={badgeVariant}
              />
            )}
          </View>

          {subtitle && (
            <AppText
              variant="caption"
              colorRole="textSecondary"
              style={styles.subtitle}
            >
              {subtitle}
            </AppText>
          )}
        </View>
      </Pressable>

      {error && (
        <AppText
          variant="caption"
          colorRole="danger"
          style={styles.errorText}
        >
          {error}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginVertical: spacing[1],
  },
  pressableContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 44,
    paddingVertical: spacing[2],
    borderRadius: radius.medium,
  },
  pressedLight: {
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
  },
  pressedDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  disabled: {
    opacity: 0.6,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: radius.small,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
    gap: spacing[1],
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  label: {
    flex: 1,
  },
  subtitle: {
    lineHeight: 18,
  },
  errorText: {
    marginLeft: 36,
    marginTop: 2,
  },
});
