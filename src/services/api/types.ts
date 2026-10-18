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
  phone?: string | null;
  status: string;
  createdAt?: string;
  termsVersion?: string | null;
  termsAcceptedAt?: string | null;
  privacyVersion?: string | null;
  privacyAwareAt?: string | null;
  phoneContactAuthorized?: boolean;
  phoneContactVersion?: string | null;
  phoneContactGrantedAt?: string | null;
  phoneContactRevokedAt?: string | null;
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

// Documentos legais versionados
export interface LegalDocumentMetadata {
  id: string;
  title: string;
  version: string;
  updatedAt: string;
}

export interface LegalDocumentResponseData extends LegalDocumentMetadata {
  content: string;
}

// Payloads de requisição
export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  termsAccepted: boolean;
  termsVersion: string;
  privacyAware: boolean;
  privacyVersion: string;
  phone?: string | null;
  phoneContactAuthorized?: boolean;
  phoneContactVersion?: string;
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
  name?: string;
  phone?: string | null;
  phoneContactAuthorized?: boolean;
}

export interface RegisterManifestationsPayload {
  termsAccepted: boolean;
  termsVersion: string;
  privacyAware: boolean;
  privacyVersion: string;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ForgotPasswordResponseData {
  message: string;
}

export interface ResetPasswordPayload {
  token: string;
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
  INVALID_RESET_TOKEN: 'INVALID_RESET_TOKEN',
  RESET_TOKEN_EXPIRED: 'RESET_TOKEN_EXPIRED',
  MONITORING_STATE_CONFLICT: 'MONITORING_STATE_CONFLICT',
  CAMERA_NOT_OPERATIONAL: 'CAMERA_NOT_OPERATIONAL',
  EVIDENCE_NOT_FOUND: 'EVIDENCE_NOT_FOUND',
  EVIDENCE_UNAVAILABLE: 'EVIDENCE_UNAVAILABLE',
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

// Câmeras — Fatia 5
export type CameraAdministrativeStatus = 'ATIVA' | 'INATIVA';
export type CameraConnectionStatus = 'ONLINE' | 'OFFLINE' | 'DESCONHECIDA';

export interface CameraCurrentMonitoring {
  id: string;
  status: string;
  operationalStatus: string;
}

export interface CameraAlertCamera {
  id: string;
  name: string;
  location: string | null;
}

export interface CameraRecentAlert {
  id: string;
  type: string;
  severity: string;
  detectedAt: string;
  camera: CameraAlertCamera;
  evidenceAvailable: boolean;
}

export interface CameraItem {
  id: string;
  name: string;
  location: string | null;
  administrativeStatus: CameraAdministrativeStatus;
  connectionStatus: CameraConnectionStatus;
  lastCommunicationAt: string | null;
  currentMonitoring: CameraCurrentMonitoring | null;
  recentAlertsCount: number;
}

export interface CameraDetailItem extends CameraItem {
  recentAlerts: CameraRecentAlert[];
}

// Monitoramentos — Fatia 6
export type MonitoringStatus = 'ATIVO' | 'PAUSADO' | 'ENCERRADO';

export type MonitoringOperationalStatus =
  | 'ATIVO'
  | 'PAUSADO'
  | 'DEGRADADO'
  | 'INDISPONIVEL';

export type MonitoringOperationalReason =
  | 'OPERACIONAL'
  | 'SEM_SESSAO'
  | 'PAUSADO_PELO_USUARIO'
  | 'CAMERAS_INDISPONIVEIS'
  | 'SEM_CAMERA_ONLINE';

export interface MonitoringCameraItem {
  id: string;
  name: string;
  connectionStatus: CameraConnectionStatus;
}

export interface MonitoringItem {
  id: string;
  status: MonitoringStatus;
  operationalStatus: MonitoringOperationalStatus;
  operationalReason: MonitoringOperationalReason;
  cameras: MonitoringCameraItem[];
  startedAt: string;
  pausedAt: string | null;
  endedAt: string | null;
  updatedAt: string;
}

export interface CreateMonitoringPayload {
  cameraIds: string[];
}

export interface PauseMonitoringPayload {
  password: string;
}

export interface EndMonitoringPayload {
  password: string;
}

// Alertas e Evidências — Fatia 7
export type AlertSeverity = 'ATENCAO' | 'CRITICA';
export type EvidenceUnavailableReason = 'NOT_CAPTURED' | 'EXPIRED' | 'REMOVED';

export interface AlertCameraSummary {
  id: string;
  name: string;
  location: string | null;
}

export interface AlertSummaryItem {
  id: string;
  type: string;
  severity: AlertSeverity;
  detectedAt: string;
  camera: AlertCameraSummary;
  evidenceAvailable: boolean;
}

export interface AlertsPaginationMeta {
  nextCursor: string | null;
  hasMore: boolean;
}

export interface AlertsListResponseData {
  data: AlertSummaryItem[];
  pagination: AlertsPaginationMeta;
  meta?: {
    requestId?: string;
  };
}

export interface AlertEvidenceInfo {
  available: boolean;
  mimeType: string | null;
  expiresAt: string | null;
  unavailableReason: EvidenceUnavailableReason | null;
}

export interface AlertNotificationInfo {
  status: string;
  processedAt: string | null;
}

export interface AlertDetailItem {
  id: string;
  type: string;
  severity: AlertSeverity;
  detectedAt: string;
  camera: AlertCameraSummary;
  monitoringId: string;
  evidence: AlertEvidenceInfo;
  notification: AlertNotificationInfo | null;
}

