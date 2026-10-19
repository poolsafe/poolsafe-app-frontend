import { NativeModule, requireNativeModule } from 'expo';
import type {
  CriticalAlarmEvents,
  StartAlarmOptions,
} from './CriticalAlarm.types';

declare class CriticalAlarmModuleInstance extends NativeModule<CriticalAlarmEvents> {
  startAlarm(options?: StartAlarmOptions): Promise<boolean>;
  stopAlarm(): Promise<boolean>;
  isAlarmActive(): boolean;
  getActiveAlertId(): string | null;
  getActiveDeliveryId(): string | null;
  clearAlarmStateForTesting(): Promise<boolean>;
  isIgnoringBatteryOptimizations(): boolean;
  openBatteryOptimizationSettings(): Promise<boolean>;
  getLaunchAlertIntent(): import('./CriticalAlarm.types').LaunchAlertIntent | null;
  clearLaunchAlertIntent(): boolean;
}

export default requireNativeModule<CriticalAlarmModuleInstance>('CriticalAlarm');
