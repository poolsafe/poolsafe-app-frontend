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

// Home — Fatia 4
export type OverallMonitoringStatus =
  | 'ATIVO'
  | 'PAUSADO'
  | 'DEGRADADO'
  | 'INDISPONIVEL';

export type OverallMonitoringReason =
  | 'OPERACIONAL'
  | 'SEM_SESSAO'
  | 'PAUSADO_PELO_USUARIO'
  | 'CAMERAS_INDISPONIVEIS'
  | 'SEM_CAMERA_ONLINE'
  | 'SESSIONS_MIXED';

export type WarningCode =
  | 'NO_CURRENT_MONITORING'
  | 'MONITORING_PAUSED'
  | 'CAMERA_OFFLINE'
  | 'CAMERA_UNKNOWN';

export type WarningSeverity = 'ATENCAO' | 'CRITICA';

export interface HomeWarning {
  code: WarningCode;
  severity: WarningSeverity;
  cameraId?: string;
  monitoringId?: string;
}

export interface LatestAlertCamera {
  id: string;
  name: string;
  location: string | null;
}

export interface LatestAlert {
  id: string;
  type: string;
  severity: string;
  detectedAt: string;
  camera: LatestAlertCamera;
}

export interface OverallMonitoring {
  status: OverallMonitoringStatus;
  reason: OverallMonitoringReason;
  currentSessions: number;
  activeSessions: number;
  pausedSessions: number;
  degradedSessions: number;
  unavailableSessions: number;
}

export interface CamerasSummary {
  total: number;
  online: number;
  offline: number;
  unknown: number;
  inactive: number;
}

export interface HomeData {
  generatedAt: string;
  overallMonitoring: OverallMonitoring;
  cameras: CamerasSummary;
  latestAlert: LatestAlert | null;
  warnings: HomeWarning[];
}

