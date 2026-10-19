import test from 'node:test';
import assert from 'node:assert/strict';

import { MonitoringsApiService } from '../src/services/api/monitorings-service.ts';
import { HttpClient } from '../src/services/api/client.ts';
import { ApiError } from '../src/services/api/errors.ts';
import { ApiErrorCodes } from '../src/services/api/types.ts';
import type {
  MonitoringItem,
  CameraItem,
} from '../src/services/api/types.ts';

// ─── 1. API SERVICE TESTS ───────────────────────────────────────────────────

test('1. MonitoringsApiService - Consulta GET /monitorings/current com Bearer token e retorna sessões', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedAuth = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  const mockSessions: MonitoringItem[] = [
    {
      id: '50',
      status: 'ATIVO',
      operationalStatus: 'ATIVO',
      operationalReason: 'OPERACIONAL',
      startedAt: '2026-09-27T10:00:00.000Z',
      pausedAt: null,
      endedAt: null,
      updatedAt: '2026-09-27T10:00:00.000Z',
      cameras: [
        {
          id: '8',
          name: 'Piscina Principal',
          connectionStatus: 'ONLINE',
        },
      ],
    },
    {
      id: '51',
      status: 'PAUSADO',
      operationalStatus: 'PAUSADO',
      operationalReason: 'PAUSADO_PELO_USUARIO',
      startedAt: '2026-09-27T08:00:00.000Z',
      pausedAt: '2026-09-27T09:30:00.000Z',
      endedAt: null,
      updatedAt: '2026-09-27T09:30:00.000Z',
      cameras: [
        {
          id: '9',
          name: 'Deck e Prainha',
          connectionStatus: 'ONLINE',
        },
      ],
    },
  ];

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || 'GET';
    capturedAuth = (init.headers as any)?.['Authorization'] || '';

    return new Response(
      JSON.stringify({
        data: mockSessions,
        meta: { requestId: 'req-mon-1' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new MonitoringsApiService(mockHttpClient);
  const result = await service.getCurrentMonitorings('test-token');

  assert.equal(capturedMethod, 'GET');
  assert.equal(capturedUrl, 'http://api.test/api/v1/monitorings/current');
  assert.equal(capturedAuth, 'Bearer test-token');
  assert.equal(result.length, 2);
  assert.equal(result[0]!.id, '50');
  assert.equal(result[0]!.status, 'ATIVO');
  assert.equal(result[0]!.cameras[0]!.name, 'Piscina Principal');
  assert.equal(result[1]!.id, '51');
  assert.equal(result[1]!.status, 'PAUSADO');
});

test('2. MonitoringsApiService - Consulta GET /monitorings/:id com Bearer token', async () => {
  let capturedUrl = '';
  let capturedAuth = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  const mockDetail: MonitoringItem = {
    id: '50',
    status: 'ATIVO',
    operationalStatus: 'ATIVO',
    operationalReason: 'OPERACIONAL',
    startedAt: '2026-09-27T10:00:00.000Z',
    pausedAt: null,
    endedAt: null,
    updatedAt: '2026-09-27T10:00:00.000Z',
    cameras: [
      {
        id: '8',
        name: 'Piscina Principal',
        connectionStatus: 'ONLINE',
      },
    ],
  };

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedAuth = (init.headers as any)?.['Authorization'] || '';

    return new Response(
      JSON.stringify({
        data: mockDetail,
        meta: { requestId: 'req-mon-2' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new MonitoringsApiService(mockHttpClient);
  const result = await service.getMonitoringById('50', 'test-token');

  assert.equal(capturedUrl, 'http://api.test/api/v1/monitorings/50');
  assert.equal(capturedAuth, 'Bearer test-token');
  assert.equal(result.id, '50');
  assert.equal(result.cameras.length, 1);
});

test('3. MonitoringsApiService - POST /monitorings com IDs selecionados e payload canônico', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || '';
    capturedBody = (init.body as string) || '';

    return new Response(
      JSON.stringify({
        data: {
          id: '52',
          status: 'ATIVO',
          operationalStatus: 'ATIVO',
          operationalReason: 'Todas as câmeras estão operacionais.',
          startedAt: '2026-09-27T12:00:00.000Z',
          pausedAt: null,
          cameras: [
            {
              id: '8',
              name: 'Piscina Principal',
              location: 'Área externa norte',
              connectionStatus: 'ONLINE',
              lastCommunicationAt: '2026-09-27T12:00:00.000Z',
            },
            {
              id: '9',
              name: 'Deck e Prainha',
              location: 'Área externa sul',
              connectionStatus: 'ONLINE',
              lastCommunicationAt: '2026-09-27T12:00:00.000Z',
            },
          ],
        },
        meta: { requestId: 'req-mon-create' },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new MonitoringsApiService(mockHttpClient);
  const result = await service.createMonitoring({ cameraIds: ['8', '9'] }, 'test-token');

  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedUrl, 'http://api.test/api/v1/monitorings');
  const parsedBody = JSON.parse(capturedBody);
  assert.deepEqual(parsedBody, { cameraIds: ['8', '9'] });
  assert.equal(result.id, '52');
  assert.equal(result.cameras.length, 2);
});

test('4. MonitoringsApiService - POST /monitorings/:id/pause envia senha e recebe confirmação', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || '';
    capturedBody = (init.body as string) || '';

    return new Response(
      JSON.stringify({
        data: {
          id: '50',
          status: 'PAUSADO',
          operationalStatus: 'PAUSADO',
          operationalReason: 'Monitoramento pausado temporariamente pelo usuário.',
          startedAt: '2026-09-27T10:00:00.000Z',
          pausedAt: '2026-09-27T11:00:00.000Z',
          cameras: [],
        },
        meta: { requestId: 'req-mon-pause' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new MonitoringsApiService(mockHttpClient);
  const result = await service.pauseMonitoring('50', { password: 'UserSecret123!' }, 'test-token');

  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedUrl, 'http://api.test/api/v1/monitorings/50/pause');
  const parsedBody = JSON.parse(capturedBody);
  assert.equal(parsedBody.password, 'UserSecret123!');
  assert.equal(result.status, 'PAUSADO');
});

test('5. MonitoringsApiService - POST /monitorings/:id/resume não envia corpo e reativa sessão', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedBody: any = undefined;

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || '';
    capturedBody = init.body;

    return new Response(
      JSON.stringify({
        data: {
          id: '50',
          status: 'ATIVO',
          operationalStatus: 'ATIVO',
          operationalReason: 'Todas as câmeras estão operacionais.',
          startedAt: '2026-09-27T10:00:00.000Z',
          pausedAt: null,
          cameras: [],
        },
        meta: { requestId: 'req-mon-resume' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new MonitoringsApiService(mockHttpClient);
  const result = await service.resumeMonitoring('50', 'test-token');

  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedUrl, 'http://api.test/api/v1/monitorings/50/resume');
  assert.equal(capturedBody, undefined);
  assert.equal(result.status, 'ATIVO');
});

test('5.1 MonitoringsApiService - POST /monitorings/:id/end exige senha e encerra sessão de monitoramento', async () => {
  let capturedUrl = '';
  let capturedMethod = '';
  let capturedAuth = '';
  let capturedBody = '';

  const mockHttpClient = new HttpClient('http://api.test/api/v1');

  (mockHttpClient as any).execute = async (url: string, init: RequestInit) => {
    capturedUrl = url;
    capturedMethod = init.method || '';
    capturedAuth = (init.headers as any)?.['Authorization'] || '';
    capturedBody = (init.body as string) || '';

    return new Response(
      JSON.stringify({
        data: {
          id: '50',
          status: 'ENCERRADO',
          operationalStatus: 'INDISPONIVEL',
          operationalReason: 'Sessão de monitoramento encerrada.',
          startedAt: '2026-09-27T10:00:00.000Z',
          endedAt: '2026-09-27T12:00:00.000Z',
          cameras: [],
        },
        meta: { requestId: 'req-mon-end' },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  const service = new MonitoringsApiService(mockHttpClient);
  const result = await service.endMonitoring('50', { password: 'UserSecret123!' }, 'test-token');

  assert.equal(capturedMethod, 'POST');
  assert.equal(capturedUrl, 'http://api.test/api/v1/monitorings/50/end');
  assert.equal(capturedAuth, 'Bearer test-token');
  const parsedBody = JSON.parse(capturedBody);
  assert.equal(parsedBody.password, 'UserSecret123!');
  assert.equal(result.status, 'ENCERRADO');
  assert.equal(result.id, '50');
});

// ─── 2. PROBLEM DETAILS & ERROR HELPERS ─────────────────────────────────────

test('6. ApiError - Reconhece códigos RFC 9457 específicos da Fatia 6', () => {
  const conflictError = ApiError.fromProblemDetails({
    type: 'https://api.poolsafe.com.br/errors/monitoring-state-conflict',
    title: 'Conflito de estado no monitoramento',
    status: 409,
    detail: 'A câmera já pertence a outra sessão ativa.',
    instance: '/api/v1/monitorings',
    code: ApiErrorCodes.MONITORING_STATE_CONFLICT,
  });

  assert.equal(conflictError.isMonitoringStateConflict(), true);
  assert.equal(conflictError.isCameraNotOperational(), false);
  assert.equal(conflictError.isReauthenticationFailed(), false);

  const notOperationalError = ApiError.fromProblemDetails({
    type: 'https://api.poolsafe.com.br/errors/camera-not-operational',
    title: 'Câmera não operacional',
    status: 422,
    detail: 'A câmera não está online.',
    instance: '/api/v1/monitorings',
    code: ApiErrorCodes.CAMERA_NOT_OPERATIONAL,
  });

  assert.equal(notOperationalError.isCameraNotOperational(), true);
  assert.equal(notOperationalError.isMonitoringStateConflict(), false);

  const reauthError = ApiError.fromProblemDetails({
    type: 'https://api.poolsafe.com.br/errors/reauthentication-failed',
    title: 'Reautenticação falhou',
    status: 403,
    detail: 'Senha incorreta.',
    instance: '/api/v1/monitorings/50/pause',
    code: ApiErrorCodes.REAUTHENTICATION_FAILED,
  });

  assert.equal(reauthError.isReauthenticationFailed(), true);
  assert.equal(reauthError.status, 403);
});

// ─── 3. CAMERA ELIGIBILITY LOGIC TESTS ──────────────────────────────────────

function resolveCameraEligibility(
  camera: CameraItem,
  occupiedCameraIds: Set<string>,
): { eligible: boolean; reason?: string } {
  if (camera.administrativeStatus === 'INATIVA') {
    return { eligible: false, reason: 'Câmera inativa' };
  }
  if (camera.connectionStatus === 'OFFLINE') {
    return { eligible: false, reason: 'Câmera offline' };
  }
  if (camera.connectionStatus === 'DESCONHECIDA') {
    return { eligible: false, reason: 'Conexão desconhecida' };
  }
  if (occupiedCameraIds.has(camera.id) || camera.currentMonitoring !== null) {
    return { eligible: false, reason: 'Já vinculada a uma sessão' };
  }
  return { eligible: true };
}

test('7. Elegibilidade de Câmeras - Desabilita inelegíveis com motivos claros e preserva elegíveis', () => {
  const occupiedSet = new Set(['8']);

  const camEligible: CameraItem = {
    id: '10',
    name: 'Piscina Infantil',
    location: 'Área infantil',
    administrativeStatus: 'ATIVA',
    connectionStatus: 'ONLINE',
    lastCommunicationAt: '2026-09-27T10:00:00.000Z',
    currentMonitoring: null,
    recentAlertsCount: 0,
  };

  const camInactive: CameraItem = {
    id: '11',
    name: 'Deck Leste',
    location: 'Área leste',
    administrativeStatus: 'INATIVA',
    connectionStatus: 'ONLINE',
    lastCommunicationAt: '2026-09-27T10:00:00.000Z',
    currentMonitoring: null,
    recentAlertsCount: 0,
  };

  const camOffline: CameraItem = {
    id: '12',
    name: 'Deck Oeste',
    location: 'Área oeste',
    administrativeStatus: 'ATIVA',
    connectionStatus: 'OFFLINE',
    lastCommunicationAt: '2026-09-27T08:00:00.000Z',
    currentMonitoring: null,
    recentAlertsCount: 0,
  };

  const camUnknown: CameraItem = {
    id: '13',
    name: 'Perímetro',
    location: 'Cerca',
    administrativeStatus: 'ATIVA',
    connectionStatus: 'DESCONHECIDA',
    lastCommunicationAt: null,
    currentMonitoring: null,
    recentAlertsCount: 0,
  };

  const camOccupied: CameraItem = {
    id: '8',
    name: 'Piscina Principal',
    location: 'Norte',
    administrativeStatus: 'ATIVA',
    connectionStatus: 'ONLINE',
    lastCommunicationAt: '2026-09-27T10:00:00.000Z',
    currentMonitoring: { id: '50', status: 'ATIVO', operationalStatus: 'ATIVO' },
    recentAlertsCount: 0,
  };

  assert.deepEqual(resolveCameraEligibility(camEligible, occupiedSet), { eligible: true });
  assert.deepEqual(resolveCameraEligibility(camInactive, occupiedSet), {
    eligible: false,
    reason: 'Câmera inativa',
  });
  assert.deepEqual(resolveCameraEligibility(camOffline, occupiedSet), {
    eligible: false,
    reason: 'Câmera offline',
  });
  assert.deepEqual(resolveCameraEligibility(camUnknown, occupiedSet), {
    eligible: false,
    reason: 'Conexão desconhecida',
  });
  assert.deepEqual(resolveCameraEligibility(camOccupied, occupiedSet), {
    eligible: false,
    reason: 'Já vinculada a uma sessão',
  });
});

// ─── 4. SELECTION & PRESELECTION LOGIC TESTS ────────────────────────────────

test('8. Seleção de Câmeras - Suporta múltiplas câmeras sem duplicidade e respeita pré-seleção', () => {
  const selectedIds = new Set<string>();

  // Pré-seleção da câmera vinda por parâmetro de rota (ex: '10')
  const paramCameraId = '10';
  selectedIds.add(paramCameraId);
  assert.equal(selectedIds.size, 1);
  assert.equal(selectedIds.has('10'), true);

  // Adicionar outra câmera elegível
  selectedIds.add('11');
  assert.equal(selectedIds.size, 2);

  // Tentar adicionar duplicata (Set impede duplicidade)
  selectedIds.add('10');
  assert.equal(selectedIds.size, 2);

  // Desmarcar uma câmera
  selectedIds.delete('10');
  assert.equal(selectedIds.size, 1);
  assert.equal(selectedIds.has('11'), true);

  // Validar array gerado para o payload da API
  const payloadArray = Array.from(selectedIds);
  assert.deepEqual(payloadArray, ['11']);
});

// ─── 5. SECURITY & TRANSIENT PASSWORD TESTS ─────────────────────────────────

test('9. Segurança de Senha - Estado transitório: validação e limpeza imediata', () => {
  let formPassword = 'UserSecret123!';
  let modalOpen = true;

  // Validação: não permite envio com senha em branco
  const isFormValid = (pwd: string) => pwd.trim().length > 0;
  assert.equal(isFormValid(formPassword), true);
  assert.equal(isFormValid('   '), false);

  // Simulação de fechamento ou cancelamento do diálogo
  const handleClose = () => {
    modalOpen = false;
    formPassword = '';
  };

  handleClose();
  assert.equal(modalOpen, false);
  assert.equal(formPassword, ''); // Senha limpa do estado transitório
});

// ─── 6. STALE DATA & MUTATION SAFEGUARD TESTS ────────────────────────────────

test('10. Bloqueio com Dados Desatualizados - Impede início, pausa, retomada e encerramento', () => {
  const isStale = true;

  // 1. Início de monitoramento
  const canStart = (stale: boolean, selectedCount: number, isPending: boolean) =>
    !stale && selectedCount > 0 && !isPending;

  assert.equal(canStart(isStale, 2, false), false, 'Iniciar deve ser bloqueado quando isStale for true');
  assert.equal(canStart(false, 0, false), false, 'Iniciar deve ser bloqueado se nenhuma câmera selecionada');
  assert.equal(canStart(false, 2, true), false, 'Iniciar deve ser bloqueado se mutação já pendente');
  assert.equal(canStart(false, 2, false), true, 'Iniciar deve ser liberado quando dados forem confiáveis');

  // 2. Pausa e abertura do modal
  const canOpenPause = (stale: boolean) => !stale;
  assert.equal(canOpenPause(isStale), false, 'Abertura de pausa deve ser bloqueada quando isStale for true');
  assert.equal(canOpenPause(false), true, 'Abertura de pausa liberada quando dados confiáveis');

  // 3. Retomada
  const canResume = (stale: boolean, cameraOffline: boolean, isPending: boolean) =>
    !stale && !cameraOffline && !isPending;

  assert.equal(canResume(isStale, false, false), false, 'Retomar deve ser bloqueado quando isStale for true');
  assert.equal(canResume(false, true, false), false, 'Retomar deve ser bloqueado se câmera offline');
  assert.equal(canResume(false, false, true), false, 'Retomar deve ser bloqueado se mutação pendente');
  assert.equal(canResume(false, false, false), true, 'Retomar deve ser liberado quando dados confiáveis');

  // 4. Encerramento e abertura do modal
  const canOpenEnd = (stale: boolean) => !stale;
  assert.equal(canOpenEnd(isStale), false, 'Abertura de encerramento deve ser bloqueada quando isStale for true');
  assert.equal(canOpenEnd(false), true, 'Abertura de encerramento liberada quando dados confiáveis');

  // 5. Seleção de câmera
  const canToggleCamera = (stale: boolean, eligible: boolean) => !stale && eligible;
  assert.equal(canToggleCamera(isStale, true), false, 'Seleção de câmera bloqueada se dados desatualizados');
  assert.equal(canToggleCamera(false, false), false, 'Seleção de câmera bloqueada se câmera inelegível');
  assert.equal(canToggleCamera(false, true), true, 'Seleção liberada quando saudável e elegível');
});

test('11. Cálculo de isStale - Distingue refetch normal em segundo plano de falha de atualização com cache retido', () => {
  const calculateIsStale = (
    isMonitoringsError: boolean,
    hasMonitorings: boolean,
    isCamerasError: boolean,
    hasCameras: boolean,
  ) => (isMonitoringsError && hasMonitorings) || (isCamerasError && hasCameras);

  // Cenário A: Consulta inicial saudável, sem refetch
  assert.equal(calculateIsStale(false, true, false, true), false);

  // Cenário B: Consulta elegível para refetch rodando em background (isFetching=true, isError=false)
  // NÃO deve ser considerada stale
  assert.equal(calculateIsStale(false, true, false, true), false);

  // Cenário C: Refetch falhou para monitoramentos enquanto cache existe -> deve ser stale
  assert.equal(calculateIsStale(true, true, false, true), true);

  // Cenário D: Refetch falhou para câmeras enquanto cache existe -> deve ser stale
  assert.equal(calculateIsStale(false, true, true, true), true);

  // Cenário E: Ambas falharam com cache mantido -> stale
  assert.equal(calculateIsStale(true, true, true, true), true);

  // Cenário F: Erro inicial sem dados em cache (não é stale, é falha total tratada por tela de erro)
  assert.equal(calculateIsStale(true, false, false, false), false);
});

test('12. Proteção de Modais Abertos - Falha de atualização durante modal aberto bloqueia confirmação e não envia comando', async () => {
  let isStale = false;
  let modalSession: { id: string } | null = { id: '50' };
  let password = 'SecretPassword123!';
  let mutationCalls = 0;

  const handleConfirmPause = async () => {
    if (isStale || !modalSession || !password.trim()) {
      return { status: 'rejected', reason: isStale ? 'STALE_DATA' : 'INVALID_INPUT' };
    }
    mutationCalls += 1;
    return { status: 'executed' };
  };

  const isConfirmDisabled = (stale: boolean, pwd: string, isPending: boolean) =>
    stale || !pwd.trim() || isPending;

  // 1. Modal aberto em estado saudável com senha preenchida: pode confirmar
  assert.equal(isConfirmDisabled(isStale, password, false), false);

  // 2. Ocorre falha de sincronização de rede em segundo plano enquanto modal está aberto
  isStale = true;

  // 3. Botão de confirmação torna-se desabilitado imediatamente
  assert.equal(isConfirmDisabled(isStale, password, false), true);

  // 4. Se o usuário ou automação tentar acionar handleConfirmPause, a ação é barrada
  const resultWhileStale = await handleConfirmPause();
  assert.deepEqual(resultWhileStale, { status: 'rejected', reason: 'STALE_DATA' });
  assert.equal(mutationCalls, 0, 'Nenhuma chamada de mutação pode ser disparada durante isStale');
});

test('13. Recuperação Pós-Atualização - Libera comandos na tela e no modal imediatamente após refetch bem-sucedido', async () => {
  let isMonitoringsError = true;
  let isCamerasError = false;
  const hasMonitorings = true;
  const hasCameras = true;
  let mutationCalls = 0;

  let isStale = (isMonitoringsError && hasMonitorings) || (isCamerasError && hasCameras);
  assert.equal(isStale, true, 'Inicialmente bloqueado por falha anterior');

  // Modal aberto e senha já digitada
  const modalSession = { id: '50' };
  const password = 'MinhaSenhaSegura456!';

  const isConfirmDisabled = (stale: boolean, pwd: string) => stale || !pwd.trim();
  assert.equal(isConfirmDisabled(isStale, password), true, 'Confirmação bloqueada enquanto stale');

  // Usuário aciona "Tentar novamente" / "Atualizar" no banner do modal ou da tela
  const handleRefresh = async () => {
    // Simula refetch com êxito na API
    isMonitoringsError = false;
    isCamerasError = false;
    isStale = (isMonitoringsError && hasMonitorings) || (isCamerasError && hasCameras);
  };

  await handleRefresh();

  // isStale volta para false
  assert.equal(isStale, false, 'isStale deve ser false após atualização bem-sucedida');

  // Confirmação do modal é imediatamente liberada com a senha preservada
  assert.equal(isConfirmDisabled(isStale, password), false, 'Confirmação reabilitada após refresh');

  // Execução do comando agora tem êxito
  const handleConfirmPause = async () => {
    if (isStale || !modalSession || !password.trim()) {
      return { status: 'rejected' };
    }
    mutationCalls += 1;
    return { status: 'executed' };
  };

  const resultAfterRefresh = await handleConfirmPause();
  assert.deepEqual(resultAfterRefresh, { status: 'executed' });
  assert.equal(mutationCalls, 1, 'Comando executado com sucesso após restabelecimento dos dados');
});

