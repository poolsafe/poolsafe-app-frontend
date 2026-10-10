/**
 * Configuração tipada e validada de ambiente para o PoolSafe.
 *
 * Garante que a URL base da API esteja configurada, normalizada e
 * que o uso de HTTP sem TLS seja restrito exclusivamente ao ambiente de desenvolvimento local.
 */

const PUBLIC_PRODUCTION_API_BASE_URL = 'https://api.poolsafe.app/api/v1';
const LOCAL_DEV_API_BASE_URL = 'http://10.0.2.2:3000/api/v1';

export function resolveApiBaseUrl(
  envUrlOverride?: string,
  isReleaseOverride?: boolean,
): string {
  const isReleaseBuild =
    isReleaseOverride !== undefined
      ? isReleaseOverride
      : typeof __DEV__ !== 'undefined' && !__DEV__;

  // Em produção/release, o aplicativo consome deterministicamente o endpoint canônico HTTPS da VPS,
  // impedindo que variáveis de desenvolvimento em arquivos .env locais contaminem o artefato de release.
  // Em desenvolvimento, aceita a URL configurada localmente ou recorre ao gateway do emulador.
  let rawUrl: string;
  if (isReleaseBuild) {
    rawUrl = envUrlOverride !== undefined ? envUrlOverride : PUBLIC_PRODUCTION_API_BASE_URL;
  } else {
    const envUrl = (envUrlOverride !== undefined ? envUrlOverride : process.env.EXPO_PUBLIC_API_BASE_URL)?.trim();
    rawUrl = envUrl || LOCAL_DEV_API_BASE_URL;
  }

  // Normalização: remove barra final se houver
  const normalized = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

  // Validação de formato de protocolo
  const isHttp = normalized.startsWith('http://');
  const isHttps = normalized.startsWith('https://');

  if (!isHttp && !isHttps) {
    throw new Error(
      `[Config] EXPO_PUBLIC_API_BASE_URL inválida. O protocolo deve ser http:// ou https://. Valor: ${normalized}`,
    );
  }

  const isLocalHost =
    normalized.includes('10.0.2.2') ||
    normalized.includes('localhost') ||
    normalized.includes('127.0.0.1');

  // Validação estrita de produção/release: conexões HTTP e referências a localhost/IPs locais são estritamente proibidas
  if (isReleaseBuild) {
    if (!isHttps) {
      throw new Error(
        `[Config] O build de produção (release) requer HTTPS obrigatório. Protocolo recebido: ${normalized}`,
      );
    }
    if (isLocalHost) {
      throw new Error(
        `[Config] Referências a localhost/IPs locais são estritamente proibidas no build de produção. Valor: ${normalized}`,
      );
    }
  } else if (typeof __DEV__ !== 'undefined' && !__DEV__ && isHttp && !isLocalHost) {
    throw new Error(
      `[Config] Conexões HTTP não criptografadas são proibidas fora do desenvolvimento local.`,
    );
  }

  return normalized;
}

export const env = {
  apiBaseUrl: resolveApiBaseUrl(),
  isDev: typeof __DEV__ !== 'undefined' ? __DEV__ : false,
} as const;
