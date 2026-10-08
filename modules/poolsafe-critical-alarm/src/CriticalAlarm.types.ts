/**
 * Tipos e interfaces para o módulo nativo de Alarme Crítico do PoolSafe.
 * 
 * Fatia 8A.1 — Prova nativa de alarme crítico.
 */

export interface AlarmStateChangedEvent {
  isActive: boolean;
  reason?: string;
}

export type AlarmStateChangeListener = (event: AlarmStateChangedEvent) => void;

export type CriticalAlarmEvents = {
  onAlarmStateChanged: (event: AlarmStateChangedEvent) => void;
};
