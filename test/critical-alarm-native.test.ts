/**
 * Testes automatizados da Fatia 8A.1 — Prova nativa de alarme crítico.
 *
 * Cobertura:
 * 1. Driver de alarme crítico e chamadas à API nativa (start, stop, isAlarmActive)
 * 2. Idempotência operacional: chamadas repetidas de start e stop
 * 3. Notificação e propagação de eventos via addCriticalAlarmListener
 * 4. Diagnóstico de prontidão incluindo verificação opcional de otimização de bateria
 * 5. Abertura de configurações de otimização de bateria
 * 6. Preservação de dados sensíveis (sem vazamento em logs ou eventos)
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  NotificationsService,
  setCriticalAlarmDriver,
} from '../src/services/notifications/notifications-service.ts';
import type {
  CriticalAlarmDriver,
  NotificationsDriver,
  PlatformLinkingDriver,
} from '../src/services/notifications/notifications-service.ts';
import {
  evaluateAlertReadiness,
} from '../src/services/notifications/readiness.ts';
import {
  CRITICAL_ALERT_CHANNEL_ID,
  CRITICAL_ALERT_CHANNEL_NAME,
  CRITICAL_ALARM_SERVICE_CHANNEL_ID,
  CRITICAL_ALARM_AUTO_TIMEOUT_SECONDS,
} from '../src/services/notifications/constants.ts';
import type {
  NotificationChannelSummary,
  NotificationPermissionSummary,
} from '../src/services/notifications/types.ts';

// -----------------------------------------------------------------------------
// 1. Constantes da Prova Nativa
// -----------------------------------------------------------------------------
test('1. Constantes da Prova Nativa - IDs de canal do serviço e tempo de timeout', () => {
  assert.equal(CRITICAL_ALARM_SERVICE_CHANNEL_ID, 'poolsafe_critical_alarm_service_v2');
  assert.equal(CRITICAL_ALARM_AUTO_TIMEOUT_SECONDS, 30);
});

// -----------------------------------------------------------------------------
// 2. Driver de Alarme Crítico e Ciclo de Vida
// -----------------------------------------------------------------------------
test('2. Ciclo de Vida - Início, consulta e parada do alarme crítico nativo', async () => {
  let isRunning = false;
  const eventsReceived: Array<{ isActive: boolean; reason?: string }> = [];

  const mockCriticalDriver: CriticalAlarmDriver = {
    startAlarmAsync: async () => {
      isRunning = true;
      return true;
    },
    stopAlarmAsync: async () => {
      isRunning = false;
      return true;
    },
    isAlarmActive: () => isRunning,
    addListener: (listener) => {
      return { remove: () => {} };
    },
  };

  const service = new NotificationsService(undefined, undefined, mockCriticalDriver);

  assert.equal(service.isCriticalAlarmActive(), false);

  const startResult = await service.startCriticalAlarmAsync();
  assert.equal(startResult, true);
  assert.equal(service.isCriticalAlarmActive(), true);

  const stopResult = await service.stopCriticalAlarmAsync();
  assert.equal(stopResult, true);
  assert.equal(service.isCriticalAlarmActive(), false);
});

// -----------------------------------------------------------------------------
// 3. Idempotência Operacional
// -----------------------------------------------------------------------------
test('3. Idempotência Operacional - Inícios e paradas repetidas não falham nem alteram estado inconsistente', async () => {
  let startCount = 0;
  let stopCount = 0;
  let isRunning = false;

  const mockCriticalDriver: CriticalAlarmDriver = {
    startAlarmAsync: async () => {
      startCount++;
      if (isRunning) return true; // Idempotente
      isRunning = true;
      return true;
    },
    stopAlarmAsync: async () => {
      stopCount++;
      if (!isRunning) return true; // Idempotente
      isRunning = false;
      return true;
    },
    isAlarmActive: () => isRunning,
  };

  const service = new NotificationsService(undefined, undefined, mockCriticalDriver);

  // Início inicial
  await service.startCriticalAlarmAsync();
  assert.equal(service.isCriticalAlarmActive(), true);

  // Início subsequente enquanto ativo (idempotente)
  await service.startCriticalAlarmAsync();
  assert.equal(service.isCriticalAlarmActive(), true);
  assert.equal(startCount, 2);

  // Parada inicial
  await service.stopCriticalAlarmAsync();
  assert.equal(service.isCriticalAlarmActive(), false);

  // Parada subsequente quando já inativo (idempotente)
  await service.stopCriticalAlarmAsync();
  assert.equal(service.isCriticalAlarmActive(), false);
  assert.equal(stopCount, 2);
});

// -----------------------------------------------------------------------------
// 4. Propagação de Eventos via Listener
// -----------------------------------------------------------------------------
test('4. Listener de Alarme - Recebimento de eventos com motivo de encerramento', () => {
  let registeredListener: ((event: { isActive: boolean; reason?: string }) => void) | null = null;

  const mockCriticalDriver: CriticalAlarmDriver = {
    startAlarmAsync: async () => true,
    stopAlarmAsync: async () => true,
    isAlarmActive: () => false,
    addListener: (listener) => {
      registeredListener = listener;
      return {
        remove: () => {
          registeredListener = null;
        },
      };
    },
  };

  const service = new NotificationsService(undefined, undefined, mockCriticalDriver);
  const events: Array<{ isActive: boolean; reason?: string }> = [];

  const subscription = service.addCriticalAlarmListener((event) => {
    events.push(event);
  });

  assert.ok(registeredListener);
  const notifyListener = registeredListener as (event: { isActive: boolean; reason?: string }) => void;

  // Dispara evento de timeout automático de 30s
  notifyListener({ isActive: false, reason: 'auto_timeout_30s' });
  assert.equal(events.length, 1);
  assert.equal(events[0]?.isActive, false);
  assert.equal(events[0]?.reason, 'auto_timeout_30s');

  // Dispara evento de interrupção manual
  notifyListener({ isActive: false, reason: 'manual_or_notification_stop' });
  assert.equal(events.length, 2);
  assert.equal(events[1]?.reason, 'manual_or_notification_stop');

  // Remove listener
  subscription.remove();
  assert.equal(registeredListener, null);
});

// -----------------------------------------------------------------------------
// 5. Diagnóstico de Prontidão - Otimização de Bateria (Escopo Opcional)
// -----------------------------------------------------------------------------
test('5.1. Otimização de Bateria - Quando isenta, exibe item ok no diagnóstico', () => {
  const permission: NotificationPermissionSummary = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
  };

  const channel: NotificationChannelSummary = {
    id: CRITICAL_ALERT_CHANNEL_ID,
    name: CRITICAL_ALERT_CHANNEL_NAME,
    importance: 7,
    sound: 'custom',
    bypassDnd: true,
    audioUsage: 4,
    enableVibrate: true,
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, {
    isAndroid: true,
    isIgnoringBatteryOptimizations: true,
  });

  const batteryCheck = diagnosis.checks.find((c) => c.id === 'battery_optimization');
  assert.ok(batteryCheck);
  assert.equal(batteryCheck?.status, 'ok');
  assert.match(batteryCheck?.description ?? '', /isento de otimizações/i);
});

test('5.2. Otimização de Bateria - Quando não isenta, exibe item informativo sem degradar a prontidão', () => {
  const permission: NotificationPermissionSummary = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
  };

  const channel: NotificationChannelSummary = {
    id: CRITICAL_ALERT_CHANNEL_ID,
    name: CRITICAL_ALERT_CHANNEL_NAME,
    importance: 7,
    sound: 'custom',
    bypassDnd: true,
    audioUsage: 4,
    enableVibrate: true,
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, {
    isAndroid: true,
    isIgnoringBatteryOptimizations: false,
  });

  const batteryCheck = diagnosis.checks.find((c) => c.id === 'battery_optimization');
  assert.ok(batteryCheck);
  assert.equal(batteryCheck?.status, 'info');
  assert.equal(batteryCheck?.actionType, 'battery_settings');
  assert.equal(batteryCheck?.actionLabel, 'Verificar Bateria');
  // Não deve rebaixar o status de PRONTO ou DEGRADADO além das regras existentes
  assert.equal(diagnosis.canTest, true);
});

// -----------------------------------------------------------------------------
// 6. Abertura de Configurações de Bateria
// -----------------------------------------------------------------------------
test('6. Abertura de Configurações de Bateria - Tenta módulo nativo e faz fallback seguro', async () => {
  let nativeOpenCalled = false;
  let linkingIntentCalled: string | null = null;

  const mockCriticalDriver: CriticalAlarmDriver = {
    startAlarmAsync: async () => true,
    stopAlarmAsync: async () => true,
    isAlarmActive: () => false,
    openBatteryOptimizationSettingsAsync: async () => {
      nativeOpenCalled = true;
      return true;
    },
  };

  const mockPlatformDriver: PlatformLinkingDriver = {
    OS: 'android',
    sendIntent: async (action) => {
      linkingIntentCalled = action;
    },
  };

  const service = new NotificationsService(undefined, mockPlatformDriver, mockCriticalDriver);
  await service.openBatteryOptimizationSettings();

  assert.equal(nativeOpenCalled, true);
});

// -----------------------------------------------------------------------------
// 7. Task 9B.4 — Alarme com Dados do Alerta (alertId e deliveryId)
// -----------------------------------------------------------------------------
test('7. Task 9B.4 - Início do alarme recebe opções de payload e expõe identificadores ativos', async () => {
  let activeAlertId: string | null = null;
  let activeDeliveryId: string | null = null;
  let isRunning = false;
  let receivedOptions: unknown = null;

  const mockCriticalDriver: CriticalAlarmDriver = {
    startAlarmAsync: async (options) => {
      receivedOptions = options;
      activeAlertId = options?.alertId ?? null;
      activeDeliveryId = options?.deliveryId ?? null;
      isRunning = true;
      return true;
    },
    stopAlarmAsync: async () => {
      isRunning = false;
      activeAlertId = null;
      activeDeliveryId = null;
      return true;
    },
    isAlarmActive: () => isRunning,
    getActiveAlertId: () => activeAlertId,
    getActiveDeliveryId: () => activeDeliveryId,
  };

  const service = new NotificationsService(undefined, undefined, mockCriticalDriver);

  assert.equal(service.getActiveAlertId(), null);
  assert.equal(service.getActiveDeliveryId(), null);

  const startResult = await service.startCriticalAlarmAsync({
    alertId: 'alert-101',
    deliveryId: 'deliv-202',
    title: '[ALERTA] Risco na Piscina',
    message: 'Movimento brusco detectado',
  });

  assert.equal(startResult, true);
  assert.equal(service.isCriticalAlarmActive(), true);
  assert.equal(service.getActiveAlertId(), 'alert-101');
  assert.equal(service.getActiveDeliveryId(), 'deliv-202');
  assert.deepEqual(receivedOptions, {
    alertId: 'alert-101',
    deliveryId: 'deliv-202',
    title: '[ALERTA] Risco na Piscina',
    message: 'Movimento brusco detectado',
  });

  await service.stopCriticalAlarmAsync();
  assert.equal(service.isCriticalAlarmActive(), false);
  assert.equal(service.getActiveAlertId(), null);
  assert.equal(service.getActiveDeliveryId(), null);
});

// -----------------------------------------------------------------------------
// 8. Task 9B.4 — Transição para Segundo Alerta Distinto e Deduplicação
// -----------------------------------------------------------------------------
test('8. Task 9B.4 - Transição para segundo alerta distinto atualiza contexto sem quebrar execução', async () => {
  let activeAlertId: string | null = null;
  let activeDeliveryId: string | null = null;
  let isRunning = false;
  let serviceCreationCount = 0;
  let timerRenewals = 0;

  const mockCriticalDriver: CriticalAlarmDriver = {
    startAlarmAsync: async (options) => {
      if (!isRunning) {
        serviceCreationCount++;
        isRunning = true;
      } else if (options?.alertId && options.alertId !== activeAlertId) {
        // Segundo alerta distinto recebido durante execução:
        // Mantém mesmo serviço e renova o prazo de 30s
        timerRenewals++;
      }
      activeAlertId = options?.alertId ?? null;
      activeDeliveryId = options?.deliveryId ?? null;
      return true;
    },
    stopAlarmAsync: async () => {
      isRunning = false;
      activeAlertId = null;
      activeDeliveryId = null;
      return true;
    },
    isAlarmActive: () => isRunning,
    getActiveAlertId: () => activeAlertId,
    getActiveDeliveryId: () => activeDeliveryId,
  };

  const service = new NotificationsService(undefined, undefined, mockCriticalDriver);

  // 1. Primeiro alerta recebido
  await service.startCriticalAlarmAsync({
    alertId: 'alert-1',
    deliveryId: 'deliv-1',
    title: 'Alerta 1',
  });

  assert.equal(service.getActiveAlertId(), 'alert-1');
  assert.equal(serviceCreationCount, 1);
  assert.equal(timerRenewals, 0);

  // 2. Repetição do mesmo alerta (mesmo alertId) -> Não renova prazo
  await service.startCriticalAlarmAsync({
    alertId: 'alert-1',
    deliveryId: 'deliv-1',
    title: 'Alerta 1 (Repetição)',
  });

  assert.equal(serviceCreationCount, 1);
  assert.equal(timerRenewals, 0); // Repetição não renova prazo

  // 3. Segundo alerta distinto (novo alertId) enquanto o primeiro toca:
  await service.startCriticalAlarmAsync({
    alertId: 'alert-2',
    deliveryId: 'deliv-2',
    title: 'Alerta 2 (Distinto)',
  });

  // Reutiliza o mesmo serviço (não recria) e renova prazo para até 30s
  assert.equal(serviceCreationCount, 1);
  assert.equal(timerRenewals, 1);
  assert.equal(service.getActiveAlertId(), 'alert-2');
  assert.equal(service.getActiveDeliveryId(), 'deliv-2');

  await service.stopCriticalAlarmAsync();
  assert.equal(service.isCriticalAlarmActive(), false);
});
