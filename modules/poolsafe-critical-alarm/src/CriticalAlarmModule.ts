import { NativeModule, requireNativeModule } from 'expo';
import type { AlarmStateChangedEvent, CriticalAlarmEvents } from './CriticalAlarm.types';

declare class CriticalAlarmModuleInstance extends NativeModule<CriticalAlarmEvents> {
  startAlarm(): Promise<boolean>;
  stopAlarm(): Promise<boolean>;
  isAlarmActive(): boolean;
  isIgnoringBatteryOptimizations(): boolean;
  openBatteryOptimizationSettings(): Promise<boolean>;
}

export default requireNativeModule<CriticalAlarmModuleInstance>('CriticalAlarm');
