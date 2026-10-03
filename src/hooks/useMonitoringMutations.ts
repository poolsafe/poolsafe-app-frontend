import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { monitoringsApiService } from '@/services/api/monitorings-service';
import type {
  MonitoringItem,
  CreateMonitoringPayload,
  PauseMonitoringPayload,
  EndMonitoringPayload,
} from '@/services/api/types';

export function useStartMonitoringMutation() {
  const queryClient = useQueryClient();
  const { tokens, updateTokens } = useAuth();

  return useMutation<MonitoringItem, Error, CreateMonitoringPayload>({
    mutationFn: async (payload: CreateMonitoringPayload) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) => monitoringsApiService.createMonitoring(payload, accessToken),
        updateTokens,
      );
    },
    onSuccess: async () => {
      // Invalidação sem mutação otimista conforme regra do produto
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitorings'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['cameras'] }),
      ]);
    },
  });
}

export function usePauseMonitoringMutation() {
  const queryClient = useQueryClient();
  const { tokens, updateTokens } = useAuth();

  return useMutation<
    MonitoringItem,
    Error,
    { monitoringId: string; payload: PauseMonitoringPayload }
  >({
    mutationFn: async ({ monitoringId, payload }) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) =>
          monitoringsApiService.pauseMonitoring(monitoringId, payload, accessToken),
        updateTokens,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitorings'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['cameras'] }),
      ]);
    },
  });
}

export function useResumeMonitoringMutation() {
  const queryClient = useQueryClient();
  const { tokens, updateTokens } = useAuth();

  return useMutation<MonitoringItem, Error, string>({
    mutationFn: async (monitoringId: string) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) => monitoringsApiService.resumeMonitoring(monitoringId, accessToken),
        updateTokens,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitorings'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['cameras'] }),
      ]);
    },
  });
}

export function useEndMonitoringMutation() {
  const queryClient = useQueryClient();
  const { tokens, updateTokens } = useAuth();

  return useMutation<
    MonitoringItem,
    Error,
    { monitoringId: string; payload: EndMonitoringPayload }
  >({
    mutationFn: async ({ monitoringId, payload }) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) =>
          monitoringsApiService.endMonitoring(monitoringId, payload, accessToken),
        updateTokens,
      );
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['monitorings'] }),
        queryClient.invalidateQueries({ queryKey: ['home'] }),
        queryClient.invalidateQueries({ queryKey: ['cameras'] }),
      ]);
    },
  });
}
