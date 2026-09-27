import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { homeApiService } from '@/services/api/home-service';
import type { HomeData } from '@/services/api/types';

export const HOME_QUERY_KEY = ['home'] as const;

export function useHomeQuery() {
  const { tokens, updateTokens, status } = useAuth();

  return useQuery<HomeData, Error>({
    queryKey: HOME_QUERY_KEY,
    queryFn: async ({ signal }) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) => homeApiService.getHomeSummary(accessToken, signal),
        updateTokens,
      );
    },
    enabled: status === 'authenticated' && !!tokens,
    staleTime: 15_000,
    retry: 1,
  });
}
