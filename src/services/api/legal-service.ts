import { apiClient, type HttpClient } from './client.ts';
import type {
  LegalDocumentMetadata,
  LegalDocumentResponseData,
} from './types.ts';

export class LegalApiService {
  private readonly client: HttpClient;

  constructor(client: HttpClient = apiClient) {
    this.client = client;
  }

  /**
   * Consulta a lista pública de metadados dos documentos legais vigentes.
   */
  public async getDocuments(signal?: AbortSignal): Promise<LegalDocumentMetadata[]> {
    const response = await this.client.get<LegalDocumentMetadata[]>('legal/documents', {
      signal,
    });
    return response.data;
  }

  /**
   * Consulta o conteúdo completo de um documento legal versionado.
   */
  public async getDocument(
    id: string,
    version?: string,
    signal?: AbortSignal,
  ): Promise<LegalDocumentResponseData> {
    const path = version
      ? `legal/documents/${encodeURIComponent(id)}?version=${encodeURIComponent(version)}`
      : `legal/documents/${encodeURIComponent(id)}`;

    const response = await this.client.get<LegalDocumentResponseData>(path, {
      signal,
    });
    return response.data;
  }
}

export const legalApiService = new LegalApiService();
