import { apiClient, HttpClient } from './client.ts';
import type {
  MonitoringItem,
  CreateMonitoringPayload,
  PauseMonitoringPayload,
  EndMonitoringPayload,
} from './types.ts';

export class MonitoringsApiService {
  private client: HttpClient;

  constructor(client: HttpClient = apiClient) {
    this.client = client;
  }

  /**
   * Consulta a lista de sessões de monitoramento atuais (ATIVAS ou PAUSADAS)
   * nas quais o usuário autenticado possui acesso ativo a todas as câmeras.
   * Conforme docs/api-contract.md Seção 16.2.
   */
  public async getCurrentMonitorings(
    token: string,
    signal?: AbortSignal,
  ): Promise<MonitoringItem[]> {
    const response = await this.client.get<MonitoringItem[]>('monitorings/current', {
      token,
      signal,
    });
    return response.data;
  }

  /**
   * Consulta os detalhes de uma sessão autorizada.
   * Conforme docs/api-contract.md Seção 16.3.
   */
  public async getMonitoringById(
    monitoringId: string,
    token: string,
    signal?: AbortSignal,
  ): Promise<MonitoringItem> {
    const response = await this.client.get<MonitoringItem>(`monitorings/${monitoringId}`, {
      token,
      signal,
    });
    return response.data;
  }

  /**
   * Inicia uma nova sessão de monitoramento para o conjunto de câmeras selecionadas.
   * Retorna a nova sessão iniciada ou a sessão ativa já existente com a mesma composição (idempotente).
   * Conforme docs/api-contract.md Seção 16.4.
   */
  public async createMonitoring(
    payload: CreateMonitoringPayload,
    token: string,
    signal?: AbortSignal,
  ): Promise<MonitoringItem> {
    const response = await this.client.post<MonitoringItem>('monitorings', payload, {
      token,
      signal,
    });
    return response.data;
  }

  /**
   * Pausa uma sessão de monitoramento ativa com reautenticação obrigatória por senha.
   * Conforme docs/api-contract.md Seção 16.5.
   */
  public async pauseMonitoring(
    monitoringId: string,
    payload: PauseMonitoringPayload,
    token: string,
    signal?: AbortSignal,
  ): Promise<MonitoringItem> {
    const response = await this.client.post<MonitoringItem>(
      `monitorings/${monitoringId}/pause`,
      payload,
      {
        token,
        signal,
      },
    );
    return response.data;
  }

  /**
   * Retoma uma sessão de monitoramento pausada.
   * Conforme docs/api-contract.md Seção 16.6.
   */
  public async resumeMonitoring(
    monitoringId: string,
    token: string,
    signal?: AbortSignal,
  ): Promise<MonitoringItem> {
    const response = await this.client.post<MonitoringItem>(
      `monitorings/${monitoringId}/resume`,
      undefined,
      {
        token,
        signal,
      },
    );
    return response.data;
  }

  /**
   * Encerra uma sessão de monitoramento definitivamente com reautenticação por senha.
   */
  public async endMonitoring(
    monitoringId: string,
    payload: EndMonitoringPayload,
    token: string,
    signal?: AbortSignal,
  ): Promise<MonitoringItem> {
    const response = await this.client.post<MonitoringItem>(
      `monitorings/${monitoringId}/end`,
      payload,
      {
        token,
        signal,
      },
    );
    return response.data;
  }
}

export const monitoringsApiService = new MonitoringsApiService();
