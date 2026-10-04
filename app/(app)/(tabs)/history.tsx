import React from 'react';
import {
  View,
  FlatList,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppBadge } from '@/components/primitives/AppBadge';
import { AppBanner } from '@/components/primitives/AppBanner';
import { AppButton } from '@/components/primitives/AppButton';
import { AppIcon } from '@/components/primitives/AppIcon';
import { AlertCard } from '@/components/domain/AlertCard';

import { useAlertsInfiniteQuery } from '@/hooks/useAlertsInfiniteQuery';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/tokens';
import type { AlertSummaryItem } from '@/services/api/types';

export default function HistoryScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  const {
    data,
    isPending,
    isError,
    isFetching,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useAlertsInfiniteQuery();

  // Consolidação de todas as páginas carregadas em um único array plano
  const allAlerts: AlertSummaryItem[] =
    data?.pages.flatMap((page) => page.data) ?? [];

  const handleOpenDetail = (alertId: string) => {
    router.push({
      pathname: '/(app)/alerts/[id]',
      params: { id: alertId },
    });
  };

  const handleEndReached = () => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Histórico"
        subtitle="Alertas e possíveis situações de risco"
      />

      <View style={styles.container}>
        {/* Banner de dados em cache desatualizados quando falhar refetch com dados existentes */}
        {isError && allAlerts.length > 0 && (
          <View style={styles.bannerContainer}>
            <AppBanner
              variant="warning"
              icon="alert-circle"
              title="Dados desatualizados"
              message="Não foi possível atualizar o histórico de alertas. Os itens abaixo refletem a última consulta confirmada."
              actionTitle="Tentar novamente"
              onAction={() => refetch()}
              actionLoading={isFetching}
            />
          </View>
        )}

        {/* ESTADO 1: Carregamento inicial (sem nenhum dado prévio) */}
        {isPending && allAlerts.length === 0 && (
          <View style={styles.stateContainer}>
            <AppCard variant="glass" style={styles.stateCard}>
              <ActivityIndicator size="large" color={colors.primary} />
              <AppText variant="bodyStrong" style={styles.stateTitle}>
                Consultando histórico de alertas...
              </AppText>
              <AppText
                variant="small"
                colorRole="textMuted"
                style={styles.centeredText}
              >
                Buscando eventos registrados e evidências autorizadas para sua conta.
              </AppText>
            </AppCard>
          </View>
        )}

        {/* ESTADO 2: Erro na consulta sem dados prévios */}
        {isError && allAlerts.length === 0 && (
          <View style={styles.stateContainer}>
            <AppCard
              variant="default"
              style={[styles.stateCard, { borderColor: colors.danger }]}
            >
              <AppBadge variant="danger" label="NÃO VERIFICADO" icon="cloud-off" />
              <AppText
                variant="heading3"
                color={colors.danger}
                style={styles.stateTitle}
              >
                Não foi possível carregar o histórico
              </AppText>
              <AppText
                variant="body"
                colorRole="textSecondary"
                style={styles.centeredText}
              >
                Falha ao conectar com o servidor do PoolSafe. Por segurança, a ausência de resposta nunca é tratada como estado seguro.
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
          </View>
        )}

        {/* ESTADO 3: Lista de alertas carregada */}
        {!isPending && !isError && allAlerts.length === 0 && (
          <View style={styles.stateContainer}>
            <AppCard variant="raised" style={styles.stateCard}>
              <AppIcon
                name="check-circle"
                size={36}
                color={colors.success}
                decorative={true}
              />
              <AppText variant="heading3" style={styles.stateTitle}>
                Nenhum alerta registrado
              </AppText>
              <AppText
                variant="body"
                colorRole="textSecondary"
                style={styles.centeredText}
              >
                Nenhum evento de risco foi atribuído a você até o momento. Quando houver ocorrências nas piscinas monitoradas, elas aparecerão aqui.
              </AppText>
              <View style={styles.retryActionContainer}>
                <AppButton
                  variant="secondary"
                  title="Atualizar histórico"
                  icon="refresh-cw"
                  loading={isFetching}
                  onPress={() => refetch()}
                />
              </View>
            </AppCard>
          </View>
        )}

        {allAlerts.length > 0 && (
          <FlatList
            data={allAlerts}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <AlertCard
                alert={item}
                onPress={() => handleOpenDetail(item.id)}
                style={styles.itemSpacing}
              />
            )}
            contentContainerStyle={styles.listContent}
            onEndReached={handleEndReached}
            onEndReachedThreshold={0.4}
            refreshControl={
              <RefreshControl
                refreshing={isFetching && !isFetchingNextPage}
                onRefresh={() => refetch()}
                tintColor={colors.primary}
                colors={[colors.primary]}
              />
            }
            ListFooterComponent={
              <View style={styles.footerContainer}>
                {isFetchingNextPage && (
                  <View style={styles.loadingMoreBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <AppText
                      variant="caption"
                      colorRole="textMuted"
                      style={styles.loadingMoreText}
                    >
                      Carregando mais alertas...
                    </AppText>
                  </View>
                )}
                {!hasNextPage && allAlerts.length > 0 && (
                  <AppText
                    variant="caption"
                    colorRole="textMuted"
                    style={styles.endOfListText}
                  >
                    Fim do histórico de alertas
                  </AppText>
                )}
              </View>
            }
          />
        )}
      </View>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  bannerContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[12],
  },
  itemSpacing: {
    marginBottom: spacing[3],
  },
  stateContainer: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
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
    marginBottom: spacing[2],
  },
  retryActionContainer: {
    marginTop: spacing[3],
    width: '100%',
    maxWidth: 240,
  },
  footerContainer: {
    paddingVertical: spacing[4],
    alignItems: 'center',
  },
  loadingMoreBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  loadingMoreText: {
    marginTop: 1,
  },
  endOfListText: {
    textAlign: 'center',
  },
});
