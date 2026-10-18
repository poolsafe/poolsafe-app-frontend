import { apiClient, HttpClient } from '../api/client.ts';
import { ApiError } from '../api/errors.ts';
import type {
  AuthResponseData,
  AuthTokens,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  UserProfileResponseData,
  UpdateProfilePayload,
  RegisterManifestationsPayload,
  ChangePasswordPayload,
  ForgotPasswordResponseData,
  ResetPasswordPayload,
} from '../api/types.ts';
import { clearSession, loadSession, saveSession } from './secure-storage.ts';
import { refreshCoordinator, RefreshCoordinator } from './refresh-coordinator.ts';

export type SessionRestoreResult =
  | { status: 'unauthenticated' }
  | { status: 'authenticated'; user: AuthUser; tokens: AuthTokens }
  | { status: 'recoverable_failure'; error: ApiError };

export class AuthService {
  private readonly client: HttpClient;
  private readonly coordinator: RefreshCoordinator;

  constructor(
    client: HttpClient = apiClient,
    coordinator: RefreshCoordinator = refreshCoordinator,
  ) {
    this.client = client;
    this.coordinator = coordinator;
  }

  public async register(payload: RegisterPayload): Promise<AuthResponseData> {
    const response = await this.client.post<AuthResponseData>('/auth/register', payload);
    await saveSession(response.data.tokens);
    return response.data;
  }

  public async login(payload: LoginPayload): Promise<AuthResponseData> {
    const response = await this.client.post<AuthResponseData>('/auth/login', payload);
    await saveSession(response.data.tokens);
    return response.data;
  }

  public async logout(refreshToken?: string, installationId?: string): Promise<void> {
    if (refreshToken) {
      try {
        const payload: { refreshToken: string; installationId?: string } = { refreshToken };
        if (installationId) {
          payload.installationId = installationId;
        }
        await this.client.postNoContent('/auth/logout', payload);
      } catch {
        // Falha de rede ou indisponibilidade da API não impede o logout local seguro
      }
    }
    await clearSession();
  }

  public async forgotPassword(email: string): Promise<ForgotPasswordResponseData> {
    const response = await this.client.post<ForgotPasswordResponseData>(
      '/auth/forgot-password',
      { email },
    );
    return response.data;
  }

  public async resetPassword(payload: ResetPasswordPayload): Promise<void> {
    await this.client.postNoContent('/auth/reset-password', payload);
  }

  public async getProfile(accessToken: string): Promise<AuthUser> {
    const response = await this.client.get<UserProfileResponseData>('/users/me', {
      token: accessToken,
    });
    return response.data;
  }

  public async updateProfile(
    accessToken: string,
    payload: UpdateProfilePayload,
  ): Promise<AuthUser> {
    const response = await this.client.patch<UserProfileResponseData>('/users/me', payload, {
      token: accessToken,
    });
    return response.data;
  }

  public async registerManifestations(
    accessToken: string,
    payload: RegisterManifestationsPayload,
  ): Promise<AuthUser> {
    const response = await this.client.post<UserProfileResponseData>(
      '/users/me/manifestations',
      payload,
      {
        token: accessToken,
      },
    );
    return response.data;
  }

  public async changePassword(
    accessToken: string,
    payload: ChangePasswordPayload,
  ): Promise<void> {
    await this.client.putNoContent('/users/me/password', payload, {
      token: accessToken,
    });
  }

  /**
   * Executa uma requisição autenticada com tentativa única de renovação preventiva ou reativa.
   */
  public async executeWithAuth<T>(
    currentTokens: AuthTokens,
    requestFn: (token: string) => Promise<T>,
    onTokensUpdated?: (tokens: AuthTokens) => void,
  ): Promise<T> {
    let tokens = currentTokens;

    // Renovação preventiva: se expirar em menos de 30 segundos
    const expiresAt = new Date(tokens.accessExpiresAt).getTime();
    const now = Date.now();
    if (expiresAt - now < 30000) {
      tokens = await this.coordinator.refresh(tokens.refreshToken);
      onTokensUpdated?.(tokens);
    }

    try {
      return await requestFn(tokens.accessToken);
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401 && !err.isSessionExpired()) {
        // Tenta renovar reativamente UMA única vez
        const newTokens = await this.coordinator.refresh(tokens.refreshToken);
        onTokensUpdated?.(newTokens);
        // Repete a requisição original apenas uma vez
        return await requestFn(newTokens.accessToken);
      }
      throw err;
    }
  }

  /**
   * Procedimento canônico de inicialização e restauração de sessão (docs Seção 6).
   */
  public async restoreSession(): Promise<SessionRestoreResult> {
    // 1. Recuperar sessão do SecureStore
    const stored = await loadSession();

    // 2 & 3. Inexistente ou malformada
    if (!stored) {
      return { status: 'unauthenticated' };
    }

    let currentTokens: AuthTokens = {
      tokenType: stored.tokenType,
      accessToken: stored.accessToken,
      refreshToken: stored.refreshToken,
      accessExpiresAt: stored.accessExpiresAt,
      sessionExpiresAt: stored.sessionExpiresAt,
    };

    // 5. Se o access token precisar de renovação imediata
    const expiresAt = new Date(currentTokens.accessExpiresAt).getTime();
    const needsImmediateRefresh = isNaN(expiresAt) || expiresAt - Date.now() < 30000;

    if (needsImmediateRefresh) {
      try {
        currentTokens = await this.coordinator.refresh(currentTokens.refreshToken);
      } catch (refreshErr: unknown) {
        if (refreshErr instanceof ApiError) {
          if (refreshErr.isNetworkError || refreshErr.isTimeout) {
            // 8. Falha de rede: não apagar tokens válidos automaticamente
            return { status: 'recoverable_failure', error: refreshErr };
          }
          if (refreshErr.isSessionExpired() || refreshErr.status === 401) {
            // 7. Sessão expirada ou rejeitada: limpar e desautenticar
            await clearSession();
            return { status: 'unauthenticated' };
          }
        }
        await clearSession();
        return { status: 'unauthenticated' };
      }
    }

    // 4. Validar sessão com GET /users/me
    try {
      const user = await this.getProfile(currentTokens.accessToken);
      return {
        status: 'authenticated',
        user,
        tokens: currentTokens,
      };
    } catch (profileErr: unknown) {
      if (profileErr instanceof ApiError) {
        if (profileErr.isNetworkError || profileErr.isTimeout) {
          // Falha de rede: manter sessão salva e exibir estado recuperável
          return { status: 'recoverable_failure', error: profileErr };
        }

        if (profileErr.status === 401) {
          // Token pode ter expirado entre a checagem e a chamada: tenta refresh uma vez
          try {
            const refreshedTokens = await this.coordinator.refresh(currentTokens.refreshToken);
            const user = await this.getProfile(refreshedTokens.accessToken);
            return {
              status: 'authenticated',
              user,
              tokens: refreshedTokens,
            };
          } catch (retryErr: unknown) {
            if (retryErr instanceof ApiError && (retryErr.isNetworkError || retryErr.isTimeout)) {
              return { status: 'recoverable_failure', error: retryErr };
            }
            await clearSession();
            return { status: 'unauthenticated' };
          }
        }
      }

      await clearSession();
      return { status: 'unauthenticated' };
    }
  }
}

export const authService = new AuthService();
