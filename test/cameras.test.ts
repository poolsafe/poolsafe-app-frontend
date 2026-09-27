import test from 'node:test';
import assert from 'node:assert/strict';

import { CamerasApiService } from '../src/services/api/cameras-service.ts';
import { HttpClient } from '../src/services/api/client.ts';
import { ApiError } from '../src/services/api/errors.ts';
import { ApiErrorCodes } from '../src/services/api/types.ts';
import type { CameraItem, CameraDetailItem } from '../src/services/api/types.ts';

test('1. CamerasApiService - Consulta GET /cameras com token Bearer e retorna envelope data', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedAuth = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  const mockCamerasList: CameraItem[] = [
    {
      id: '8',
      name: 'Piscina Principal',
      location: 'Área externa norte',
      administrativeStatus: 'ATIVA',
      connectionStatus: 'ONLINE',
      lastCommunicationAt: '2026-09-27T10:00:00.000Z',
      currentMonitoring: {
        id: '51',
        status: 'ATIVO',
        operationalStatus: 'ATIVO',
      },
      recentAlertsCount: 3,
    },
    {
      id: '9',
      name: 'Deck e Prainha',
      location: 'Área externa sul',
      administrativeStatus: 'ATIVA',
      connectionStatus: 'OFFLINE',
      lastCommunicationAt: '2026-09-27T09:40:00.000Z',
      currentMonitoring: null,
      recentAlertsCount: 0,
    },
  ];

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || 'GET';
    capturedAuth = (init.headers as any)?.['Authorization'] || '';

    return new Response(
      JSON.stringify({
        data: mockCamerasList,
        meta: { requestId: 'req-cam-1' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await mockHttpClient.get<CameraItem[]>('cameras', { token: 'jwt-access-token' });

  assert.equal(capturedMethod, 'GET');
  assert.equal(capturedUrl, 'http://api.test/api/v1/cameras');
  assert.equal(capturedAuth, 'Bearer jwt-access-token');

  assert.equal(result.data.length, 2);
  const cam1 = result.data[0]!;
  const cam2 = result.data[1]!;

  assert.equal(cam1.id, '8');
  assert.equal(cam1.name, 'Piscina Principal');
  assert.equal(cam1.connectionStatus, 'ONLINE');
  assert.equal(cam1.currentMonitoring?.operationalStatus, 'ATIVO');
  assert.equal(cam1.recentAlertsCount, 3);

  assert.equal(cam2.id, '9');
  assert.equal(cam2.connectionStatus, 'OFFLINE');
  assert.equal(cam2.currentMonitoring, null);
});

test('2. CamerasApiService - Consulta GET /cameras/:id com token Bearer e retorna detalhes com até 30 alertas', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedAuth = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  const mockCameraDetail: CameraDetailItem = {
    id: '8',
    name: 'Piscina Principal',
    location: 'Área externa',
    administrativeStatus: 'ATIVA',
    connectionStatus: 'ONLINE',
    lastCommunicationAt: '2026-09-27T10:00:00.000Z',
    currentMonitoring: {
      id: '51',
      status: 'ATIVO',
      operationalStatus: 'ATIVO',
    },
    recentAlertsCount: 2,
    recentAlerts: [
      {
        id: '101',
        type: 'POSSIVEL_RISCO',
        severity: 'CRITICA',
        detectedAt: '2026-09-27T09:50:00.000Z',
        camera: {
          id: '8',
          name: 'Piscina Principal',
          location: 'Área externa',
        },
        evidenceAvailable: true,
      },
      {
        id: '100',
        type: 'POSSIVEL_RISCO',
        severity: 'ATENCAO',
        detectedAt: '2026-09-27T09:40:00.000Z',
        camera: {
          id: '8',
          name: 'Piscina Principal',
          location: 'Área externa',
        },
        evidenceAvailable: false,
      },
    ],
  };

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || 'GET';
    capturedAuth = (init.headers as any)?.['Authorization'] || '';

    return new Response(
      JSON.stringify({
        data: mockCameraDetail,
        meta: { requestId: 'req-cam-detail' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const result = await mockHttpClient.get<CameraDetailItem>('cameras/8', { token: 'jwt-access-token' });

  assert.equal(capturedMethod, 'GET');
  assert.equal(capturedUrl, 'http://api.test/api/v1/cameras/8');
  assert.equal(capturedAuth, 'Bearer jwt-access-token');

  assert.equal(result.data.id, '8');
  assert.equal(result.data.name, 'Piscina Principal');
  assert.equal(result.data.recentAlerts.length, 2);
  const alert1 = result.data.recentAlerts[0]!;
  const alert2 = result.data.recentAlerts[1]!;

  assert.equal(alert1.id, '101');
  assert.equal(alert1.severity, 'CRITICA');
  assert.equal(alert1.evidenceAvailable, true);
  assert.equal(alert2.id, '100');
  assert.equal(alert2.severity, 'ATENCAO');
  assert.equal(alert2.evidenceAvailable, false);
});

test('3. Falha de rede ao consultar câmeras produz ApiError e nunca estado seguro implícito', async () => {
  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  (mockHttpClient as any).execute = async () => {
    throw ApiError.networkError();
  };

  await assert.rejects(
    async () => {
      await mockHttpClient.get<CameraItem[]>('cameras', { token: 'any-token' });
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.code, ApiErrorCodes.NETWORK_ERROR);
      return true;
    },
  );
});

test('4. Resposta 404 RESOURCE_NOT_FOUND para câmera não autorizada gera ApiError correspondente', async () => {
  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  (mockHttpClient as any).execute = async () => {
    return new Response(
      JSON.stringify({
        type: 'urn:poolsafe:problem:resource-not-found',
        title: 'Recurso não encontrado',
        status: 404,
        detail: 'Câmera não encontrada ou acesso não autorizado.',
        code: 'RESOURCE_NOT_FOUND',
        requestId: 'req-404',
      }),
      { status: 404, headers: { 'Content-Type': 'application/problem+json' } },
    );
  };

  await assert.rejects(
    async () => {
      await mockHttpClient.get<CameraDetailItem>('cameras/999', { token: 'any-token' });
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 404);
      assert.equal(err.code, 'RESOURCE_NOT_FOUND');
      return true;
    },
  );
});
