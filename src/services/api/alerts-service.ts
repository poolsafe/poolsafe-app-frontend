import { apiClient } from './client.ts';
import type {
  AlertsListResponseData,
  AlertDetailItem,
  AlertSummaryItem,
  AlertsPaginationMeta,
} from './types.ts';
import { uint8ArrayToBase64 } from '../../utils/base64.ts';

export interface GetAlertsParams {
  limit?: number;
  cursor?: string;
  cameraId?: string;
  severity?: 'ATENCAO' | 'CRITICA';
  from?: string;
  to?: string;
}

export class AlertsApiService {
  private readonly client: typeof apiClient;

  constructor(client: typeof apiClient = apiClient) {
    this.client = client;
  }

  /**
   * Consulta a lista histórica e paginada de alertas autorizados para o usuário autenticado.
   * Conforme docs/api-contract.md Seção 17.2.
   */
  public async getAlerts(
    token: string,
    params: GetAlertsParams = {},
    signal?: AbortSignal,
  ): Promise<AlertsListResponseData> {
    const searchParams = new URLSearchParams();
    if (params.limit !== undefined) searchParams.set('limit', params.limit.toString());
    if (params.cursor) searchParams.set('cursor', params.cursor);
    if (params.cameraId) searchParams.set('cameraId', params.cameraId);
    if (params.severity) searchParams.set('severity', params.severity);
    if (params.from) searchParams.set('from', params.from);
    if (params.to) searchParams.set('to', params.to);

    const queryStr = searchParams.toString();
    const path = queryStr ? `alerts?${queryStr}` : 'alerts';

    // A rota retorna { data: AlertSummaryItem[], pagination: {...}, meta: {...} }
    const response = await this.client.get<AlertSummaryItem[]>(path, {
      token,
      signal,
    });

    const pagination: AlertsPaginationMeta = (response as any).pagination ?? {
      nextCursor: null,
      hasMore: false,
    };

    return {
      data: response.data,
      pagination,
      meta: response.meta,
    };
  }

  /**
   * Consulta os detalhes de um alerta histórico autorizado.
   * Conforme docs/api-contract.md Seção 17.3.
   */
  public async getAlertDetail(
    alertId: string,
    token: string,
    signal?: AbortSignal,
  ): Promise<AlertDetailItem> {
    const response = await this.client.get<AlertDetailItem>(`alerts/${alertId}`, {
      token,
      signal,
    });
    return response.data;
  }

  /**
   * Transmite com segurança os bytes da evidência associada ao alerta, convertendo
   * em memória para Data URL utilizável pelo componente Image do React Native.
   * Nunca persiste a imagem em disco, AsyncStorage ou SecureStore.
   * Conforme docs/api-contract.md Seção 17.4.
   */
  public async getAlertEvidence(
    alertId: string,
    token: string,
    signal?: AbortSignal,
  ): Promise<{ dataUri: string; mimeType: string }> {
    const { data, contentType } = await this.client.getBinary(`alerts/${alertId}/evidence`, {
      token,
      signal,
    });

    const base64 = uint8ArrayToBase64(data);
    const dataUri = `data:${contentType};base64,${base64}`;

    return {
      dataUri,
      mimeType: contentType,
    };
  }
}

export const alertsApiService = new AlertsApiService();
