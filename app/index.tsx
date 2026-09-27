import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '@/providers/AuthContext';

/**
 * Ponto de entrada raiz do aplicativo PoolSafe.
 *
 * Direciona o fluxo com base no estado real de autenticação e sessão:
 * - Se autenticado -> direciona diretamente ao shell autenticado /(app)/(tabs)
 * - Se não autenticado -> direciona ao fluxo público /(public)/login
 */
export default function InitialScreen() {
  const { status } = useAuth();

  if (status === 'authenticated') {
    return <Redirect href="/(app)/(tabs)" />;
  }

  return <Redirect href="/(public)/login" />;
}
