import type { HomeWarning } from '../services/api/types.ts';

export interface WarningDisplayInfo {
  title: string;
  message: string;
  variant: 'warning' | 'info' | 'danger';
}

/**
 * Mapeia os dados do aviso operacional (HomeWarning) para títulos e descrições amigáveis.
 * O texto de detalhe referente a câmeras é formatado no plural ("Uma ou mais câmeras associadas..."),
 * pois o sistema consolida as câmeras com pendência em um único aviso de cada tipo.
 */
export function resolveWarningInfo(warning: HomeWarning): WarningDisplayInfo {
  switch (warning.code) {
    case 'NO_CURRENT_MONITORING':
      return {
        title: 'Sem monitoramento ativo',
        message:
          'Não há nenhuma sessão de monitoramento em execução para suas câmeras no momento.',
        variant: 'info',
      };
    case 'MONITORING_PAUSED':
      return {
        title: 'Sessão pausada',
        message:
          'Existe uma sessão de monitoramento pausada. A vigilância automática está suspensa.',
        variant: 'warning',
      };
    case 'CAMERA_OFFLINE':
      return {
        title: 'Câmera sem sinal',
        message:
          'Uma ou mais câmeras associadas à sua conta estão sem comunicação recente há mais de 90 segundos.',
        variant: 'warning',
      };
    case 'CAMERA_UNKNOWN':
      return {
        title: 'Câmera em verificação',
        message:
          'Uma ou mais câmeras associadas ainda não estabeleceram comunicação inicial confirmada.',
        variant: 'info',
      };
    default:
      return {
        title: 'Aviso operacional',
        message: 'Existe uma pendência operacional identificada pelo sistema.',
        variant: 'warning',
      };
  }
}

/**
 * Garante que a interface renderize no máximo 1 aviso por tipo (warning.code),
 * consolidando múltiplos avisos do mesmo tipo em uma única exibição clara.
 */
export function getUniqueWarnings(warnings: HomeWarning[]): HomeWarning[] {
  const seenCodes = new Set<string>();
  return warnings.filter((warning) => {
    if (seenCodes.has(warning.code)) {
      return false;
    }
    seenCodes.add(warning.code);
    return true;
  });
}
