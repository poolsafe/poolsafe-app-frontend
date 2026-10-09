/**
 * Serviço de coordenação de sincronização de dispositivos e tokens FCM.
 * Fatia 8B — Dispositivo e FCM Token.
 * 
 * Princípios de segurança e robustez:
 * - Persistência única e contínua do poolSafeInstallationId no SecureStore (nunca apagado no logout).
 * - Single-flight e serialização com semântica "latest-wins": nunca executa múltiplas
 *   requisições de sincronização concorrentes.
 * - Registro com fcmToken: null quando a permissão de notificações estiver negada/indisponível.
 * - Subscrição a eventos de rotação de token nativo (addPushTokenListener).
 * - Tolerância a falhas transitórias com bounded retry e backoff exponencial.
 * - Desregistro defensivo no logout (unregisterForNotificationsAsync) e cancelamento de listeners.
 * - Proibição total de exibição ou log de tokens brutos e identificadores sensíveis.
 */

import { authService, AuthService } from '../auth/auth-service.ts';
import { loadSession } from '../auth/secure-storage.ts';
import type { AuthTokens } from '../api/types.ts';
import { ApiError } from '../api/errors.ts';
import { devicesApiService, DevicesApiService } from './devices-api.ts';
import {
  getOrGenerateInstallationIdAsync,
  getInstallationIdFromStorageAsync,
} from './installation-id.ts';
import type {
  DeviceRegistrationState,
  DeviceSyncDriver,
  PushTokenData,
  PushTokenSubscription,
  UpsertDevicePayload,
} from './types.ts';

export type {
  DeviceRegistrationState,
  DeviceSyncDriver,
  PushTokenData,
  PushTokenSubscription,
  UpsertDevicePayload,
};

export function maskToken(token: string | null | undefined): string | null {
  if (!token) return null;
  const trimmed = token.trim();
  if (trimmed.length <= 8) return '••••';
  return `••••${trimmed.slice(-6)}`;
}

export function maskInstallationId(id: string | null | undefined): string {
  if (!id) return 'Não identificado';
  const trimmed = id.trim();
  if (trimmed.length <= 8) return trimmed;
  return `••••${trimmed.slice(-8)}`;
}

let activeDriver: DeviceSyncDriver | null = null;

function getDefaultDriver(): DeviceSyncDriver {
  if (!activeDriver) {
    try {
      // Import dinâmico do expo-notifications no ambiente React Native
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const Notifications = require('expo-notifications');
      activeDriver = {
        getDevicePushTokenAsync: async () => {
          try {
            return await Notifications.getDevicePushTokenAsync();
          } catch (err: unknown) {
            console.warn(
              '[DeviceSyncService] Falha ao invocar Notifications.getDevicePushTokenAsync():',
              err instanceof Error ? err.message : String(err),
            );
            throw err;
          }
        },
        addPushTokenListener: (listener: (token: PushTokenData) => void) => {
          return Notifications.addPushTokenListener((token: PushTokenData) => {
            listener(token);
          });
        },
        unregisterForNotificationsAsync: async () => {
          try {
            await Notifications.unregisterForNotificationsAsync();
          } catch {
            // Silencia falhas no unregister defensivo
          }
        },
        getPermissionsAsync: async () => {
          try {
            return await Notifications.getPermissionsAsync();
          } catch {
            return { granted: false };
          }
        },
      };
    } catch {
      activeDriver = {
        getDevicePushTokenAsync: async () => null,
        unregisterForNotificationsAsync: async () => {},
        getPermissionsAsync: async () => ({ granted: false }),
      };
    }
  }
  return activeDriver;
}

export function setDeviceSyncDriver(driver: DeviceSyncDriver | null): void {
  activeDriver = driver;
}

export class DeviceSyncService {
  private readonly devicesApi: DevicesApiService;
  private readonly auth: AuthService;
  private state: DeviceRegistrationState = {
    installationId: '',
    status: 'idle',
    lastSyncedAt: null,
    hasFcmToken: false,
    fcmTokenMasked: null,
    error: null,
  };

  private stateListeners: Set<(state: DeviceRegistrationState) => void> = new Set();
  private isSyncing = false;
  private pendingSyncTokens: AuthTokens | null = null;
  private pushTokenSubscription: PushTokenSubscription | null = null;
  private activeTokens: AuthTokens | null = null;
  private lastSyncedTokenValue: string | null | undefined = undefined;

  constructor(
    devicesApi: DevicesApiService = devicesApiService,
    auth: AuthService = authService,
  ) {
    this.devicesApi = devicesApi;
    this.auth = auth;
  }

  public getState(): DeviceRegistrationState {
    return { ...this.state };
  }

  public addStateListener(listener: (state: DeviceRegistrationState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    const currentState = this.getState();
    this.stateListeners.forEach((listener) => {
      try {
        listener(currentState);
      } catch {
        // Listener com erro não corrompe o serviço
      }
    });
  }

  private extractTokenString(token: PushTokenData | string | null | undefined): string | null {
    if (!token) return null;
    if (typeof token === 'string') return token.trim();
    if (typeof token === 'object' && typeof token.data === 'string') return token.data.trim();
    return null;
  }

  /**
   * Inicializa o ouvinte nativo de alterações/rotações de Push Token.
   */
  public setupPushTokenListener(authTokens: AuthTokens): void {
    this.activeTokens = authTokens;
    if (this.pushTokenSubscription) {
      return;
    }

    const driver = activeDriver || getDefaultDriver();
    if (typeof driver.addPushTokenListener === 'function') {
      try {
        this.pushTokenSubscription = driver.addPushTokenListener((tokenData) => {
          const newToken = this.extractTokenString(tokenData);
          if (this.activeTokens && newToken !== this.lastSyncedTokenValue) {
            void this.syncDeviceAsync(this.activeTokens);
          }
        });
      } catch {
        // Se a plataforma não suportar o listener, opera em modo silencioso
      }
    }
  }

  /**
   * Remove o listener de rotação de token e cancela pendências de sincronização.
   */
  public teardownPushTokenListener(): void {
    if (this.pushTokenSubscription) {
      try {
        this.pushTokenSubscription.remove();
      } catch {
        // Silencia falhas na remoção
      }
      this.pushTokenSubscription = null;
    }
    this.pendingSyncTokens = null;
  }

  /**
   * Sincroniza o dispositivo atual de forma single-flight e idempotente (latest-wins).
   */
  public async syncDeviceAsync(tokens?: AuthTokens): Promise<DeviceRegistrationState> {
    let authTokens = tokens || this.activeTokens;
    if (!authTokens) {
      const session = await loadSession();
      if (session) {
        authTokens = {
          tokenType: session.tokenType,
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
          accessExpiresAt: session.accessExpiresAt,
          sessionExpiresAt: session.sessionExpiresAt,
        };
      }
    }

    if (!authTokens) {
      return this.getState();
    }

    this.activeTokens = authTokens;
    this.setupPushTokenListener(authTokens);

    // Se já houver sincronização em trânsito, agenda para a próxima rodada (serialização)
    if (this.isSyncing) {
      this.pendingSyncTokens = authTokens;
      return this.getState();
    }

    this.isSyncing = true;
    const installationId = await getOrGenerateInstallationIdAsync();

    this.state = {
      ...this.state,
      installationId,
      status: 'syncing',
      error: null,
    };
    this.notifyListeners();

    try {
      const driver = activeDriver || getDefaultDriver();

      // 1. Verifica permissão de notificações com diferenciação estrita
      let permissionState: 'granted' | 'denied' | 'undetermined' | 'unknown' = 'unknown';
      if (typeof driver.getPermissionsAsync === 'function') {
        try {
          const perm = await driver.getPermissionsAsync();
          if (perm?.granted) {
            permissionState = 'granted';
          } else if (perm?.status === 'denied') {
            permissionState = 'denied';
          } else {
            permissionState = 'undetermined';
          }
        } catch (err: unknown) {
          permissionState = 'unknown';
          const errMsg = err instanceof Error ? err.message : String(err);
          console.warn('[DeviceSyncService] Erro ao consultar permissões nativas:', errMsg);
        }
      } else {
        permissionState = 'granted';
      }

      // Se a checagem de permissão falhou por erro transitório, NÃO envia null para a API:
      // Preserva o registro remoto no backend e aborta com erro para retentativa posterior.
      if (permissionState === 'unknown') {
        throw new Error('Falha temporária ao verificar permissão de notificações');
      }

      if (permissionState === 'undetermined') {
        // PERMISSÃO NÃO DETERMINADA (o usuário ainda não respondeu à solicitação):
        // NÃO chama a API com null para não apagar token remoto pré-existente.
        // Representa localmente o estado "Aguardando Permissão" e segue o fluxo de solicitação já existente.
        this.state = {
          ...this.state,
          installationId,
          status: 'idle',
          hasPermission: false,
          hasFcmToken: false,
          fcmTokenMasked: null,
          tokenError: 'Aguardando permissão de notificações no sistema operacional',
          error: null,
        };
        this.notifyListeners();
        return this.getState();
      }

      // 2. Resolução do token FCM nativo
      const hasPermission = permissionState === 'granted';
      let fcmToken: string | null = null;
      let tokenError: string | null = null;

      if (hasPermission) {
        if (typeof driver.getDevicePushTokenAsync === 'function') {
          try {
            const rawToken = await driver.getDevicePushTokenAsync();
            fcmToken = this.extractTokenString(rawToken);
            if (!fcmToken) {
              throw new Error('Token push nativo retornado vazio');
            }
          } catch (err: unknown) {
            // ERRO TEMPORÁRIO / FALHA DO FIREBASE / FALTA DE REDE AO OBTER TOKEN:
            // NÃO envia null para a API para não apagar token válido já existente no backend!
            tokenError = err instanceof Error ? err.message : String(err);
            console.warn('[DeviceSyncService] Falha temporária ao obter token FCM nativo:', tokenError);
            throw new Error(`Falha temporária ao obter token push nativo: ${tokenError}`);
          }
        }
      } else {
        // PERMISSÃO CONFIRMADAMENTE NEGADA (DENIED):
        // Somente neste caso enviamos explicitamente fcmToken: null para o backend
        fcmToken = null;
        tokenError = 'Permissão de notificações negada no sistema operacional';
      }

      const payload: UpsertDevicePayload = {
        platform: 'ANDROID',
        fcmToken: fcmToken || null,
      };

      // 3. Executa o registro com retry delimitado e renovação preventiva de token se necessário
      await this.executeSyncWithRetry(installationId, payload, authTokens);

      this.lastSyncedTokenValue = fcmToken;
      this.state = {
        installationId,
        status: 'synced',
        lastSyncedAt: new Date().toISOString(),
        hasFcmToken: Boolean(fcmToken),
        fcmTokenMasked: maskToken(fcmToken),
        hasPermission,
        tokenError,
        error: null,
      };
      this.notifyListeners();
    } catch (err: unknown) {
      const errorMessage =
        err instanceof ApiError ? err.detail : err instanceof Error ? err.message : 'Falha na sincronização';
      this.state = {
        ...this.state,
        status: 'failed',
        error: errorMessage,
      };
      this.notifyListeners();
    } finally {
      this.isSyncing = false;

      // Se um novo evento ocorreu durante a sincronização, dispara rodada com estado mais recente
      if (this.pendingSyncTokens) {
        const nextTokens = this.pendingSyncTokens;
        this.pendingSyncTokens = null;
        // Executa sem encadear recursão síncrona
        void this.syncDeviceAsync(nextTokens);
      }
    }

    return this.getState();
  }

  /**
   * Executa chamada à API com renovação preventiva e até 2 retentativas em caso de falha de rede.
   */
  private async executeSyncWithRetry(
    installationId: string,
    payload: UpsertDevicePayload,
    tokens: AuthTokens,
    maxRetries = 2,
  ): Promise<void> {
    let attempt = 0;
    while (attempt <= maxRetries) {
      try {
        await this.auth.executeWithAuth(tokens, async (accessToken) => {
          return this.devicesApi.upsertDevice(installationId, payload, accessToken);
        });
        return;
      } catch (err: unknown) {
        attempt++;
        const isNetwork = err instanceof ApiError && err.isNetworkError;
        if (isNetwork && attempt <= maxRetries) {
          // Bounded backoff
          await new Promise((resolve) => setTimeout(resolve, attempt * 300));
          continue;
        }
        throw err;
      }
    }
  }

  /**
   * Desregistra o dispositivo local e remoto de forma coordenada durante o logout.
   */
  public async unregisterDeviceOnLogoutAsync(refreshToken?: string): Promise<void> {
    this.teardownPushTokenListener();
    this.activeTokens = null;
    this.lastSyncedTokenValue = undefined;

    const driver = activeDriver || getDefaultDriver();
    // 1. Desregistro nativo defensivo
    if (typeof driver.unregisterForNotificationsAsync === 'function') {
      try {
        await driver.unregisterForNotificationsAsync();
      } catch {
        // Falha no desregistro local não bloqueia encerramento seguro
      }
    }

    // 2. Consulta a instalação persistida
    const installationId = await getInstallationIdFromStorageAsync();

    // 3. Executa o logout no backend informando o installationId para desassociação atômica
    await this.auth.logout(refreshToken, installationId || undefined);

    // 4. Limpa o estado em memória mantendo a instalação do hardware
    this.state = {
      installationId: installationId || '',
      status: 'idle',
      lastSyncedAt: null,
      hasFcmToken: false,
      fcmTokenMasked: null,
      error: null,
    };
    this.notifyListeners();
  }
}

export const deviceSyncService = new DeviceSyncService();
