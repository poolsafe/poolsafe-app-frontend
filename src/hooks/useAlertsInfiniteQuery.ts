import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { alertsApiService } from '@/services/api/alerts-service';
import type { AlertsListResponseData } from '@/services/api/types';

export const alertsInfiniteQueryKey = ['alerts'] as const;

export function useAlertsInfiniteQuery() {
  const { tokens, updateTokens, status } = useAuth();

  return useInfiniteQuery<AlertsListResponseData, Error>({
    queryKey: alertsInfiniteQueryKey,
    queryFn: async ({ pageParam, signal }) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) =>
          alertsApiService.getAlerts(
            accessToken,
            { cursor: pageParam as string | undefined },
            signal,
          ),
        updateTokens,
      );
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) =>
      lastPage.pagination.hasMore
        ? (lastPage.pagination.nextCursor ?? undefined)
        : undefined,
    enabled: status === 'authenticated' && !!tokens,
    staleTime: 15_000,
  });
}
