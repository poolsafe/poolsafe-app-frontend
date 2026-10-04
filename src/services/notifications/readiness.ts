/**
 * Serviço puro de avaliação e classificação da prontidão Android para alertas.
 * 
 * Regras estritas:
 * - DESATIVADO: Aplicativo sem permissão de notificações ou canal crítico bloqueado.
 * - DEGRADADO: Notificações permitidas, mas canal sem som, importância reduzida,
 *              silenciado, sem sobreposição ao Não Perturbe ou uso de áudio não alarme.
 * - PRONTO: Permissão concedida, canal ativo com prioridade máxima, som provisório
 *           associado, áudio ALARM e sobreposição do Não Perturbe ativada.
 * 
 * Fatia 8A — Prontidão Android para alertas.
 */

import type {
  AlertReadinessDiagnosis,
  AlertReadinessStatus,
  CheckItem,
  NotificationChannelSummary,
  NotificationPermissionSummary,
} from './types.ts';

export interface EvaluateOptions {
  isAndroid?: boolean;
}

/**
 * Normaliza e identifica se o canal está bloqueado (importância NONE).
 * Suporta tanto os enum values do expo-notifications (NONE = 2)
 * quanto os valores nativos do Android NotificationManagerCompat (NONE = 0).
 */
function isChannelBlocked(importance: number): boolean {
  return importance <= 2;
}

/**
 * Normaliza e verifica se a importância é máxima (AndroidImportance.MAX = 7).
 */
function isChannelImportanceMax(importance: number): boolean {
  return importance >= 7;
}

/**
 * Normaliza e verifica se a importância é alta (AndroidImportance.HIGH = 6).
 */
function isChannelImportanceHigh(importance: number): boolean {
  return importance === 6;
}

/**
 * Avalia o estado geral da prontidão de forma pura e determinística.
 */
export function evaluateAlertReadiness(
  permission: NotificationPermissionSummary | null,
  channel: NotificationChannelSummary | null,
  options: EvaluateOptions = {},
): AlertReadinessDiagnosis {
  const isAndroid = options.isAndroid !== undefined ? options.isAndroid : true;
  const checks: CheckItem[] = [];

  let status: AlertReadinessStatus = 'PRONTO';
  let canTest = true;

  // 1. Verificação da Permissão Geral de Notificações
  if (!permission || !permission.granted || permission.status === 'denied') {
    const isUndetermined = permission?.status === 'undetermined';
    checks.push({
      id: 'permission',
      title: 'Permissão de notificações',
      description: isUndetermined
        ? 'A permissão de notificações ainda não foi solicitada ao usuário.'
        : 'Permissão de notificações negada ou desativada no sistema.',
      status: 'error',
      actionType: permission?.canAskAgain === false ? 'app_settings' : 'request_permission',
      actionLabel: permission?.canAskAgain === false ? 'Abrir Configurações' : 'Ativar Notificações',
    });

    status = 'DESATIVADO';
    canTest = false;
  } else {
    checks.push({
      id: 'permission',
      title: 'Permissão de notificações',
      description: 'Permissão concedida para exibir notificações no sistema.',
      status: 'ok',
    });
  }

  // 2. Verificação do Canal Crítico (específico de Android)
  if (isAndroid) {
    if (!channel) {
      checks.push({
        id: 'channel_existence',
        title: 'Canal crítico de alertas',
        description: 'O canal crítico de alertas ainda não foi criado ou registrado no Android.',
        status: 'warning',
        actionType: 'channel_settings',
        actionLabel: 'Verificar Canal',
      });

      if (status !== 'DESATIVADO') {
        status = 'DEGRADADO';
        canTest = false; // Não é possível testar se o canal não existe
      }
    } else if (isChannelBlocked(channel.importance)) {
      checks.push({
        id: 'channel_importance',
        title: 'Canal crítico de alertas',
        description: 'O canal de alertas críticos está bloqueado/silenciado nas configurações do Android.',
        status: 'error',
        actionType: 'channel_settings',
        actionLabel: 'Ativar Canal',
      });

      status = 'DESATIVADO';
      canTest = false;
    } else {
      // 2a. Importância do Canal
      if (isChannelImportanceMax(channel.importance)) {
        checks.push({
          id: 'channel_importance',
          title: 'Importância do canal',
          description: 'Prioridade máxima configurada (exibe aviso na tela e toca áudio).',
          status: 'ok',
        });
      } else if (isChannelImportanceHigh(channel.importance)) {
        checks.push({
          id: 'channel_importance',
          title: 'Importância do canal',
          description: 'Prioridade alta. Recomenda-se prioridade máxima para alertas de piscina.',
          status: 'warning',
          actionType: 'channel_settings',
          actionLabel: 'Ajustar Importância',
        });
        if (status === 'PRONTO') status = 'DEGRADADO';
      } else {
        checks.push({
          id: 'channel_importance',
          title: 'Importância do canal',
          description: 'Importância reduzida nas configurações. Os alertas podem não surgir em primeiro plano.',
          status: 'warning',
          actionType: 'channel_settings',
          actionLabel: 'Ajustar Importância',
        });
        if (status === 'PRONTO') status = 'DEGRADADO';
      }

      // 2b. Som do Canal
      if (channel.sound === null || channel.sound === 'none') {
        checks.push({
          id: 'channel_sound',
          title: 'Som do alerta crítico',
          description: 'O canal está sem som ou foi silenciado nas configurações do Android.',
          status: 'warning',
          actionType: 'channel_settings',
          actionLabel: 'Configurar Som',
        });
        if (status === 'PRONTO') status = 'DEGRADADO';
      } else if (channel.sound === 'default') {
        checks.push({
          id: 'channel_sound',
          title: 'Som do alerta crítico',
          description: 'Som padrão do sistema associado em vez do som de alerta provisório do PoolSafe.',
          status: 'warning',
          actionType: 'channel_settings',
          actionLabel: 'Configurar Som',
        });
        if (status === 'PRONTO') status = 'DEGRADADO';
      } else {
        checks.push({
          id: 'channel_sound',
          title: 'Som do alerta crítico',
          description: 'Som provisório de alta audibilidade configurado no canal.',
          status: 'ok',
        });
      }

      // 2c. Vibração do Canal
      if (channel.enableVibrate === false || channel.vibrationPattern === null) {
        checks.push({
          id: 'channel_vibration',
          title: 'Vibração do alerta',
          description: 'A vibração está desativada ou sem padrão configurado nas configurações do canal.',
          status: 'warning',
          actionType: 'channel_settings',
          actionLabel: 'Ativar Vibração',
        });
        if (status === 'PRONTO') status = 'DEGRADADO';
      } else {
        checks.push({
          id: 'channel_vibration',
          title: 'Vibração do alerta',
          description: 'Vibração ativada com padrão crítico de pulsos configurado no canal.',
          status: 'ok',
        });
      }

      // 2d. Uso de Áudio (ALARM) e Limitação do Modo Silencioso no Android
      // AndroidAudioUsage.ALARM = 4
      if (channel.audioUsage === 4) {
        checks.push({
          id: 'audio_usage',
          title: 'Fluxo de áudio e modo silencioso',
          description: 'Canal configurado com atributo ALARM no SO. No entanto, por restrição nativa do Android, o som respeita o volume de notificações e não tocará se o celular estiver no modo silencioso.',
          status: 'warning',
          actionType: 'channel_settings',
          actionLabel: 'Verificar Volume',
        });
        if (status === 'PRONTO') status = 'DEGRADADO';
      } else if (channel.audioUsage !== undefined) {
        checks.push({
          id: 'audio_usage',
          title: 'Tipo de fluxo de áudio',
          description: 'O canal não está vinculado ao fluxo de Alarme. Pode ser afetado pelo modo silencioso comum.',
          status: 'warning',
          actionType: 'channel_settings',
          actionLabel: 'Revisar Canal',
        });
        if (status === 'PRONTO') status = 'DEGRADADO';
      }

      // 2e. Sobreposição do "Não Perturbe" (bypassDnd)
      if (channel.bypassDnd) {
        checks.push({
          id: 'bypass_dnd',
          title: 'Sobreposição de Não Perturbe',
          description: 'Canal configurado para emitir som mesmo com o modo Não Perturbe ativado.',
          status: 'ok',
        });
      } else {
        checks.push({
          id: 'bypass_dnd',
          title: 'Sobreposição de Não Perturbe',
          description: 'O canal não pode atravessar o Não Perturbe. Ative a sobreposição nas configurações do canal ou conceda acesso ao Não Perturbe.',
          status: 'warning',
          actionType: 'dnd_settings',
          actionLabel: 'Ajustar Não Perturbe',
        });
        if (status === 'PRONTO') status = 'DEGRADADO';
      }
    }
  }

  // 3. Orientação Operacional (Informativo - sem promessa de controle do hardware)
  checks.push({
    id: 'volume_guidance',
    title: 'Orientação de volume',
    description: 'No Android, notificações dependem do volume de Notificações/Toque do aparelho. Para que o alerta seja audível, certifique-se de não manter o aparelho no silencioso durante o monitoramento.',
    status: 'info',
  });

  // 4. Síntese textual de acordo com o status
  let summary = '';
  let detail = '';

  switch (status) {
    case 'DESATIVADO':
      summary = 'Alertas desativados no dispositivo.';
      detail = 'As notificações ou o canal crítico estão bloqueados. O PoolSafe não poderá emitir alertas sonoros ou visuais caso ocorra uma situação de risco.';
      break;
    case 'DEGRADADO':
      summary = 'Prontidão parcial (sujeita ao volume de notificações).';
      detail = 'As notificações e o canal estão ativos, mas por limitação nativa do sistema operacional o som obedece ao volume de notificações e não tocará no modo silencioso. O teste manual deve ser realizado com o volume de notificações ativo.';
      break;
    case 'PRONTO':
    default:
      summary = 'Aparelho pronto para alertas críticos.';
      detail = 'Permissão concedida e canal configurado com prioridade máxima, som provisório e sobreposição ao modo Não Perturbe.';
      break;
  }

  return {
    status,
    summary,
    detail,
    canTest,
    checks,
    evaluatedAt: new Date().toISOString(),
    rawPermission: permission,
    rawChannel: channel,
  };
}
