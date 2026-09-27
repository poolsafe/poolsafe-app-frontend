import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Não re-fetch automaticamente em foco no MVP inicial
      refetchOnWindowFocus: false,
      // Tempo de stale padrão: 1 minuto
      staleTime: 60_000,
      // Retry limitado para falhas de rede
      retry: 1,
    },
  },
});

export function QueryProvider({ children }: PropsWithChildren) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

