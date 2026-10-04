import React from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppButton } from '@/components/primitives/AppButton';
import { AppIcon } from '@/components/primitives/AppIcon';
import { AppDivider } from '@/components/primitives/AppDivider';

import { useAlertDetailQuery } from '@/hooks/useAlertDetailQuery';
import { useAlertEvidenceQuery } from '@/hooks/useAlertEvidenceQuery';
import { useTheme } from '@/theme/useTheme';
import { spacing, radius } from '@/theme/tokens';
import { formatFullDateTime } from '@/utils/date';
import type { AlertDetailItem } from '@/services/api/types';

/**
 * Componente interno de renderização do frame de evidência.
 * Carrega a imagem binária autenticada e mantém exclusivamente em memória heap.
 */
function EvidenceFrameView({ alert }: { alert: AlertDetailItem }) {
  const { colors } = useTheme();
  const isAvailable = alert.evidence.available;

  const {
    data: evidenceData,
    isLoading: isEvidenceLoading,
    isError: isEvidenceError,
    refetch: refetchEvidence,
  } = useAlertEvidenceQuery(alert.id, isAvailable);

  if (isAvailable) {
    if (isEvidenceLoading) {
      return (
        <View
          style={[styles.evidenceBox, { backgroundColor: colors.surfaceRaised }]}
        >
          <ActivityIndicator size="large" color={colors.primary} />
          <AppText
            variant="small"
            colorRole="textMuted"
            style={styles.evidenceLoadingText}
          >
            Carregando imagem de evidência...
          </AppText>
        </View>
      );
    }

    if (isEvidenceError || !evidenceData) {
      return (
        <View
          style={[
            styles.evidenceBox,
            styles.evidenceErrorBox,
            { backgroundColor: colors.surfaceRaised, borderColor: colors.warning },
          ]}
        >
          <AppIcon name="alert-triangle" size={28} color={colors.warning} decorative={true} />
          <AppText variant="bodyStrong" style={styles.evidenceStateTitle}>
            Falha ao carregar evidência
          </AppText>
          <AppText
            variant="small"
            colorRole="textMuted"
            style={styles.evidenceCenteredText}
          >
            Não foi possível transferir a imagem no momento. Os dados do alerta continuam disponíveis acima.
          </AppText>
          <AppButton
            variant="secondary"
            title="Recarregar imagem"
            icon="refresh-cw"
            onPress={() => refetchEvidence()}
            style={styles.retryImageButton}
          />
        </View>
      );
    }

    return (
      <View style={styles.evidenceLoadedContainer}>
        <View
          style={[
            styles.imageContainer,
            { backgroundColor: colors.backgroundDeep, borderColor: colors.border },
          ]}
        >
          <Image
            source={{ uri: evidenceData.dataUri }}
            style={styles.evidenceImage}
            resizeMode="contain"
            accessibilityLabel={`Frame de evidência capturado pela câmera ${alert.camera.name} no momento do alerta`}
          />
        </View>

        <View style={styles.privacyNoteBox}>
          <AppIcon name="lock" size={13} color={colors.textMuted} decorative={true} />
          <AppText
            variant="caption"
            colorRole="textMuted"
            style={styles.privacyNoteText}
          >
            Evidência protegida. Mantida apenas temporariamente em memória durante a visualização.
          </AppText>
        </View>
      </View>
    );
  }

  // Casos em que a evidência NÃO está disponível
  const reason = alert.evidence.unavailableReason;

  if (reason === 'NOT_CAPTURED') {
    return (
      <View
        style={[styles.evidenceBox, { backgroundColor: colors.surfaceRaised }]}
      >
        <AppIcon name="camera-off" size={32} color={colors.textMuted} decorative={true} />
        <AppText variant="bodyStrong" style={styles.evidenceStateTitle}>
          Evidência não capturada
        </AppText>
        <AppText
          variant="small"
          colorRole="textMuted"
          style={styles.evidenceCenteredText}
        >
          Nenhum frame foi registrado no momento deste alerta.
        </AppText>
      </View>
    );
  }

  if (reason === 'EXPIRED') {
    return (
      <View
        style={[styles.evidenceBox, { backgroundColor: colors.surfaceRaised }]}
      >
        <AppIcon name="clock" size={32} color={colors.warning} decorative={true} />
        <AppText variant="bodyStrong" style={styles.evidenceStateTitle}>
          Evidência expirada
        </AppText>
        <AppText
          variant="small"
          colorRole="textMuted"
          style={styles.evidenceCenteredText}
        >
          A imagem associada a este alerta expirou conforme o período de retenção de 30 dias e foi desativada.
        </AppText>
      </View>
    );
  }

  if (reason === 'REMOVED') {
    return (
      <View
        style={[styles.evidenceBox, { backgroundColor: colors.surfaceRaised }]}
      >
        <AppIcon name="trash-2" size={32} color={colors.offline} decorative={true} />
        <AppText variant="bodyStrong" style={styles.evidenceStateTitle}>
          Evidência removida
        </AppText>
        <AppText
          variant="small"
          colorRole="textMuted"
          style={styles.evidenceCenteredText}
        >
          A imagem de evidência foi removida do sistema por política de retenção ou operação de limpeza.
        </AppText>
      </View>
    );
  }

  return (
    <View
      style={[styles.evidenceBox, { backgroundColor: colors.surfaceRaised }]}
    >
      <AppIcon name="info" size={32} color={colors.offline} decorative={true} />
      <AppText variant="bodyStrong" style={styles.evidenceStateTitle}>
        Evidência indisponível
      </AppText>
    </View>
  );
}

export default function AlertDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const alertId = id || '';
  const {
    data: alert,
    isPending,
    isError,
    refetch,
  } = useAlertDetailQuery(alertId);

  const isCritical = alert?.severity === 'CRITICA';

  return (
    <AppBackground edges={['top', 'bottom', 'left', 'right']}>
      <ScreenHeader
        title="Detalhes do Alerta"
        subtitle={alert ? `#${alert.id}` : 'Consulta de evento'}
        showBack={true}
        onBack={() => router.back()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ESTADO 1: Carregando detalhes */}
        {isPending && !alert && (
          <AppCard variant="glass" style={styles.stateCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <AppText variant="bodyStrong" style={styles.stateTitle}>
              Consultando alerta...
            </AppText>
            <AppText
              variant="small"
              colorRole="textMuted"
              style={styles.centeredText}
            >
              Verificando autorização de acesso e metadados da detecção.
            </AppText>
          </AppCard>
        )}

        {/* ESTADO 2: Alerta não encontrado ou não autorizado */}
        {isError && !alert && (
          <AppCard
            variant="default"
            style={[styles.stateCard, { borderColor: colors.danger }]}
          >
            <AppBadge variant="danger" label="NÃO ENCONTRADO" icon="alert-circle" />
            <AppText
              variant="heading3"
              color={colors.danger}
              style={styles.stateTitle}
            >
              Alerta indisponível
            </AppText>
            <AppText
              variant="body"
              colorRole="textSecondary"
              style={styles.centeredText}
            >
              Este alerta não foi encontrado ou sua conta não possui autorização como destinatário histórico deste evento.
            </AppText>
            <View style={styles.errorActionsRow}>
              <AppButton
                variant="primary"
                title="Tentar novamente"
                icon="refresh-cw"
                onPress={() => refetch()}
              />
              <AppButton
                variant="secondary"
                title="Voltar ao Histórico"
                icon="arrow-left"
                onPress={() => router.back()}
              />
            </View>
          </AppCard>
        )}

        {/* CONTEÚDO PRINCIPAL DO ALERTA */}
        {!!alert && (
          <>
            {/* 1. Card Principal de Identificação */}
            <AppCard
              variant="default"
              style={[
                styles.sectionCard,
                {
                  borderColor: isCritical ? colors.danger : colors.warning,
                },
              ]}
            >
              <View style={styles.cardHeaderRow}>
                <View style={styles.severityBadgeGroup}>
                  <AppBadge
                    variant={isCritical ? 'danger' : 'warning'}
                    label={alert.severity}
                    icon={isCritical ? 'alert-octagon' : 'alert-triangle'}
                  />
                  <AppText variant="telemetry" colorRole="textMuted">
                    ID #{alert.id}
                  </AppText>
                </View>

                {alert.evidence.available ? (
                  <AppBadge
                    variant="info"
                    label="EVIDÊNCIA DISPONÍVEL"
                    icon="image"
                  />
                ) : (
                  <AppBadge
                    variant="offline"
                    label="SEM EVIDÊNCIA"
                    icon="image"
                  />
                )}
              </View>

              {/* Título Responsável: "Possível situação de risco" sem afirmar afogamento */}
              <AppText variant="heading2" style={styles.alertTitle}>
                Possível situação de risco
              </AppText>

              <AppDivider style={styles.divider} />

              <View style={styles.infoList}>
                {/* Câmera e Localização */}
                <View style={styles.infoRow}>
                  <AppIcon name="video" size={16} color={colors.primary} decorative={true} />
                  <View style={styles.infoTexts}>
                    <AppText variant="caption" colorRole="textMuted">
                      Câmera de detecção
                    </AppText>
                    <AppText variant="bodyStrong">
                      {alert.camera.name}
                    </AppText>
                    {alert.camera.location && (
                      <AppText variant="small" colorRole="textSecondary">
                        {alert.camera.location}
                      </AppText>
                    )}
                  </View>
                </View>

                {/* Data e Horário */}
                <View style={styles.infoRow}>
                  <AppIcon name="clock" size={16} color={colors.primary} decorative={true} />
                  <View style={styles.infoTexts}>
                    <AppText variant="caption" colorRole="textMuted">
                      Data e horário da detecção
                    </AppText>
                    <AppText variant="bodyStrong">
                      {formatFullDateTime(alert.detectedAt)}
                    </AppText>
                  </View>
                </View>

                {/* Sessão de Monitoramento */}
                <View style={styles.infoRow}>
                  <AppIcon name="shield" size={16} color={colors.primary} decorative={true} />
                  <View style={styles.infoTexts}>
                    <AppText variant="caption" colorRole="textMuted">
                      Sessão de monitoramento
                    </AppText>
                    <AppText variant="telemetry" color={colors.primary}>
                      Sessão #{alert.monitoringId}
                    </AppText>
                  </View>
                </View>

                {/* Notificação associada */}
                {alert.notification && (
                  <View style={styles.infoRow}>
                    <AppIcon name="bell" size={16} color={colors.primary} decorative={true} />
                    <View style={styles.infoTexts}>
                      <AppText variant="caption" colorRole="textMuted">
                        Notificação do alerta
                      </AppText>
                      <AppText variant="small" colorRole="textSecondary">
                        Status: {alert.notification.status}
                        {alert.notification.processedAt
                          ? ` • Processada em ${formatFullDateTime(alert.notification.processedAt)}`
                          : ''}
                      </AppText>
                    </View>
                  </View>
                )}
              </View>
            </AppCard>

            {/* 2. Seção de Evidência Fotográfica (Evidence Frame) */}
            <AppCard variant="raised" style={styles.sectionCard}>
              <View style={styles.evidenceHeader}>
                <View style={styles.evidenceTitleGroup}>
                  <AppIcon name="image" size={18} color={colors.primary} decorative={true} />
                  <AppText variant="heading3">Registro de Evidência</AppText>
                </View>
                <AppBadge
                  variant={alert.evidence.available ? 'info' : 'offline'}
                  label={
                    alert.evidence.available
                      ? 'FRAME CAPTURADO'
                      : alert.evidence.unavailableReason ?? 'INDISPONÍVEL'
                  }
                />
              </View>

              <AppDivider style={styles.divider} />

              <EvidenceFrameView alert={alert} />
            </AppCard>

            {/* 3. Ações inferiores */}
            <View style={styles.bottomActions}>
              <AppButton
                variant="secondary"
                title="Retornar ao Histórico"
                icon="arrow-left"
                onPress={() => router.back()}
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
    paddingTop: spacing[2],
    paddingBottom: spacing[12],
    gap: spacing[4],
  },
  sectionCard: {
    padding: spacing[4],
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[2],
  },
  severityBadgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  alertTitle: {
    marginTop: spacing[1],
    marginBottom: spacing[1],
  },
  divider: {
    marginVertical: spacing[3],
  },
  infoList: {
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
  evidenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  evidenceTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  evidenceBox: {
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceErrorBox: {
    borderWidth: 1,
  },
  evidenceLoadingText: {
    marginTop: spacing[3],
  },
  evidenceStateTitle: {
    marginTop: spacing[2],
    marginBottom: spacing[1],
  },
  evidenceCenteredText: {
    textAlign: 'center',
  },
  retryImageButton: {
    marginTop: spacing[3],
  },
  evidenceLoadedContainer: {
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: 240,
    borderRadius: radius.medium,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  evidenceImage: {
    width: '100%',
    height: '100%',
  },
  privacyNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    marginTop: spacing[2],
    paddingHorizontal: spacing[2],
  },
  privacyNoteText: {
    flex: 1,
  },
  stateCard: {
    alignItems: 'center',
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[5],
  },
  stateTitle: {
    marginTop: spacing[3],
    marginBottom: spacing[1],
    textAlign: 'center',
  },
  centeredText: {
    textAlign: 'center',
  },
  errorActionsRow: {
    marginTop: spacing[4],
    gap: spacing[2],
    width: '100%',
    maxWidth: 240,
  },
  bottomActions: {
    marginTop: spacing[2],
  },
});
