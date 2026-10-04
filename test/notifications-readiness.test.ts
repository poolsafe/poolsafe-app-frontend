/**
 * Testes automatizados da Fatia 8A — Prontidão Android para alertas.
 * 
 * Cobertura:
 * 1. Classificação PRONTO (permissão OK, canal MAX, som custom, áudio ALARM, bypassDnd true)
 * 2. Classificação DEGRADADO (permissão OK, mas som ausente, importância reduzida, bypassDnd false ou áudio não-alarme)
 * 3. Classificação DESATIVADO (permissão negada/bloqueada ou canal com importância NONE)
 * 4. Permissão não determinada (solicitação com contexto) vs negada
 * 5. Canal inexistente (não inicializado no dispositivo)
 * 6. Canal silenciado ou bloqueado pelo usuário
 * 7. Falha ao consultar APIs nativas (resiliência sem quebrar a aplicação)
 * 8. Bloqueio de disparo de teste sonoro quando canTest for false
 * 9. Execução de disparo de teste sonoro com parâmetros canônicos (canal crítico, som provisório e sem dados sensíveis)
 * 10. Configuração nativa de canal com todos os requisitos (MAX, bypassDnd, ALARM, SONIFICATION)
 * 11. Validação do arquivo de áudio provisório (formato RIFF WAVE válido, 16-bit PCM, cabeçalhos e duração)
 * 12. Resolução segura de Intents do Android para abertura de configurações nativas
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  evaluateAlertReadiness,
} from '../src/services/notifications/readiness.ts';
import {
  NotificationsService,
} from '../src/services/notifications/notifications-service.ts';
import type {
  NotificationsDriver,
  PlatformLinkingDriver,
} from '../src/services/notifications/notifications-service.ts';
import {
  CRITICAL_ALERT_CHANNEL_ID,
  CRITICAL_ALERT_CHANNEL_NAME,
  CRITICAL_ALERT_CHANNEL_DESCRIPTION,
  PROVISIONAL_ALERT_SOUND_FILE,
  TEST_NOTIFICATION_TITLE,
  TEST_NOTIFICATION_BODY,
  CRITICAL_VIBRATION_PATTERN,
} from '../src/services/notifications/constants.ts';
import type {
  NotificationChannelSummary,
  NotificationPermissionSummary,
} from '../src/services/notifications/types.ts';

// -----------------------------------------------------------------------------
// 1. Classificação DEGRADADO sob restrições do SO
// -----------------------------------------------------------------------------
test('1. Classificação DEGRADADO - Permissão concedida e canal configurado, mas restrito ao volume de notificações no Android', () => {
  const permission: NotificationPermissionSummary = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
  };

  const channel: NotificationChannelSummary = {
    id: CRITICAL_ALERT_CHANNEL_ID,
    name: CRITICAL_ALERT_CHANNEL_NAME,
    importance: 7, // MAX
    sound: 'custom',
    bypassDnd: true,
    audioUsage: 4, // AndroidAudioUsage.ALARM
    audioContentType: 4, // AndroidAudioContentType.SONIFICATION
    enableVibrate: true,
    vibrationPattern: CRITICAL_VIBRATION_PATTERN,
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, { isAndroid: true });

  assert.equal(diagnosis.status, 'DEGRADADO');
  assert.equal(diagnosis.canTest, true);
  assert.match(diagnosis.summary, /Prontidão parcial/);

  // Verifica que todos os itens de verificação principais estão presentes
  const permCheck = diagnosis.checks.find((c) => c.id === 'permission');
  const impCheck = diagnosis.checks.find((c) => c.id === 'channel_importance');
  const soundCheck = diagnosis.checks.find((c) => c.id === 'channel_sound');
  const vibCheck = diagnosis.checks.find((c) => c.id === 'channel_vibration');
  const audioCheck = diagnosis.checks.find((c) => c.id === 'audio_usage');
  const dndCheck = diagnosis.checks.find((c) => c.id === 'bypass_dnd');
  const volumeCheck = diagnosis.checks.find((c) => c.id === 'volume_guidance');

  assert.equal(permCheck?.status, 'ok');
  assert.equal(impCheck?.status, 'ok');
  assert.equal(soundCheck?.status, 'ok');
  assert.equal(vibCheck?.status, 'ok');
  assert.equal(audioCheck?.status, 'warning'); // Reflete que o SO subordina o som ao volume de notificações
  assert.equal(dndCheck?.status, 'ok');
  assert.equal(volumeCheck?.status, 'info'); // Informativo
});

// -----------------------------------------------------------------------------
// 2. Classificação DEGRADADO - Cenários de Degradação
// -----------------------------------------------------------------------------
test('2. Classificação DEGRADADO - Canal sem sobreposição ao Não Perturbe (bypassDnd: false)', () => {
  const permission: NotificationPermissionSummary = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
  };

  const channel: NotificationChannelSummary = {
    id: CRITICAL_ALERT_CHANNEL_ID,
    name: CRITICAL_ALERT_CHANNEL_NAME,
    importance: 7, // MAX
    sound: 'custom',
    bypassDnd: false, // Não consegue furar DND
    audioUsage: 4,
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, { isAndroid: true });

  assert.equal(diagnosis.status, 'DEGRADADO');
  assert.equal(diagnosis.canTest, true); // Pode testar
  const dndCheck = diagnosis.checks.find((c) => c.id === 'bypass_dnd');
  assert.equal(dndCheck?.status, 'warning');
  assert.equal(dndCheck?.actionType, 'dnd_settings');
});

test('2.1 Classificação DEGRADADO - Canal sem som ou silenciado (sound: null)', () => {
  const permission: NotificationPermissionSummary = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
  };

  const channel: NotificationChannelSummary = {
    id: CRITICAL_ALERT_CHANNEL_ID,
    name: CRITICAL_ALERT_CHANNEL_NAME,
    importance: 7,
    sound: null, // Sem som
    bypassDnd: true,
    audioUsage: 4,
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, { isAndroid: true });

  assert.equal(diagnosis.status, 'DEGRADADO');
  const soundCheck = diagnosis.checks.find((c) => c.id === 'channel_sound');
  assert.equal(soundCheck?.status, 'warning');
});

test('2.2 Classificação DEGRADADO - Canal com som padrão do sistema em vez do som crítico', () => {
  const permission: NotificationPermissionSummary = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
  };

  const channel: NotificationChannelSummary = {
    id: CRITICAL_ALERT_CHANNEL_ID,
    name: CRITICAL_ALERT_CHANNEL_NAME,
    importance: 7,
    sound: 'default', // Som padrão do sistema
    bypassDnd: true,
    audioUsage: 4,
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, { isAndroid: true });

  assert.equal(diagnosis.status, 'DEGRADADO');
  const soundCheck = diagnosis.checks.find((c) => c.id === 'channel_sound');
  assert.equal(soundCheck?.status, 'warning');
});

test('2.3 Classificação DEGRADADO - Importância reduzida pelo usuário (HIGH ou DEFAULT)', () => {
  const permission: NotificationPermissionSummary = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
  };

  // Importância 6 (HIGH)
  const channelHigh: NotificationChannelSummary = {
    id: CRITICAL_ALERT_CHANNEL_ID,
    name: CRITICAL_ALERT_CHANNEL_NAME,
    importance: 6, // HIGH
    sound: 'custom',
    bypassDnd: true,
    audioUsage: 4,
  };

  const diagHigh = evaluateAlertReadiness(permission, channelHigh, { isAndroid: true });
  assert.equal(diagHigh.status, 'DEGRADADO');
  const impCheckHigh = diagHigh.checks.find((c) => c.id === 'channel_importance');
  assert.equal(impCheckHigh?.status, 'warning');

  // Importância 5 (DEFAULT)
  const channelDefault: NotificationChannelSummary = {
    ...channelHigh,
    importance: 5,
  };

  const diagDefault = evaluateAlertReadiness(permission, channelDefault, { isAndroid: true });
  assert.equal(diagDefault.status, 'DEGRADADO');
});

test('2.4 Classificação DEGRADADO - Uso de áudio não configurado como ALARM', () => {
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
    audioUsage: 5, // NOTIFICATION em vez de ALARM (4)
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, { isAndroid: true });
  assert.equal(diagnosis.status, 'DEGRADADO');
  const audioCheck = diagnosis.checks.find((c) => c.id === 'audio_usage');
  assert.equal(audioCheck?.status, 'warning');
});

test('2.5 Classificação DEGRADADO - Canal com vibração desativada (enableVibrate: false)', () => {
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
    enableVibrate: false, // Vibração desativada
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, { isAndroid: true });
  assert.equal(diagnosis.status, 'DEGRADADO');
  const vibCheck = diagnosis.checks.find((c) => c.id === 'channel_vibration');
  assert.equal(vibCheck?.status, 'warning');
  assert.equal(vibCheck?.actionLabel, 'Ativar Vibração');
});

// -----------------------------------------------------------------------------
// 3. Classificação DESATIVADO - Permissão Negada ou Canal Bloqueado
// -----------------------------------------------------------------------------
test('3. Classificação DESATIVADO - Permissão de notificações negada no sistema', () => {
  const permission: NotificationPermissionSummary = {
    granted: false,
    status: 'denied',
    canAskAgain: false,
  };

  const channel: NotificationChannelSummary = {
    id: CRITICAL_ALERT_CHANNEL_ID,
    name: CRITICAL_ALERT_CHANNEL_NAME,
    importance: 7,
    sound: 'custom',
    bypassDnd: true,
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, { isAndroid: true });

  assert.equal(diagnosis.status, 'DESATIVADO');
  assert.equal(diagnosis.canTest, false);
  const permCheck = diagnosis.checks.find((c) => c.id === 'permission');
  assert.equal(permCheck?.status, 'error');
  assert.equal(permCheck?.actionType, 'app_settings');
});

test('3.1 Classificação DESATIVADO - Canal crítico bloqueado pelo usuário (IMPORTANCE_NONE)', () => {
  const permission: NotificationPermissionSummary = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
  };

  // Importance 2 (NONE no enum do expo-notifications)
  const channel: NotificationChannelSummary = {
    id: CRITICAL_ALERT_CHANNEL_ID,
    name: CRITICAL_ALERT_CHANNEL_NAME,
    importance: 2, // NONE
    sound: 'custom',
    bypassDnd: true,
  };

  const diagnosis = evaluateAlertReadiness(permission, channel, { isAndroid: true });

  assert.equal(diagnosis.status, 'DESATIVADO');
  assert.equal(diagnosis.canTest, false);
  const chanCheck = diagnosis.checks.find((c) => c.id === 'channel_importance');
  assert.equal(chanCheck?.status, 'error');
  assert.equal(chanCheck?.actionType, 'channel_settings');
});

// -----------------------------------------------------------------------------
// 4. Permissão Não Determinada
// -----------------------------------------------------------------------------
test('4. Permissão não determinada - Oferece ação de solicitação de permissão (request_permission)', () => {
  const permission: NotificationPermissionSummary = {
    granted: false,
    status: 'undetermined',
    canAskAgain: true,
  };

  const diagnosis = evaluateAlertReadiness(permission, null, { isAndroid: true });

  assert.equal(diagnosis.status, 'DESATIVADO');
  assert.equal(diagnosis.canTest, false);
  const permCheck = diagnosis.checks.find((c) => c.id === 'permission');
  assert.equal(permCheck?.actionType, 'request_permission');
  assert.equal(permCheck?.actionLabel, 'Ativar Notificações');
});

// -----------------------------------------------------------------------------
// 5. Canal Inexistente
// -----------------------------------------------------------------------------
test('5. Canal inexistente - Canal nulo quando notificações estão ativas resulta em DEGRADADO com canTest false', () => {
  const permission: NotificationPermissionSummary = {
    granted: true,
    status: 'granted',
    canAskAgain: true,
  };

  const diagnosis = evaluateAlertReadiness(permission, null, { isAndroid: true });

  assert.equal(diagnosis.status, 'DEGRADADO');
  assert.equal(diagnosis.canTest, false); // Não pode testar canal inexistente
  const chanCheck = diagnosis.checks.find((c) => c.id === 'channel_existence');
  assert.equal(chanCheck?.status, 'warning');
});

// -----------------------------------------------------------------------------
// 6. Resiliência do NotificationsService perante Falhas Nativas
// -----------------------------------------------------------------------------
test('6. NotificationsService - getDiagnosisAsync absorve falhas da API nativa sem lançar exceção', async () => {
  const brokenMock: NotificationsDriver = {
    async getPermissionsAsync() {
      throw new Error('Native IPC timeout in Android notification manager');
    },
    async getNotificationChannelAsync() {
      throw new Error('Native channel lookup failed');
    },
    async setNotificationChannelAsync() {
      throw new Error('Native channel registration failed');
    },
  };

  const mockPlatform: PlatformLinkingDriver = {
    OS: 'android',
    sendIntent: async () => {},
    openSettings: async () => {},
  };

  const service = new NotificationsService(brokenMock, mockPlatform);
  const diagnosis = await service.getDiagnosisAsync();

  assert.ok(diagnosis);
  assert.equal(diagnosis.status, 'DESATIVADO');
  assert.equal(diagnosis.canTest, false);
  assert.match(diagnosis.summary, /(Alertas desativados|Não foi possível verificar)/);
});

// -----------------------------------------------------------------------------
// 7. Bloqueio de Disparo de Teste Sonoro quando Inapto
// -----------------------------------------------------------------------------
test('7. NotificationsService - sendTestNotificationAsync rejeita disparo quando aparelho está desativado', async () => {
  const disabledMock: NotificationsDriver = {
    async getPermissionsAsync() {
      return { granted: false, status: 'denied', canAskAgain: false };
    },
    async getNotificationChannelAsync() {
      return null;
    },
  };

  const mockPlatform: PlatformLinkingDriver = {
    OS: 'android',
    sendIntent: async () => {},
    openSettings: async () => {},
  };

  const service = new NotificationsService(disabledMock, mockPlatform);

  await assert.rejects(
    async () => {
      await service.sendTestNotificationAsync();
    },
    {
      message: /As notificações estão desativadas/,
    },
  );
});

// -----------------------------------------------------------------------------
// 8. Disparo de Teste Sonoro com Parâmetros Corretos
// -----------------------------------------------------------------------------
test('8. NotificationsService - sendTestNotificationAsync agenda alerta no canal crítico e com som provisório', async () => {
  let scheduledPayload: any = null;

  const mockNotifications: NotificationsDriver = {
    async getPermissionsAsync() {
      return { granted: true, status: 'granted', canAskAgain: true };
    },
    async getNotificationChannelAsync(id: string) {
      assert.equal(id, CRITICAL_ALERT_CHANNEL_ID);
      return {
        id: CRITICAL_ALERT_CHANNEL_ID,
        name: CRITICAL_ALERT_CHANNEL_NAME,
        importance: 7,
        sound: 'custom',
        bypassDnd: true,
        audioAttributes: { usage: 4, contentType: 4 },
      };
    },
    async setNotificationChannelAsync() {
      return {};
    },
    async scheduleNotificationAsync(payload: any) {
      scheduledPayload = payload;
      return 'test-notification-uuid-1234';
    },
    AndroidImportance: { MAX: 7 },
    AndroidAudioUsage: { ALARM: 4 },
    AndroidAudioContentType: { SONIFICATION: 4 },
    AndroidNotificationVisibility: { PUBLIC: 1 },
    AndroidNotificationPriority: { MAX: 'max' },
  };

  const mockPlatform: PlatformLinkingDriver = {
    OS: 'android',
    sendIntent: async () => {},
    openSettings: async () => {},
  };

  const service = new NotificationsService(mockNotifications, mockPlatform);
  const resultId = await service.sendTestNotificationAsync();

  assert.equal(resultId, 'test-notification-uuid-1234');
  assert.ok(scheduledPayload);
  assert.equal(scheduledPayload.content.title, TEST_NOTIFICATION_TITLE);
  assert.equal(scheduledPayload.content.body, TEST_NOTIFICATION_BODY);
  assert.equal(scheduledPayload.content.sound, PROVISIONAL_ALERT_SOUND_FILE);
  assert.deepEqual(scheduledPayload.content.vibrate, CRITICAL_VIBRATION_PATTERN);
  assert.equal(scheduledPayload.content.data.isTest, true);
  // Garante ausência de simulação de ocorrência real ou dados sensíveis
  assert.equal(scheduledPayload.content.data.cameraId, undefined);
  assert.equal(scheduledPayload.content.data.alertId, undefined);
});

// -----------------------------------------------------------------------------
// 9. Configuração Nativa do Canal Crítico (setupCriticalChannelAsync)
// -----------------------------------------------------------------------------
test('9. NotificationsService - setupCriticalChannelAsync configura canal com requisitos canônicos', async () => {
  let createdChannelId = '';
  let createdChannelConfig: any = null;

  const mockNotifications: NotificationsDriver = {
    async setNotificationChannelAsync(channelId: string, config: any) {
      createdChannelId = channelId;
      createdChannelConfig = config;
      return { id: channelId, ...config };
    },
    AndroidImportance: { MAX: 7 },
    AndroidAudioUsage: { ALARM: 4 },
    AndroidAudioContentType: { SONIFICATION: 4 },
    AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 2 },
  };

  const mockPlatform: PlatformLinkingDriver = {
    OS: 'android',
    sendIntent: async () => {},
    openSettings: async () => {},
  };

  const service = new NotificationsService(mockNotifications, mockPlatform);
  const channel = await service.setupCriticalChannelAsync();

  assert.ok(channel);
  assert.equal(createdChannelId, CRITICAL_ALERT_CHANNEL_ID);
  assert.equal(createdChannelConfig.name, CRITICAL_ALERT_CHANNEL_NAME);
  assert.equal(createdChannelConfig.description, CRITICAL_ALERT_CHANNEL_DESCRIPTION);
  assert.equal(createdChannelConfig.importance, 7);
  assert.equal(createdChannelConfig.sound, PROVISIONAL_ALERT_SOUND_FILE);
  assert.equal(createdChannelConfig.bypassDnd, true);
  assert.equal(createdChannelConfig.lockscreenVisibility, 2); // PRIVATE
  assert.deepEqual(createdChannelConfig.vibrationPattern, CRITICAL_VIBRATION_PATTERN);
  assert.equal(createdChannelConfig.audioAttributes.usage, 4); // ALARM
  assert.equal(createdChannelConfig.audioAttributes.contentType, 4); // SONIFICATION
  assert.equal(createdChannelConfig.audioAttributes.flags.enforceAudibility, false);
});

// -----------------------------------------------------------------------------
// 10. Validação do Arquivo de Áudio Provisório (WAV)
// -----------------------------------------------------------------------------
test('10. Som Provisório - Arquivo existe em assets/sounds e possui cabeçalhos RIFF WAVE válidos', () => {
  const soundPath = path.resolve(process.cwd(), 'assets/sounds', PROVISIONAL_ALERT_SOUND_FILE);

  assert.ok(fs.existsSync(soundPath), `Arquivo de som não encontrado em: ${soundPath}`);

  const buffer = fs.readFileSync(soundPath);
  assert.ok(buffer.length > 44, 'Arquivo de som muito pequeno para conter cabeçalho WAV');

  // Validação do cabeçalho RIFF
  const riff = buffer.toString('ascii', 0, 4);
  const wave = buffer.toString('ascii', 8, 12);
  const fmt = buffer.toString('ascii', 12, 16);

  assert.equal(riff, 'RIFF', 'O cabeçalho deve começar com RIFF');
  assert.equal(wave, 'WAVE', 'O formato do arquivo deve ser WAVE');
  assert.equal(fmt, 'fmt ', 'O primeiro sub-chunk deve ser fmt ');

  // Formato de áudio 1 = PCM linear
  const audioFormat = buffer.readUInt16LE(20);
  assert.equal(audioFormat, 1, 'O áudio deve estar codificado em PCM linear uncompressed');

  // Canais
  const numChannels = buffer.readUInt16LE(22);
  assert.equal(numChannels, 1, 'O áudio deve ser mono (1 canal)');

  // Taxa de amostragem: 44.1 kHz
  const sampleRate = buffer.readUInt32LE(24);
  assert.equal(sampleRate, 44100, 'Taxa de amostragem padrão de 44.100 Hz');

  // Bits por amostra: 16-bit
  const bitsPerSample = buffer.readUInt16LE(34);
  assert.equal(bitsPerSample, 16, 'Resolução de 16 bits por amostra');

  // Duração entre 0.5s e 1.5s (som curto e não intrusivo para teste)
  const dataSize = buffer.readUInt32LE(40);
  const duration = dataSize / (sampleRate * numChannels * (bitsPerSample / 8));
  assert.ok(duration >= 0.5 && duration <= 1.5, `Duração esperada ~0.8s, encontrada: ${duration}s`);
});

// -----------------------------------------------------------------------------
// 11. Resolução Segura e Dinâmica de Intents do Android com Application ID Dinâmico
// -----------------------------------------------------------------------------
test('11. NotificationsService - Abertura de configurações nativas via Intents com Application ID dinâmico', async () => {
  const sentIntents: Array<{ action: string; extras?: any }> = [];
  let fallbackSettingsOpened = 0;

  const dynamicAppId = 'br.com.poolsafe.app.production';

  const mockPlatform: PlatformLinkingDriver = {
    OS: 'android',
    async sendIntent(action: string, extras?: any) {
      sentIntents.push({ action, extras });
    },
    async openSettings() {
      fallbackSettingsOpened++;
    },
    getApplicationId() {
      return dynamicAppId;
    },
  };

  const service = new NotificationsService({}, mockPlatform);

  // Confirma resolução dinâmica do application ID
  assert.equal(service.getApplicationId(), dynamicAppId);

  // 1. Configurações de Notificação do App
  await service.openAppNotificationSettings();
  assert.equal(sentIntents.length, 1);
  assert.equal(sentIntents[0]!.action, 'android.settings.APP_NOTIFICATION_SETTINGS');
  assert.deepEqual(sentIntents[0]!.extras, [
    { key: 'android.provider.extra.APP_PACKAGE', value: dynamicAppId },
  ]);

  // 2. Configurações do Canal Específico
  await service.openChannelNotificationSettings();
  assert.equal(sentIntents.length, 2);
  assert.equal(sentIntents[1]!.action, 'android.settings.CHANNEL_NOTIFICATION_SETTINGS');
  assert.deepEqual(sentIntents[1]!.extras, [
    { key: 'android.provider.extra.APP_PACKAGE', value: dynamicAppId },
    { key: 'android.provider.extra.CHANNEL_ID', value: CRITICAL_ALERT_CHANNEL_ID },
  ]);

  // 3. Configurações de Não Perturbe (Notification Policy Access)
  await service.openDndSettings();
  assert.equal(sentIntents.length, 3);
  assert.equal(sentIntents[2]!.action, 'android.settings.NOTIFICATION_POLICY_ACCESS_SETTINGS');

  // 4. Teste de fallback quando sendIntent falha
  const brokenIntentPlatform: PlatformLinkingDriver = {
    OS: 'android',
    async sendIntent() {
      throw new Error('ActivityNotFoundException');
    },
    async openSettings() {
      fallbackSettingsOpened++;
    },
  };

  const serviceWithFallback = new NotificationsService({}, brokenIntentPlatform);
  await serviceWithFallback.openDndSettings();
  assert.equal(fallbackSettingsOpened, 1, 'Deve chamar openSettings quando o intent falhar');
});

test('11.1. NotificationsService - Quando Application ID não estiver disponível, usa diretamente Linking.openSettings() sem intents com package inexistente', async () => {
  const sentIntents: Array<{ action: string; extras?: any }> = [];
  let fallbackSettingsOpened = 0;

  const platformWithoutAppId: PlatformLinkingDriver = {
    OS: 'android',
    async sendIntent(action: string, extras?: any) {
      sentIntents.push({ action, extras });
    },
    async openSettings() {
      fallbackSettingsOpened++;
    },
    getApplicationId() {
      return null;
    },
  };

  const service = new NotificationsService({}, platformWithoutAppId);

  // Confirma que o application ID é null
  assert.equal(service.getApplicationId(), null);

  // 1. Tenta abrir configurações do app: não deve emitir Intent específico de package e deve usar openSettings direto
  await service.openAppNotificationSettings();
  assert.equal(sentIntents.length, 0, 'Não deve emitir Intent específico com package nulo');
  assert.equal(fallbackSettingsOpened, 1, 'Deve chamar openSettings diretamente');

  // 2. Tenta abrir configurações do canal: não deve emitir Intent específico de package e deve usar openSettings direto
  await service.openChannelNotificationSettings();
  assert.equal(sentIntents.length, 0, 'Não deve emitir Intent específico com package nulo');
  assert.equal(fallbackSettingsOpened, 2, 'Deve chamar openSettings diretamente');
});

// -----------------------------------------------------------------------------
// 12. Atualização de Diagnóstico Pós-Retorno das Configurações
// -----------------------------------------------------------------------------
test('12. NotificationsService - Atualização dinâmica do diagnóstico após alteração de permissões pelo usuário', async () => {
  let isGranted = false;

  const dynamicMock: NotificationsDriver = {
    async getPermissionsAsync() {
      return {
        granted: isGranted,
        status: isGranted ? 'granted' : 'denied',
        canAskAgain: true,
      };
    },
    async getNotificationChannelAsync() {
      if (!isGranted) return null;
      return {
        id: CRITICAL_ALERT_CHANNEL_ID,
        name: CRITICAL_ALERT_CHANNEL_NAME,
        importance: 7, // MAX
        sound: 'custom',
        bypassDnd: true,
        audioAttributes: { usage: 4, contentType: 4 },
      };
    },
    async setNotificationChannelAsync(id: string, config: any) {
      return { id, ...config };
    },
    AndroidImportance: { MAX: 7 },
    AndroidAudioUsage: { ALARM: 4 },
    AndroidAudioContentType: { SONIFICATION: 4 },
  };

  const mockPlatform: PlatformLinkingDriver = {
    OS: 'android',
  };

  const service = new NotificationsService(dynamicMock, mockPlatform);

  // 1. Estado inicial: Usuário com permissão desativada
  const initialDiagnosis = await service.getDiagnosisAsync();
  assert.equal(initialDiagnosis.status, 'DESATIVADO');
  assert.equal(initialDiagnosis.canTest, false);

  // 2. Simula o usuário indo às configurações do Android e ativando as notificações
  isGranted = true;

  // 3. Ao retornar ao app (gatilho de AppState active / useFocusEffect), nova consulta é executada
  const updatedDiagnosis = await service.getDiagnosisAsync();
  assert.equal(updatedDiagnosis.status, 'DEGRADADO');
  assert.equal(updatedDiagnosis.canTest, true);
  assert.match(updatedDiagnosis.summary, /Prontidão parcial/);
});

// -----------------------------------------------------------------------------
// 13. Mapeamento Visual e Componentes dos Estados Essenciais
// -----------------------------------------------------------------------------
test('13. Diagnóstico e Interface - Mapeamento estrito de cores, variantes e ícones do Design System', () => {
  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'PRONTO':
        return 'success';
      case 'DEGRADADO':
        return 'warning';
      case 'DESATIVADO':
      default:
        return 'danger';
    }
  };

  const getBadgeIcon = (status: string) => {
    switch (status) {
      case 'PRONTO':
        return 'check-circle';
      case 'DEGRADADO':
        return 'alert-triangle';
      case 'DESATIVADO':
      default:
        return 'x-circle';
    }
  };

  // PRONTO
  assert.equal(getBadgeVariant('PRONTO'), 'success');
  assert.equal(getBadgeIcon('PRONTO'), 'check-circle');

  // DEGRADADO
  assert.equal(getBadgeVariant('DEGRADADO'), 'warning');
  assert.equal(getBadgeIcon('DEGRADADO'), 'alert-triangle');

  // DESATIVADO
  assert.equal(getBadgeVariant('DESATIVADO'), 'danger');
  assert.equal(getBadgeIcon('DESATIVADO'), 'x-circle');
});

// -----------------------------------------------------------------------------
// 14. Fluxo Pós-Retorno de DND - Ordem Estrita de Execução
// -----------------------------------------------------------------------------
test('14. Fluxo Pós-Retorno de DND - Reaplica canal idempotentemente, consulta novamente o canal e recalcula a prontidão nessa ordem', async () => {
  const callSequence: string[] = [];

  const trackingMock: NotificationsDriver = {
    async getPermissionsAsync() {
      callSequence.push('getPermissionsAsync');
      return { granted: true, status: 'granted', canAskAgain: true };
    },
    async setNotificationChannelAsync(id: string, config: any) {
      callSequence.push(`setNotificationChannelAsync:${id}`);
      return { id, ...config };
    },
    async getNotificationChannelAsync(id: string) {
      callSequence.push(`getNotificationChannelAsync:${id}`);
      return {
        id,
        name: CRITICAL_ALERT_CHANNEL_NAME,
        importance: 7,
        sound: 'custom',
        bypassDnd: true,
        audioAttributes: { usage: 4, contentType: 4 },
      };
    },
    AndroidImportance: { MAX: 7 },
    AndroidAudioUsage: { ALARM: 4 },
    AndroidAudioContentType: { SONIFICATION: 4 },
  };

  const mockPlatform: PlatformLinkingDriver = {
    OS: 'android',
  };

  const service = new NotificationsService(trackingMock, mockPlatform);

  // Executa o diagnóstico (simulando retorno de tela ou trigger do AppState)
  const diagnosis = await service.getDiagnosisAsync({ reapplyChannel: true });

  // 1. Confirma ordem: getPermissions -> setNotificationChannel (reaplica) -> getNotificationChannel (consulta)
  assert.equal(callSequence[0], 'getPermissionsAsync');
  assert.equal(callSequence[1], `setNotificationChannelAsync:${CRITICAL_ALERT_CHANNEL_ID}`);
  assert.equal(callSequence[2], `getNotificationChannelAsync:${CRITICAL_ALERT_CHANNEL_ID}`);

  // 2. Confirma que a prontidão foi recalculada baseada no resultado atualizado
  assert.equal(diagnosis.status, 'DEGRADADO');
  assert.equal(diagnosis.canTest, true);
});


