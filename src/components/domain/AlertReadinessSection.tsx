/**
 * Seção de Prontidão dos Alertas para a tela de Definições.
 * 
 * Apresenta o diagnóstico do dispositivo (PRONTO, DEGRADADO ou DESATIVADO),
 * detalha as configurações adequadas e pendentes, permite solicitar permissões,
 * oferece atalhos para as configurações nativas do Android e botão para teste sonoro local.
 * 
 * Fatia 8A — Prontidão Android para alertas.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, StyleSheet, AppState, AppStateStatus } from 'react-native';

import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppButton } from '@/components/primitives/AppButton';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppIcon, FeatherIconName } from '@/components/primitives/AppIcon';
import { AppDivider } from '@/components/primitives/AppDivider';
import { spacing, radius } from '@/theme/tokens';
import { useTheme } from '@/theme/useTheme';
import {
  notificationsService,
  NotificationsService,
} from '@/services/notifications/notifications-service.ts';
import {
  AlertReadinessDiagnosis,
  AlertReadinessStatus,
  CheckItem,
  CheckItemStatus,
} from '@/services/notifications/types.ts';

export interface AlertReadinessSectionProps {
  service?: NotificationsService;
  onDiagnosisEvaluated?: (diagnosis: AlertReadinessDiagnosis) => void;
}

export function AlertReadinessSection({
  service = notificationsService,
  onDiagnosisEvaluated,
}: AlertReadinessSectionProps) {
  const { colors } = useTheme();

  const [diagnosis, setDiagnosis] = useState<AlertReadinessDiagnosis | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [isTestingAlert, setIsTestingAlert] = useState(false);
  const [isAlarmRunning, setIsAlarmRunning] = useState(false);
  const [testSuccessMessage, setTestSuccessMessage] = useState<string | null>(null);
  const [testErrorMessage, setTestErrorMessage] = useState<string | null>(null);
  const testNotificationIdRef = useRef<string | null>(null);

  const refreshDiagnosis = useCallback(async () => {
    try {
      const diag = await service.getDiagnosisAsync();
      setDiagnosis(diag);
      onDiagnosisEvaluated?.(diag);
    } catch {
      // Falhas são absorvidas pelo próprio service
    } finally {
      setIsLoading(false);
    }
  }, [service, onDiagnosisEvaluated]);

  // Carrega diagnóstico na montagem
  useEffect(() => {
    refreshDiagnosis();
  }, [refreshDiagnosis]);

  // Sincronização em tempo real do estado do alarme via listener nativo
  useEffect(() => {
    setIsAlarmRunning(service.isCriticalAlarmActive());

    const subscription = service.addCriticalAlarmListener((event) => {
      setIsAlarmRunning(event.isActive);
      if (!event.isActive) {
        if (testNotificationIdRef.current) {
          service.dismissNotificationAsync(testNotificationIdRef.current).catch(() => {});
          testNotificationIdRef.current = null;
        }
        if (event.reason === 'auto_timeout_30s' || event.reason === 'timeout_30s') {
          setTestSuccessMessage(
            'Teste de alarme crítico encerrado automaticamente após 30 segundos.',
          );
        } else if (event.reason === 'manual_or_notification_stop') {
          setTestSuccessMessage('Alarme crítico interrompido com sucesso.');
        }
      }
    });

    return () => {
      subscription.remove();
      if (testNotificationIdRef.current) {
        service.dismissNotificationAsync(testNotificationIdRef.current).catch(() => {});
      }
    };
  }, [service]);

  // Atualiza diagnóstico e estado do alarme quando o app volta do segundo plano ou desbloqueio
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        setIsAlarmRunning(service.isCriticalAlarmActive());
        refreshDiagnosis();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshDiagnosis, service]);

  // Ação de solicitar permissão com contexto
  const handleRequestPermission = async () => {
    setIsRequestingPermission(true);
    setTestSuccessMessage(null);
    setTestErrorMessage(null);
    try {
      await service.requestPermissionsAsync();
      await refreshDiagnosis();
    } catch {
      setTestErrorMessage('Não foi possível solicitar a permissão de notificações.');
    } finally {
      setIsRequestingPermission(false);
    }
  };

  // Ação de iniciar ou interromper o alarme crítico nativo
  const handleTestAlert = async () => {
    setIsTestingAlert(true);
    setTestSuccessMessage(null);
    setTestErrorMessage(null);
    try {
      if (isAlarmRunning) {
        await service.stopCriticalAlarmAsync();
        if (testNotificationIdRef.current) {
          await service.dismissNotificationAsync(testNotificationIdRef.current).catch(() => {});
          testNotificationIdRef.current = null;
        }
        setIsAlarmRunning(false);
        setTestSuccessMessage('Alarme crítico interrompido com sucesso.');
      } else {
        await service.startCriticalAlarmAsync();
        setIsAlarmRunning(true);

        try {
          const notifId = await service.sendTestNotificationAsync();
          testNotificationIdRef.current = notifId;
        } catch {
          // Ignora caso o disparo visual da notificação falhe
        }

        setTestSuccessMessage(
          'Alarme crítico nativo em andamento! Áudio no fluxo de alarme e vibração contínua ativos. Encerra em até 30s ou ao interromper.',
        );
      }
    } catch (err: unknown) {
      setTestErrorMessage(
        err instanceof Error
          ? err.message
          : 'Ocorreu uma falha ao controlar o alarme crítico.',
      );
    } finally {
      setIsTestingAlert(false);
    }
  };

  const getBadgeVariant = (
    status: AlertReadinessStatus,
  ): 'success' | 'warning' | 'danger' => {
    switch (status) {
      case 'PRONTO':
        return 'success';
      case 'DEGRADADO':
        return 'warning';
      case 'DESATIVADO':
      default:
        return 'danger';
    }
  };

  const getBadgeIcon = (status: AlertReadinessStatus): FeatherIconName => {
    switch (status) {
      case 'PRONTO':
        return 'check-circle';
      case 'DEGRADADO':
        return 'alert-triangle';
      case 'DESATIVADO':
      default:
        return 'x-circle';
    }
  };

  const getCheckIcon = (status: CheckItemStatus): FeatherIconName => {
    switch (status) {
      case 'ok':
        return 'check-circle';
      case 'warning':
        return 'alert-triangle';
      case 'error':
        return 'x-circle';
      case 'info':
      default:
        return 'info';
    }
  };

  const getCheckIconColor = (status: CheckItemStatus): string => {
    switch (status) {
      case 'ok':
        return colors.success;
      case 'warning':
        return colors.warning;
      case 'error':
        return colors.danger;
      case 'info':
      default:
        return colors.primary;
    }
  };

  const handleAction = async (actionType?: string) => {
    switch (actionType) {
      case 'request_permission':
        await handleRequestPermission();
        break;
      case 'app_settings':
        await service.openAppNotificationSettings();
        break;
      case 'channel_settings':
        await service.openChannelNotificationSettings();
        break;
      case 'dnd_settings':
        await service.openDndSettings();
        break;
      case 'battery_settings':
        await service.openBatteryOptimizationSettings();
        break;
    }
  };

  return (
    <AppCard variant="raised" style={styles.card}>
      {/* Cabeçalho da Seção */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <AppText variant="heading3" style={styles.title}>
            Prontidão dos Alertas
          </AppText>
          <AppText variant="small" colorRole="textSecondary">
            Verificação nativa do canal e som no Android
          </AppText>
        </View>

        {diagnosis && (
          <AppBadge
            testID="readiness-status-badge"
            label={diagnosis.status}
            variant={getBadgeVariant(diagnosis.status)}
            icon={getBadgeIcon(diagnosis.status)}
          />
        )}
      </View>

      <AppDivider marginVertical={spacing[3]} />

      {/* Banner / Resumo do Estado Atual */}
      {diagnosis && (
        <View style={styles.summaryContainer}>
          <AppBanner
            testID="readiness-summary-banner"
            variant={getBadgeVariant(diagnosis.status)}
            title={diagnosis.summary}
            message={diagnosis.detail}
            style={styles.summaryBanner}
          />
        </View>
      )}

      {/* Feedback de Teste */}
      {isAlarmRunning && (
        <AppBanner
          testID="active-alarm-banner"
          variant="danger"
          title="Alarme Crítico em Execução"
          message="Reproduzindo áudio pelo fluxo de alarmes e vibração nativa. O teste encerra em até 30s ou ao tocar em Interromper."
          style={styles.feedbackBanner}
        />
      )}

      {testSuccessMessage && (
        <AppBanner
          testID="test-alert-success-banner"
          variant="success"
          message={testSuccessMessage}
          style={styles.feedbackBanner}
        />
      )}

      {testErrorMessage && (
        <AppBanner
          testID="test-alert-error-banner"
          variant="danger"
          message={testErrorMessage}
          style={styles.feedbackBanner}
        />
      )}

      {/* Lista de Verificações de Prontidão */}
      <AppText variant="smallStrong" colorRole="primary" style={styles.checklistTitle}>
        Diagnóstico dos Requisitos
      </AppText>

      <View style={styles.checklist}>
        {diagnosis?.checks.map((check: CheckItem) => {
          const iconName = getCheckIcon(check.status);
          const iconColor = getCheckIconColor(check.status);

          return (
            <View
              key={check.id}
              testID={`check-item-${check.id}`}
              style={[
                styles.checkItem,
                { backgroundColor: colors.surface, borderColor: colors.borderSubtle },
              ]}
            >
              <View style={styles.checkIconWrapper}>
                <AppIcon name={iconName} size={18} color={iconColor} decorative={true} />
              </View>

              <View style={styles.checkContent}>
                <AppText variant="bodyStrong" style={styles.checkTitle}>
                  {check.title}
                </AppText>
                <AppText variant="small" colorRole="textSecondary" style={styles.checkDesc}>
                  {check.description}
                </AppText>

                {check.actionType && check.actionLabel && (
                  <View style={styles.checkActionRow}>
                    <AppButton
                      testID={`btn-action-${check.id}`}
                      variant="ghost"
                      title={check.actionLabel}
                      onPress={() => handleAction(check.actionType)}
                      style={styles.inlineButton}
                    />
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Ações e Acesso às Configurações Nativas */}
      <View style={styles.nativeActionsGroup}>
        {diagnosis?.status === 'DESATIVADO' &&
          diagnosis.rawPermission?.status !== 'denied' && (
            <AppButton
              testID="btn-request-permission"
              variant="primary"
              title="Ativar Notificações"
              icon="bell"
              loading={isRequestingPermission}
              fullWidth={true}
              onPress={handleRequestPermission}
            />
          )}

        <View style={styles.settingsButtonsRow}>
          <AppButton
            testID="btn-open-channel-settings"
            variant="secondary"
            title="Configurar Canal"
            icon="sliders"
            style={styles.halfButton}
            onPress={() => service.openChannelNotificationSettings()}
          />
          <AppButton
            testID="btn-open-dnd-settings"
            variant="secondary"
            title="Não Perturbe"
            icon="shield"
            style={styles.halfButton}
            onPress={() => service.openDndSettings()}
          />
        </View>

        {/* Botão Principal: Testar ou Interromper Alarme Crítico Nativo */}
        <AppButton
          testID="btn-test-alert"
          variant={isAlarmRunning ? 'danger' : diagnosis?.status === 'PRONTO' ? 'primary' : 'secondary'}
          title={isAlarmRunning ? 'Interromper alarme crítico' : 'Testar alarme crítico nativo'}
          icon={isAlarmRunning ? 'square' : 'volume-2'}
          loading={isTestingAlert}
          disabled={(!diagnosis?.canTest && !isAlarmRunning) || isLoading}
          fullWidth={true}
          onPress={handleTestAlert}
          style={styles.testAlertButton}
        />

        {!diagnosis?.canTest && !isAlarmRunning && (
          <AppText
            variant="small"
            colorRole="textSecondary"
            style={styles.disabledHelperText}
          >
            O teste sonoro está desabilitado porque as notificações ou o canal crítico
            estão bloqueados. Ative a permissão acima para liberar o teste.
          </AppText>
        )}
      </View>
    </AppCard>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing[4],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  titleContainer: {
    flex: 1,
    marginRight: spacing[2],
  },
  title: {
    marginBottom: 2,
  },
  summaryContainer: {
    marginBottom: spacing[2],
  },
  summaryBanner: {
    marginVertical: 0,
  },
  feedbackBanner: {
    marginBottom: spacing[3],
  },
  checklistTitle: {
    marginBottom: spacing[2],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  checklist: {
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing[3],
    borderRadius: radius.medium,
    borderWidth: 1,
  },
  checkIconWrapper: {
    marginRight: spacing[3],
    marginTop: 2,
  },
  checkContent: {
    flex: 1,
  },
  checkTitle: {
    marginBottom: 2,
  },
  checkDesc: {
    lineHeight: 18,
  },
  checkActionRow: {
    marginTop: spacing[2],
    alignItems: 'flex-start',
  },
  inlineButton: {
    minHeight: 32,
    height: 32,
    paddingHorizontal: spacing[2],
  },
  nativeActionsGroup: {
    gap: spacing[2],
  },
  settingsButtonsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  halfButton: {
    flex: 1,
  },
  testAlertButton: {
    marginTop: spacing[1],
  },
  disabledHelperText: {
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing[1],
  },
});
