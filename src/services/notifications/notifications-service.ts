/**
 * Serviço de gerenciamento de notificações locais e canal crítico do PoolSafe.
 * 
 * Implementa a camada nativa com expo-notifications, canais versionados do Android,
 * som provisório e Intents de configuração do sistema operacional.
 * 
 * Utiliza o padrão de driver desacoplado (conforme adotado em secure-storage.ts)
 * para permitir execução e testes limpos sem acoplamento a código compilado.
 * 
 * Fatia 8A — Prontidão Android para alertas.
 */

import {
  CRITICAL_ALERT_CHANNEL_ID,
  CRITICAL_ALERT_CHANNEL_NAME,
  CRITICAL_ALERT_CHANNEL_DESCRIPTION,
  PROVISIONAL_ALERT_SOUND_FILE,
  CRITICAL_VIBRATION_PATTERN,
  NOTIFICATION_ACCENT_COLOR,
  TEST_NOTIFICATION_TITLE,
  TEST_NOTIFICATION_BODY,
} from './constants.ts';
import type {
  AlertReadinessDiagnosis,
  NotificationChannelSummary,
  NotificationPermissionSummary,
} from './types.ts';
import { evaluateAlertReadiness } from './readiness.ts';

export interface NotificationsDriver {
  setNotificationHandler?: (handler: unknown) => void;
  setNotificationChannelAsync?: (channelId: string, channelConfiguration: unknown) => Promise<unknown>;
  getNotificationChannelAsync?: (channelId: string) => Promise<unknown>;
  getPermissionsAsync?: () => Promise<{ granted: boolean; status: string; canAskAgain: boolean }>;
  requestPermissionsAsync?: (request?: unknown) => Promise<{ granted: boolean; status: string; canAskAgain: boolean }>;
  scheduleNotificationAsync?: (request: unknown) => Promise<string>;
  dismissNotificationAsync?: (identifier: string) => Promise<void>;
  dismissAllNotificationsAsync?: () => Promise<void>;
  AndroidImportance?: Record<string, number>;
  AndroidAudioUsage?: Record<string, number>;
  AndroidAudioContentType?: Record<string, number>;
  AndroidNotificationVisibility?: Record<string, number>;
  AndroidNotificationPriority?: Record<string, string>;
}

export interface PlatformLinkingDriver {
  OS: string;
  sendIntent?: (action: string, extras?: Array<{ key: string; value: string | number | boolean }>) => Promise<void>;
  openSettings?: () => Promise<void>;
  getApplicationId?: () => string | null;
}

export interface CriticalAlarmDriver {
  startAlarmAsync: (options?: {
    alertId?: string;
    deliveryId?: string;
    title?: string;
    message?: string;
  }) => Promise<boolean>;
  stopAlarmAsync: () => Promise<boolean>;
  isAlarmActive: () => boolean;
  getActiveAlertId?: () => string | null;
  getActiveDeliveryId?: () => string | null;
  clearAlarmStateForTestingAsync?: () => Promise<boolean>;
  isIgnoringBatteryOptimizations?: () => boolean;
  openBatteryOptimizationSettingsAsync?: () => Promise<boolean>;
  addListener?: (
    listener: (event: { isActive: boolean; reason?: string }) => void,
  ) => { remove: () => void };
}

let activeNotificationsDriver: NotificationsDriver | null = null;
let activePlatformLinkingDriver: PlatformLinkingDriver | null = null;
let activeCriticalAlarmDriver: CriticalAlarmDriver | null = null;

function getNotificationsDriver(): NotificationsDriver {
  if (!activeNotificationsDriver) {
    try {
      // Import dinâmico em tempo de execução no app React Native
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      activeNotificationsDriver = require('expo-notifications');
    } catch {
      // Driver ausente (ex: ambiente de teste puro sem mock atribuído)
    }
  }
  return activeNotificationsDriver || {};
}

function getPlatformLinkingDriver(): PlatformLinkingDriver {
  if (!activePlatformLinkingDriver) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const rn = require('react-native');
      activePlatformLinkingDriver = {
        OS: rn.Platform.OS,
        sendIntent: rn.Linking.sendIntent.bind(rn.Linking),
        openSettings: rn.Linking.openSettings.bind(rn.Linking),
      };
    } catch {
      activePlatformLinkingDriver = {
        OS: 'android',
        sendIntent: async () => {},
        openSettings: async () => {},
      };
    }
  }
  return activePlatformLinkingDriver;
}

function getCriticalAlarmDriver(): CriticalAlarmDriver {
  if (!activeCriticalAlarmDriver) {
    try {
      // Import dinâmico do módulo local poolsafe-critical-alarm
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('../../../modules/poolsafe-critical-alarm/src/index.ts');
      activeCriticalAlarmDriver = {
        startAlarmAsync: (options) => mod.startCriticalAlarmAsync(options),
        stopAlarmAsync: () => mod.stopCriticalAlarmAsync(),
        isAlarmActive: () => mod.isCriticalAlarmActive(),
        getActiveAlertId: () => mod.getActiveAlertId?.() ?? null,
        getActiveDeliveryId: () => mod.getActiveDeliveryId?.() ?? null,
        clearAlarmStateForTestingAsync: () =>
          mod.clearAlarmStateForTestingAsync?.() ?? Promise.resolve(false),
        isIgnoringBatteryOptimizations: () => mod.isIgnoringBatteryOptimizations?.() ?? false,
        openBatteryOptimizationSettingsAsync: () =>
          mod.openBatteryOptimizationSettingsAsync?.() ?? Promise.resolve(false),
        addListener: (listener) => mod.addCriticalAlarmListener?.(listener) ?? { remove: () => {} },
      };
    } catch {
      activeCriticalAlarmDriver = {
        startAlarmAsync: async () => false,
        stopAlarmAsync: async () => true,
        isAlarmActive: () => false,
        getActiveAlertId: () => null,
        getActiveDeliveryId: () => null,
        clearAlarmStateForTestingAsync: async () => false,
        isIgnoringBatteryOptimizations: () => false,
        openBatteryOptimizationSettingsAsync: async () => false,
        addListener: () => ({ remove: () => {} }),
      };
    }
  }
  return activeCriticalAlarmDriver;
}

export function setNotificationsDriver(driver: NotificationsDriver | null): void {
  activeNotificationsDriver = driver;
}

export function setPlatformLinkingDriver(driver: PlatformLinkingDriver | null): void {
  activePlatformLinkingDriver = driver;
}

export function setCriticalAlarmDriver(driver: CriticalAlarmDriver | null): void {
  activeCriticalAlarmDriver = driver;
}

/**
 * Obtém dinamicamente o application ID / package name Android,
 * consultando expo-application ou expo-constants.
 * Retorna null se não estiver disponível.
 */
function resolveApplicationId(customPlatform?: PlatformLinkingDriver): string | null {
  if (customPlatform?.getApplicationId) {
    const id = customPlatform.getApplicationId();
    if (id) return id;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Application = require('expo-application');
    if (Application?.applicationId) {
      return Application.applicationId;
    }
  } catch {
    // Silencia e tenta expo-constants
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Constants = require('expo-constants').default;
    const pkg = Constants?.expoConfig?.android?.package;
    if (pkg) {
      return pkg;
    }
  } catch {
    // Silencia
  }

  return null;
}

export class NotificationsService {
  private customDriver?: NotificationsDriver;
  private customPlatformDriver?: PlatformLinkingDriver;
  private customCriticalAlarmDriver?: CriticalAlarmDriver;
  private channelInitialized = false;

  constructor(
    customNotificationsDriver?: NotificationsDriver,
    customPlatformDriver?: PlatformLinkingDriver,
    customCriticalAlarmDriver?: CriticalAlarmDriver,
  ) {
    if (customNotificationsDriver) {
      this.customDriver = customNotificationsDriver;
    }
    if (customPlatformDriver) {
      this.customPlatformDriver = customPlatformDriver;
    }
    if (customCriticalAlarmDriver) {
      this.customCriticalAlarmDriver = customCriticalAlarmDriver;
    }

    this.initForegroundHandler();
  }

  private get driver(): NotificationsDriver {
    return this.customDriver || getNotificationsDriver();
  }

  private get platform(): PlatformLinkingDriver {
    return this.customPlatformDriver || getPlatformLinkingDriver();
  }

  private get criticalAlarm(): CriticalAlarmDriver {
    return this.customCriticalAlarmDriver || getCriticalAlarmDriver();
  }

  /**
   * Retorna o application ID do Android resolvido dinamicamente, ou null se não determinado.
   */
  getApplicationId(): string | null {
    return resolveApplicationId(this.platform);
  }

  /**
   * Configuração de apresentação em primeiro plano.
   */
  private initForegroundHandler(): void {
    try {
      const driver = this.driver;
      if (driver?.setNotificationHandler) {
        driver.setNotificationHandler({
          handleNotification: async () => ({
            shouldShowAlert: true,
            shouldShowBanner: true,
            shouldShowList: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            priority: driver.AndroidNotificationPriority?.MAX ?? 'max',
          }),
        });
      }
    } catch {
      // Ignora se o handler não puder ser registrado em ambiente sem suporte
    }
  }

  /**
   * Inicializa ou reaplica o canal crítico versionado no Android.
   * Não altera canais existentes com o mesmo ID para não sobrescrever preferências do usuário,
   * mas garante sua criação ou sincronização idempotente (ex: após concessão de DND).
   */
  async setupCriticalChannelAsync(): Promise<unknown | null> {
    if (this.platform.OS !== 'android') {
      return null;
    }

    const driver = this.driver;
    if (!driver.setNotificationChannelAsync) {
      return null;
    }

    try {
      const channel = await driver.setNotificationChannelAsync(
        CRITICAL_ALERT_CHANNEL_ID,
        {
          name: CRITICAL_ALERT_CHANNEL_NAME,
          description: CRITICAL_ALERT_CHANNEL_DESCRIPTION,
          importance: driver.AndroidImportance?.MAX ?? 7,
          sound: PROVISIONAL_ALERT_SOUND_FILE,
          vibrationPattern: CRITICAL_VIBRATION_PATTERN,
          enableVibrate: true,
          enableLights: true,
          lightColor: NOTIFICATION_ACCENT_COLOR,
          // Visibilidade restrita na tela de bloqueio (PRIVATE) para preservar privacidade
          lockscreenVisibility: driver.AndroidNotificationVisibility?.PRIVATE ?? 2,
          bypassDnd: true,
          showBadge: true,
          audioAttributes: {
            usage: driver.AndroidAudioUsage?.ALARM ?? 4,
            contentType: driver.AndroidAudioContentType?.SONIFICATION ?? 4,
            flags: {
              enforceAudibility: false,
              requestHardwareAudioVideoSynchronization: false,
            },
          },
        },
      );

      this.channelInitialized = true;
      return channel;
    } catch (err: unknown) {
      // Registra aviso de forma segura sem vazar dados sensíveis
      console.warn('[NotificationsService] Falha ao configurar canal crítico Android:', err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  /**
   * Consulta a permissão geral de notificações do sistema.
   */
  async getPermissionsAsync(): Promise<NotificationPermissionSummary> {
    const driver = this.driver;
    if (!driver.getPermissionsAsync) {
      return {
        granted: false,
        status: 'denied',
        canAskAgain: false,
      };
    }

    try {
      const perms = await driver.getPermissionsAsync();
      return {
        granted: perms.granted,
        status: perms.status,
        canAskAgain: perms.canAskAgain,
      };
    } catch {
      return {
        granted: false,
        status: 'denied',
        canAskAgain: false,
      };
    }
  }

  /**
   * Solicita permissão de notificações ao usuário (Android 13+ / iOS).
   * Se concedida, inicializa o canal crítico imediatamente.
   */
  async requestPermissionsAsync(): Promise<NotificationPermissionSummary> {
    const driver = this.driver;
    if (!driver.requestPermissionsAsync) {
      return {
        granted: false,
        status: 'denied',
        canAskAgain: false,
      };
    }

    try {
      const perms = await driver.requestPermissionsAsync({
        ios: {
          allowAlert: true,
          allowBadge: true,
          allowSound: true,
        },
      });

      if (perms.granted && this.platform.OS === 'android') {
        await this.setupCriticalChannelAsync();
      }

      return {
        granted: perms.granted,
        status: perms.status,
        canAskAgain: perms.canAskAgain,
      };
    } catch {
      return {
        granted: false,
        status: 'denied',
        canAskAgain: false,
      };
    }
  }

  /**
   * Consulta a configuração efetiva do canal crítico no Android.
   */
  async getCriticalChannelAsync(): Promise<NotificationChannelSummary | null> {
    if (this.platform.OS !== 'android') {
      return null;
    }

    const driver = this.driver;
    if (!driver.getNotificationChannelAsync) {
      return null;
    }

    try {
      // Tenta obter o canal configurado
      let channel = (await driver.getNotificationChannelAsync(CRITICAL_ALERT_CHANNEL_ID)) as Record<string, unknown> | null;

      // Se o canal ainda não existe, tenta criá-lo automaticamente
      if (!channel && !this.channelInitialized) {
        channel = (await this.setupCriticalChannelAsync()) as Record<string, unknown> | null;
      }

      if (!channel) {
        return null;
      }

      const audioAttributes = channel.audioAttributes as Record<string, unknown> | undefined;

      return {
        id: String(channel.id ?? CRITICAL_ALERT_CHANNEL_ID),
        name: (channel.name as string | null) ?? null,
        importance: Number(channel.importance ?? 0),
        sound: (channel.sound as string | null) ?? null,
        bypassDnd: Boolean(channel.bypassDnd),
        audioUsage: audioAttributes?.usage !== undefined ? Number(audioAttributes.usage) : undefined,
        audioContentType: audioAttributes?.contentType !== undefined ? Number(audioAttributes.contentType) : undefined,
        vibrationPattern: (channel.vibrationPattern as number[] | null) ?? null,
        enableVibrate: channel.enableVibrate !== undefined ? Boolean(channel.enableVibrate) : undefined,
      };
    } catch (err: unknown) {
      console.warn('[NotificationsService] Falha ao consultar canal crítico:', err instanceof Error ? err.message : String(err));
      return null;
    }
  }

  /**
   * Diagnóstico consolidado da prontidão do aparelho.
   * 
   * Fluxo garantido (especialmente após retorno de configurações ou DND):
   * 1. Consulta permissão geral;
   * 2. Reaplica idempotentemente a configuração do canal no Android (para sincronizar bypassDnd se DND foi autorizado);
   * 3. Consulta novamente a configuração efetiva do canal;
   * 4. Recalcula a prontidão somente depois disso.
   */
  async getDiagnosisAsync(options: { reapplyChannel?: boolean } = { reapplyChannel: true }): Promise<AlertReadinessDiagnosis> {
    try {
      const permission = await this.getPermissionsAsync();

      // 1. Re-aplica idempotentemente a configuração do canal no Android
      // para que autorizações de "Não Perturbe" ou alterações de política sejam sincronizadas
      if (this.platform.OS === 'android' && options.reapplyChannel !== false) {
        await this.setupCriticalChannelAsync();
      }

      // 2. Consulta novamente o canal para capturar a configuração efetiva do SO
      const channel = await this.getCriticalChannelAsync();

      const isIgnoringBattery =
        this.platform.OS === 'android' ? this.isIgnoringBatteryOptimizations() : null;

      const isAlarmActive = this.isCriticalAlarmActive();

      // 3. Recalcula a prontidão estritamente após a re-consulta
      return evaluateAlertReadiness(permission, channel, {
        isAndroid: this.platform.OS === 'android',
        isIgnoringBatteryOptimizations: isIgnoringBattery,
        isCriticalAlarmActive: isAlarmActive,
      });
    } catch (err: unknown) {
      // Contingência sem quebrar a tela de Definições
      console.warn('[NotificationsService] Falha ao gerar diagnóstico:', err instanceof Error ? err.message : String(err));
      return {
        status: 'DESATIVADO',
        summary: 'Não foi possível verificar a prontidão do aparelho.',
        detail: 'Ocorreu uma falha ao consultar as permissões e canais de notificações do sistema operacional.',
        canTest: false,
        checks: [
          {
            id: 'system_error',
            title: 'Erro de comunicação nativa',
            description: 'Não foi possível obter o estado das notificações do sistema operacional.',
            status: 'error',
            actionType: 'app_settings',
            actionLabel: 'Verificar Configurações',
          },
        ],
        evaluatedAt: new Date().toISOString(),
      };
    }
  }

  /**
   * Dispara um alerta local de teste pelo canal crítico e com som provisório.
   * Não chama API, FCM nem serviços remotos.
   */
  async sendTestNotificationAsync(): Promise<string> {
    const diagnosis = await this.getDiagnosisAsync({ reapplyChannel: false });
    if (!diagnosis.canTest) {
      throw new Error(
        diagnosis.status === 'DESATIVADO'
          ? 'As notificações estão desativadas. Habilite a permissão antes de realizar o teste.'
          : 'O canal crítico de alertas não está pronto para disparo de testes.',
      );
    }

    // Garante canal antes do envio
    if (this.platform.OS === 'android') {
      await this.setupCriticalChannelAsync();
    }

    const driver = this.driver;
    if (!driver.scheduleNotificationAsync) {
      throw new Error('Módulo de notificações nativas não disponível.');
    }

    return await driver.scheduleNotificationAsync({
      content: {
        title: TEST_NOTIFICATION_TITLE,
        body: TEST_NOTIFICATION_BODY,
        sound: PROVISIONAL_ALERT_SOUND_FILE,
        vibrate: CRITICAL_VIBRATION_PATTERN,
        color: NOTIFICATION_ACCENT_COLOR,
        priority: driver.AndroidNotificationPriority?.MAX ?? 'max',
        data: {
          isTest: true,
          timestamp: Date.now(),
        },
      },
      trigger:
        this.platform.OS === 'android'
          ? {
              channelId: CRITICAL_ALERT_CHANNEL_ID,
            }
          : null,
    });
  }

  /**
   * Descarta uma notificação específica pelo identificador.
   */
  async dismissNotificationAsync(identifier: string): Promise<void> {
    try {
      const driver = this.driver;
      if (driver.dismissNotificationAsync) {
        await driver.dismissNotificationAsync(identifier);
      }
    } catch {
      // Silencia falha de descarte
    }
  }

  /**
   * Descarta todas as notificações ativas do aplicativo.
   */
  async dismissAllNotificationsAsync(): Promise<void> {
    try {
      const driver = this.driver;
      if (driver.dismissAllNotificationsAsync) {
        await driver.dismissAllNotificationsAsync();
      }
    } catch {
      // Silencia falha de descarte
    }
  }

  /**
   * Abre as configurações gerais de notificação do aplicativo no Android.
   * Se o package name não puder ser determinado dinamicamente, usa Linking.openSettings() como fallback genérico.
   */
  async openAppNotificationSettings(): Promise<void> {
    const packageName = this.getApplicationId();

    if (this.platform.OS === 'android' && this.platform.sendIntent && packageName) {
      try {
        await this.platform.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
          { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
        ]);
        return;
      } catch {
        // Fallback para abertura genérica via openSettings
      }
    }
    if (this.platform.openSettings) {
      await this.platform.openSettings();
    }
  }

  /**
   * Abre diretamente a tela de configuração do canal crítico no Android.
   * Se o package name não puder ser determinado dinamicamente, usa Linking.openSettings() como fallback genérico.
   */
  async openChannelNotificationSettings(): Promise<void> {
    const packageName = this.getApplicationId();

    if (this.platform.OS === 'android' && this.platform.sendIntent && packageName) {
      try {
        await this.platform.sendIntent('android.settings.CHANNEL_NOTIFICATION_SETTINGS', [
          { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
          { key: 'android.provider.extra.CHANNEL_ID', value: CRITICAL_ALERT_CHANNEL_ID },
        ]);
        return;
      } catch {
        // Tenta abrir as configurações gerais de notificação do app com o package name
        try {
          await this.platform.sendIntent('android.settings.APP_NOTIFICATION_SETTINGS', [
            { key: 'android.provider.extra.APP_PACKAGE', value: packageName },
          ]);
          return;
        } catch {
          // Fallback para configurações gerais
        }
      }
    }
    if (this.platform.openSettings) {
      await this.platform.openSettings();
    }
  }

  /**
   * Abre a tela de configuração de acesso ao Não Perturbe (Notification Policy Access) no Android.
   */
  async openDndSettings(): Promise<void> {
    if (this.platform.OS === 'android' && this.platform.sendIntent) {
      try {
        await this.platform.sendIntent('android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');
        return;
      } catch {
        // Fallback
      }
    }
    if (this.platform.openSettings) {
      await this.platform.openSettings();
    }
  }

  /**
   * Inicia o teste da prova nativa de alarme crítico via Foreground Service (Fatias 8A.1 e 9B.4).
   */
  async startCriticalAlarmAsync(options?: {
    alertId?: string;
    deliveryId?: string;
    title?: string;
    message?: string;
  }): Promise<boolean> {
    return await this.criticalAlarm.startAlarmAsync(options);
  }

  /**
   * Interrompe o alarme crítico em execução e libera todos os recursos nativos.
   */
  async stopCriticalAlarmAsync(): Promise<boolean> {
    return await this.criticalAlarm.stopAlarmAsync();
  }

  /**
   * Consulta se o alarme crítico está ativo no momento.
   */
  isCriticalAlarmActive(): boolean {
    return this.criticalAlarm.isAlarmActive();
  }

  /**
   * Consulta o ID do alerta ativo no momento, se houver.
   */
  getActiveAlertId(): string | null {
    return this.criticalAlarm.getActiveAlertId?.() ?? null;
  }

  /**
   * Consulta o ID da entrega ativa no momento, se houver.
   */
  getActiveDeliveryId(): string | null {
    return this.criticalAlarm.getActiveDeliveryId?.() ?? null;
  }

  /**
   * Limpa o estado persistido de alarmes em testes.
   */
  async clearAlarmStateForTestingAsync(): Promise<boolean> {
    return (await this.criticalAlarm.clearAlarmStateForTestingAsync?.()) ?? false;
  }

  /**
   * Consulta se o app está isento das otimizações de bateria no Android (escopo opcional).
   */
  isIgnoringBatteryOptimizations(): boolean {
    return this.criticalAlarm.isIgnoringBatteryOptimizations?.() ?? false;
  }

  /**
   * Abre a tela do sistema de otimizações de bateria no Android (escopo opcional).
   */
  async openBatteryOptimizationSettings(): Promise<void> {
    if (this.criticalAlarm.openBatteryOptimizationSettingsAsync) {
      try {
        const opened = await this.criticalAlarm.openBatteryOptimizationSettingsAsync();
        if (opened) return;
      } catch {
        // Fallback
      }
    }

    if (this.platform.OS === 'android' && this.platform.sendIntent) {
      try {
        await this.platform.sendIntent('android.settings.IGNORE_BATTERY_OPTIMIZATION_SETTINGS');
        return;
      } catch {
        // Fallback
      }
    }
    if (this.platform.openSettings) {
      await this.platform.openSettings();
    }
  }

  /**
   * Adiciona um ouvinte para alterações de estado do alarme crítico nativo.
   */
  addCriticalAlarmListener(
    listener: (event: { isActive: boolean; reason?: string }) => void,
  ): { remove: () => void } {
    return this.criticalAlarm.addListener
      ? this.criticalAlarm.addListener(listener)
      : { remove: () => {} };
  }
}

export const notificationsService = new NotificationsService();

