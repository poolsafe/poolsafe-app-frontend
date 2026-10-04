import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { AppIcon, FeatherIconName } from './AppIcon';
import { radius, spacing } from '@/theme/tokens';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'offline';

export interface AppBadgeProps {
  label: string;
  variant?: BadgeVariant;
  icon?: FeatherIconName;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Primitiva de badge compacto do PoolSafe.
 *
 * Utiliza tipografia monoespaçada (telemetry), fundos suaves (Soft) e
 * texto com alto contraste para identificadores e metadados de status.
 */
export function AppBadge({
  label,
  variant = 'info',
  icon,
  style,
  testID,
}: AppBadgeProps) {
  const { colors } = useTheme();

  let backgroundColor: string;
  let textColor: string;
  let borderColor: string;

  switch (variant) {
    case 'success':
      backgroundColor = colors.successSoft;
      textColor = colors.success;
      borderColor = colors.success;
      break;
    case 'warning':
      backgroundColor = colors.warningSoft;
      textColor = colors.warning;
      borderColor = colors.warning;
      break;
    case 'danger':
      backgroundColor = colors.dangerSoft;
      textColor = colors.danger;
      borderColor = colors.danger;
      break;
    case 'offline':
      backgroundColor = colors.surfaceRaised;
      textColor = colors.offline;
      borderColor = colors.borderSubtle;
      break;
    case 'info':
    default:
      backgroundColor = colors.primarySoft;
      textColor = colors.primary;
      borderColor = colors.primary;
      break;
  }

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`Status: ${label}`}
      style={[
        styles.badge,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      {icon && (
        <View style={styles.iconContainer}>
          <AppIcon name={icon} size={14} color={textColor} decorative={true} />
        </View>
      )}
      <AppText variant="telemetry" color={textColor} style={styles.label}>
        {label.toUpperCase()}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[1],
    borderRadius: radius.small,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  iconContainer: {
    marginRight: spacing[1],
  },
  label: {
    lineHeight: 14,
  },
});
