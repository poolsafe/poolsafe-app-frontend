import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppButton } from '@/components/primitives/AppButton';
import { AppIcon, FeatherIconName } from '@/components/primitives/AppIcon';
import { AppDivider } from '@/components/primitives/AppDivider';

import { useCamerasQuery } from '@/hooks/useCamerasQuery';
import { useTheme } from '@/theme/useTheme';
import { spacing, radius } from '@/theme/tokens';
import { formatShortDateTime } from '@/utils/date';
import type {
  CameraItem,
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
      };
    case 'OFFLINE':
      return {
        variant: 'danger' as const,
        label: 'OFFLINE',
        icon: 'wifi-off' as FeatherIconName,
      };
    case 'DESCONHECIDA':
    default:
      return {
        variant: 'offline' as const,
        label: 'DESCONHECIDA',
        icon: 'help-circle' as FeatherIconName,
      };
  }
}

function getMonitoringBadge(monitoring: CameraCurrentMonitoring | null) {
  if (!monitoring) {
    return {
      variant: 'offline' as const,
      label: 'SEM SESSÃO',
      icon: 'slash' as FeatherIconName,
      text: 'Sem monitoramento ativo',
    };
  }

  if (monitoring.status === 'PAUSADO') {
    return {
      variant: 'warning' as const,
      label: 'PAUSADO',
      icon: 'pause-circle' as FeatherIconName,
      text: 'Monitoramento pausado',
    };
  }

  switch (monitoring.operationalStatus) {
    case 'ATIVO':
      return {
        variant: 'success' as const,
        label: 'EM VIGILÂNCIA',
        icon: 'shield' as FeatherIconName,
        text: 'Monitoramento ativo e operacional',
      };
    case 'DEGRADADO':
      return {
        variant: 'warning' as const,
        label: 'DEGRADADO',
        icon: 'alert-triangle' as FeatherIconName,
        text: 'Sessão ativa com limitações',
      };
    case 'INDISPONIVEL':
    default:
      return {
        variant: 'offline' as const,
        label: 'INDISPONÍVEL',
        icon: 'alert-circle' as FeatherIconName,
        text: 'Câmeras da sessão sem conexão',
      };
  }
}

export default function CamerasScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const {
    data,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useCamerasQuery();

  const cameras = data ?? [];

  // Contagem para resumo de conectividade
  const onlineCount = cameras.filter((c) => c.connectionStatus === 'ONLINE').length;
  const offlineCount = cameras.filter((c) => c.connectionStatus === 'OFFLINE').length;
  const unknownCount = cameras.filter((c) => c.connectionStatus === 'DESCONHECIDA').length;

  const handleOpenDetails = (cameraId: string) => {
    router.push({
      pathname: '/(app)/cameras/[id]',
      params: { id: cameraId },
    });
  };

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Câmeras"
        subtitle="Dispositivos autorizados"
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
        {/* ESTADO 1: Carregamento inicial (sem dados em cache) */}
        {isPending && !data && (
          <AppCard variant="glass" style={styles.stateCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="bodyStrong" style={styles.loadingTitle}>
              Consultando câmeras autorizadas...
            </AppText>
            <AppText variant="small" colorRole="textMuted" style={styles.centeredText}>
              Verificando dispositivos associados e status de conectividade.
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
            <AppText variant="heading3" color={colors.danger} style={styles.errorTitle}>
              Não foi possível carregar as câmeras
            </AppText>
            <AppText variant="body" colorRole="textSecondary" style={styles.centeredText}>
              Falha ao conectar com o servidor do PoolSafe. Por segurança, a ausência de resposta
              nunca é considerada como confirmação de que as câmeras estão online ou de que a
              piscina está segura.
            </AppText>
            <View style={styles.retryActionContainer}>
              <AppButton
                variant="primary"
                title="Tentar novamente"
                icon="refresh-cw"
                loading={isFetching}
                onPress={() => refetch()}
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
            message="Não foi possível atualizar o status das câmeras. As informações abaixo são as últimas confirmadas e podem não refletir o estado atual."
            actionTitle="Tentar novamente"
            onAction={() => refetch()}
            actionLoading={isFetching}
            style={styles.staleBanner}
          />
        )}

        {/* CONTEÚDO QUANDO OS DADOS ESTÃO DISPONÍVEIS */}
        {!!data && (
          <>
            {/* ESTADO 4: Nenhuma câmera associada */}
            {cameras.length === 0 ? (
              <AppCard variant="default" style={styles.emptyCard}>
                <View style={styles.emptyIconContainer}>
                  <AppIcon name="video-off" size={40} color={colors.textMuted} decorative={true} />
                </View>
                <AppText variant="heading3" style={styles.emptyTitle}>
                  Nenhuma câmera associada
                </AppText>
                <AppText variant="body" colorRole="textSecondary" style={styles.centeredText}>
                  Sua conta ainda não possui nenhuma câmera vinculada pela administração do sistema.
                </AppText>
                <AppText variant="small" colorRole="textMuted" style={[styles.centeredText, styles.emptyHint]}>
                  As câmeras são associadas administrativamente. Entre em contato com o suporte ou responsável pela instalação.
                </AppText>
              </AppCard>
            ) : (
              <>
                {/* 1. Card de Resumo de Conectividade */}
                <AppCard variant="raised" style={styles.summaryCard}>
                  <View style={styles.summaryHeader}>
                    <View style={styles.summaryTitleRow}>
                      <AppIcon name="activity" size={18} color={colors.primary} />
                      <AppText variant="heading3" style={styles.summaryTitleText}>
                        Conectividade
                      </AppText>
                    </View>
                    {isFetching ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <AppBadge
                        variant={offlineCount > 0 ? 'warning' : 'info'}
                        label={`${onlineCount}/${cameras.length} ONLINE`}
                      />
                    )}
                  </View>

                  <View style={styles.summaryChipsGrid}>
                    <View style={[styles.summaryChip, { backgroundColor: colors.surface }]}>
                      <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                      <View>
                        <AppText variant="heading3">{onlineCount}</AppText>
                        <AppText variant="caption" colorRole="textMuted">
                          Online
                        </AppText>
                      </View>
                    </View>

                    <View style={[styles.summaryChip, { backgroundColor: colors.surface }]}>
                      <View
                        style={[
                          styles.statusDot,
                          { backgroundColor: offlineCount > 0 ? colors.danger : colors.offline },
                        ]}
                      />
                      <View>
                        <AppText variant="heading3">{offlineCount}</AppText>
                        <AppText variant="caption" colorRole="textMuted">
                          Offline
                        </AppText>
                      </View>
                    </View>

                    <View style={[styles.summaryChip, { backgroundColor: colors.surface }]}>
                      <View style={[styles.statusDot, { backgroundColor: colors.offline }]} />
                      <View>
                        <AppText variant="heading3">{unknownCount}</AppText>
                        <AppText variant="caption" colorRole="textMuted">
                          Desconhecida
                        </AppText>
                      </View>
                    </View>
                  </View>
                </AppCard>

                {/* 2. Lista de Câmeras Autorizadas */}
                <View style={styles.sectionHeaderRow}>
                  <AppText variant="bodyStrong" colorRole="textSecondary">
                    CÂMERAS DISPONÍVEIS ({cameras.length})
                  </AppText>
                </View>

                <View style={styles.camerasList}>
                  {cameras.map((camera) => {
                    const connBadge = getConnectionBadge(camera.connectionStatus);
                    const monBadge = getMonitoringBadge(camera.currentMonitoring);
                    const isInactive = camera.administrativeStatus === 'INATIVA';

                    return (
                      <Pressable
                        key={camera.id}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`Câmera ${camera.name}, status ${connBadge.label}, ${camera.recentAlertsCount} alertas recentes. Toque para ver detalhes.`}
                        onPress={() => handleOpenDetails(camera.id)}
                        style={({ pressed }) => [
                          styles.cameraCardWrapper,
                          pressed && styles.cardPressed,
                        ]}
                      >
                        <AppCard
                          variant="default"
                          style={styles.cameraCard}
                        >
                        {/* Linha superior: Nome da câmera e Badge de Conexão */}
                        <View style={styles.cameraCardHeader}>
                          <View style={styles.cameraNameContainer}>
                            <AppText variant="heading3" numberOfLines={1}>
                              {camera.name}
                            </AppText>
                            <View style={styles.locationRow}>
                              <AppIcon name="map-pin" size={12} color={colors.textMuted} />
                              <AppText
                                variant="small"
                                colorRole={camera.location ? 'textSecondary' : 'textMuted'}
                                numberOfLines={1}
                                style={styles.locationText}
                              >
                                {camera.location ?? 'Localização não informada'}
                              </AppText>
                            </View>
                          </View>

                          <View style={styles.badgesColumn}>
                            <AppBadge
                              variant={connBadge.variant}
                              label={connBadge.label}
                              icon={connBadge.icon}
                            />
                            {isInactive && (
                              <AppBadge
                                variant="offline"
                                label="INATIVA"
                                icon="slash"
                                style={styles.inactiveBadge}
                              />
                            )}
                          </View>
                        </View>

                        <AppDivider style={styles.cardInnerDivider} />

                        {/* Informações operacionais */}
                        <View style={styles.cameraDetailsGrid}>
                          {/* Monitoramento */}
                          <View style={styles.detailRow}>
                            <AppIcon name={monBadge.icon} size={15} color={colors.textSecondary} />
                            <AppText variant="small" colorRole="textMuted" style={styles.detailLabel}>
                              Monitoramento:
                            </AppText>
                            <AppBadge
                              variant={monBadge.variant}
                              label={monBadge.label}
                              style={styles.inlineBadge}
                            />
                          </View>

                          {/* Última comunicação */}
                          <View style={styles.detailRow}>
                            <AppIcon name="clock" size={15} color={colors.textSecondary} />
                            <AppText variant="small" colorRole="textMuted" style={styles.detailLabel}>
                              Último sinal:
                            </AppText>
                            <AppText variant="small" colorRole="textSecondary">
                              {formatShortDateTime(camera.lastCommunicationAt)}
                            </AppText>
                          </View>

                          {/* Quantidade de alertas recentes */}
                          <View style={styles.detailRow}>
                            <AppIcon
                              name="alert-triangle"
                              size={15}
                              color={camera.recentAlertsCount > 0 ? colors.warning : colors.textMuted}
                            />
                            <AppText variant="small" colorRole="textMuted" style={styles.detailLabel}>
                              Alertas (30d):
                            </AppText>
                            <AppText
                              variant="small"
                              color={camera.recentAlertsCount > 0 ? colors.warning : colors.textSecondary}
                              style={styles.alertsCountText}
                            >
                              {camera.recentAlertsCount === 0
                                ? 'Nenhum alerta recente'
                                : `${camera.recentAlertsCount} ${
                                    camera.recentAlertsCount === 1 ? 'alerta' : 'alertas'
                                  }`}
                            </AppText>
                          </View>
                        </View>

                        {/* Rodapé do Card: Indicação clara de toque para detalhes */}
                        <View style={[styles.cardFooter, { backgroundColor: colors.surfaceRaised }]}>
                          <AppText variant="small" color={colors.primary} style={styles.footerText}>
                            Ver detalhes e alertas
                          </AppText>
                          <AppIcon name="chevron-right" size={16} color={colors.primary} />
                        </View>
                      </AppCard>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
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
},
  stateCard: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[5],
    gap: spacing[3],
    marginVertical: spacing[4],
  },
  loadingTitle: {
    marginTop: spacing[2],
  },
  errorTitle: {
    textAlign: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  retryActionContainer: {
    marginTop: spacing[3],
    width: '100%',
  },
  staleBanner: {
    marginBottom: spacing[4],
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: spacing[10],
    paddingHorizontal: spacing[5],
    gap: spacing[2],
    marginVertical: spacing[4],
  },
  emptyIconContainer: {
    marginBottom: spacing[2],
  },
  emptyTitle: {
    textAlign: 'center',
  },
  emptyHint: {
    marginTop: spacing[2],
  },
  summaryCard: {
    marginBottom: spacing[4],
    padding: spacing[4],
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  summaryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  summaryTitleText: {
    fontSize: 16,
  },
  summaryChipsGrid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  summaryChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.medium,
    gap: spacing[2],
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sectionHeaderRow: {
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  camerasList: {
    gap: spacing[3],
  },
  cameraCardWrapper: {},
  cardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  cameraCard: {
    padding: 0,
    overflow: 'hidden',
  },
  cameraCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: spacing[4],
    paddingHorizontal: spacing[4],
  },
  cameraNameContainer: {
    flex: 1,
    marginRight: spacing[2],
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: 4,
  },
  locationText: {
    flex: 1,
  },
  badgesColumn: {
    alignItems: 'flex-end',
    gap: 4,
  },
  inactiveBadge: {
    marginTop: 2,
  },
  cardInnerDivider: {
    marginVertical: spacing[3],
    marginHorizontal: spacing[4],
  },
  cameraDetailsGrid: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  detailLabel: {
    width: 100,
  },
  inlineBadge: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  alertsCountText: {
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2] + 2,
    paddingHorizontal: spacing[4],
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
  },
  footerText: {
    fontWeight: '600',
  },
});
