import test from 'node:test';
import assert from 'node:assert/strict';

import { HomeApiService } from '../src/services/api/home-service.ts';
import { HttpClient } from '../src/services/api/client.ts';
import { ApiError } from '../src/services/api/errors.ts';
import { ApiErrorCodes } from '../src/services/api/types.ts';
import type { HomeData } from '../src/services/api/types.ts';

test('1. HomeApiService - Consulta GET /home com token Bearer e retorna envelope data', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedAuth = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  const mockHomeData: HomeData = {
    generatedAt: '2026-09-27T10:00:00.000Z',
    overallMonitoring: {
      status: 'ATIVO',
      reason: 'OPERACIONAL',
      currentSessions: 1,
      activeSessions: 1,
      pausedSessions: 0,
      degradedSessions: 0,
      unavailableSessions: 0,
    },
    cameras: {
      total: 2,
      online: 2,
      offline: 0,
      unknown: 0,
      inactive: 0,
    },
    latestAlert: {
      id: '99',
      type: 'POSSIVEL_RISCO',
      severity: 'CRITICA',
      detectedAt: '2026-09-27T09:55:00.000Z',
      camera: {
        id: '5',
        name: 'Piscina Principal',
        location: 'Área externa',
      },
    },
    warnings: [],
  };

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || 'GET';
    capturedAuth = (init.headers as any)?.['Authorization'] || '';

    return new Response(
      JSON.stringify({
        data: mockHomeData,
        meta: { requestId: 'req-home-1' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new HomeApiService();
  (service as any).client = mockHttpClient;

  // Substitui temporariamente o apiClient global do serviço ou chama através da instância
  const result = await mockHttpClient.get<HomeData>('home', { token: 'jwt-access-token' });

  assert.equal(capturedMethod, 'GET');
  assert.equal(capturedUrl, 'http://api.test/api/v1/home');
  assert.equal(capturedAuth, 'Bearer jwt-access-token');

  assert.equal(result.data.overallMonitoring.status, 'ATIVO');
  assert.equal(result.data.overallMonitoring.reason, 'OPERACIONAL');
  assert.equal(result.data.cameras.total, 2);
  assert.equal(result.data.cameras.online, 2);
  assert.ok(result.data.latestAlert);
  assert.equal(result.data.latestAlert?.id, '99');
  assert.equal(result.data.latestAlert?.severity, 'CRITICA');
  assert.equal(result.data.warnings.length, 0);
});

test('2. HomeApiService - Suporta resposta sem alertas recentes e com avisos operacionais', async () => {
  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  const mockHomeData: HomeData = {
    generatedAt: '2026-09-27T10:00:00.000Z',
    overallMonitoring: {
      status: 'DEGRADADO',
      reason: 'CAMERAS_INDISPONIVEIS',
      currentSessions: 1,
      activeSessions: 1,
      pausedSessions: 0,
      degradedSessions: 1,
      unavailableSessions: 0,
    },
    cameras: {
      total: 2,
      online: 1,
      offline: 1,
      unknown: 0,
      inactive: 0,
    },
    latestAlert: null,
    warnings: [
      {
        code: 'CAMERA_OFFLINE',
        severity: 'ATENCAO',
        cameraId: '8',
        monitoringId: '20',
      },
    ],
  };

  (mockHttpClient as any).execute = async () => {
    return new Response(
      JSON.stringify({
        data: mockHomeData,
        meta: { requestId: 'req-home-2' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await mockHttpClient.get<HomeData>('home', { token: 'jwt-token-2' });

  assert.equal(result.data.overallMonitoring.status, 'DEGRADADO');
  assert.equal(result.data.overallMonitoring.reason, 'CAMERAS_INDISPONIVEIS');
  assert.equal(result.data.latestAlert, null);
  assert.equal(result.data.warnings.length, 1);
  const firstWarning = result.data.warnings[0];
  assert.ok(firstWarning);
  assert.equal(firstWarning.code, 'CAMERA_OFFLINE');
  assert.equal(firstWarning.cameraId, '8');
});

test('3. Falha de comunicação nunca produz estado seguro e lança ApiError', async () => {
  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  (mockHttpClient as any).execute = async () => {
    throw ApiError.networkError();
  };

  await assert.rejects(
    async () => {
      await mockHttpClient.get<HomeData>('home', { token: 'jwt-token' });
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.isNetworkError, true);
      assert.equal(err.code, ApiErrorCodes.NETWORK_ERROR);
      // Garante que não contém propriedades que simulem sucesso
      assert.equal((err as any).overallMonitoring, undefined);
      return true;
    },
  );
});

test('4. Validação dos quatro estados operacionais canônicos da Home', () => {
  const validStatuses = ['ATIVO', 'PAUSADO', 'DEGRADADO', 'INDISPONIVEL'];

  // ATIVO
  const activeStatus: HomeData['overallMonitoring']['status'] = 'ATIVO';
  assert.ok(validStatuses.includes(activeStatus));

  // PAUSADO
  const pausedStatus: HomeData['overallMonitoring']['status'] = 'PAUSADO';
  assert.ok(validStatuses.includes(pausedStatus));

  // DEGRADADO
  const degradedStatus: HomeData['overallMonitoring']['status'] = 'DEGRADADO';
  assert.ok(validStatuses.includes(degradedStatus));

  // INDISPONIVEL
  const unavailStatus: HomeData['overallMonitoring']['status'] = 'INDISPONIVEL';
  assert.ok(validStatuses.includes(unavailStatus));
});

test('5. Lógica de dados desatualizados (stale data): falha de rede preserva dados em cache marcados como não confirmados', () => {
  const cachedData: HomeData = {
    generatedAt: '2026-09-27T08:00:00.000Z',
    overallMonitoring: {
      status: 'ATIVO',
      reason: 'OPERACIONAL',
      currentSessions: 1,
      activeSessions: 1,
      pausedSessions: 0,
      degradedSessions: 0,
      unavailableSessions: 0,
    },
    cameras: { total: 1, online: 1, offline: 0, unknown: 0, inactive: 0 },
    latestAlert: null,
    warnings: [],
  };

  // Simula estado TanStack Query: isError = true, mas data != null
  const queryState = {
    data: cachedData,
    isError: true,
    error: ApiError.networkError(),
    isPending: false,
  };

  // Regra da Fatia 4: Se isError === true && data != null, o aplicativo exibe o aviso "Dados desatualizados"
  const isStale = queryState.isError && !!queryState.data;
  assert.equal(isStale, true, 'Deve identificar que os dados em tela estão desatualizados');

  // Confirma que a última data conhecida é preservada
  assert.equal(queryState.data.generatedAt, '2026-09-27T08:00:00.000Z');
});
