import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  StyleSheet,
  Modal,
  Pressable,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

import { useTheme } from '@/theme/useTheme';
import { radius, spacing, layout } from '@/theme/tokens';
import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppButton } from '@/components/primitives/AppButton';
import { AppIcon, FeatherIconName } from '@/components/primitives/AppIcon';
import { AppInput } from '@/components/primitives/AppInput';
import { AppDivider } from '@/components/primitives/AppDivider';
import { useCurrentMonitoringsQuery } from '@/hooks/useCurrentMonitoringsQuery';
import { useCamerasQuery } from '@/hooks/useCamerasQuery';
import {
  useStartMonitoringMutation,
  usePauseMonitoringMutation,
  useResumeMonitoringMutation,
  useEndMonitoringMutation,
} from '@/hooks/useMonitoringMutations';
import { ApiError } from '@/services/api/errors';
import type {
  MonitoringItem,
  MonitoringOperationalStatus,
  MonitoringOperationalReason,
  CameraItem,
} from '@/services/api/types';

function getOperationalStatusInfo(
  status: MonitoringOperationalStatus,
  reason: MonitoringOperationalReason,
) {
  switch (status) {
    case 'ATIVO':
      return {
        variant: 'success' as const,
        icon: 'shield' as FeatherIconName,
        label: 'OPERACIONAL',
        description: 'Vigilância ativa e operando normalmente.',
      };
    case 'PAUSADO':
      return {
        variant: 'warning' as const,
        icon: 'pause-circle' as FeatherIconName,
        label: 'PAUSADO',
        description:
          'Monitoramento pausado pelo usuário. A análise de risco está suspensa.',
      };
    case 'DEGRADADO':
      return {
        variant: 'warning' as const,
        icon: 'alert-triangle' as FeatherIconName,
        label: 'DEGRADADO',
        description:
          'Sessão ativa, porém uma ou mais câmeras estão sem comunicação recente.',
      };
    case 'INDISPONIVEL':
    default:
      return {
        variant: 'danger' as const,
        icon: 'alert-circle' as FeatherIconName,
        label: 'INDISPONÍVEL',
        description:
          reason === 'SEM_CAMERA_ONLINE'
            ? 'Nenhuma câmera desta sessão está transmitindo sinal no momento.'
            : 'Sessão indisponível.',
      };
  }
}

export default function MonitoringControlScreen() {
  const router = useRouter();
  const { selectedCameraId } = useLocalSearchParams<{ selectedCameraId?: string }>();
  const { colors } = useTheme();

  // Queries
  const {
    data: monitorings,
    isPending: isMonitoringsPending,
    isError: isMonitoringsError,
    isFetching: isMonitoringsFetching,
    refetch: refetchMonitorings,
  } = useCurrentMonitoringsQuery();

  const {
    data: cameras,
    isPending: isCamerasPending,
    isError: isCamerasError,
    isFetching: isCamerasFetching,
    refetch: refetchCameras,
  } = useCamerasQuery();

  // Mutations
  const startMutation = useStartMonitoringMutation();
  const pauseMutation = usePauseMonitoringMutation();
  const resumeMutation = useResumeMonitoringMutation();
  const endMutation = useEndMonitoringMutation();

  // Estados locais da tela
  const [selectedCameraIds, setSelectedCameraIds] = useState<Set<string>>(new Set());
  const [hasInitializedPreselection, setHasInitializedPreselection] = useState(false);

  // Estado do diálogo de pausa reforçada
  const [pauseModalSession, setPauseModalSession] = useState<MonitoringItem | null>(null);
  const [pausePassword, setPausePassword] = useState('');
  const [pauseError, setPauseError] = useState<string | null>(null);

  // Estado do diálogo de encerramento de sessão
  const [endModalSession, setEndModalSession] = useState<MonitoringItem | null>(null);
  const [endPassword, setEndPassword] = useState('');
  const [endError, setEndError] = useState<string | null>(null);

  // Mensagens contextuais de feedback da tela
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Câmeras que já pertencem a alguma sessão atual (ativa ou pausada)
  const occupiedCameraIdSet = useMemo(() => {
    const set = new Set<string>();
    if (monitorings) {
      for (const m of monitorings) {
        for (const cam of m.cameras) {
          set.add(cam.id);
        }
      }
    }
    return set;
  }, [monitorings]);

  // Avaliação de elegibilidade de cada câmera
  const cameraEligibilityMap = useMemo(() => {
    const map = new Map<
      string,
      { eligible: boolean; reason?: string }
    >();

    if (cameras) {
      for (const cam of cameras) {
        if (cam.administrativeStatus === 'INATIVA') {
          map.set(cam.id, {
            eligible: false,
            reason: 'Inativa administrativamente',
          });
        } else if (cam.connectionStatus === 'OFFLINE') {
          map.set(cam.id, {
            eligible: false,
            reason: 'Sem sinal recente (offline)',
          });
        } else if (cam.connectionStatus === 'DESCONHECIDA') {
          map.set(cam.id, {
            eligible: false,
            reason: 'Em verificação de sinal',
          });
        } else if (occupiedCameraIdSet.has(cam.id)) {
          map.set(cam.id, {
            eligible: false,
            reason: 'Já associada a uma sessão atual',
          });
        } else {
          map.set(cam.id, { eligible: true });
        }
      }
    }
    return map;
  }, [cameras, occupiedCameraIdSet]);

  // Inicialização de pré-seleção ao abrir a tela com parâmetro de câmera
  useEffect(() => {
    if (!hasInitializedPreselection && selectedCameraId && cameras) {
      const eligibility = cameraEligibilityMap.get(selectedCameraId);
      if (eligibility?.eligible) {
        setSelectedCameraIds(new Set([selectedCameraId]));
      }
      setHasInitializedPreselection(true);
    }
  }, [hasInitializedPreselection, selectedCameraId, cameras, cameraEligibilityMap]);

  const isInitialLoading =
    (isMonitoringsPending && !monitorings) || (isCamerasPending && !cameras);
  const isRefreshing = isMonitoringsFetching || isCamerasFetching;
  const isStale = (isMonitoringsError && !!monitorings) || (isCamerasError && !!cameras);

  const handleRefresh = async () => {
    setFeedback(null);
    await Promise.all([refetchMonitorings(), refetchCameras()]);
  };

  const toggleCameraSelection = (cameraId: string) => {
    const eligibility = cameraEligibilityMap.get(cameraId);
    if (!eligibility?.eligible) return;

    setSelectedCameraIds((prev) => {
      const next = new Set(prev);
      if (next.has(cameraId)) {
        next.delete(cameraId);
      } else {
        next.add(cameraId);
      }
      return next;
    });
  };

  // Iniciar novo monitoramento
  const handleStartMonitoring = async () => {
    if (selectedCameraIds.size === 0 || startMutation.isPending) return;
    setFeedback(null);

    try {
      await startMutation.mutateAsync({
        cameraIds: Array.from(selectedCameraIds),
      });
      setSelectedCameraIds(new Set());
      setFeedback({
        type: 'success',
        message: 'Sessão de monitoramento iniciada com sucesso.',
      });
    } catch (err: unknown) {
      let msg = 'Não foi possível iniciar o monitoramento.';
      if (err instanceof ApiError) {
        if (err.isMonitoringStateConflict()) {
          msg = 'Uma ou mais câmeras já estão associadas a outra sessão ou houve conflito de estado.';
        } else if (err.isCameraNotOperational()) {
          msg = 'Uma ou mais câmeras selecionadas não estão operacionais (offline ou inativas).';
        } else if (err.isNetworkError) {
          msg = 'Falha de comunicação com o servidor. Verifique sua conexão e tente novamente.';
        } else {
          msg = err.detail || err.title;
        }
      }
      setFeedback({ type: 'error', message: msg });
    }
  };

  // Abrir diálogo de confirmação com senha para pausa
  const handleOpenPauseModal = (session: MonitoringItem) => {
    setPauseModalSession(session);
    setPausePassword('');
    setPauseError(null);
  };

  // Fechar diálogo de pausa e limpar senha do estado transitório
  const handleClosePauseModal = () => {
    setPauseModalSession(null);
    setPausePassword('');
    setPauseError(null);
  };

  // Confirmar pausa reforçada
  const handleConfirmPause = async () => {
    if (!pauseModalSession || !pausePassword.trim() || pauseMutation.isPending) return;

    setPauseError(null);

    try {
      await pauseMutation.mutateAsync({
        monitoringId: pauseModalSession.id,
        payload: { password: pausePassword },
      });
      handleClosePauseModal();
      setFeedback({
        type: 'success',
        message: 'Monitoramento pausado com sucesso.',
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isReauthenticationFailed()) {
          setPauseError('A senha atual informada está incorreta. Verifique e tente novamente.');
        } else if (err.isMonitoringStateConflict()) {
          setPauseError('A sessão de monitoramento já foi alterada ou encerrada.');
        } else if (err.isSessionExpired()) {
          setPauseError('Sua sessão expirou. Faça login novamente para prosseguir.');
        } else if (err.isNetworkError) {
          setPauseError('Falha de conexão. Verifique sua internet e tente novamente.');
        } else {
          setPauseError(err.detail || err.title);
        }
      } else {
        setPauseError('Ocorreu um erro inesperado ao tentar pausar o monitoramento.');
      }
    }
  };

  // Retomada de sessão pausada
  const handleResumeMonitoring = async (session: MonitoringItem) => {
    if (resumeMutation.isPending) return;
    setFeedback(null);

    // Verificar se alguma câmera da sessão está offline
    const offlineCam = session.cameras.find((c) => c.connectionStatus !== 'ONLINE');
    if (offlineCam) {
      setFeedback({
        type: 'error',
        message: `Não é possível retomar: a câmera "${offlineCam.name}" está ${offlineCam.connectionStatus.toLowerCase()}. Todas as câmeras precisam estar online.`,
      });
      return;
    }

    try {
      await resumeMutation.mutateAsync(session.id);
      setFeedback({
        type: 'success',
        message: 'Sessão de monitoramento retomada com sucesso.',
      });
    } catch (err: unknown) {
      let msg = 'Não foi possível retomar o monitoramento.';
      if (err instanceof ApiError) {
        if (err.isCameraNotOperational()) {
          msg = 'Uma ou mais câmeras da sessão não estão online ou operacionais no momento.';
        } else if (err.isMonitoringStateConflict()) {
          msg = 'A sessão de monitoramento já foi alterada ou encerrada.';
        } else if (err.isNetworkError) {
          msg = 'Falha de comunicação. Verifique sua rede e tente novamente.';
        } else {
          msg = err.detail || err.title;
        }
      }
      setFeedback({ type: 'error', message: msg });
    }
  };

  // Abrir diálogo de encerramento
  const handleOpenEndModal = (session: MonitoringItem) => {
    setEndModalSession(session);
    setEndPassword('');
    setEndError(null);
  };

  const handleCloseEndModal = () => {
    setEndModalSession(null);
    setEndPassword('');
    setEndError(null);
  };

  // Confirmar encerramento da sessão com senha
  const handleConfirmEnd = async () => {
    if (!endModalSession || !endPassword.trim() || endMutation.isPending) return;
    setEndError(null);

    try {
      await endMutation.mutateAsync({
        monitoringId: endModalSession.id,
        payload: { password: endPassword },
      });
      const sessionId = endModalSession.id;
      handleCloseEndModal();
      setFeedback({
        type: 'success',
        message: `Sessão #${sessionId} encerrada com sucesso. Câmeras liberadas.`,
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        if (err.isReauthenticationFailed()) {
          setEndError('A senha atual informada está incorreta. Verifique e tente novamente.');
        } else if (err.isMonitoringStateConflict()) {
          setEndError('A sessão de monitoramento já foi alterada ou encerrada.');
        } else if (err.isSessionExpired()) {
          setEndError('Sua sessão expirou. Faça login novamente para prosseguir.');
        } else if (err.isNetworkError) {
          setEndError('Falha de comunicação com o servidor. Verifique sua rede e tente novamente.');
        } else {
          setEndError(err.detail || err.title);
        }
      } else {
        setEndError('Ocorreu um erro inesperado ao tentar encerrar o monitoramento.');
      }
    }
  };

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Controle de Monitoramento"
        subtitle="Gerenciamento de sessões e vigilância"
        showBack={true}
        onBack={() => router.back()}
        showThemeToggle={true}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing && !isInitialLoading}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Banner de feedback geral */}
        {feedback && (
          <AppBanner
            variant={feedback.type === 'success' ? 'success' : 'danger'}
            title={feedback.type === 'success' ? 'Operação concluída' : 'Atenção'}
            message={feedback.message}
            actionTitle="OK"
            onAction={() => setFeedback(null)}
            style={styles.banner}
          />
        )}

        {/* ESTADO 1: Carregamento inicial */}
        {isInitialLoading && (
          <AppCard variant="glass" style={styles.stateCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="bodyStrong" style={styles.stateTitle}>
              Carregando sessões e câmeras...
            </AppText>
            <AppText variant="small" colorRole="textMuted" style={styles.centeredText}>
              Consultando o estado atual do monitoramento na API.
            </AppText>
          </AppCard>
        )}

        {/* ESTADO 2: Erro total sem dados */}
        {!isInitialLoading && isMonitoringsError && !monitorings && (
          <AppCard variant="default" style={[styles.stateCard, { borderColor: colors.danger }]}>
            <AppBadge variant="danger" label="FALHA DE COMUNICAÇÃO" icon="cloud-off" />
            <AppText variant="heading3" color={colors.danger} style={styles.stateTitle}>
              Não foi possível carregar as informações
            </AppText>
            <AppText variant="body" colorRole="textSecondary" style={styles.centeredText}>
              Verifique sua conexão ou tente novamente.
            </AppText>
            <View style={styles.actionsRow}>
              <AppButton
                variant="primary"
                title="Tentar novamente"
                icon="refresh-cw"
                loading={isRefreshing}
                onPress={handleRefresh}
              />
              <AppButton
                variant="secondary"
                title="Voltar"
                icon="arrow-left"
                onPress={() => router.back()}
              />
            </View>
          </AppCard>
        )}

        {/* ESTADO 3: Dados anteriores preservados, mas desatualizados */}
        {isStale && (
          <AppBanner
            variant="warning"
            icon="alert-circle"
            title="Dados desatualizados"
            message="Não foi possível atualizar o estado do monitoramento com o servidor. Ações sensíveis dependem de confirmação da rede."
            actionTitle="Tentar novamente"
            onAction={handleRefresh}
            actionLoading={isRefreshing}
            style={styles.banner}
          />
        )}

        {/* CONTEÚDO PRINCIPAL */}
        {!isInitialLoading && (
          <>
            {/* SEÇÃO 1: SESSÕES ATUAIS DE MONITORAMENTO */}
            <View style={styles.sectionHeader}>
              <AppIcon name="activity" size={18} color={colors.primary} />
              <AppText variant="heading3" style={styles.sectionTitleText}>
                Sessões Atuais
              </AppText>
              {monitorings && (
                <AppBadge
                  variant={monitorings.length > 0 ? 'info' : 'offline'}
                  label={`${monitorings.length} ${
                    monitorings.length === 1 ? 'SESSÃO' : 'SESSÕES'
                  }`}
                />
              )}
            </View>

            {monitorings && monitorings.length === 0 ? (
              <AppCard variant="default" style={styles.emptyCard}>
                <AppIcon name="shield-off" size={28} color={colors.textMuted} />
                <AppText variant="bodyStrong" style={styles.emptyTitle}>
                  Nenhuma sessão em andamento
                </AppText>
                <AppText variant="small" colorRole="textMuted" style={styles.centeredText}>
                  Não há nenhuma vigilância ativa ou pausada no momento. Selecione as câmeras disponíveis abaixo para iniciar.
                </AppText>
              </AppCard>
            ) : (
              monitorings?.map((session) => {
                const statusInfo = getOperationalStatusInfo(
                  session.operationalStatus,
                  session.operationalReason,
                );
                const isPaused = session.status === 'PAUSADO';

                return (
                  <AppCard key={`session-${session.id}`} variant="raised" style={styles.sessionCard}>
                    <View style={styles.sessionHeaderRow}>
                      <View style={styles.sessionTitleGroup}>
                        <AppText variant="heading3">Sessão #{session.id}</AppText>
                        <AppText variant="caption" colorRole="textMuted">
                          {statusInfo.description}
                        </AppText>
                      </View>
                      <View style={styles.badgesCol}>
                        <AppBadge
                          variant={isPaused ? 'warning' : 'success'}
                          label={session.status}
                        />
                        <AppBadge
                          variant={statusInfo.variant}
                          label={statusInfo.label}
                          icon={statusInfo.icon}
                          style={styles.subBadge}
                        />
                      </View>
                    </View>

                    <AppDivider style={styles.divider} />

                    <AppText variant="caption" colorRole="textMuted" style={styles.fieldLabel}>
                      CÂMERAS NA SESSÃO ({session.cameras.length}):
                    </AppText>

                    <View style={styles.sessionCamerasList}>
                      {session.cameras.map((cam) => {
                        const isOnline = cam.connectionStatus === 'ONLINE';
                        return (
                          <View
                            key={`session-${session.id}-cam-${cam.id}`}
                            style={[styles.sessionCameraItem, { backgroundColor: colors.surface }]}
                          >
                            <View style={styles.cameraNameGroup}>
                              <AppIcon
                                name="video"
                                size={14}
                                color={isOnline ? colors.success : colors.danger}
                              />
                              <AppText variant="bodyStrong" style={styles.cameraNameText}>
                                {cam.name}
                              </AppText>
                            </View>
                            <AppBadge
                              variant={
                                isOnline
                                  ? 'success'
                                  : cam.connectionStatus === 'OFFLINE'
                                  ? 'danger'
                                  : 'offline'
                              }
                              label={cam.connectionStatus}
                            />
                          </View>
                        );
                      })}
                    </View>

                    <AppDivider style={styles.divider} />

                    {/* Ações da Sessão */}
                    <View style={styles.sessionActions}>
                      <View style={styles.sessionActionsRow}>
                        {session.status === 'ATIVO' ? (
                          <AppButton
                            variant="secondary"
                            title="Pausar"
                            icon="pause"
                            style={styles.flexButton}
                            onPress={() => handleOpenPauseModal(session)}
                          />
                        ) : (
                          <AppButton
                            variant="primary"
                            title="Retomar"
                            icon="play"
                            style={styles.flexButton}
                            loading={resumeMutation.isPending}
                            onPress={() => handleResumeMonitoring(session)}
                          />
                        )}
                        <AppButton
                          variant="danger"
                          title="Encerrar"
                          icon="power"
                          style={styles.flexButton}
                          onPress={() => handleOpenEndModal(session)}
                        />
                      </View>
                    </View>
                  </AppCard>
                );
              })
            )}

            {/* SEÇÃO 2: INICIAR NOVO MONITORAMENTO */}
            <View style={[styles.sectionHeader, { marginTop: spacing[6] }]}>
              <AppIcon name="plus-circle" size={18} color={colors.primary} />
              <AppText variant="heading3" style={styles.sectionTitleText}>
                Iniciar Novo Monitoramento
              </AppText>
            </View>

            <AppText variant="small" colorRole="textSecondary" style={styles.sectionSubtitle}>
              Selecione uma ou mais câmeras elegíveis para compor a nova sessão de vigilância.
            </AppText>

            {cameras && cameras.length === 0 ? (
              <AppCard variant="default" style={styles.emptyCard}>
                <AppIcon name="video-off" size={28} color={colors.textMuted} />
                <AppText variant="bodyStrong" style={styles.emptyTitle}>
                  Nenhuma câmera autorizada
                </AppText>
                <AppText variant="small" colorRole="textMuted" style={styles.centeredText}>
                  Sua conta não possui câmeras autorizadas cadastradas no momento.
                </AppText>
              </AppCard>
            ) : (
              <View style={styles.camerasSelectionList}>
                {cameras?.map((cam) => {
                  const eligibility = cameraEligibilityMap.get(cam.id) ?? {
                    eligible: false,
                    reason: 'Inelegível',
                  };
                  const isSelected = selectedCameraIds.has(cam.id);

                  return (
                    <Pressable
                      key={`select-cam-${cam.id}`}
                      onPress={() => toggleCameraSelection(cam.id)}
                      disabled={!eligibility.eligible}
                      accessibilityRole="checkbox"
                      accessibilityState={{
                        checked: isSelected,
                        disabled: !eligibility.eligible,
                      }}
                      style={({ pressed }) => [
                        styles.cameraSelectionCard,
                        {
                          backgroundColor: isSelected
                            ? colors.surfaceRaised
                            : colors.surface,
                          borderColor: isSelected
                            ? colors.primary
                            : eligibility.eligible
                            ? colors.border
                            : colors.borderSubtle,
                          opacity: !eligibility.eligible ? 0.6 : pressed ? 0.9 : 1,
                        },
                      ]}
                    >
                      <View style={styles.selectionCardContent}>
                        {/* Checkbox visual */}
                        <View
                          style={[
                            styles.checkboxBase,
                            {
                              borderColor: isSelected
                                ? colors.primary
                                : eligibility.eligible
                                ? colors.textMuted
                                : colors.borderSubtle,
                              backgroundColor: isSelected
                                ? colors.primary
                                : 'transparent',
                            },
                          ]}
                        >
                          {isSelected && <AppIcon name="check" size={14} color="#ffffff" />}
                        </View>

                        <View style={styles.selectionInfo}>
                          <AppText variant="bodyStrong">{cam.name}</AppText>
                          {cam.location && (
                            <AppText variant="caption" colorRole="textMuted">
                              {cam.location}
                            </AppText>
                          )}

                          {/* Explicação de inelegibilidade quando aplicável */}
                          {!eligibility.eligible && eligibility.reason && (
                            <View style={styles.ineligibleBadgeRow}>
                              <AppBadge
                                variant={
                                  cam.administrativeStatus === 'INATIVA'
                                    ? 'offline'
                                    : cam.connectionStatus === 'OFFLINE'
                                    ? 'danger'
                                    : 'warning'
                                }
                                label={eligibility.reason}
                              />
                            </View>
                          )}
                        </View>

                        {/* Status de conexão */}
                        <AppBadge
                          variant={
                            cam.connectionStatus === 'ONLINE'
                              ? 'success'
                              : cam.connectionStatus === 'OFFLINE'
                              ? 'danger'
                              : 'offline'
                          }
                          label={cam.connectionStatus}
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}

            {/* Botão de ação para iniciar */}
            <View style={styles.bottomActionContainer}>
              <AppButton
                variant="primary"
                title={
                  selectedCameraIds.size > 0
                    ? `Iniciar monitoramento (${selectedCameraIds.size} ${
                        selectedCameraIds.size === 1 ? 'câmera' : 'câmeras'
                      })`
                    : 'Selecione ao menos uma câmera'
                }
                icon="play"
                disabled={selectedCameraIds.size === 0 || startMutation.isPending}
                loading={startMutation.isPending}
                fullWidth={true}
                onPress={handleStartMonitoring}
              />
            </View>
          </>
        )}
      </ScrollView>

      {/* DIÁLOGO DE PAUSA REFORÇADA (MODAL COM SENHA) */}
      <Modal
        visible={!!pauseModalSession}
        transparent={true}
        animationType="fade"
        onRequestClose={handleClosePauseModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleClosePauseModal} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.dangerSoft }]}>
                <AppIcon name="alert-triangle" size={24} color={colors.danger} />
              </View>
              <View style={styles.modalTitleGroup}>
                <AppText variant="heading3" color={colors.danger}>
                  Pausar monitoramento
                </AppText>
                <AppText variant="caption" colorRole="textMuted">
                  Confirmação de segurança exigida
                </AppText>
              </View>
            </View>

            <AppDivider style={styles.divider} />

            <AppText variant="body" colorRole="textSecondary" style={styles.modalNotice}>
              A análise automática de risco e os alertas de segurança serão suspensos para todas as câmeras desta sessão.
            </AppText>

            {pauseModalSession && (
              <View style={[styles.affectedCamerasBox, { backgroundColor: colors.surfaceRaised }]}>
                <AppText variant="caption" colorRole="textMuted">
                  CÂMERAS AFETADAS:
                </AppText>
                <AppText variant="bodyStrong">
                  {pauseModalSession.cameras.map((c) => c.name).join(', ')}
                </AppText>
              </View>
            )}

            {pauseError && (
              <AppBanner
                variant="danger"
                title="Erro ao pausar"
                message={pauseError}
                style={styles.modalBanner}
              />
            )}

            <View style={styles.inputContainer}>
              <AppInput
                label="Senha atual"
                placeholder="Informe sua senha para confirmar"
                isPassword={true}
                value={pausePassword}
                onChangeText={setPausePassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalActions}>
              <AppButton
                variant="secondary"
                title="Cancelar"
                disabled={pauseMutation.isPending}
                onPress={handleClosePauseModal}
                style={styles.modalButton}
              />
              <AppButton
                variant="danger"
                title="Pausar"
                icon="pause"
                loading={pauseMutation.isPending}
                disabled={!pausePassword.trim() || pauseMutation.isPending}
                onPress={handleConfirmPause}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* DIÁLOGO DE ENCERRAMENTO DE SESSÃO COM SENHA */}
      <Modal
        visible={!!endModalSession}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseEndModal}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={styles.modalBackdrop} onPress={handleCloseEndModal} />
          <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <View style={[styles.modalIconWrap, { backgroundColor: colors.dangerSoft }]}>
                <AppIcon name="power" size={24} color={colors.danger} />
              </View>
              <View style={styles.modalTitleGroup}>
                <AppText variant="heading3" color={colors.danger}>
                  Encerrar sessão #{endModalSession?.id}
                </AppText>
                <AppText variant="caption" colorRole="textMuted">
                  Confirmação de segurança exigida
                </AppText>
              </View>
            </View>

            <AppDivider style={styles.divider} />

            <AppText variant="body" colorRole="textSecondary" style={styles.modalNotice}>
              A vigilância automática será finalizada definitivamente para todas as câmeras desta sessão.
            </AppText>

            {endModalSession && (
              <View style={[styles.affectedCamerasBox, { backgroundColor: colors.surfaceRaised }]}>
                <AppText variant="caption" colorRole="textMuted">
                  CÂMERAS AFETADAS:
                </AppText>
                <AppText variant="bodyStrong">
                  {endModalSession.cameras.map((c) => c.name).join(', ')}
                </AppText>
                <AppText variant="caption" colorRole="textMuted" style={{ marginTop: 4 }}>
                  Atenção: outros usuários autorizados nestas câmeras também deixarão de contar com a vigilância ativa desta sessão.
                </AppText>
              </View>
            )}

            {endError && (
              <AppBanner
                variant="danger"
                title="Erro ao encerrar"
                message={endError}
                style={styles.modalBanner}
              />
            )}

            <View style={styles.inputContainer}>
              <AppInput
                label="Senha atual"
                placeholder="Informe sua senha para confirmar"
                isPassword={true}
                value={endPassword}
                onChangeText={setEndPassword}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.modalActions}>
              <AppButton
                variant="secondary"
                title="Cancelar"
                disabled={endMutation.isPending}
                onPress={handleCloseEndModal}
                style={styles.modalButton}
              />
              <AppButton
                variant="danger"
                title="Encerrar"
                icon="power"
                loading={endMutation.isPending}
                disabled={!endPassword.trim() || endMutation.isPending}
                onPress={handleConfirmEnd}
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[10],
  },
  banner: {
    marginBottom: spacing[4],
  },
  stateCard: {
    alignItems: 'center',
    padding: spacing[6],
    marginVertical: spacing[4],
  },
  stateTitle: {
    marginTop: spacing[3],
    marginBottom: spacing[2],
    textAlign: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  sectionTitleText: {
    flex: 1,
  },
  sectionSubtitle: {
    marginBottom: spacing[3],
  },
  emptyCard: {
    alignItems: 'center',
    padding: spacing[6],
    marginVertical: spacing[2],
  },
  emptyTitle: {
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  sessionCard: {
    marginBottom: spacing[4],
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionTitleGroup: {
    flex: 1,
    marginRight: spacing[2],
  },
  badgesCol: {
    alignItems: 'flex-end',
    gap: spacing[1],
  },
  subBadge: {
    marginTop: 2,
  },
  divider: {
    marginVertical: spacing[3],
  },
  fieldLabel: {
    letterSpacing: 0.5,
    marginBottom: spacing[2],
  },
  sessionCamerasList: {
    gap: spacing[2],
  },
  sessionCameraItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.medium,
  },
  cameraNameGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    flex: 1,
    marginRight: spacing[2],
  },
  cameraNameText: {
    flexShrink: 1,
  },
  sessionActions: {
    marginTop: spacing[1],
  },
  sessionActionsRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  flexButton: {
    flex: 1,
  },
  camerasSelectionList: {
    gap: spacing[3],
  },
  cameraSelectionCard: {
    borderWidth: 1,
    borderRadius: radius.large,
    padding: spacing[3],
  },
  selectionCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxBase: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  selectionInfo: {
    flex: 1,
    marginRight: spacing[2],
  },
  ineligibleBadgeRow: {
    marginTop: spacing[1],
    alignSelf: 'flex-start',
  },
  bottomActionContainer: {
    marginTop: spacing[6],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing[4],
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFill,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: radius.large,
    padding: spacing[5],
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  modalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitleGroup: {
    flex: 1,
  },
  modalNotice: {
    lineHeight: 22,
    marginBottom: spacing[3],
  },
  affectedCamerasBox: {
    padding: spacing[3],
    borderRadius: radius.medium,
    marginBottom: spacing[3],
    gap: 4,
  },
  modalBanner: {
    marginBottom: spacing[3],
  },
  inputContainer: {
    marginBottom: spacing[4],
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing[3],
  },
  modalButton: {
    flex: 1,
  },
});
