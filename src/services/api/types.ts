/**
 * Tipos e contratos das respostas da API do PoolSafe (v1).
 *
 * Fonte da verdade: docs/api-contract.md e implementação do backend.
 */

export interface ApiResponse<T> {
  data: T;
  meta?: {
    requestId?: string;
  };
}

export interface ProblemErrorItem {
  pointer: string;
  code: string;
  detail: string;
}

export interface ProblemDetails {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  requestId?: string;
  errors?: ProblemErrorItem[];
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  status: string;
  createdAt?: string;
}

export interface AuthTokens {
  tokenType: 'Bearer';
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: string;
  sessionExpiresAt: string;
}

export interface AuthResponseData {
  user: AuthUser;
  tokens: AuthTokens;
}

export type RefreshResponseData = AuthTokens;

export type UserProfileResponseData = AuthUser;

// Payloads de requisição
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RefreshPayload {
  refreshToken: string;
}

export interface LogoutPayload {
  refreshToken: string;
}

export interface UpdateProfilePayload {
  name: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

// Códigos estáveis de erro conhecidos
export const ApiErrorCodes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  ACCOUNT_CANNOT_BE_CREATED: 'ACCOUNT_CANNOT_BE_CREATED',
  AUTHENTICATION_REQUIRED: 'AUTHENTICATION_REQUIRED',
  SESSION_EXPIRED: 'SESSION_EXPIRED',
  ACCESS_DENIED: 'ACCESS_DENIED',
  REAUTHENTICATION_FAILED: 'REAUTHENTICATION_FAILED',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RATE_LIMITED: 'RATE_LIMITED',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
} as const;

export type ApiErrorCode = (typeof ApiErrorCodes)[keyof typeof ApiErrorCodes] | string;
