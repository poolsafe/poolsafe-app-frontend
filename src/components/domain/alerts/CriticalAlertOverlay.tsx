import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useTheme } from '@/theme/useTheme';
import { AppText } from '@/components/primitives/AppText';
import { AppButton } from '@/components/primitives/AppButton';
import { AppCard } from '@/components/primitives/AppCard';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppIcon } from '@/components/primitives/AppIcon';
import { AppDivider } from '@/components/primitives/AppDivider';
import { spacing, radius } from '@/theme/tokens';
import { formatFullDateTime } from '@/utils/date';
import {
  alertNavigationCoordinator,
  type ActiveAlarmState,
} from '@/services/navigation/alert-navigation-coordinator';
import { useAlertDetailQuery } from '@/hooks/useAlertDetailQuery';

/**
 * Overlay de Tela Crítica sobreposto à navegação (Task 9B.5).
 *
 * Características:
 * - Apresenta-se acima de toda a navegação normal enquanto o alarme sonoro estiver ativo;
 * - Ação clara e prioritária para silenciar o alarme imediatamente;
 * - Autorização estrita pela API antes de exibir dados do alerta:
 *   enquanto a consulta estiver pendente ou falhar (ex: sem rede ou sem autorização),
 *   mantém apresentação genérica com possibilidade de silenciar sem expor piscina/câmera;
 * - Respeita regras Android/Fabric (collapsable={false} em nós dinâmicos);
 * - Acompanha dinamicamente substituição por novos alertas (A -> B);
 * - Encaminha aos Detalhes ao encerrar o alarme.
 */
export function CriticalAlertOverlay() {
  const { colors } = useTheme();
  const router = useRouter();

  const [alarmState, setAlarmState] = useState<ActiveAlarmState>(() =>
    alertNavigationCoordinator.getActiveAlarmState(),
  );
  const [isSilencing, setIsSilencing] = useState(false);

  // Escuta alterações do alarme ativo via coordenador central
  useEffect(() => {
    const unsubscribe = alertNavigationCoordinator.subscribeAlarmState((nextState) => {
      setAlarmState(nextState);
      if (!nextState.isActive) {
        setIsSilencing(false);
      }
    });
    return unsubscribe;
  }, []);

  const activeAlertId = alarmState.alertId || '';

  // Consulta autorizada à API via TanStack Query
  const {
    data: alertData,
    isLoading: isAlertLoading,
    isError: isAlertError,
  } = useAlertDetailQuery(activeAlertId);

  // Interrupção manual do alarme pelo botão da UI
  const handleSilenceAlarm = useCallback(async () => {
    setIsSilencing(true);
    try {
      await alertNavigationCoordinator.stopCurrentAlarmAsync();
    } catch {
      setIsSilencing(false);
    }
  }, []);

  // Transição direta para os detalhes silenciando o alarme
  const handleViewDetails = useCallback(async () => {
    setIsSilencing(true);
    try {
      await alertNavigationCoordinator.stopCurrentAlarmAsync();
      if (activeAlertId) {
        router.push(`/(app)/alerts/${activeAlertId}` as any);
      }
    } catch {
      setIsSilencing(false);
    }
  }, [activeAlertId, router]);

  if (!alarmState.isActive) {
    return null;
  }

  // Verifica se temos dados autorizados pela API para exibição
  const isAuthorized = !isAlertLoading && !isAlertError && !!alertData;

  return (
    <Modal
      visible={alarmState.isActive}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={handleSilenceAlarm}
    >
      <View style={styles.backdrop} collapsable={false}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.modalContent} collapsable={false}>
            {/* Header crítico pulsante com alerta de segurança */}
            <AppCard
              variant="default"
              style={[
                styles.mainCard,
                {
                  borderColor: colors.danger,
                  backgroundColor: colors.surfaceRaised,
                },
              ]}
            >
              <View style={styles.headerRow} collapsable={false}>
                <View style={styles.pulseIconContainer} collapsable={false}>
                  <AppIcon name="alert-octagon" size={32} color={colors.danger} decorative={true} />
                </View>
                <View style={styles.badgeGroup} collapsable={false}>
                  <AppBadge
                    variant="danger"
                    label="ALARME ATIVO NO DISPOSITIVO"
                    icon="volume-2"
                  />
                  {activeAlertId ? (
                    <AppText variant="telemetry" colorRole="textMuted">
                      #{activeAlertId}
                    </AppText>
                  ) : null}
                </View>
              </View>

              <AppText variant="heading1" style={styles.title}>
                Possível situação de risco
              </AppText>

              <AppDivider style={styles.divider} />

              {/* CONTEÚDO 1: Apresentação Genérica (enquanto autorização pendente, falha de rede ou sem acesso) */}
              {!isAuthorized ? (
                <View style={styles.genericSection} collapsable={false}>
                  <View style={styles.loadingRow} collapsable={false}>
                    {isAlertLoading ? (
                      <>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <AppText variant="small" colorRole="textMuted">
                          Validando autorização de acesso ao evento...
                        </AppText>
                      </>
                    ) : (
                      <AppText variant="small" colorRole="textSecondary">
                        Alarme em execução no aparelho. Toque abaixo para silenciar o áudio e a vibração.
                      </AppText>
                    )}
                  </View>
                  <AppText variant="caption" colorRole="textMuted" style={styles.disclaimerText}>
                    O PoolSafe apoia a prevenção de acidentes na piscina. Mantenha a supervisão presencial.
                  </AppText>
                </View>
              ) : (
                /* CONTEÚDO 2: Apresentação Autorizada (confirmada pela API) */
                <View style={styles.authorizedSection} collapsable={false}>
                  <View style={styles.infoRow} collapsable={false}>
                    <AppIcon name="video" size={18} color={colors.primary} decorative={true} />
                    <View style={styles.infoTextContainer} collapsable={false}>
                      <AppText variant="caption" colorRole="textMuted">
                        Câmera de detecção
                      </AppText>
                      <AppText variant="bodyStrong">
                        {alertData.camera.name}
                      </AppText>
                      {alertData.camera.location ? (
                        <AppText variant="small" colorRole="textSecondary">
                          {alertData.camera.location}
                        </AppText>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.infoRow} collapsable={false}>
                    <AppIcon name="clock" size={18} color={colors.primary} decorative={true} />
                    <View style={styles.infoTextContainer} collapsable={false}>
                      <AppText variant="caption" colorRole="textMuted">
                        Horário da detecção
                      </AppText>
                      <AppText variant="bodyStrong">
                        {formatFullDateTime(alertData.detectedAt)}
                      </AppText>
                    </View>
                  </View>

                  {alertData.evidence.available ? (
                    <View style={styles.evidenceHintRow} collapsable={false}>
                      <AppIcon name="image" size={16} color={colors.primary} decorative={true} />
                      <AppText variant="small" colorRole="textSecondary">
                        Registro fotográfico disponível no detalhe
                      </AppText>
                    </View>
                  ) : null}
                </View>
              )}

              {/* Ações Rápidas: Silenciar Alarme prioritário */}
              <View style={styles.actionsContainer} collapsable={false}>
                <AppButton
                  variant="danger"
                  title={isSilencing ? 'Silenciando...' : 'SILENCIAR ALARME'}
                  icon="volume-x"
                  fullWidth={true}
                  loading={isSilencing}
                  onPress={handleSilenceAlarm}
                />

                {isAuthorized ? (
                  <AppButton
                    variant="secondary"
                    title="Ver Detalhes do Alerta"
                    icon="arrow-right"
                    fullWidth={true}
                    disabled={isSilencing}
                    onPress={handleViewDetails}
                  />
                ) : null}
              </View>
            </AppCard>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(5, 15, 25, 0.88)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  safeArea: {
    width: '100%',
    maxWidth: 480,
  },
  modalContent: {
    width: '100%',
  },
  mainCard: {
    borderWidth: 2,
    padding: spacing[5],
    borderRadius: radius.xlarge,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  pulseIconContainer: {
    padding: spacing[2],
    borderRadius: radius.full,
    backgroundColor: 'rgba(255, 23, 68, 0.15)',
  },
  badgeGroup: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  title: {
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  divider: {
    marginVertical: spacing[3],
  },
  genericSection: {
    marginVertical: spacing[2],
    gap: spacing[2],
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    minHeight: 44,
  },
  disclaimerText: {
    fontStyle: 'italic',
  },
  authorizedSection: {
    marginVertical: spacing[2],
    gap: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  infoTextContainer: {
    flex: 1,
  },
  evidenceHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingTop: spacing[1],
  },
  actionsContainer: {
    marginTop: spacing[5],
    gap: spacing[3],
  },
});
