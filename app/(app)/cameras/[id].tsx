import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppButton } from '@/components/primitives/AppButton';
import { AppIcon, FeatherIconName } from '@/components/primitives/AppIcon';
import { AppDivider } from '@/components/primitives/AppDivider';

import { useCameraDetailsQuery } from '@/hooks/useCameraDetailsQuery';
import { useTheme } from '@/theme/useTheme';
import { spacing, radius } from '@/theme/tokens';
import { formatFullDateTime } from '@/utils/date';
import type {
  CameraConnectionStatus,
  CameraCurrentMonitoring,
} from '@/services/api/types';

function getConnectionBadge(status: CameraConnectionStatus) {
  switch (status) {
    case 'ONLINE':
      return {
        variant: 'success' as const,
        label: 'ONLINE',
        icon: 'wifi' as FeatherIconName,
        description: 'Sinal recebido dentro da janela de 90 segundos.',
      };
    case 'OFFLINE':
      return {
        variant: 'danger' as const,
        label: 'OFFLINE',
        icon: 'wifi-off' as FeatherIconName,
        description: 'Sem sinal recente da câmera há mais de 90 segundos.',
      };
    case 'DESCONHECIDA':
    default:
      return {
        variant: 'offline' as const,
        label: 'DESCONHECIDA',
        icon: 'help-circle' as FeatherIconName,
        description: 'A câmera ainda não registrou comunicação inicial confirmada.',
      };
  }
}

function getMonitoringDetails(monitoring: CameraCurrentMonitoring | null) {
  if (!monitoring) {
    return {
      variant: 'offline' as const,
      label: 'SEM MONITORAMENTO',
      icon: 'slash' as FeatherIconName,
      title: 'Nenhuma sessão em andamento',
      description: 'Esta câmera não está associada a nenhuma sessão de monitoramento ativa ou pausada.',
    };
  }

  if (monitoring.status === 'PAUSADO') {
    return {
      variant: 'warning' as const,
      label: 'SESSÃO PAUSADA',
      icon: 'pause-circle' as FeatherIconName,
      title: 'Monitoramento Pausado',
      description: 'A vigilância automática desta sessão foi pausada temporariamente pelo usuário.',
    };
  }

  switch (monitoring.operationalStatus) {
    case 'ATIVO':
      return {
        variant: 'success' as const,
        label: 'EM VIGILÂNCIA',
        icon: 'shield' as FeatherIconName,
        title: 'Monitoramento Ativo e Operacional',
        description: 'Todas as câmeras da sessão estão conectadas e transmitindo dados normalmente.',
      };
    case 'DEGRADADO':
      return {
        variant: 'warning' as const,
        label: 'DEGRADADO',
        icon: 'alert-triangle' as FeatherIconName,
        title: 'Monitoramento Operando com Limitações',
        description: 'A sessão está ativa, mas uma ou mais câmeras vinculadas estão offline ou com sinal instável.',
      };
    case 'INDISPONIVEL':
    default:
      return {
        variant: 'offline' as const,
        label: 'INDISPONÍVEL',
        icon: 'alert-circle' as FeatherIconName,
        title: 'Monitoramento Indisponível',
        description: 'Nenhuma câmera da sessão está conectada ou transmitindo sinal no momento.',
      };
  }
}

function formatAlertTypeName(type: string): string {
  switch (type) {
    case 'POSSIVEL_RISCO':
      return 'Possível Risco de Afogamento';
    default:
      return type;
  }
}

export default function CameraDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const {
    data,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useCameraDetailsQuery(id ?? '');

  const connectionInfo = data ? getConnectionBadge(data.connectionStatus) : null;
  const monitoringInfo = data ? getMonitoringDetails(data.currentMonitoring) : null;
  const isInactive = data?.administrativeStatus === 'INATIVA';

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title={data?.name ?? 'Detalhes da Câmera'}
        subtitle={data?.location ?? (isPending ? 'Consultando...' : undefined)}
        showBack={true}
        onBack={() => router.back()}
        showThemeToggle={true}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isPending}
            onRefresh={() => refetch()}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* ESTADO 1: Carregamento */}
        {isPending && !data && (
          <AppCard variant="glass" style={styles.stateCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="bodyStrong" style={styles.stateTitle}>
              Consultando detalhes da câmera...
            </AppText>
            <AppText variant="small" colorRole="textMuted" style={styles.centeredText}>
              Verificando autorização, status de conexão e alertas recentes.
            </AppText>
          </AppCard>
        )}

        {/* ESTADO 2: Erro sem dados em cache */}
        {isError && !data && (
          <AppCard
            variant="default"
            style={[styles.stateCard, { borderColor: colors.danger }]}
          >
            <AppBadge variant="danger" label="NÃO VERIFICADO" icon="cloud-off" />
            <AppText variant="heading3" color={colors.danger} style={styles.stateTitle}>
              Não foi possível carregar os detalhes
            </AppText>
            <AppText variant="body" colorRole="textSecondary" style={styles.centeredText}>
              Falha ao consultar a câmera ou sua conta não possui autorização ativa para este dispositivo.
            </AppText>
            <View style={styles.actionsRow}>
              <AppButton
                variant="primary"
                title="Tentar novamente"
                icon="refresh-cw"
                loading={isFetching}
                onPress={() => refetch()}
              />
              <AppButton
                variant="secondary"
                title="Voltar para a lista"
                icon="arrow-left"
                onPress={() => router.back()}
              />
            </View>
          </AppCard>
        )}

        {/* ESTADO 3: Dados anteriores preservados, mas desatualizados */}
        {isError && !!data && (
          <AppBanner
            variant="warning"
            icon="alert-circle"
            title="Dados desatualizados"
            message="Não foi possível atualizar as informações da câmera. Os dados abaixo refletem a última consulta confirmada."
            actionTitle="Tentar novamente"
            onAction={() => refetch()}
            actionLoading={isFetching}
            style={styles.staleBanner}
          />
        )}

        {/* CONTEÚDO PRINCIPAL QUANDO HOUVER DADOS */}
        {!!data && connectionInfo && monitoringInfo && (
          <>
            {/* 1. Card de Identificação e Conectividade */}
            <AppCard variant="default" style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.headerTitleGroup}>
                  <AppText variant="heading2">{data.name}</AppText>
                  <View style={styles.locationRow}>
                    <AppIcon name="map-pin" size={14} color={colors.textMuted} />
                    <AppText
                      variant="small"
                      colorRole={data.location ? 'textSecondary' : 'textMuted'}
                    >
                      {data.location ?? 'Localização não informada'}
                    </AppText>
                  </View>
                </View>

                <View style={styles.badgesGroup}>
                  <AppBadge
                    variant={connectionInfo.variant}
                    label={connectionInfo.label}
                    icon={connectionInfo.icon}
                  />
                  {isInactive ? (
                    <AppBadge variant="offline" label="INATIVA" icon="slash" style={styles.extraBadge} />
                  ) : (
                    <AppBadge variant="info" label="ATIVA" style={styles.extraBadge} />
                  )}
                </View>
              </View>

              <AppDivider style={styles.divider} />

              <View style={styles.detailsList}>
                <View style={styles.infoRow}>
                  <AppIcon name="clock" size={16} color={colors.primary} />
                  <View style={styles.infoTexts}>
                    <AppText variant="caption" colorRole="textMuted">
                      Última comunicação registrada
                    </AppText>
                    <AppText variant="bodyStrong">
                      {formatFullDateTime(data.lastCommunicationAt)}
                    </AppText>
                    <AppText variant="small" colorRole="textMuted">
                      {connectionInfo.description}
                    </AppText>
                  </View>
                </View>

                <View style={styles.infoRow}>
                  <AppIcon name="shield" size={16} color={colors.primary} />
                  <View style={styles.infoTexts}>
                    <AppText variant="caption" colorRole="textMuted">
                      Situação administrativa
                    </AppText>
                    <AppText variant="bodyStrong">
                      {isInactive ? 'Câmera Inativa' : 'Câmera Ativa e Habilitada'}
                    </AppText>
                    <AppText variant="small" colorRole="textMuted">
                      {isInactive
                        ? 'O dispositivo foi desativado pela administração do sistema.'
                        : 'Dispositivo elegível para participação em sessões de monitoramento.'}
                    </AppText>
                  </View>
                </View>
              </View>
            </AppCard>

            {/* 2. Card de Monitoramento da Câmera (Simplificado) */}
            <AppCard variant="raised" style={styles.sectionCard}>
              <View style={styles.monitoringHeader}>
                <View style={styles.monitoringTitleRow}>
                  <AppIcon name="shield" size={20} color={colors.primary} />
                  <AppText variant="heading3">Monitoramento</AppText>
                </View>
                <AppBadge
                  variant={monitoringInfo.variant}
                  label={monitoringInfo.label}
                  icon={monitoringInfo.icon}
                />
              </View>

              {data.currentMonitoring ? (
                <View style={[styles.sessionBox, { backgroundColor: colors.surfaceRaised }]}>
                  <AppText variant="small" colorRole="textMuted">
                    Sessão associada:
                  </AppText>
                  <AppText variant="telemetry" color={colors.primary}>
                    #{data.currentMonitoring.id} ({data.currentMonitoring.status})
                  </AppText>
                </View>
              ) : (
                <View style={[styles.sessionBox, { backgroundColor: colors.surfaceRaised }]}>
                  <AppText variant="small" colorRole="textMuted">
                    Sessão associada:
                  </AppText>
                  <AppText variant="caption" colorRole="textMuted">
                    Nenhuma sessão em andamento
                  </AppText>
                </View>
              )}

              <AppDivider style={styles.divider} />

              <View style={styles.monitoringActionsContainer}>
                {data.currentMonitoring ? (
                  <AppButton
                    variant="secondary"
                    title="Gerenciar sessão"
                    icon="sliders"
                    fullWidth={true}
                    onPress={() => router.push('/monitoring')}
                  />
                ) : (
                  <AppButton
                    variant="primary"
                    title="Ativar monitoramento"
                    icon="play"
                    fullWidth={true}
                    onPress={() =>
                      router.push({
                        pathname: '/monitoring',
                        params: { selectedCameraId: data.id },
                      })
                    }
                  />
                )}
              </View>
            </AppCard>

            {/* 3. Seção de Alertas Recentes */}
            <AppCard variant="default" style={styles.sectionCard}>
              <View style={styles.alertsHeader}>
                <View style={styles.alertsTitleGroup}>
                  <AppIcon name="alert-triangle" size={20} color={colors.warning} />
                  <AppText variant="heading3">Alertas Recentes</AppText>
                </View>
                <AppBadge
                  variant={data.recentAlertsCount > 0 ? 'warning' : 'info'}
                  label={`${data.recentAlerts.length} ${
                    data.recentAlerts.length === 1 ? 'ALERTA' : 'ALERTAS'
                  }`}
                />
              </View>

              <AppText variant="small" colorRole="textMuted" style={styles.alertsSubtitle}>
                Alertas atribuídos a você nesta câmera nos últimos 30 dias (máximo de 30 exibidos).
              </AppText>

              <AppDivider style={styles.divider} />

              {data.recentAlerts.length === 0 ? (
                <View style={styles.emptyAlertsBox}>
                  <AppIcon name="check-circle" size={32} color={colors.success} decorative={true} />
                  <AppText variant="bodyStrong" style={styles.emptyAlertsTitle}>
                    Nenhum alerta recente
                  </AppText>
                  <AppText variant="small" colorRole="textMuted" style={styles.centeredText}>
                    Nenhum evento de risco registrado para você nesta câmera no período de retenção de 30 dias.
                  </AppText>
                </View>
              ) : (
                <View style={styles.alertsList}>
                  {data.recentAlerts.map((alert, index) => {
                    const isCritical = alert.severity === 'CRITICA';
                    return (
                      <TouchableOpacity
                        key={alert.id}
                        activeOpacity={0.7}
                        onPress={() => router.push(`/(app)/alerts/${alert.id}`)}
                        accessibilityRole="button"
                        accessibilityLabel={`Ver detalhes do alerta ${alert.id}: ${alert.severity}, ${formatAlertTypeName(alert.type)}`}
                      >
                        <View
                          style={[
                            styles.alertItem,
                            { backgroundColor: colors.surfaceRaised },
                            index < data.recentAlerts.length - 1 && styles.alertItemSpacing,
                          ]}
                        >
                          <View style={styles.alertItemHeader}>
                            <AppBadge
                              variant={isCritical ? 'danger' : 'warning'}
                              label={alert.severity}
                              icon={isCritical ? 'alert-octagon' : 'alert-triangle'}
                            />
                            <AppText variant="telemetry" colorRole="textMuted">
                              #{alert.id}
                            </AppText>
                          </View>

                          <AppText variant="bodyStrong" style={styles.alertTypeTitle}>
                            {formatAlertTypeName(alert.type)}
                          </AppText>

                          <View style={styles.alertMetaRow}>
                            <View style={styles.alertMetaItem}>
                              <AppIcon name="clock" size={13} color={colors.textMuted} />
                              <AppText variant="small" colorRole="textSecondary">
                                {formatFullDateTime(alert.detectedAt)}
                              </AppText>
                            </View>

                            <View style={styles.alertMetaItem}>
                              <AppBadge
                                variant={alert.evidenceAvailable ? 'info' : 'offline'}
                                label={alert.evidenceAvailable ? 'EVIDÊNCIA DISPONÍVEL' : 'SEM EVIDÊNCIA'}
                                icon="image"
                                style={styles.evidenceBadge}
                              />
                            </View>
                          </View>
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <View style={styles.noticeBox}>
                    <AppIcon name="info" size={14} color={colors.textMuted} decorative={true} />
                    <AppText variant="caption" colorRole="textMuted" style={styles.noticeText}>
                      A visualização completa de detalhes e evidência do alerta estará disponível na Fatia 7.
                    </AppText>
                  </View>
                </View>
              )}
            </AppCard>
          </>
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[12],
    gap: spacing[4],
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[5],
    gap: spacing[3],
    marginVertical: spacing[4],
  },
  stateTitle: {
    textAlign: 'center',
    marginTop: spacing[2],
  },
  centeredText: {
    textAlign: 'center',
  },
  actionsRow: {
    marginTop: spacing[3],
    gap: spacing[2],
    width: '100%',
  },
  staleBanner: {
    marginBottom: spacing[2],
  },
  sectionCard: {
    padding: spacing[4],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerTitleGroup: {
    flex: 1,
    marginRight: spacing[2],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: 4,
  },
  badgesGroup: {
    alignItems: 'flex-end',
    gap: 4,
  },
  extraBadge: {
    marginTop: 2,
  },
  divider: {
    marginVertical: spacing[3],
  },
  detailsList: {
    gap: spacing[3],
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing[3],
  },
  infoTexts: {
    flex: 1,
    gap: 2,
  },
  monitoringHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[2],
  },
  monitoringTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  monitoringStatusTitle: {
    marginTop: spacing[1],
    marginBottom: 4,
  },
  sessionBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.small,
    marginTop: spacing[3],
  },
  noticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginTop: spacing[1],
  },
  noticeText: {
    flex: 1,
  },
  alertsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  alertsTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  alertsSubtitle: {
    marginTop: 2,
  },
  emptyAlertsBox: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  emptyAlertsTitle: {
    marginTop: spacing[1],
  },
  alertsList: {
    gap: spacing[2],
  },
  alertItem: {
    padding: spacing[3],
    borderRadius: radius.medium,
    gap: spacing[2],
  },
  alertItemSpacing: {
    marginBottom: spacing[1],
  },
  alertItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertTypeTitle: {
    fontSize: 15,
  },
  alertMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing[2],
  },
  alertMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  evidenceBadge: {
    paddingVertical: 1,
    paddingHorizontal: 5,
  },
  monitoringActionsContainer: {
    marginTop: spacing[1],
  },
});
