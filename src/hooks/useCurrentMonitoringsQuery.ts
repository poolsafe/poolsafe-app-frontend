import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { monitoringsApiService } from '@/services/api/monitorings-service';
import type { MonitoringItem } from '@/services/api/types';

export const CURRENT_MONITORINGS_QUERY_KEY = ['monitorings', 'current'] as const;

export function useCurrentMonitoringsQuery() {
  const { tokens, updateTokens, status } = useAuth();

  return useQuery<MonitoringItem[], Error>({
    queryKey: CURRENT_MONITORINGS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) => monitoringsApiService.getCurrentMonitorings(accessToken, signal),
        updateTokens,
      );
    },
    enabled: status === 'authenticated' && !!tokens,
    staleTime: 15_000,
    retry: 1,
  });
}
