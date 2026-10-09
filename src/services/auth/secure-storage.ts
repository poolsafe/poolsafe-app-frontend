import { z } from 'zod';
import type { AuthTokens } from '../api/types.ts';

export const SESSION_STORAGE_KEY = 'poolsafe_session_v1';

export const storedSessionSchema = z.object({
  version: z.literal(1),
  tokenType: z.literal('Bearer'),
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  accessExpiresAt: z.string(),
  sessionExpiresAt: z.string(),
});

export type StoredSession = z.infer<typeof storedSessionSchema>;

export interface SecureStoreDriver {
  getItemAsync: (key: string) => Promise<string | null>;
  setItemAsync: (key: string, value: string, options?: unknown) => Promise<void>;
  deleteItemAsync: (key: string) => Promise<void>;
}

let activeDriver: SecureStoreDriver | null = null;

export function getSecureStoreDriver(): SecureStoreDriver {
  if (!activeDriver) {
    try {
      // Importa dinamicamente expo-secure-store em tempo de execução no app
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      activeDriver = require('expo-secure-store');
    } catch {
      throw new Error('Driver do SecureStore não disponível.');
    }
  }
  return activeDriver!;
}

function getDriver(): SecureStoreDriver {
  return getSecureStoreDriver();
}

export function setSecureStoreDriver(driver: SecureStoreDriver | null): void {
  activeDriver = driver;
}

/**
 * Persistência segura da sessão do PoolSafe exclusivamente via Expo SecureStore.
 *
 * Princípios de segurança:
 * - Entrada única e versionada (v1)
 * - Validação estrita de schema Zod em leituras
 * - Limpeza automática de dados corrompidos ou malformados
 * - Proibição absoluta de logs com credenciais ou tokens
 */
export async function saveSession(tokens: AuthTokens): Promise<void> {
  const sessionData: StoredSession = {
    version: 1,
    tokenType: tokens.tokenType,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessExpiresAt: tokens.accessExpiresAt,
    sessionExpiresAt: tokens.sessionExpiresAt,
  };

  // Validação em tempo de execução antes de persistir
  storedSessionSchema.parse(sessionData);

  const serialized = JSON.stringify(sessionData);
  const driver = getDriver();
  await driver.setItemAsync(SESSION_STORAGE_KEY, serialized, {
    keychainAccessible: 1, // AFTER_FIRST_UNLOCK
  });
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const driver = getDriver();
    const raw = await driver.getItemAsync(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(raw);
    } catch {
      // JSON inválido: remove do SecureStore e retorna null
      await clearSession();
      return null;
    }

    const validation = storedSessionSchema.safeParse(parsedJson);
    if (!validation.success) {
      // Estrutura malformada ou versão incompatível: limpa e retorna null
      await clearSession();
      return null;
    }

    return validation.data;
  } catch {
    // Qualquer falha de leitura em hardware seguro limpa e retorna null
    await clearSession();
    return null;
  }
}

export async function clearSession(): Promise<void> {
  try {
    const driver = getDriver();
    await driver.deleteItemAsync(SESSION_STORAGE_KEY);
  } catch {
    // Falhas de remoção são silenciadas para evitar loops
  }
}
