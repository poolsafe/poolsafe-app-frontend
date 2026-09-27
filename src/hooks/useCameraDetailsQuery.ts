import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/providers/AuthContext';
import { authService } from '@/services/auth/auth-service';
import { camerasApiService } from '@/services/api/cameras-service';
import type { CameraDetailItem } from '@/services/api/types';

export const cameraDetailsQueryKey = (cameraId: string) => ['cameras', cameraId] as const;

export function useCameraDetailsQuery(cameraId: string) {
  const { tokens, updateTokens, status } = useAuth();

  return useQuery<CameraDetailItem, Error>({
    queryKey: cameraDetailsQueryKey(cameraId),
    queryFn: async ({ signal }) => {
      if (!tokens) {
        throw new Error('Usuário não autenticado');
      }
      return await authService.executeWithAuth(
        tokens,
        (accessToken) => camerasApiService.getCameraDetails(cameraId, accessToken, signal),
        updateTokens,
      );
    },
    enabled: status === 'authenticated' && !!tokens && !!cameraId,
    staleTime: 15_000,
    retry: 1,
  });
}
