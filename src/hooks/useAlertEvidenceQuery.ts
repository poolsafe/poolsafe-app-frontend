import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { alertsApiService } from '@/services/api/alerts-service';

export const alertEvidenceQueryKey = (alertId: string) =>
  ['alerts', alertId, 'evidence'] as const;

export function useAlertEvidenceQuery(alertId: string, isAvailable: boolean) {
  const { tokens, updateTokens, status } = useAuth();

  return useQuery<{ dataUri: string; mimeType: string }, Error>({
    queryKey: alertEvidenceQueryKey(alertId),
    queryFn: async ({ signal }) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) => alertsApiService.getAlertEvidence(alertId, accessToken, signal),
        updateTokens,
      );
    },
    enabled: status === 'authenticated' && !!tokens && !!alertId && isAvailable,
    // gcTime: 0 garante descarte imediato da memória ao desmontar o componente
    gcTime: 0,
    staleTime: 60_000,
    retry: 1,
  });
}
