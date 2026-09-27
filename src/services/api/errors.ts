import { ApiErrorCodes } from './types.ts';
import type { ProblemDetails, ProblemErrorItem } from './types.ts';

/**
 * Classe customizada de erro para respostas da API em formato RFC 9457 Problem Details,
 * erros de rede ou timeouts.
 *
 * NUNCA serializa ou inclui senhas, tokens ou dados sensíveis em sua mensagem.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly title: string;
  public readonly detail: string;
  public readonly requestId?: string;
  public readonly errors?: ProblemErrorItem[];
  public readonly isNetworkError: boolean;
  public readonly isTimeout: boolean;

  constructor(options: {
    status: number;
    code: string;
    title: string;
    detail: string;
    requestId?: string;
    errors?: ProblemErrorItem[];
    isNetworkError?: boolean;
    isTimeout?: boolean;
  }) {
    super(options.detail || options.title);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.title = options.title;
    this.detail = options.detail;
    this.requestId = options.requestId;
    this.errors = options.errors;
    this.isNetworkError = !!options.isNetworkError;
    this.isTimeout = !!options.isTimeout;
  }

  /**
   * Converte a lista de erros de validação RFC 9457 (pointers como "/email", "/password")
   * em um mapa simples campo -> mensagem legível para uso em formulários.
   */
  public getFieldErrors(): Record<string, string> {
    const map: Record<string, string> = {};
    if (!this.errors || !Array.isArray(this.errors)) {
      return map;
    }

    for (const item of this.errors) {
      if (item.pointer) {
        // Remove barra inicial: "/email" -> "email", "/user/name" -> "user.name"
        const fieldName = item.pointer.replace(/^\//, '').replace(/\//g, '.');
        if (fieldName && !map[fieldName]) {
          map[fieldName] = item.detail;
        }
      }
    }

    return map;
  }

  public isRateLimited(): boolean {
    return this.status === 429 || this.code === ApiErrorCodes.RATE_LIMITED;
  }

  public isServiceUnavailable(): boolean {
    return this.status === 503 || this.code === ApiErrorCodes.SERVICE_UNAVAILABLE;
  }

  public isSessionExpired(): boolean {
    return this.code === ApiErrorCodes.SESSION_EXPIRED;
  }

  public isInvalidCredentials(): boolean {
    return this.code === ApiErrorCodes.INVALID_CREDENTIALS;
  }

  public isAccountCannotBeCreated(): boolean {
    return this.code === ApiErrorCodes.ACCOUNT_CANNOT_BE_CREATED;
  }

  public static fromProblemDetails(problem: ProblemDetails, fallbackStatus = 500): ApiError {
    return new ApiError({
      status: problem.status || fallbackStatus,
      code: problem.code || ApiErrorCodes.UNKNOWN_ERROR,
      title: problem.title || 'Erro na requisição',
      detail: problem.detail || 'Ocorreu um erro ao processar sua solicitação.',
      requestId: problem.requestId,
      errors: problem.errors,
    });
  }

  public static networkError(detail = 'Não foi possível conectar ao servidor. Verifique sua conexão.'): ApiError {
    return new ApiError({
      status: 0,
      code: ApiErrorCodes.NETWORK_ERROR,
      title: 'Falha de conexão',
      detail,
      isNetworkError: true,
    });
  }

  public static timeout(detail = 'O servidor demorou muito para responder. Tente novamente.'): ApiError {
    return new ApiError({
      status: 408,
      code: ApiErrorCodes.TIMEOUT,
      title: 'Tempo esgotado',
      detail,
      isTimeout: true,
    });
  }
}
