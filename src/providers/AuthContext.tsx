import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  PropsWithChildren,
} from 'react';
import { AuthTokens, AuthUser, LoginPayload, RegisterPayload } from '@/services/api/types';
import { ApiError } from '@/services/api/errors';
import { authService, AuthService } from '@/services/auth/auth-service';
import { refreshCoordinator } from '@/services/auth/refresh-coordinator';
import { queryClient } from './QueryClientProvider';

export type AuthStatus =
  | 'initializing'
  | 'authenticated'
  | 'unauthenticated'
  | 'recoverable_failure';

export interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  tokens: AuthTokens | null;
  recoverableError: ApiError | null;
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  retryRestore: () => Promise<void>;
  updateUser: (updatedUser: AuthUser) => void;
  updateTokens: (newTokens: AuthTokens) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  service = authService,
}: PropsWithChildren<{ service?: AuthService }>) {
  const [status, setStatus] = useState<AuthStatus>('initializing');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tokens, setTokens] = useState<AuthTokens | null>(null);
  const [recoverableError, setRecoverableError] = useState<ApiError | null>(null);

  // Escuta término definitivo de sessão provocado pelo coordenador de refresh
  useEffect(() => {
    refreshCoordinator.setOnSessionTerminated(() => {
      setUser(null);
      setTokens(null);
      setStatus('unauthenticated');
      queryClient.clear();
    });
  }, []);

  const restore = useCallback(async () => {
    setStatus('initializing');
    setRecoverableError(null);

    const result = await service.restoreSession();

    if (result.status === 'authenticated') {
      setUser(result.user);
      setTokens(result.tokens);
      setStatus('authenticated');
    } else if (result.status === 'unauthenticated') {
      setUser(null);
      setTokens(null);
      setStatus('unauthenticated');
      queryClient.clear();
    } else {
      setRecoverableError(result.error);
      setStatus('recoverable_failure');
    }
  }, [service]);

  useEffect(() => {
    restore();
  }, [restore]);

  const login = useCallback(
    async (payload: LoginPayload) => {
      const response = await service.login(payload);
      setUser(response.user);
      setTokens(response.tokens);
      setStatus('authenticated');
      setRecoverableError(null);
    },
    [service],
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      const response = await service.register(payload);
      setUser(response.user);
      setTokens(response.tokens);
      setStatus('authenticated');
      setRecoverableError(null);
    },
    [service],
  );

  const logout = useCallback(async () => {
    const currentRefreshToken = tokens?.refreshToken;
    try {
      await service.logout(currentRefreshToken);
    } finally {
      setUser(null);
      setTokens(null);
      setStatus('unauthenticated');
      setRecoverableError(null);
      queryClient.clear();
    }
  }, [service, tokens?.refreshToken]);

  const retryRestore = useCallback(async () => {
    await restore();
  }, [restore]);

  const updateUser = useCallback((updatedUser: AuthUser) => {
    setUser(updatedUser);
  }, []);

  const updateTokens = useCallback((newTokens: AuthTokens) => {
    setTokens(newTokens);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      tokens,
      recoverableError,
      login,
      register,
      logout,
      retryRestore,
      updateUser,
      updateTokens,
    }),
    [
      status,
      user,
      tokens,
      recoverableError,
      login,
      register,
      logout,
      retryRestore,
      updateUser,
      updateTokens,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider />');
  }
  return context;
}
