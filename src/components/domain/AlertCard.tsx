import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';

import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppIcon } from '@/components/primitives/AppIcon';
import { useTheme } from '@/theme/useTheme';
import { spacing, radius } from '@/theme/tokens';
import type { AlertSummaryItem, CameraRecentAlert } from '@/services/api/types';

export interface AlertCardProps {
  alert: AlertSummaryItem | CameraRecentAlert;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}

function formatAlertDate(isoString?: string): string {
  if (!isoString) return '--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month} às ${hours}:${minutes}`;
  } catch {
    return isoString;
  }
}

export function AlertCard({ alert, onPress, style }: AlertCardProps) {
  const { colors } = useTheme();
  const isCritical = alert.severity === 'CRITICA';

  const cameraName = alert.camera.name;
  const cameraLocation = alert.camera.location;

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole="button"
      accessibilityLabel={`Alerta número ${alert.id}, Possível situação de risco, severidade ${alert.severity}, detectado na câmera ${cameraName}, em ${formatAlertDate(alert.detectedAt)}`}
      style={style}
    >
      <AppCard
        variant="default"
        style={[
          styles.card,
          {
            borderColor: isCritical ? colors.danger : colors.warning,
            backgroundColor: colors.surface,
          },
        ]}
      >
        {/* Cabeçalho do Card: Severidade, Badge de Evidência e ID */}
        <View style={styles.headerRow}>
          <View style={styles.badgeGroup}>
            <AppBadge
              variant={isCritical ? 'danger' : 'warning'}
              label={alert.severity}
              icon={isCritical ? 'alert-octagon' : 'alert-triangle'}
            />
            {alert.evidenceAvailable && (
              <AppBadge
                variant="info"
                label="EVIDÊNCIA"
                icon="image"
                style={styles.evidenceBadge}
              />
            )}
          </View>

          <AppText variant="telemetry" colorRole="textMuted">
            #{alert.id}
          </AppText>
        </View>

        {/* Título Responsável: Nunca afirma afogamento automaticamente */}
        <AppText variant="heading3" style={styles.title}>
          Possível situação de risco
        </AppText>

        {/* Informações da Câmera e Localização */}
        <View style={styles.cameraRow}>
          <AppIcon name="video" size={14} color={colors.textSecondary} decorative={true} />
          <AppText variant="small" colorRole="textSecondary" style={styles.cameraText} numberOfLines={1}>
            {cameraName}
            {cameraLocation ? ` • ${cameraLocation}` : ''}
          </AppText>
        </View>

        {/* Rodapé: Horário e Affordance de Navegação */}
        <View style={styles.footerRow}>
          <View style={styles.dateGroup}>
            <AppIcon name="clock" size={13} color={colors.textMuted} decorative={true} />
            <AppText variant="caption" colorRole="textMuted" style={styles.dateText}>
              {formatAlertDate(alert.detectedAt)}
            </AppText>
          </View>

          {onPress && (
            <View style={styles.navAction}>
              <AppText variant="caption" color={colors.primary} style={styles.navLabel}>
                Ver detalhes
              </AppText>
              <AppIcon name="chevron-right" size={14} color={colors.primary} decorative={true} />
            </View>
          )}
        </View>
      </AppCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
    borderWidth: 1,
    borderRadius: radius.large,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  evidenceBadge: {
    marginLeft: 2,
  },
  title: {
    marginBottom: spacing[1],
  },
  cameraRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginBottom: spacing[3],
  },
  cameraText: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: 'rgba(120, 167, 181, 0.15)',
    paddingTop: spacing[2],
  },
  dateGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
  },
  dateText: {
    marginTop: 1,
  },
  navAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  navLabel: {
    fontWeight: '600',
  },
});
