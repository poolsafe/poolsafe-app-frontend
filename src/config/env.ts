/**
 * Configuração tipada e validada de ambiente para o PoolSafe.
 *
 * Garante que a URL base da API esteja configurada, normalizada e
 * que o uso de HTTP sem TLS seja restrito exclusivamente ao ambiente de desenvolvimento local.
 */

function resolveApiBaseUrl(): string {
  const envUrl = process.env['EXPO_PUBLIC_API_BASE_URL']?.trim();

  // Em desenvolvimento local, se não informada, assume o gateway padrão do emulador Android (porta 3000)
  const rawUrl = envUrl || 'http://10.0.2.2:3000/api/v1';

  // Normalização: remove barra final se houver
  const normalized = rawUrl.endsWith('/') ? rawUrl.slice(0, -1) : rawUrl;

  // Validação de segurança: HTTP inseguro é estritamente proibido fora do ambiente de desenvolvimento
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

  if (isHttp && !isLocalHost && !__DEV__) {
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
