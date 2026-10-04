import React from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppLogo } from '@/components/primitives/AppLogo';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppButton } from '@/components/primitives/AppButton';
import { AppIcon, FeatherIconName } from '@/components/primitives/AppIcon';
import { AppDivider } from '@/components/primitives/AppDivider';

import { useRouter } from 'expo-router';

import { useAuth } from '@/providers/AuthContext';
import { useHomeQuery } from '@/hooks/useHomeQuery';
import { useTheme } from '@/theme/useTheme';
import { spacing, radius } from '@/theme/tokens';
import type { ColorTokens } from '@/theme/colors';
import type {
  OverallMonitoringStatus,
  OverallMonitoringReason,
  HomeWarning,
} from '@/services/api/types';
import { resolveWarningInfo, getUniqueWarnings } from '@/utils/home-warnings';

function formatTimestamp(isoString?: string): string {
  if (!isoString) return '--:--:--';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  } catch {
    return isoString;
  }
}

function formatFullDateTime(isoString?: string): string {
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

function getMonitoringDisplay(
  status: OverallMonitoringStatus,
  reason: OverallMonitoringReason,
  colors: ColorTokens,
  pausedSessions: number = 0,
) {
  if (status === 'DEGRADADO' && reason === 'SESSIONS_MIXED') {
    return {
      badgeVariant: 'warning' as const,
      badgeLabel: 'PARCIAL',
      title: 'Proteção parcial',
      description:
        pausedSessions === 1
          ? 'Vigilância ativa com 1 sessão pausada.'
          : `Vigilância ativa com ${pausedSessions} sessões pausadas.`,
      icon: 'activity' as FeatherIconName,
      borderColor: colors.warning,
    };
  }

  switch (status) {
    case 'ATIVO':
      return {
        badgeVariant: 'success' as const,
        badgeLabel: 'ATIVO',
        title: 'Monitoramento Ativo',
        description: 'Todas as câmeras online e em vigilância contínua.',
        icon: 'shield' as FeatherIconName,
        borderColor: colors.success,
      };
    case 'PAUSADO':
      return {
        badgeVariant: 'warning' as const,
        badgeLabel: 'PAUSADO',
        title: 'Monitoramento Pausado',
        description: 'A vigilância automática foi pausada pelo usuário.',
        icon: 'pause-circle' as FeatherIconName,
        borderColor: colors.warning,
      };
    case 'DEGRADADO':
      return {
        badgeVariant: 'warning' as const,
        badgeLabel: 'DEGRADADO',
        title: 'Monitoramento Degradado',
        description:
          reason === 'CAMERAS_INDISPONIVEIS'
            ? 'Uma ou mais câmeras da sessão estão offline ou indisponíveis.'
            : 'O sistema está operando com limitações de captura.',
        icon: 'alert-triangle' as FeatherIconName,
        borderColor: colors.warning,
      };
    case 'INDISPONIVEL':
    default:
      return {
        badgeVariant: 'offline' as const,
        badgeLabel: 'INDISPONÍVEL',
        title: 'Monitoramento Indisponível',
        description:
          reason === 'SEM_CAMERA_ONLINE'
            ? 'Nenhuma câmera da sessão está conectada ou transmitindo sinal.'
            : 'Nenhuma sessão de monitoramento em andamento.',
        icon: 'alert-circle' as FeatherIconName,
        borderColor: colors.border,
      };
  }
}


export default function HomeScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();
  const {
    data,
    isPending,
    isError,
    isFetching,
    refetch,
  } = useHomeQuery();

  const userFirstName = user?.name ? user.name.trim().split(' ')[0] : null;
  const greeting = userFirstName ? `Olá, ${userFirstName}` : 'Painel de monitoramento';

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        title={<AppLogo />}
        subtitle={greeting}
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
              Consultando monitoramento...
            </AppText>
            <AppText variant="small" colorRole="textMuted" style={styles.centeredText}>
              Verificando status das câmeras e sessões operacionais.
            </AppText>
          </AppCard>
        )}

        {/* ESTADO 2: Erro de comunicação sem dados anteriores */}
        {isError && !data && (
          <AppCard
            variant="default"
            style={[styles.stateCard, { borderColor: colors.danger }]}
          >
            <AppBadge variant="danger" label="NÃO VERIFICADO" icon="cloud-off" />
            <AppText variant="heading3" color={colors.danger} style={styles.errorTitle}>
              Não foi possível verificar o monitoramento
            </AppText>
            <AppText variant="body" colorRole="textSecondary" style={styles.centeredText}>
              Falha ao conectar com o servidor do PoolSafe. Por segurança, a ausência de
              resposta nunca é considerada como situação normal ou segura.
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

        {/* ESTADO 3: Dados em cache desatualizados após falha de atualização recente */}
        {isError && !!data && (
          <AppBanner
            variant="warning"
            icon="alert-circle"
            title="Dados desatualizados"
            message="Não foi possível verificar o monitoramento. As informações abaixo são as últimas confirmadas e podem não refletir o estado atual."
            actionTitle="Tentar novamente"
            onAction={() => refetch()}
            actionLoading={isFetching}
            style={styles.staleBanner}
          />
        )}

        {/* CONTEÚDO PRINCIPAL (quando dados estiverem disponíveis) */}
        {!!data && (
          <>
            {/* 1. Card Hero: Estado Principal do Monitoramento */}
            {(() => {
              const display = getMonitoringDisplay(
                data.overallMonitoring.status,
                data.overallMonitoring.reason,
                colors,
                data.overallMonitoring.pausedSessions,
              );
              return (
                <AppCard
                  variant="default"
                  style={[styles.heroCard, { borderColor: display.borderColor }]}
                >
                  <View style={styles.cardHeaderRow}>
                    <AppBadge
                      variant={display.badgeVariant}
                      label={display.badgeLabel}
                      icon={display.icon}
                    />
                    {isFetching ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <AppText variant="telemetry" colorRole="textMuted">
                        {formatTimestamp(data.generatedAt)}
                      </AppText>
                    )}
                  </View>

                  <AppText variant="heading2" style={styles.heroTitle}>
                    {display.title}
                  </AppText>
                  <AppText variant="body" colorRole="textSecondary">
                    {display.description}
                  </AppText>

                  <AppDivider style={styles.cardDivider} />

                  <View style={styles.sessionMetricsRow}>
                    <View style={styles.metricItem}>
                      <AppText variant="caption" colorRole="textMuted">
                        Sessões ativas
                      </AppText>
                      <AppText variant="bodyStrong">
                        {data.overallMonitoring.activeSessions} de{' '}
                        {data.overallMonitoring.currentSessions}
                      </AppText>
                    </View>
                    {data.overallMonitoring.pausedSessions > 0 && (
                      <View style={styles.metricItem}>
                        <AppText variant="caption" colorRole="textMuted">
                          Pausadas
                        </AppText>
                        <AppText variant="bodyStrong" color={colors.warning}>
                          {data.overallMonitoring.pausedSessions}
                        </AppText>
                      </View>
                    )}
                    {data.overallMonitoring.degradedSessions > 0 && (
                      <View style={styles.metricItem}>
                        <AppText variant="caption" colorRole="textMuted">
                          Degradadas
                        </AppText>
                        <AppText variant="bodyStrong" color={colors.warning}>
                          {data.overallMonitoring.degradedSessions}
                        </AppText>
                      </View>
                    )}
                  </View>

                  <AppDivider style={styles.cardDivider} />

                  <View style={styles.heroActionContainer}>
                    {data.overallMonitoring.currentSessions === 0 ? (
                      <AppButton
                        variant="primary"
                        title="Ativar monitoramento"
                        icon="play"
                        onPress={() => router.push('/monitoring')}
                      />
                    ) : (
                      <AppButton
                        variant="secondary"
                        title="Gerenciar monitoramento"
                        icon="sliders"
                        onPress={() => router.push('/monitoring')}
                      />
                    )}
                  </View>
                </AppCard>
              );
            })()}

            {/* 2. Resumo das Câmeras */}
            <AppCard variant="raised" style={styles.sectionCard}>
              <View style={styles.cardHeaderRow}>
                <View style={styles.sectionHeaderTitle}>
                  <AppIcon name="video" size={18} color={colors.primary} />
                  <AppText variant="heading3" style={styles.headerTitleText}>
                    Resumo das Câmeras
                  </AppText>
                </View>
                <AppBadge
                  variant={data.cameras.offline > 0 ? 'warning' : 'info'}
                  label={`${data.cameras.online}/${data.cameras.total} ONLINE`}
                />
              </View>

              <View style={styles.camerasGrid}>
                <View style={[styles.cameraChip, { backgroundColor: colors.surface }]}>
                  <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
                  <View>
                    <AppText variant="heading3">{data.cameras.online}</AppText>
                    <AppText variant="caption" colorRole="textMuted">
                      Online
                    </AppText>
                  </View>
                </View>

                <View style={[styles.cameraChip, { backgroundColor: colors.surface }]}>
                  <View
                    style={[
                      styles.statusDot,
                      {
                        backgroundColor:
                          data.cameras.offline > 0 ? colors.danger : colors.offline,
                      },
                    ]}
                  />
                  <View>
                    <AppText
                      variant="heading3"
                      color={data.cameras.offline > 0 ? colors.danger : undefined}
                    >
                      {data.cameras.offline}
                    </AppText>
                    <AppText variant="caption" colorRole="textMuted">
                      Offline
                    </AppText>
                  </View>
                </View>

                <View style={[styles.cameraChip, { backgroundColor: colors.surface }]}>
                  <View style={[styles.statusDot, { backgroundColor: colors.info }]} />
                  <View>
                    <AppText variant="heading3">{data.cameras.total}</AppText>
                    <AppText variant="caption" colorRole="textMuted">
                      Total
                    </AppText>
                  </View>
                </View>
              </View>

              {data.cameras.total === 0 && (
                <AppText variant="small" colorRole="textMuted" style={styles.emptyNote}>
                  Nenhuma câmera associada à sua conta no momento.
                </AppText>
              )}
            </AppCard>

            {/* 3. Avisos Operacionais (mantém no máximo 1 aviso por tipo) */}
            {data.warnings.length > 0 && (() => {
              const uniqueWarnings = getUniqueWarnings(data.warnings);
              if (uniqueWarnings.length === 0) return null;

              return (
                <View style={styles.warningsContainer}>
                  {uniqueWarnings.map((warning, index) => {
                    const info = resolveWarningInfo(warning);
                    return (
                      <AppBanner
                        key={`warning-${warning.code}-${index}`}
                        variant={info.variant}
                        title={info.title}
                        message={info.message}
                        style={styles.warningItem}
                      />
                    );
                  })}
                </View>
              );
            })()}

            {/* 4. Alerta Mais Recente */}
            {data.latestAlert ? (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => router.push(`/(app)/alerts/${data.latestAlert!.id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Ver detalhes do alerta mais recente: ${data.latestAlert.severity}, câmera ${data.latestAlert.camera.name}`}
              >
                <AppCard
                  variant="default"
                  style={[
                    styles.sectionCard,
                  ]}
                >
                  <View style={styles.cardHeaderRow}>
                    <View style={styles.sectionHeaderTitle}>
                      <AppIcon
                        name="alert-triangle"
                        size={20}
                        color={
                          data.latestAlert.severity === 'CRITICA'
                            ? colors.danger
                            : colors.warning
                        }
                      />
                      <AppText variant="heading3" style={styles.headerTitleText}>
                        Alerta Mais Recente
                      </AppText>
                    </View>
                    <AppBadge
                      variant={
                        data.latestAlert.severity === 'CRITICA' ? 'danger' : 'warning'
                      }
                      label={data.latestAlert.severity}
                    />
                  </View>

                  <View style={styles.alertBody}>
                    <AppText variant="bodyStrong">
                      {data.latestAlert.type === 'POSSIVEL_RISCO'
                        ? 'Possível Risco Detectado'
                        : data.latestAlert.type}
                    </AppText>
                    <AppText variant="small" colorRole="textSecondary" style={styles.alertCamera}>
                      {data.latestAlert.camera.name}
                      {data.latestAlert.camera.location
                        ? ` • ${data.latestAlert.camera.location}`
                        : ''}
                    </AppText>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <AppText variant="caption" colorRole="textMuted">
                        Detectado em {formatFullDateTime(data.latestAlert.detectedAt)}
                      </AppText>
                      <AppText variant="caption" style={{ color: colors.primary, fontWeight: '600' }}>
                        Ver detalhes →
                      </AppText>
                    </View>
                  </View>
                </AppCard>
              </TouchableOpacity>
            ) : (
              <AppCard variant="raised" style={styles.sectionCard}>
                <View style={styles.noAlertRow}>
                  <AppIcon name="check-circle" size={18} color={colors.success} />
                  <AppText variant="small" colorRole="textMuted" style={styles.noAlertText}>
                    Nenhum alerta recente registrado para sua conta.
                  </AppText>
                </View>
              </AppCard>
            )}

            {/* 5. Rodapé: Horário da última atualização e ação manual */}
            <View style={styles.footerRow}>
              <View style={styles.footerTimestampContainer}>
                <AppText variant="caption" colorRole="textMuted">
                  Última sincronização: {formatTimestamp(data.generatedAt)}
                </AppText>
                <AppText variant="caption" colorRole="textMuted">
                  Puxe para baixo para atualizar
                </AppText>
              </View>
              <AppButton
                variant="ghost"
                title="Atualizar"
                icon="refresh-cw"
                loading={isFetching}
                onPress={() => refetch()}
              />
            </View>
          </>
        )}
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[8],
    gap: spacing[4],
  },
  stateCard: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  loadingTitle: {
    marginTop: spacing[2],
  },
  centeredText: {
    textAlign: 'center',
    maxWidth: 320,
  },
  errorTitle: {
    textAlign: 'center',
    marginTop: spacing[2],
  },
  retryActionContainer: {
    marginTop: spacing[3],
    width: '100%',
    maxWidth: 240,
  },
  staleBanner: {
    marginBottom: spacing[1],
  },
  heroCard: {
    gap: spacing[2],
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroTitle: {
    marginTop: spacing[1],
  },
  cardDivider: {
    marginVertical: spacing[2],
  },
  sessionMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[6],
  },
  metricItem: {
    gap: spacing[1],
  },
  heroActionContainer: {
    marginTop: spacing[1],
  },
  sectionCard: {
    gap: spacing[3],
  },
  sectionHeaderTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  headerTitleText: {
    marginLeft: spacing[1],
  },
  camerasGrid: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  cameraChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.medium,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyNote: {
    fontStyle: 'italic',
  },
  warningsContainer: {
    gap: spacing[2],
  },
  warningItem: {
    borderRadius: radius.medium,
  },
  alertBody: {
    gap: spacing[1],
  },
  alertCamera: {
    marginTop: spacing[1],
  },
  noAlertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  noAlertText: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[1],
  },
  footerTimestampContainer: {
    gap: spacing[1],
  },
});
