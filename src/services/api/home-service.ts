import { apiClient } from './client.ts';
import type { HomeData } from './types.ts';

export class HomeApiService {
  /**
   * Consulta o resumo operacional da Home autenticado conforme api-contract.md Seção 14.
   */
  public async getHomeSummary(token: string, signal?: AbortSignal): Promise<HomeData> {
    const response = await apiClient.get<HomeData>('home', {
      token,
      signal,
    });
    return response.data;
  }
}

export const homeApiService = new HomeApiService();
