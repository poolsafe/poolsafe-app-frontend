import test from 'node:test';
import assert from 'node:assert/strict';

import { AlertsApiService } from '../src/services/api/alerts-service.ts';
import { HttpClient } from '../src/services/api/client.ts';
import { ApiError } from '../src/services/api/errors.ts';
import { ApiErrorCodes } from '../src/services/api/types.ts';
import type {
  AlertSummaryItem,
  AlertDetailItem,
} from '../src/services/api/types.ts';
import { uint8ArrayToBase64 } from '../src/utils/base64.ts';

test('1. AlertsApiService - Consulta GET /alerts paginada e valida parsing do contrato', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedAuth = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  const mockAlertsList: AlertSummaryItem[] = [
    {
      id: '101',
      type: 'POSSIVEL_RISCO',
      severity: 'CRITICA',
      detectedAt: '2026-10-03T18:00:00.000Z',
      camera: {
        id: '1',
        name: 'Piscina Olímpica',
        location: 'Área externa',
      },
      evidenceAvailable: true,
    },
    {
      id: '100',
      type: 'POSSIVEL_RISCO',
      severity: 'ATENCAO',
      detectedAt: '2026-10-03T17:30:00.000Z',
      camera: {
        id: '2',
        name: 'Prainha Infantil',
        location: 'Área rasa',
      },
      evidenceAvailable: false,
    },
  ];

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || 'GET';
    capturedAuth = (init.headers as any)?.['Authorization'] || '';

    return new Response(
      JSON.stringify({
        data: mockAlertsList,
        pagination: {
          nextCursor: 'cursor-token-page-2',
          hasMore: true,
        },
        meta: {
          requestId: 'req-alerts-1',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new AlertsApiService(mockHttpClient);
  const result = await service.getAlerts('jwt-access-token', { limit: 20 });

  assert.equal(capturedMethod, 'GET');
  assert.equal(capturedUrl, 'http://api.test/api/v1/alerts?limit=20');
  assert.equal(capturedAuth, 'Bearer jwt-access-token');

  assert.equal(result.data.length, 2);
  assert.equal(result.pagination.nextCursor, 'cursor-token-page-2');
  assert.equal(result.pagination.hasMore, true);

  const item1 = result.data[0]!;
  assert.equal(item1.id, '101');
  assert.equal(item1.severity, 'CRITICA');
  assert.equal(item1.evidenceAvailable, true);
  assert.equal(item1.camera.name, 'Piscina Olímpica');

  // Inexistência de campos de leitura/status no contrato
  assert.equal((item1 as any).viewed, undefined, 'Não deve existir campo viewed');
  assert.equal((item1 as any).verified, undefined, 'Não deve existir campo verified');
  assert.equal((item1 as any).resolved, undefined, 'Não deve existir campo resolved');
});

test('2. AlertsApiService - Paginação incremental com cursor opaco', async () => {
  let capturedUrl = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');
  (mockHttpClient as any).execute = async (url: string) => {
    capturedUrl = url;
    return new Response(
      JSON.stringify({
        data: [],
        pagination: {
          nextCursor: null,
          hasMore: false,
        },
        meta: {
          requestId: 'req-alerts-p2',
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new AlertsApiService(mockHttpClient);
  const result = await service.getAlerts('jwt-access-token', {
    cursor: 'opaque-cursor-from-prev-page',
    limit: 20,
  });

  assert.ok(
    capturedUrl.includes('cursor=opaque-cursor-from-prev-page'),
    'O cursor deve ser repassado na query da requisição seguinte',
  );
  assert.equal(result.pagination.hasMore, false);
  assert.equal(result.pagination.nextCursor, null);
});

test('3. AlertsApiService - Filtros de consulta (cameraId, severity, from, to)', async () => {
  let capturedUrl = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');
  (mockHttpClient as any).execute = async (url: string) => {
    capturedUrl = url;
    return new Response(
      JSON.stringify({
        data: [],
        pagination: {
          nextCursor: null,
          hasMore: false,
        },
        meta: { requestId: 'req-alerts-filters' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new AlertsApiService(mockHttpClient);
  await service.getAlerts('jwt-access-token', {
    cameraId: '10',
    severity: 'CRITICA',
    from: '2026-09-01T00:00:00.000Z',
    to: '2026-09-30T23:59:59.999Z',
  });

  assert.ok(capturedUrl.includes('cameraId=10'));
  assert.ok(capturedUrl.includes('severity=CRITICA'));
  assert.ok(capturedUrl.includes('from=2026-09-01T00%3A00%3A00.000Z'));
  assert.ok(capturedUrl.includes('to=2026-09-30T23%3A59%3A59.999Z'));
});

test('4. AlertsApiService - Detalhe do alerta GET /alerts/{alertId} com metadados de evidência', async () => {
  let capturedUrl = '';
  let capturedAuth = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  const mockDetail: AlertDetailItem = {
    id: '105',
    type: 'POSSIVEL_RISCO',
    severity: 'CRITICA',
    detectedAt: '2026-10-03T19:00:00.000Z',
    camera: {
      id: '3',
      name: 'Deck Lateral',
      location: 'Área do bar',
    },
    monitoringId: '42',
    evidence: {
      available: true,
      mimeType: 'image/jpeg',
      expiresAt: '2026-11-02T19:00:01.000Z',
      unavailableReason: null,
    },
    notification: null,
  };

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedAuth = (init.headers as any)?.['Authorization'] || '';

    return new Response(
      JSON.stringify({
        data: mockDetail,
        meta: { requestId: 'req-alert-detail-1' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new AlertsApiService(mockHttpClient);
  const result = await service.getAlertDetail('105', 'jwt-access-token');

  assert.equal(capturedUrl, 'http://api.test/api/v1/alerts/105');
  assert.equal(capturedAuth, 'Bearer jwt-access-token');

  assert.equal(result.id, '105');
  assert.equal(result.type, 'POSSIVEL_RISCO');
  assert.equal(result.severity, 'CRITICA');
  assert.equal(result.monitoringId, '42');
  assert.ok(result.evidence);
  assert.equal(result.evidence.available, true);
  assert.equal(result.evidence.mimeType, 'image/jpeg');
  assert.equal(result.evidence.unavailableReason, null);
  assert.equal(result.notification, null);

  // Não expõe dados técnicos ou confiança/bounding boxes
  assert.equal((result as any).confidence, undefined);
  assert.equal((result as any).boundingBoxes, undefined);
  assert.equal((result as any).eventKey, undefined);
  assert.equal((result as any).viewed, undefined);
});

test('5. AlertsApiService - Alerta inexistente ou não autorizado retorna 404 RESOURCE_NOT_FOUND', async () => {
  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  (mockHttpClient as any).execute = async () => {
    return new Response(
      JSON.stringify({
        type: 'urn:poolsafe:problem:resource-not-found',
        title: 'Recurso não encontrado',
        status: 404,
        code: 'RESOURCE_NOT_FOUND',
        detail: 'Alerta não encontrado ou não autorizado.',
        instance: 'urn:poolsafe:request:req-404',
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/problem+json' },
      },
    );
  };

  const service = new AlertsApiService(mockHttpClient);

  await assert.rejects(
    async () => {
      await service.getAlertDetail('9999', 'jwt-access-token');
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 404);
      assert.equal(err.code, ApiErrorCodes.RESOURCE_NOT_FOUND);
      return true;
    },
  );
});

test('6. AlertsApiService - Evidência binária transmitida com headers seguros e mimeType', async () => {
  let capturedUrl = '';
  let capturedAuth = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');
  const fakeJpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]);

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedAuth = (init.headers as any)?.['Authorization'] || '';

    return new Response(fakeJpegBytes, {
      status: 200,
      headers: {
        'Content-Type': 'image/jpeg',
        'Content-Disposition': 'inline; filename="alert-105.jpg"',
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  };

  const service = new AlertsApiService(mockHttpClient);
  const result = await service.getAlertEvidence('105', 'jwt-access-token');

  assert.equal(capturedUrl, 'http://api.test/api/v1/alerts/105/evidence');
  assert.equal(capturedAuth, 'Bearer jwt-access-token');
  assert.equal(result.mimeType, 'image/jpeg');
  assert.ok(result.dataUri.startsWith('data:image/jpeg;base64,'));
});

test('7. AlertsApiService - Evidência ausente (404) ou indisponível/expirada/removida (410)', async () => {
  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  // Caso 1: 404 EVIDENCE_NOT_FOUND
  (mockHttpClient as any).execute = async () => {
    return new Response(
      JSON.stringify({
        type: 'urn:poolsafe:problem:evidence-not-found',
        title: 'Evidência não encontrada',
        status: 404,
        code: 'EVIDENCE_NOT_FOUND',
        detail: 'Evidência não encontrada para este alerta.',
        instance: 'urn:poolsafe:request:req-evi-404',
      }),
      {
        status: 404,
        headers: { 'Content-Type': 'application/problem+json' },
      },
    );
  };

  const service = new AlertsApiService(mockHttpClient);

  await assert.rejects(
    async () => {
      await service.getAlertEvidence('100', 'jwt-access-token');
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 404);
      assert.equal(err.code, 'EVIDENCE_NOT_FOUND');
      return true;
    },
  );

  // Caso 2: 410 EVIDENCE_UNAVAILABLE (EXPIRADA)
  (mockHttpClient as any).execute = async () => {
    return new Response(
      JSON.stringify({
        type: 'urn:poolsafe:problem:evidence-unavailable',
        title: 'Evidência indisponível',
        status: 410,
        code: 'EVIDENCE_UNAVAILABLE',
        detail: 'Evidência expirada.',
        instance: 'urn:poolsafe:request:req-evi-410',
        reason: 'EXPIRED',
      }),
      {
        status: 410,
        headers: { 'Content-Type': 'application/problem+json' },
      },
    );
  };

  await assert.rejects(
    async () => {
      await service.getAlertEvidence('101', 'jwt-access-token');
    },
    (err: unknown) => {
      assert.ok(err instanceof ApiError);
      assert.equal(err.status, 410);
      assert.equal(err.code, 'EVIDENCE_UNAVAILABLE');
      return true;
    },
  );
});

test('8. uint8ArrayToBase64 - Conversão puramente em memória sem persistência em disco', () => {
  const bytes = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100]); // "Hello World"
  const base64 = uint8ArrayToBase64(bytes);

  assert.equal(base64, 'SGVsbG8gV29ybGQ=');

  const dataUri = `data:image/jpeg;base64,${base64}`;
  assert.ok(dataUri.startsWith('data:image/jpeg;base64,SGVsbG8g'));
});

test('9. uint8ArrayToBase64 - Conversão de imagem grande (5 MiB) em blocos sem estourar pilha', () => {
  // 5 MiB = 5 * 1024 * 1024 = 5.242.880 bytes
  const largeSize = 5 * 1024 * 1024;
  const largeBytes = new Uint8Array(largeSize);
  for (let i = 0; i < 1000; i++) {
    largeBytes[i] = i % 256;
  }

  // Executa a conversão e garante ausência de RangeError: Maximum call stack size exceeded
  const base64 = uint8ArrayToBase64(largeBytes);

  assert.ok(base64.length > 0);
  assert.equal(base64.length, Math.ceil(largeSize / 3) * 4);
});

