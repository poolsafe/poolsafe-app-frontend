import { env } from '../../config/env.ts';
import { ApiError } from './errors.ts';
import type { ApiResponse, ProblemDetails } from './types.ts';

export interface RequestOptions {
  headers?: Record<string, string>;
  token?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 10000;

/**
 * Cliente HTTP leve baseado em fetch nativo para a API PoolSafe.
 *
 * Tratamento rigoroso de:
 * - Envelope de resposta data/meta
 * - RFC 9457 Problem Details para erros
 * - Respostas 204 No Content
 * - Falhas de rede e timeouts
 * - Proibição total de logs de credenciais e tokens
 */
export class HttpClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = env.apiBaseUrl) {
    this.baseUrl = baseUrl;
  }

  private buildUrl(path: string): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  private async execute(
    url: string,
    init: RequestInit,
    timeoutMs: number = DEFAULT_TIMEOUT_MS,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: init.signal || controller.signal,
      });
      return response;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw ApiError.timeout();
      }
      throw ApiError.networkError();
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async parseResponse<T>(response: Response): Promise<T> {
    // 204 No Content
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return undefined as unknown as T;
    }

    const contentType = response.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json') || contentType.includes('application/problem+json');

    if (!isJson) {
      if (!response.ok) {
        throw new ApiError({
          status: response.status,
          code: `HTTP_${response.status}`,
          title: response.statusText || 'Erro no servidor',
          detail: 'O servidor retornou uma resposta inesperada.',
        });
      }
      return undefined as unknown as T;
    }

    let parsedJson: unknown;
    try {
      parsedJson = await response.json();
    } catch {
      if (!response.ok) {
        throw new ApiError({
          status: response.status,
          code: `HTTP_${response.status}`,
          title: response.statusText || 'Erro no servidor',
          detail: 'Falha ao processar corpo de resposta da API.',
        });
      }
      return undefined as unknown as T;
    }

    if (!response.ok) {
      const problem = parsedJson as ProblemDetails;
      throw ApiError.fromProblemDetails(problem, response.status);
    }

    return parsedJson as T;
  }

  public async get<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await this.execute(
      url,
      {
        method: 'GET',
        headers,
        signal: options.signal,
      },
      options.timeoutMs,
    );

    return this.parseResponse<ApiResponse<T>>(response);
  }

  public async post<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await this.execute(
      url,
      {
        method: 'POST',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: options.signal,
      },
      options.timeoutMs,
    );

    return this.parseResponse<ApiResponse<T>>(response);
  }

  public async postNoContent(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<void> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await this.execute(
      url,
      {
        method: 'POST',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: options.signal,
      },
      options.timeoutMs,
    );

    await this.parseResponse<void>(response);
  }

  public async patch<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await this.execute(
      url,
      {
        method: 'PATCH',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: options.signal,
      },
      options.timeoutMs,
    );

    return this.parseResponse<ApiResponse<T>>(response);
  }

  public async put<T>(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await this.execute(
      url,
      {
        method: 'PUT',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: options.signal,
      },
      options.timeoutMs,
    );

    return this.parseResponse<ApiResponse<T>>(response);
  }

  public async putNoContent(
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<void> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await this.execute(
      url,
      {
        method: 'PUT',
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: options.signal,
      },
      options.timeoutMs,
    );

    await this.parseResponse<void>(response);
  }

  public async delete<T>(path: string, options: RequestOptions = {}): Promise<ApiResponse<T>> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'application/json, application/problem+json',
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await this.execute(
      url,
      {
        method: 'DELETE',
        headers,
        signal: options.signal,
      },
      options.timeoutMs,
    );

    return this.parseResponse<ApiResponse<T>>(response);
  }

  /**
   * Executa uma requisição GET para transmissão autorizada de dados binários em memória (ex: evidência).
   * Não grava em disco nem em caches persistentes.
   */
  public async getBinary(
    path: string,
    options: RequestOptions = {},
  ): Promise<{ data: Uint8Array; contentType: string }> {
    const url = this.buildUrl(path);
    const headers: Record<string, string> = {
      Accept: 'image/jpeg, image/png, application/problem+json',
      ...options.headers,
    };

    if (options.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    }

    const response = await this.execute(
      url,
      {
        method: 'GET',
        headers,
        signal: options.signal,
      },
      options.timeoutMs,
    );

    if (!response.ok) {
      let problem: ProblemDetails | undefined;
      try {
        problem = (await response.json()) as ProblemDetails;
      } catch {
        // Ignora erro de parsing JSON
      }

      if (problem && problem.code) {
        throw ApiError.fromProblemDetails(problem, response.status);
      }

      throw new ApiError({
        status: response.status,
        code: `HTTP_${response.status}`,
        title: response.statusText || 'Erro no servidor',
        detail: 'Falha ao obter conteúdo da API.',
      });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await response.arrayBuffer();

    return {
      data: new Uint8Array(arrayBuffer),
      contentType,
    };
  }
}

export const apiClient = new HttpClient();
