/**
 * Gerenciamento e persistência da identidade única de instalação do aplicativo (poolSafeInstallationId).
 * 
 * Regras estritas (Fatia 8B):
 * - Persistido exclusivamente no SecureStore.
 * - NUNCA é apagado no logout (sobrevive a trocas de usuário e sessões).
 * - Recriado apenas em caso de reinstalação limpa ou limpeza de dados do aplicativo.
 * - Formato: UUID v4 padronizado (RFC 4122).
 */

import { getSecureStoreDriver, type SecureStoreDriver } from '../auth/secure-storage.ts';

export const INSTALLATION_ID_STORAGE_KEY = 'poolsafe_installation_id_v1';

const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidInstallationUuid(id: string): boolean {
  return typeof id === 'string' && UUID_V4_REGEX.test(id.trim());
}

/**
 * Gera um UUID v4 canônico utilizando os mecanismos criptográficos disponíveis
 * no ambiente (Hermes, Node.js, Web Crypto API) com fallback seguro.
 */
export function generateInstallationUuid(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID().toLowerCase();
  }

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(bytes);
    // Ajuste de versão 4
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    // Ajuste de variante RFC 4122
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`.toLowerCase();
  }

  // Fallback seguro em caso de indisponibilidade extrema do crypto
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    .replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    })
    .toLowerCase();
}

/**
 * Obtém o UUID persistido no SecureStore ou gera e armazena um novo de forma idempotente.
 */
export async function getOrGenerateInstallationIdAsync(
  customDriver?: SecureStoreDriver,
): Promise<string> {
  const driver = customDriver || getSecureStoreDriver();

  try {
    const stored = await driver.getItemAsync(INSTALLATION_ID_STORAGE_KEY);
    if (stored && isValidInstallationUuid(stored)) {
      return stored.trim().toLowerCase();
    }
  } catch {
    // Falha de leitura em hardware seguro: gerará nova identidade e tentará persistir
  }

  const freshId = generateInstallationUuid();

  try {
    await driver.setItemAsync(INSTALLATION_ID_STORAGE_KEY, freshId, {
      keychainAccessible: 1, // AFTER_FIRST_UNLOCK
    });
  } catch {
    // Falha de gravação: não trava o app em tempo de execução
  }

  return freshId;
}

/**
 * Consulta a identidade atual sem gerar uma nova se estiver ausente.
 */
export async function getInstallationIdFromStorageAsync(
  customDriver?: SecureStoreDriver,
): Promise<string | null> {
  const driver = customDriver || getSecureStoreDriver();
  try {
    const stored = await driver.getItemAsync(INSTALLATION_ID_STORAGE_KEY);
    if (stored && isValidInstallationUuid(stored)) {
      return stored.trim().toLowerCase();
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper utilitário exclusivo para testes unitários automatizados.
 */
export async function clearInstallationIdForTestingOnly(
  customDriver?: SecureStoreDriver,
): Promise<void> {
  const driver = customDriver || getSecureStoreDriver();
  try {
    await driver.deleteItemAsync(INSTALLATION_ID_STORAGE_KEY);
  } catch {
    // Silencia erros de exclusão em testes
  }
}
