/**
 * Constantes para a camada de notificações e prontidão Android do PoolSafe.
 * 
 * Fatia 8A — Prova técnica com canal crítico versionado e som provisório.
 */

/**
 * Identificador versionado do canal crítico definitivo Android.
 * Versionado para v2 para garantir isolamento e recriação limpa no Android,
 * evitando que configurações prévias de som/vibração cacheadas no SO afetem o diagnóstico.
 */
export const CRITICAL_ALERT_CHANNEL_ID = 'poolsafe_alertas_criticos_v2';

export const CRITICAL_ALERT_CHANNEL_NAME = 'Alertas Críticos PoolSafe';

export const CRITICAL_ALERT_CHANNEL_DESCRIPTION =
  'Notificações de alta prioridade para situações de risco e afogamento na piscina';

/**
 * Nome do arquivo de áudio provisório gerado para a prova técnica (em res/raw).
 */
export const PROVISIONAL_ALERT_SOUND_FILE = 'poolsafe_alert_provisional.wav';

/**
 * Identificador do asset sonoro sem extensão (usado por convenção em algumas APIs do Android).
 */
export const PROVISIONAL_ALERT_SOUND_NAME = 'poolsafe_alert_provisional';

/**
 * Padrão de vibração crítico: pulso inicial, pausa curta, dois pulsos fortes repetidos.
 */
export const CRITICAL_VIBRATION_PATTERN = [0, 500, 250, 500, 250, 500];

/**
 * Cor de destaque do canal e notificações (ciano / turquesa PoolSafe).
 */
export const NOTIFICATION_ACCENT_COLOR = '#00e5ff';


/**
 * Conteúdo da notificação de teste local.
 * Identificado explicitamente como teste para não simular uma ocorrência real
 * e sem exibir dados sensíveis na tela de bloqueio.
 */
export const TEST_NOTIFICATION_TITLE = '[TESTE] Alerta Crítico PoolSafe';

export const TEST_NOTIFICATION_BODY =
  'Teste local de som e vibração do canal crítico. Nenhuma ocorrência detectada.';
