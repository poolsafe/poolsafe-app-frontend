import { apiClient } from './client.ts';
import type { CameraItem, CameraDetailItem } from './types.ts';

export class CamerasApiService {
  /**
   * Consulta a lista de câmeras autorizadas para o usuário autenticado.
   * Conforme docs/api-contract.md Seção 15.2.
   */
  public async getCameras(token: string, signal?: AbortSignal): Promise<CameraItem[]> {
    const response = await apiClient.get<CameraItem[]>('cameras', {
      token,
      signal,
    });
    return response.data;
  }

  /**
   * Consulta os detalhes operacionais e alertas recentes autorizados de uma câmera.
   * Conforme docs/api-contract.md Seção 15.3.
   */
  public async getCameraDetails(
    cameraId: string,
    token: string,
    signal?: AbortSignal,
  ): Promise<CameraDetailItem> {
    const response = await apiClient.get<CameraDetailItem>(`cameras/${cameraId}`, {
      token,
      signal,
    });
    return response.data;
  }
}

export const camerasApiService = new CamerasApiService();
