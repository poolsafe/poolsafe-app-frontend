/**
 * Ponto de entrada do módulo local Expo: poolsafe-critical-alarm.
 *
 * Fatias 8A.1 e 9B.4 — Alarme Crítico e Recepção de Alerta.
 */

import CriticalAlarmModule from './CriticalAlarmModule';
import type {
  AlarmStateChangedEvent,
  AlarmStateChangeListener,
  StartAlarmOptions,
} from './CriticalAlarm.types';

export * from './CriticalAlarm.types';

export async function startCriticalAlarmAsync(options?: StartAlarmOptions): Promise<boolean> {
  return await CriticalAlarmModule.startAlarm(options);
}

export async function stopCriticalAlarmAsync(): Promise<boolean> {
  return await CriticalAlarmModule.stopAlarm();
}

export function isCriticalAlarmActive(): boolean {
  return CriticalAlarmModule.isAlarmActive();
}

export function getActiveAlertId(): string | null {
  return CriticalAlarmModule.getActiveAlertId();
}

export function getActiveDeliveryId(): string | null {
  return CriticalAlarmModule.getActiveDeliveryId();
}

export async function clearAlarmStateForTestingAsync(): Promise<boolean> {
  return await CriticalAlarmModule.clearAlarmStateForTesting();
}

export function isIgnoringBatteryOptimizations(): boolean {
  return CriticalAlarmModule.isIgnoringBatteryOptimizations();
}

export async function openBatteryOptimizationSettingsAsync(): Promise<boolean> {
  return await CriticalAlarmModule.openBatteryOptimizationSettings();
}

export function addCriticalAlarmListener(
  listener: AlarmStateChangeListener,
): { remove: () => void } {
  return CriticalAlarmModule.addListener('onAlarmStateChanged', listener);
}

export default CriticalAlarmModule;
