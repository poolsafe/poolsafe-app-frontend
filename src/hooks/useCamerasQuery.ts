import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { camerasApiService } from '@/services/api/cameras-service';
import type { CameraItem } from '@/services/api/types';

export const CAMERAS_QUERY_KEY = ['cameras'] as const;

export function useCamerasQuery() {
  const { tokens, updateTokens, status } = useAuth();

  return useQuery<CameraItem[], Error>({
    queryKey: CAMERAS_QUERY_KEY,
    queryFn: async ({ signal }) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) => camerasApiService.getCameras(accessToken, signal),
        updateTokens,
      );
    },
    enabled: status === 'authenticated' && !!tokens,
    staleTime: 15_000,
    retry: 1,
  });
}
