/**
 * Tipos e interfaces canônicos para sincronização de dispositivos e tokens FCM.
 * Fatia 8B — Dispositivo e FCM Token.
 */

export type DevicePlatform = 'ANDROID';

export type DeviceSyncStatus = 'idle' | 'syncing' | 'synced' | 'failed';

export interface DeviceRegistrationState {
  installationId: string;
  status: DeviceSyncStatus;
  lastSyncedAt: string | null;
  hasFcmToken: boolean;
  fcmTokenMasked: string | null;
  hasPermission?: boolean;
  tokenError?: string | null;
  error: string | null;
}

export interface UpsertDevicePayload {
  platform: DevicePlatform;
  fcmToken?: string | null;
}

export interface DeviceResponseData {
  id: string;
  installationId: string;
  platform: DevicePlatform;
  active: boolean;
  hasFcmToken: boolean;
  registeredAt: string;
  updatedAt: string;
}

export interface PushTokenData {
  type?: string;
  data: string;
}

export interface PushTokenSubscription {
  remove: () => void;
}

export interface DeviceSyncDriver {
  getDevicePushTokenAsync: () => Promise<PushTokenData | string | null>;
  addPushTokenListener?: (
    listener: (token: PushTokenData) => void,
  ) => PushTokenSubscription;
  unregisterForNotificationsAsync?: () => Promise<void>;
  getPermissionsAsync?: () => Promise<{ granted: boolean; status?: string }>;
}
