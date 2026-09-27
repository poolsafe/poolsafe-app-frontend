import { apiClient, HttpClient } from '../api/client.ts';
import { ApiError } from '../api/errors.ts';
import type { AuthTokens, RefreshResponseData } from '../api/types.ts';
import { saveSession, clearSession, loadSession } from './secure-storage.ts';

export interface StorageAdapter {
  saveSession: (tokens: AuthTokens) => Promise<void>;
  clearSession: () => Promise<void>;
  loadSession: () => Promise<unknown>;
}

/**
 * Coordenador centralizado e single-flight para rotação de tokens.
 *
 * Garante que:
 * - Apenas uma chamada a /auth/refresh seja executada simultaneamente;
 * - Múltiplas requisições aguardem a mesma Promise sem reuso do refresh token antigo;
 * - Novos tokens sejam persistidos no SecureStore ANTES de liberar as requisições aguardando;
 * - Falhas definitivas (401, SESSION_EXPIRED) encerrem a sessão imediatamente;
 * - Falhas de gravação no SecureStore encerrem a sessão com segurança;
 * - Nenhuma informação confidencial seja registrada em logs.
 */
export class RefreshCoordinator {
  private inFlightPromise: Promise<AuthTokens> | null = null;
  private onSessionTerminated: (() => void) | null = null;
  private readonly client: HttpClient;
  private readonly storage: StorageAdapter;

  constructor(
    client: HttpClient = apiClient,
    storage: StorageAdapter = { saveSession, clearSession, loadSession },
  ) {
    this.client = client;
    this.storage = storage;
  }

  public setOnSessionTerminated(callback: () => void): void {
    this.onSessionTerminated = callback;
  }

  public isRefreshing(): boolean {
    return this.inFlightPromise !== null;
  }

  public async refresh(refreshToken: string): Promise<AuthTokens> {
    // Se já houver renovação em andamento, junta-se à Promise existente
    if (this.inFlightPromise) {
      return this.inFlightPromise;
    }

    this.inFlightPromise = (async () => {
      try {
        const response = await this.client.post<RefreshResponseData>('/auth/refresh', {
          refreshToken,
        });

        const newTokens = response.data;

        // Persistência no SecureStore obrigatória antes de resolver
        try {
          await this.storage.saveSession(newTokens);
        } catch (saveErr) {
          // Se não conseguir salvar no SecureStore, a sessão anterior já foi rotacionada no banco.
          // Por segurança, encerra a sessão localmente.
          await this.storage.clearSession();
          if (this.onSessionTerminated) {
            this.onSessionTerminated();
          }
          throw saveErr;
        }

        return newTokens;
      } catch (err: unknown) {
        if (err instanceof ApiError) {
          if (err.isSessionExpired() || err.status === 401) {
            await this.storage.clearSession();
            if (this.onSessionTerminated) {
              this.onSessionTerminated();
            }
          }
        }
        throw err;
      } finally {
        this.inFlightPromise = null;
      }
    })();

    return this.inFlightPromise;
  }
}

export const refreshCoordinator = new RefreshCoordinator();
