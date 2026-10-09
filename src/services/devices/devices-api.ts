/**
 * Cliente API dedicado aos endpoints de dispositivos e tokens FCM.
 * Fatia 8B — Dispositivo e FCM Token.
 */

import { apiClient, HttpClient } from '../api/client.ts';
import type { ApiResponse } from '../api/types.ts';
import type {
  DeviceResponseData,
  UpsertDevicePayload,
} from './types.ts';

export class DevicesApiService {
  private readonly client: HttpClient;

  constructor(client: HttpClient = apiClient) {
    this.client = client;
  }

  /**
   * Registra ou atualiza o dispositivo vinculado ao usuário autenticado.
   * PUT /api/v1/devices/{installationId}
   */
  public async upsertDevice(
    installationId: string,
    payload: UpsertDevicePayload,
    accessToken: string,
  ): Promise<DeviceResponseData> {
    const response = await this.client.put<DeviceResponseData>(
      `/devices/${encodeURIComponent(installationId)}`,
      payload,
      {
        token: accessToken,
      },
    );
    return response.data;
  }

  /**
   * Invalida e desassocia o dispositivo do usuário autenticado.
   * DELETE /api/v1/devices/{installationId}
   */
  public async deleteDevice(
    installationId: string,
    accessToken: string,
  ): Promise<void> {
    await this.client.deleteNoContent(
      `/devices/${encodeURIComponent(installationId)}`,
      {
        token: accessToken,
      },
    );
  }
}

export const devicesApiService = new DevicesApiService();
