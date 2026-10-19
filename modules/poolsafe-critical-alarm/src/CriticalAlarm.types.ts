/**
 * Tipos e interfaces para o módulo nativo de Alarme Crítico do PoolSafe.
 * 
 * Fatias 8A.1 e 9B.4 — Alarme Crítico e Recepção de Alerta.
 */

export interface StartAlarmOptions {
  alertId?: string;
  deliveryId?: string;
  title?: string;
  message?: string;
}

export interface AlarmStateChangedEvent {
  isActive: boolean;
  reason?: string;
  alertId?: string;
}

export interface LaunchAlertIntent {
  alertId: string;
  deliveryId?: string;
  source?: string;
}

export type AlarmStateChangeListener = (event: AlarmStateChangedEvent) => void;

export type CriticalAlarmEvents = {
  onAlarmStateChanged: (event: AlarmStateChangedEvent) => void;
};

