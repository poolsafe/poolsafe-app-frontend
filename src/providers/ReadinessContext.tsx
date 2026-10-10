import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { AppState, type AppStateStatus } from 'react-native';

import {
  notificationsService,
  type NotificationsService,
} from '@/services/notifications/notifications-service';
import {
  deviceSyncService,
  type DeviceSyncService,
} from '@/services/devices/device-sync-service';
import type { AlertReadinessDiagnosis } from '@/services/notifications/types';

export interface ReadinessContextValue {
  diagnosis: AlertReadinessDiagnosis | null;
  isLoading: boolean;
  hasPendingReadiness: boolean;
  /** Publica um diagnóstico já calculado (referência estável, sem nova consulta nativa). */
  publishDiagnosis: (diagnosis: AlertReadinessDiagnosis) => void;
  refreshDiagnosis: (options?: { reapplyChannel?: boolean }) => Promise<AlertReadinessDiagnosis | null>;
}

const ReadinessContext = createContext<ReadinessContextValue | null>(null);

export interface ReadinessProviderProps {
  children: ReactNode;
  service?: NotificationsService;
  deviceSync?: DeviceSyncService;
}

/**
 * Provedor de prontidão de alertas nativos (Android/iOS).
 *
 * Mantém sincronizado em tempo real o diagnóstico de alertas e disponibiliza
 * o estado de pendência (`hasPendingReadiness`) para toda a árvore da aplicação,
 * incluindo a Bottom Navigation e os menus de Definições.
 */
export function ReadinessProvider({
  children,
  service = notificationsService,
  deviceSync = deviceSyncService,
}: ReadinessProviderProps) {
  const [diagnosis, setDiagnosis] = useState<AlertReadinessDiagnosis | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const refreshDiagnosis = useCallback(
    async (options?: { reapplyChannel?: boolean }): Promise<AlertReadinessDiagnosis | null> => {
      try {
        const diag = await service.getDiagnosisAsync(options);
        setDiagnosis(diag);
        return diag;
      } catch (err: unknown) {
        console.warn('[ReadinessProvider] Falha ao atualizar diagnóstico:', err);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [service],
  );

  const publishDiagnosis = useCallback((diag: AlertReadinessDiagnosis) => {
    setDiagnosis((prev) =>
      prev && prev.status === diag.status && prev.summary === diag.summary ? prev : diag,
    );
    setIsLoading(false);
  }, []);

  // Carrega diagnóstico na montagem inicial
  useEffect(() => {
    void refreshDiagnosis();
  }, [refreshDiagnosis]);

  // Recalcula imediatamente quando o app volta do segundo plano ou configurações nativas
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void refreshDiagnosis();
        void deviceSync.syncDeviceAsync();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [refreshDiagnosis, deviceSync]);

  // Sincroniza quando o alarme crítico é encerrado ou atualizado
  useEffect(() => {
    const subscription = service.addCriticalAlarmListener(() => {
      void refreshDiagnosis({ reapplyChannel: false });
    });

    return () => {
      subscription.remove();
    };
  }, [service, refreshDiagnosis]);

  // Pendência identificada caso diagnóstico exista e NÃO esteja com status 'PRONTO'
  const hasPendingReadiness = useMemo(() => {
    if (!diagnosis) return false;
    return diagnosis.status !== 'PRONTO';
  }, [diagnosis]);

  const value = useMemo<ReadinessContextValue>(
    () => ({
      diagnosis,
      isLoading,
      hasPendingReadiness,
      publishDiagnosis,
      refreshDiagnosis,
    }),
    [diagnosis, isLoading, hasPendingReadiness, publishDiagnosis, refreshDiagnosis],
  );

  return (
    <ReadinessContext.Provider value={value}>
      {children}
    </ReadinessContext.Provider>
  );
}

/**
 * Hook para acessar o estado e ações de prontidão de alertas.
 */
export function useAlertReadiness(): ReadinessContextValue {
  const context = useContext(ReadinessContext);
  if (!context) {
    // Fallback defensivo caso usado fora do provider (ex: testes unitários isolados)
    return {
      diagnosis: null,
      isLoading: false,
      hasPendingReadiness: false,
      publishDiagnosis: () => {},
      refreshDiagnosis: async () => null,
    };
  }
  return context;
}
