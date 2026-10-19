/**
 * Coordenador central de navegação e ciclo de vida de alertas do PoolSafe.
 *
 * Responsabilidades (Task 9B.5):
 * 1. Centralizar e normalizar as entradas de alerta (Linking, Expo Notifications, Intent nativo e Foreground Service);
 * 2. Deduplicar eventos concorrentes ou repetidos (evita abertura dupla e reprocessamento de respostas antigas);
 * 3. Gerenciar o estado do alarme ativo associado ao seu alertId específico (sem confundir alertas distintos);
 * 4. Preservar o alertId para navegação mesmo após a limpeza do estado nativo na parada do alarme;
 * 5. Gerenciar o ciclo de vida do destino pendente:
 *    - Preservar durante restauração de sessão e login por sessão expirada;
 *    - Preservar durante falhas de rede transitórias com possibilidade de tentar novamente;
 *    - Limpar em logout voluntário, troca de conta, cancelamento ou após consumo;
 * 6. Atualizar consultas de Home e Histórico no recebimento, na parada do alarme e na retomada do app.
 *
 * Arquitetura desacoplada por driver para permitir execução em ambiente React Native e testes puros no Node.js.
 */

import { notificationsService, NotificationsService } from '../notifications/notifications-service.ts';

export const HOME_QUERY_KEY = ['home'] as const;
export const ALERTS_QUERY_KEY = ['alerts'] as const;

export interface AlertDestination {
  alertId: string;
  deliveryId?: string;
  source: 'critical_service' | 'delayed_notification' | 'expo_notification' | 'deep_link' | 'foreground_alarm';
  originalUserId?: string | null;
  timestamp: number;
}

export interface ActiveAlarmState {
  isActive: boolean;
  alertId: string | null;
  deliveryId: string | null;
}

export type NavigationTargetHandler = (target: { route: string; alertId: string }) => void;
export type AlarmStateChangeHandler = (state: ActiveAlarmState) => void;
export type QueryInvalidator = (queryKeys: Array<readonly string[]>) => Promise<void> | void;

export interface AppStateDriver {
  currentState: string;
  addEventListener: (type: 'change', listener: (state: string) => void) => { remove: () => void };
}

let activeAppStateDriver: AppStateDriver | null = null;
let activeQueryInvalidator: QueryInvalidator | null = null;

function getAppStateDriver(): AppStateDriver | null {
  if (activeAppStateDriver) {
    return activeAppStateDriver;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require('react-native');
    if (rn?.AppState) {
      return rn.AppState;
    }
  } catch {
    // Silencia em ambiente de teste puro sem react-native
  }
  return null;
}

export function setAppStateDriver(driver: AppStateDriver | null): void {
  activeAppStateDriver = driver;
}

export function setQueryInvalidator(invalidator: QueryInvalidator | null): void {
  activeQueryInvalidator = invalidator;
}

export class AlertNavigationCoordinator {
  private notifications: NotificationsService;
  private pendingDestination: AlertDestination | null = null;
  private activeAlarm: ActiveAlarmState = {
    isActive: false,
    alertId: null,
    deliveryId: null,
  };
  private lastDismissedAlertId: string | null = null;
  private lastKnownUserId: string | null = null;
  private lastProcessedIntentKey: string | null = null;
  private lastProcessedIntentTime = 0;

  private onNavigateCallback: NavigationTargetHandler | null = null;
  private alarmSubscribers = new Set<AlarmStateChangeHandler>();
  private nativeAlarmSubscription: { remove: () => void } | null = null;
  private appStateSubscription: { remove: () => void } | null = null;

  // Janela de deduplicação para intents idênticos (2,5 segundos)
  private readonly DEDUPLICATION_WINDOW_MS = 2500;

  constructor(notifications: NotificationsService = notificationsService) {
    this.notifications = notifications;
  }

  /**
   * Inicializa ouvintes nativos e de ciclo de vida do aplicativo.
   */
  public init(): void {
    if (this.nativeAlarmSubscription) {
      return;
    }

    // Ouvinte nativo de alteração do alarme crítico
    this.nativeAlarmSubscription = this.notifications.addCriticalAlarmListener((event) => {
      this.handleNativeAlarmStateChanged(event);
    });

    // Ouvinte de ciclo de vida do app (retomada para foreground)
    const appState = getAppStateDriver();
    if (appState?.addEventListener) {
      try {
        this.appStateSubscription = appState.addEventListener('change', (nextState: string) => {
          if (nextState === 'active') {
            this.reconcileStateOnResume();
          }
        });
      } catch {
        // Silencia em ambientes onde o AppState está mockado parcialmente
      }
    }

    // Reconciliação imediata na inicialização
    this.reconcileStateOnResume();
  }

  /**
   * Encerra ouvintes (usado em desmontagens ou testes).
   */
  public teardown(): void {
    this.nativeAlarmSubscription?.remove();
    this.nativeAlarmSubscription = null;
    this.appStateSubscription?.remove();
    this.appStateSubscription = null;
    this.alarmSubscribers.clear();
  }

  // ---------------------------------------------------------------------------
  // Gestão de Usuário e Isolamento de Contas
  // ---------------------------------------------------------------------------

  public setLastKnownUserId(userId: string | null): void {
    this.lastKnownUserId = userId;
  }

  public getLastKnownUserId(): string | null {
    return this.lastKnownUserId;
  }

  /**
   * Registra autenticação de usuário.
   * Se houver destino pendente da conta anterior e a nova conta for diferente,
   * descarta o destino para impedir vazamento de dados entre usuários.
   */
  public onUserAuthenticated(newUserId: string): string | null {
    const previousUserId = this.lastKnownUserId;
    this.lastKnownUserId = newUserId;

    if (!this.pendingDestination) {
      return null;
    }

    // Se o destino pertencia a uma conta diferente, descarta imediatamente
    if (
      this.pendingDestination.originalUserId &&
      this.pendingDestination.originalUserId !== newUserId
    ) {
      this.clearPendingDestination('account_switched');
      return null;
    }

    // Se não havia conta anterior vinculada, vincula à nova conta
    if (!this.pendingDestination.originalUserId && previousUserId && previousUserId !== newUserId) {
      this.clearPendingDestination('account_switched');
      return null;
    }

    // Mesma conta: retorna o alertId para navegação e consome o destino
    const targetAlertId = this.pendingDestination.alertId;
    this.clearPendingDestination('consumed_on_login');
    return targetAlertId;
  }

  /**
   * Logout voluntário/explícito: limpa o destino pendente e a identidade salva.
   */
  public onExplicitLogout(): void {
    this.pendingDestination = null;
    this.lastKnownUserId = null;
  }

  /**
   * Cancelamento pelo usuário ou clique em "Acessar com outra conta".
   */
  public onCancelOrDismiss(): void {
    this.clearPendingDestination('cancelled_by_user');
  }

  // ---------------------------------------------------------------------------
  // Gestão do Destino Pendente
  // ---------------------------------------------------------------------------

  public getPendingDestination(): AlertDestination | null {
    return this.pendingDestination;
  }

  public setPendingDestination(destination: Omit<AlertDestination, 'timestamp'>): void {
    this.pendingDestination = {
      ...destination,
      originalUserId: destination.originalUserId ?? this.lastKnownUserId,
      timestamp: Date.now(),
    };
  }

  public clearPendingDestination(_reason?: string): void {
    this.pendingDestination = null;
  }

  public consumePendingDestination(): string | null {
    if (!this.pendingDestination) return null;
    const alertId = this.pendingDestination.alertId;
    this.pendingDestination = null;
    return alertId;
  }

  // ---------------------------------------------------------------------------
  // Estado do Alarme Ativo e Sincronização
  // ---------------------------------------------------------------------------

  public getActiveAlarmState(): ActiveAlarmState {
    return { ...this.activeAlarm };
  }

  public subscribeAlarmState(listener: AlarmStateChangeHandler): () => void {
    this.alarmSubscribers.add(listener);
    // Notifica imediatamente o estado atual
    listener(this.getActiveAlarmState());
    return () => {
      this.alarmSubscribers.delete(listener);
    };
  }

  private notifyAlarmSubscribers(): void {
    const state = this.getActiveAlarmState();
    for (const sub of this.alarmSubscribers) {
      try {
        sub(state);
      } catch {
        // Silencia erros de subscrição individual
      }
    }
  }

  /**
   * Registra callback de navegação para despachar rotas pelo Expo Router.
   */
  public setNavigationHandler(handler: NavigationTargetHandler | null): void {
    this.onNavigateCallback = handler;
  }

  /**
   * Reconcilia estado com a camada nativa na abertura ou retorno do app.
   */
  public reconcileStateOnResume(): void {
    const isNativeActive = this.notifications.isCriticalAlarmActive();
    const nativeAlertId = this.notifications.getActiveAlertId();
    const nativeDeliveryId = this.notifications.getActiveDeliveryId();

    if (isNativeActive && nativeAlertId) {
      this.activeAlarm = {
        isActive: true,
        alertId: nativeAlertId,
        deliveryId: nativeDeliveryId,
      };
    } else if (!isNativeActive && this.activeAlarm.isActive) {
      this.activeAlarm = {
        isActive: false,
        alertId: null,
        deliveryId: null,
      };
    }

    this.notifyAlarmSubscribers();

    // Invalida dados na retomada para garantir atualização de Home e Histórico
    this.invalidateAlertQueries();

    // Verifica se há intent nativo de lançamento retido na Activity
    this.checkLaunchIntent();
  }

  /**
   * Trata evento disparado pelo Foreground Service nativo.
   */
  public handleNativeAlarmStateChanged(event: {
    isActive: boolean;
    reason?: string;
    alertId?: string;
  }): void {
    if (event.isActive) {
      const activeId = event.alertId || this.notifications.getActiveAlertId() || this.activeAlarm.alertId;
      const deliveryId = this.notifications.getActiveDeliveryId();

      this.activeAlarm = {
        isActive: true,
        alertId: activeId,
        deliveryId,
      };
      this.lastDismissedAlertId = activeId;
      this.notifyAlarmSubscribers();

      // Atualiza Home e Histórico logo no início do recebimento do alerta
      this.invalidateAlertQueries();
    } else {
      // Alarme encerrou (por botão na UI, ação na notificação ou timeout de 30s)
      const targetAlertId = event.alertId || this.activeAlarm.alertId || this.lastDismissedAlertId;

      this.activeAlarm = {
        isActive: false,
        alertId: null,
        deliveryId: null,
      };
      this.notifyAlarmSubscribers();

      // Invalida consultas para refletir estado recente
      this.invalidateAlertQueries();

      // Encaminha para os Detalhes do alerta correspondente
      if (targetAlertId) {
        this.dispatchNavigationToAlert(targetAlertId);
      }
    }
  }

  /**
   * Centraliza e processa a entrada de um alerta por qualquer canal (deep link,
   * notificação Expo, notificação do serviço ou notificação de atraso).
   */
  public handleIncomingAlert(intent: {
    alertId: string;
    deliveryId?: string;
    source: AlertDestination['source'];
    isAuthenticated: boolean;
  }): void {
    const alertId = intent.alertId?.trim();
    if (!alertId) return;

    // 1. Deduplicação contra eventos idênticos no intervalo curto
    const now = Date.now();
    const intentKey = `${alertId}_${intent.deliveryId || ''}_${intent.source}`;
    if (
      this.lastProcessedIntentKey === intentKey &&
      now - this.lastProcessedIntentTime < this.DEDUPLICATION_WINDOW_MS
    ) {
      return;
    }
    this.lastProcessedIntentKey = intentKey;
    this.lastProcessedIntentTime = now;

    // 2. Se outro alerta estiver alarmando ativamente no SO:
    // Não altera o alarme ativo para um alerta diferente nem interrompe o alarme atual
    if (this.activeAlarm.isActive && this.activeAlarm.alertId && this.activeAlarm.alertId !== alertId) {
      // Salva como destino pendente para navegação posterior caso o usuário queira consultar
      this.setPendingDestination({
        alertId,
        deliveryId: intent.deliveryId,
        source: intent.source,
        originalUserId: this.lastKnownUserId,
      });
      return;
    }

    // 3. Atualiza queries remotas
    this.invalidateAlertQueries();

    // 4. Se o alarme para este mesmo alerta ainda estiver ativo:
    // O overlay crítico já está (ou estará) visível para interrupção manual
    const isAlarmActiveForThisAlert =
      this.notifications.isCriticalAlarmActive() &&
      this.notifications.getActiveAlertId() === alertId;

    if (isAlarmActiveForThisAlert) {
      this.activeAlarm = {
        isActive: true,
        alertId,
        deliveryId: intent.deliveryId ?? null,
      };
      this.notifyAlarmSubscribers();
      return;
    }

    // 5. Se o alarme já encerrou ou é notificação de atraso/convencional:
    // Trata autenticação e navegação para o detalhe
    if (intent.isAuthenticated) {
      this.dispatchNavigationToAlert(alertId);
    } else {
      // Não autenticado: preserva destino para consumo após login
      this.setPendingDestination({
        alertId,
        deliveryId: intent.deliveryId,
        source: intent.source,
        originalUserId: this.lastKnownUserId,
      });
      this.dispatchNavigationToLogin();
    }
  }

  /**
   * Dispara navegação controlada para a tela de detalhe.
   */
  public dispatchNavigationToAlert(alertId: string): void {
    if (this.onNavigateCallback) {
      this.onNavigateCallback({
        route: `/(app)/alerts/${alertId}`,
        alertId,
      });
    }
  }

  /**
   * Dispara redirecionamento para o login em caso de sessão ausente ou expirada.
   */
  public dispatchNavigationToLogin(): void {
    if (this.onNavigateCallback) {
      this.onNavigateCallback({
        route: '/(public)/login',
        alertId: '',
      });
    }
  }

  /**
   * Solicita interrupção do alarme crítico atual ao SO.
   */
  public async stopCurrentAlarmAsync(): Promise<boolean> {
    const currentId = this.activeAlarm.alertId || this.notifications.getActiveAlertId();
    if (currentId) {
      this.lastDismissedAlertId = currentId;
    }
    return await this.notifications.stopCriticalAlarmAsync();
  }

  /**
   * Invalida as consultas React Query de Home e Histórico de Alertas.
   */
  public invalidateAlertQueries(): void {
    if (activeQueryInvalidator) {
      try {
        activeQueryInvalidator([HOME_QUERY_KEY, ALERTS_QUERY_KEY]);
      } catch {
        // Silencia erros no invalidator customizado
      }
      return;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const provider = require('../../providers/QueryClientProvider.tsx');
      if (provider?.queryClient?.invalidateQueries) {
        void provider.queryClient.invalidateQueries({ queryKey: HOME_QUERY_KEY });
        void provider.queryClient.invalidateQueries({ queryKey: ALERTS_QUERY_KEY });
      }
    } catch {
      // Silencia se indisponível em ambiente de teste puro
    }
  }

  /**
   * Inspeciona e consome intent nativo inicial da Activity se presente.
   */
  private checkLaunchIntent(): void {
    try {
      const launch = this.notifications.getLaunchAlertIntent();
      if (launch && launch.alertId) {
        this.notifications.clearLaunchAlertIntent();
        this.handleIncomingAlert({
          alertId: launch.alertId,
          deliveryId: launch.deliveryId,
          source: launch.source === 'delayed_notification' ? 'delayed_notification' : 'critical_service',
          isAuthenticated: !!this.lastKnownUserId,
        });
      }
    } catch {
      // Silencia
    }
  }
}

export const alertNavigationCoordinator = new AlertNavigationCoordinator();
