import { registerWebModule, NativeModule } from 'expo';
import type { AlarmStateChangedEvent, CriticalAlarmEvents } from './CriticalAlarm.types';

class CriticalAlarmModuleWeb extends NativeModule<CriticalAlarmEvents> {
  async startAlarm(): Promise<boolean> {
    return false;
  }

  async stopAlarm(): Promise<boolean> {
    return false;
  }

  isAlarmActive(): boolean {
    return false;
  }

  isIgnoringBatteryOptimizations(): boolean {
    return false;
  }

  async openBatteryOptimizationSettings(): Promise<boolean> {
    return false;
  }
}

export default registerWebModule(CriticalAlarmModuleWeb, 'CriticalAlarm');
