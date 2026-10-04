import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { alertsApiService } from '@/services/api/alerts-service';
import type { AlertDetailItem } from '@/services/api/types';

export const alertDetailQueryKey = (alertId: string) => ['alerts', alertId] as const;

export function useAlertDetailQuery(alertId: string) {
  const { tokens, updateTokens, status } = useAuth();

  return useQuery<AlertDetailItem, Error>({
    queryKey: alertDetailQueryKey(alertId),
    queryFn: async ({ signal }) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) => alertsApiService.getAlertDetail(alertId, accessToken, signal),
        updateTokens,
      );
    },
    enabled: status === 'authenticated' && !!tokens && !!alertId,
    staleTime: 15_000,
    retry: 1,
  });
}
