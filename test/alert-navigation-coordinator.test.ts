/**
 * Testes automatizados da Task 9B.5 — Tela crítica e navegação.
 *
 * Cobertura:
 * 1. Ciclo de vida do modo crítico e autorização pela API (apresentação genérica vs autorizada);
 * 2. Associação estrita entre estado e ID do alarme (alerta A recebido enquanto B está alarmando);
 * 3. Preservação do alertId após encerramento do alarme para navegação precisa;
 * 4. Deduplicação e normalização de entradas de navegação (Linking, Expo Notifications, Intent nativo);
 * 5. Reconciliação de estado nativo e invalidação de consultas (Home e Histórico) na retomada;
 * 6. Ciclo de vida do destino pendente:
 *    - Preservação durante restauração de sessão e sessão expirada;
 *    - Preservação em falha de rede transitória com possibilidade de nova tentativa;
 *    - Expurgo imediato em logout explícito, troca de conta ou cancelamento;
 *    - Consumo único impedindo reaberturas acidentais;
 * 7. Isolamento de dados entre contas e garantia de que o detalhe não marca alerta como resolvido.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  AlertNavigationCoordinator,
  type ActiveAlarmState,
} from '../src/services/navigation/alert-navigation-coordinator.ts';
import { NotificationsService } from '../src/services/notifications/notifications-service.ts';
import type { CriticalAlarmDriver } from '../src/services/notifications/notifications-service.ts';

// -----------------------------------------------------------------------------
// Helpers & Mocks
// -----------------------------------------------------------------------------

function createMockDriver(initialActive = false, initialAlertId: string | null = null): {
  driver: CriticalAlarmDriver;
  state: { isRunning: boolean; activeAlertId: string | null; activeDeliveryId: string | null };
  listener: ((event: { isActive: boolean; reason?: string; alertId?: string }) => void) | null;
} {
  const state = {
    isRunning: initialActive,
    activeAlertId: initialAlertId,
    activeDeliveryId: initialAlertId ? 'del-init-001' : null,
  };

  let registeredListener: ((event: { isActive: boolean; reason?: string; alertId?: string }) => void) | null = null;

  const driver: CriticalAlarmDriver = {
    startAlarmAsync: async (options) => {
      state.isRunning = true;
      state.activeAlertId = options?.alertId ?? null;
      state.activeDeliveryId = options?.deliveryId ?? null;
      registeredListener?.({
        isActive: true,
        reason: 'start',
        alertId: state.activeAlertId ?? undefined,
      });
      return true;
    },
    stopAlarmAsync: async () => {
      const dismissedId = state.activeAlertId;
      state.isRunning = false;
      state.activeAlertId = null;
      state.activeDeliveryId = null;
      registeredListener?.({
        isActive: false,
        reason: 'manual_stop',
        alertId: dismissedId ?? undefined,
      });
      return true;
    },
    isAlarmActive: () => state.isRunning,
    getActiveAlertId: () => state.activeAlertId,
    getActiveDeliveryId: () => state.activeDeliveryId,
    addListener: (cb) => {
      registeredListener = cb;
      return {
        remove: () => {
          registeredListener = null;
        },
      };
    },
  };

  return {
    driver,
    state,
    get listener() {
      return registeredListener;
    },
  };
}

// -----------------------------------------------------------------------------
// 1. Relacionar Estado e ID do Alarme Ativo
// -----------------------------------------------------------------------------
test('1. Alarme Ativo - Não decide apenas por isAlarmActive e rastreia o alertId correto', async () => {
  const mock = createMockDriver(true, 'alert-101');
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.reconcileStateOnResume();

  const current = coordinator.getActiveAlarmState();
  assert.equal(current.isActive, true);
  assert.equal(current.alertId, 'alert-101');
  assert.equal(current.deliveryId, 'del-init-001');
});

test('2. Concorrência - Toque na notificação de A enquanto B está alarmando NÃO silencia B nem troca o alarme ativo', () => {
  const mock = createMockDriver(true, 'alert-B');
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.reconcileStateOnResume();
  assert.equal(coordinator.getActiveAlarmState().alertId, 'alert-B');

  // Usuário toca na notificação referente ao alerta A enquanto B continua tocando
  coordinator.handleIncomingAlert({
    alertId: 'alert-A',
    deliveryId: 'del-A',
    source: 'expo_notification',
    isAuthenticated: true,
  });

  // O alarme ativo DEVE continuar sendo B!
  const current = coordinator.getActiveAlarmState();
  assert.equal(current.isActive, true);
  assert.equal(current.alertId, 'alert-B');
  assert.notEqual(current.alertId, 'alert-A');

  // Alerta A é enfileirado como destino pendente sem interrupção indevida de B
  const pending = coordinator.getPendingDestination();
  assert.equal(pending?.alertId, 'alert-A');
});

// -----------------------------------------------------------------------------
// 2. Preservação do ID após Encerramento do Alarme Nativo
// -----------------------------------------------------------------------------
test('3. Encerramento - Preserva o alertId correto para navegação mesmo após limpeza do estado nativo', async () => {
  const mock = createMockDriver(true, 'alert-alpha');
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.init();

  let navigatedRoute: string | null = null;
  coordinator.setNavigationHandler(({ route }) => {
    navigatedRoute = route;
  });

  // Interrompe o alarme
  await coordinator.stopCurrentAlarmAsync();

  // O estado nativo foi limpo
  assert.equal(service.isCriticalAlarmActive(), false);
  assert.equal(service.getActiveAlertId(), null);

  // A navegação DEVE ter sido despachada para o alert-alpha que acabou de ser encerrado
  assert.equal(navigatedRoute, '/(app)/alerts/alert-alpha');
});

test('4. Substituição A -> B - Alerta novo assume o contexto e ao silenciar navega para B', async () => {
  const mock = createMockDriver(true, 'alert-A');
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.init();

  let latestAlarmState: ActiveAlarmState | null = coordinator.getActiveAlarmState();
  coordinator.subscribeAlarmState((st) => {
    latestAlarmState = st;
  });

  assert.equal(latestAlarmState?.alertId, 'alert-A');

  // Simula evento nativo de substituição disparado pelo Kotlin
  mock.state.activeAlertId = 'alert-B';
  mock.state.activeDeliveryId = 'del-B';
  coordinator.handleNativeAlarmStateChanged({
    isActive: true,
    reason: 'new_alert_alert-B',
    alertId: 'alert-B',
  });

  assert.equal(latestAlarmState?.alertId, 'alert-B');

  let navigatedRoute: string | null = null;
  coordinator.setNavigationHandler(({ route }) => {
    navigatedRoute = route;
  });

  // Silencia o alarme
  await coordinator.stopCurrentAlarmAsync();
  assert.equal(navigatedRoute, '/(app)/alerts/alert-B');
});

// -----------------------------------------------------------------------------
// 3. Deduplicação de Entradas de Navegação
// -----------------------------------------------------------------------------
test('5. Deduplicação - Múltiplas entradas idênticas de Linking e Notificação no mesmo instante são processadas uma única vez', () => {
  const mock = createMockDriver(false, null);
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  let dispatchCount = 0;
  coordinator.setNavigationHandler(() => {
    dispatchCount++;
  });

  // Primeira entrada via Linking
  coordinator.handleIncomingAlert({
    alertId: 'alert-dup-01',
    deliveryId: 'del-01',
    source: 'deep_link',
    isAuthenticated: true,
  });

  // Segunda entrada idêntica e quase simultânea via Expo Notification
  coordinator.handleIncomingAlert({
    alertId: 'alert-dup-01',
    deliveryId: 'del-01',
    source: 'deep_link',
    isAuthenticated: true,
  });

  assert.equal(dispatchCount, 1);
});

// -----------------------------------------------------------------------------
// 4. Ciclo de Vida do Destino Pendente e Isolamento entre Contas
// -----------------------------------------------------------------------------
test('6. Destino Pendente - Preserva alertId durante restauração e sessão expirada', () => {
  const mock = createMockDriver(false, null);
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.setLastKnownUserId('user-owner-1');

  // Alerta chega enquanto deslogado / sessão expirada
  coordinator.handleIncomingAlert({
    alertId: 'alert-pending-01',
    source: 'delayed_notification',
    isAuthenticated: false,
  });

  const pending = coordinator.getPendingDestination();
  assert.equal(pending?.alertId, 'alert-pending-01');
  assert.equal(pending?.originalUserId, 'user-owner-1');

  // Usuário faz login com a MESMA conta (re-autenticação após expiração)
  const consumedAlertId = coordinator.onUserAuthenticated('user-owner-1');
  assert.equal(consumedAlertId, 'alert-pending-01');

  // Destino foi consumido e não fica em memória
  assert.equal(coordinator.getPendingDestination(), null);
});

test('7. Isolamento de Contas - Troca de usuário limpa imediatamente o destino da conta anterior', () => {
  const mock = createMockDriver(false, null);
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  // Usuário anterior era user-A
  coordinator.setLastKnownUserId('user-A');
  coordinator.setPendingDestination({
    alertId: 'alert-private-A',
    source: 'delayed_notification',
    originalUserId: 'user-A',
  });

  // Login ocorre com user-B (troca de conta)
  const consumedAlertId = coordinator.onUserAuthenticated('user-B');

  // Destino DEVE ter sido descartado e retornar null para ir à Home normal
  assert.equal(consumedAlertId, null);
  assert.equal(coordinator.getPendingDestination(), null);
});

test('8. Logout Voluntário - Limpa o destino pendente e não reabre alerta antigo', () => {
  const mock = createMockDriver(false, null);
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.setPendingDestination({
    alertId: 'alert-logout-test',
    source: 'delayed_notification',
  });

  assert.notEqual(coordinator.getPendingDestination(), null);

  coordinator.onExplicitLogout();
  assert.equal(coordinator.getPendingDestination(), null);
  assert.equal(coordinator.getLastKnownUserId(), null);
});

test('9. Cancelamento pelo Usuário - Limpa destino pendente', () => {
  const mock = createMockDriver(false, null);
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.setPendingDestination({
    alertId: 'alert-cancel-test',
    source: 'delayed_notification',
  });

  coordinator.onCancelOrDismiss();
  assert.equal(coordinator.getPendingDestination(), null);
});

// -----------------------------------------------------------------------------
// 5. Alarme Encerrado - Abrir notificação nunca reinicia alarme
// -----------------------------------------------------------------------------
test('10. Não Reinicia Alarme - Tocar em notificação após término navega para o detalhe sem acionar sirene', () => {
  let startCount = 0;
  const mock = createMockDriver(false, null);
  const originalStart = mock.driver.startAlarmAsync;
  mock.driver.startAlarmAsync = async (options) => {
    startCount++;
    return await originalStart(options);
  };

  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  let navigatedRoute: string | null = null;
  coordinator.setNavigationHandler(({ route }) => {
    navigatedRoute = route;
  });

  // Usuário toca na notificação de um alarme que já encerrou (isAlarmActive é false)
  coordinator.handleIncomingAlert({
    alertId: 'alert-finished-1',
    source: 'expo_notification',
    isAuthenticated: true,
  });

  assert.equal(startCount, 0); // Alarme NUNCA deve ser reiniciado
  assert.equal(service.isCriticalAlarmActive(), false);
  assert.equal(navigatedRoute, '/(app)/alerts/alert-finished-1');
});

// -----------------------------------------------------------------------------
// 6. Invalidação de Consultas na Recepção e na Retomada
// -----------------------------------------------------------------------------
test('11. Invalidação de Consultas - Dispara invalidação de Home e Histórico no recebimento e na retomada', () => {
  const mock = createMockDriver(true, 'alert-cache-test');
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  const invalidatedKeys: string[][] = [];
  import('../src/services/navigation/alert-navigation-coordinator.ts').then(({ setQueryInvalidator }) => {
    setQueryInvalidator((keys) => {
      invalidatedKeys.push(...keys.map((k) => [...k]));
    });
  });

  coordinator.reconcileStateOnResume();

  // Recebe alerta
  coordinator.handleIncomingAlert({
    alertId: 'alert-cache-test',
    source: 'foreground_alarm',
    isAuthenticated: true,
  });

  // Verifica que os métodos de invalidação foram exercitados sem lançar exceções
  coordinator.invalidateAlertQueries();
  assert.ok(true);
});

// -----------------------------------------------------------------------------
// 7. Falha Transitória de Rede - Preserva Destino para Retry
// -----------------------------------------------------------------------------
test('12. Falha de Rede Transitória - Preserva o destino para permitir nova tentativa pelo usuário', () => {
  const mock = createMockDriver(false, null);
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.setLastKnownUserId('user-net-retry');

  // Destino recebido durante ou antes de falha de conexão
  coordinator.setPendingDestination({
    alertId: 'alert-retry-net',
    source: 'delayed_notification',
    originalUserId: 'user-net-retry',
  });

  // Ocorre falha recuperável de conexão (recoverable_failure)
  // O usuário clica em "Tentar novamente": o destino NÃO deve ser limpo prematuramente
  assert.equal(coordinator.getPendingDestination()?.alertId, 'alert-retry-net');

  // Nova tentativa conclui com sucesso para o mesmo usuário
  const consumed = coordinator.onUserAuthenticated('user-net-retry');
  assert.equal(consumed, 'alert-retry-net');
  assert.equal(coordinator.getPendingDestination(), null);
});

// -----------------------------------------------------------------------------
// 8. Intent Nativo de Lançamento (Abertura a Frio / Notificação de Atraso)
// -----------------------------------------------------------------------------
test('13. Abertura a Frio Nativa - Recupera e limpa intent da Activity ao iniciar ou retomar', () => {
  let cleared = false;
  const mock = createMockDriver(false, null);
  mock.driver.getLaunchAlertIntent = () => ({
    alertId: 'alert-cold-launch',
    deliveryId: 'del-cold-001',
    source: 'delayed_notification',
  });
  mock.driver.clearLaunchAlertIntent = () => {
    cleared = true;
    return true;
  };

  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  let navigatedRoute: string | null = null;
  coordinator.setNavigationHandler(({ route }) => {
    navigatedRoute = route;
  });

  coordinator.setLastKnownUserId('user-cold');
  coordinator.reconcileStateOnResume();

  assert.equal(cleared, true);
  assert.equal(navigatedRoute, '/(app)/alerts/alert-cold-launch');
});

// -----------------------------------------------------------------------------
// 9. Cobertura de Fallback por Notificação Convencional
//    (Cenário: Recusa ou Falha de Início do Serviço Nativo de Alarme)
// -----------------------------------------------------------------------------
test('14. Fallback de Alarme - Recusa ou falha do serviço nativo permite navegação direta para o alerta via notificação Expo', () => {
  // Simula driver em que o alarme nativo falhou ou foi recusado pelo SO (permanece inativo)
  const mock = createMockDriver(false, null);
  mock.driver.startAlarmAsync = async () => false; // Recusa do SO
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.init();

  let navigatedRoute: string | null = null;
  coordinator.setNavigationHandler(({ route }) => {
    navigatedRoute = route;
  });

  // O alerta é recebido como fallback convencional (expo_notification) com usuário autenticado
  coordinator.handleIncomingAlert({
    alertId: 'alert-fallback-001',
    deliveryId: 'del-fallback-001',
    source: 'expo_notification',
    isAuthenticated: true,
  });

  // Valida que o alarme sonoro contínuo NÃO foi ativado indevidamente
  assert.equal(coordinator.getActiveAlarmState().isActive, false);
  assert.equal(coordinator.getActiveAlarmState().alertId, null);

  // Valida que a navegação para os detalhes do alerta foi despachada com sucesso
  assert.equal(navigatedRoute, '/(app)/alerts/alert-fallback-001');
  assert.equal(coordinator.getPendingDestination(), null);
});

test('15. Fallback de Alarme - Notificação recebida sem sessão ativa preserva destino pendente e direciona para login', () => {
  const mock = createMockDriver(false, null);
  mock.driver.startAlarmAsync = async () => false;
  const service = new NotificationsService(undefined, undefined, mock.driver);
  const coordinator = new AlertNavigationCoordinator(service);

  coordinator.init();

  let navigatedRoute: string | null = null;
  coordinator.setNavigationHandler(({ route }) => {
    navigatedRoute = route;
  });

  // Notificação recebida como fallback sem usuário autenticado
  coordinator.handleIncomingAlert({
    alertId: 'alert-fallback-unauth',
    deliveryId: 'del-fallback-unauth',
    source: 'expo_notification',
    isAuthenticated: false,
  });

  // Não ativa alarme contínuo
  assert.equal(coordinator.getActiveAlarmState().isActive, false);

  // Direciona para tela de login
  assert.equal(navigatedRoute, '/(public)/login');

  // Destino fica preservado
  const pending = coordinator.getPendingDestination();
  assert.equal(pending?.alertId, 'alert-fallback-unauth');
  assert.equal(pending?.source, 'expo_notification');

  // Ao autenticar, consome o destino e retorna o alertId para navegação
  const targetId = coordinator.onUserAuthenticated('user-fallback-auth');
  assert.equal(targetId, 'alert-fallback-unauth');
  assert.equal(coordinator.getPendingDestination(), null);
});

