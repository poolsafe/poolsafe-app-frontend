/**
 * Ponto de entrada do módulo local Expo: poolsafe-critical-alarm.
 *
 * Fatia 8A.1 — Prova nativa de alarme crítico.
 */

import CriticalAlarmModule from './CriticalAlarmModule';
import type {
  AlarmStateChangedEvent,
  AlarmStateChangeListener,
} from './CriticalAlarm.types';

export * from './CriticalAlarm.types';

export async function startCriticalAlarmAsync(): Promise<boolean> {
  return await CriticalAlarmModule.startAlarm();
}

export async function stopCriticalAlarmAsync(): Promise<boolean> {
  return await CriticalAlarmModule.stopAlarm();
}

export function isCriticalAlarmActive(): boolean {
  return CriticalAlarmModule.isAlarmActive();
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
