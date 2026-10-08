/**
 * Tipos e interfaces para o diagnóstico de prontidão Android de alertas.
 * 
 * Fatia 8A — Prontidão Android para alertas.
 */

export type AlertReadinessStatus = 'PRONTO' | 'DEGRADADO' | 'DESATIVADO';

export const ALERT_READINESS_STATUSES = ['PRONTO', 'DEGRADADO', 'DESATIVADO'] as const;

export type CheckItemStatus = 'ok' | 'warning' | 'error' | 'info';

export type ReadinessActionType =
  | 'request_permission'
  | 'app_settings'
  | 'channel_settings'
  | 'dnd_settings'
  | 'battery_settings';

export interface CheckItem {
  id: string;
  title: string;
  description: string;
  status: CheckItemStatus;
  actionType?: ReadinessActionType;
  actionLabel?: string;
}

export interface NotificationPermissionSummary {
  granted: boolean;
  status: string; // 'granted' | 'denied' | 'undetermined'
  canAskAgain: boolean;
}

export interface NotificationChannelSummary {
  id: string;
  name: string | null;
  importance: number; // AndroidImportance enum value: MAX=7, HIGH=6, DEFAULT=5, LOW=4, MIN=3, NONE=2
  sound: string | null; // 'custom' | 'default' | null
  bypassDnd: boolean;
  audioUsage?: number; // AndroidAudioUsage.ALARM = 4
  audioContentType?: number; // AndroidAudioContentType.SONIFICATION = 4
  vibrationPattern?: number[] | null;
  enableVibrate?: boolean;
}

export interface AlertReadinessDiagnosis {
  status: AlertReadinessStatus;
  summary: string;
  detail: string;
  canTest: boolean;
  checks: CheckItem[];
  evaluatedAt: string;
  rawPermission?: NotificationPermissionSummary | null;
  rawChannel?: NotificationChannelSummary | null;
  isIgnoringBatteryOptimizations?: boolean | null;
  isCriticalAlarmActive?: boolean;
}

