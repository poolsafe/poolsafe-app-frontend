import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '@/theme/useTheme';
import { AppText } from './AppText';
import { AppIcon, FeatherIconName } from './AppIcon';
import { AppButton } from './AppButton';
import { layout, radius, spacing } from '@/theme/tokens';

export type BannerVariant = 'danger' | 'warning' | 'info' | 'success';

export interface AppBannerProps {
  title?: string;
  message: string;
  variant?: BannerVariant;
  icon?: FeatherIconName;
  actionTitle?: string;
  onAction?: () => void;
  actionLoading?: boolean;
  style?: ViewStyle;
  testID?: string;
}

/**
 * Primitiva de banner informativo e de contingência do PoolSafe.
 *
 * Exibe avisos persistentes, falhas de conectividade, erros gerais
 * e avisos com suporte a ação inline (ex: "Tentar novamente").
 */
export function AppBanner({
  title,
  message,
  variant = 'info',
  icon,
  actionTitle,
  onAction,
  actionLoading = false,
  style,
  testID,
}: AppBannerProps) {
  const { colors } = useTheme();

  let backgroundColor: string;
  let borderColor: string;
  let textColor: string;
  let defaultIcon: FeatherIconName;

  switch (variant) {
    case 'danger':
      backgroundColor = colors.dangerSoft;
      borderColor = colors.danger;
      textColor = colors.danger;
      defaultIcon = 'alert-triangle';
      break;
    case 'warning':
      backgroundColor = colors.warningSoft;
      borderColor = colors.warning;
      textColor = colors.warning;
      defaultIcon = 'alert-circle';
      break;
    case 'success':
      backgroundColor = colors.successSoft;
      borderColor = colors.success;
      textColor = colors.success;
      defaultIcon = 'check-circle';
      break;
    case 'info':
    default:
      backgroundColor = colors.primarySoft;
      borderColor = colors.primary;
      textColor = colors.primary;
      defaultIcon = 'info';
      break;
  }

  const resolvedIcon = icon || defaultIcon;

  return (
    <View
      testID={testID}
      accessible={true}
      accessibilityRole="alert"
      style={[
        styles.container,
        {
          backgroundColor,
          borderColor,
        },
        style,
      ]}
    >
      <View style={styles.contentRow}>
        <View style={styles.iconWrapper}>
          <AppIcon name={resolvedIcon} size={20} color={textColor} decorative={true} />
        </View>

        <View style={styles.textContainer}>
          {title ? (
            <AppText variant="smallStrong" color={textColor} style={styles.title}>
              {title}
            </AppText>
          ) : null}
          <AppText variant="small" colorRole="textPrimary" style={styles.message}>
            {message}
          </AppText>
        </View>
      </View>

      {actionTitle && onAction ? (
        <View style={styles.actionRow}>
          <AppButton
            variant="ghost"
            title={actionTitle}
            loading={actionLoading}
            onPress={onAction}
            style={styles.actionButton}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: radius.medium,
    padding: spacing[3],
    marginVertical: spacing[2],
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconWrapper: {
    marginRight: spacing[2],
    marginTop: 2,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    marginBottom: 2,
  },
  message: {
    lineHeight: 18,
  },
  actionRow: {
    marginTop: spacing[2],
    alignItems: 'flex-end',
  },
  actionButton: {
    minHeight: layout.touchTargetMin,
    paddingHorizontal: spacing[3],
  },
});
