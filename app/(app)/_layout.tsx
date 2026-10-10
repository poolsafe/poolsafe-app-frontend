import { Stack } from 'expo-router';

/**
 * Layout raiz da área autenticada.
 *
 * Registra o grupo de abas (tabs) e as telas de detalhe (alerts/[id], cameras/[id])
 * em pilha (Stack), garantindo que os detalhes sejam apresentados acima da barra
 * de navegação inferior com transição limpa e retorno garantido.
 */
export default function AppLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'none',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="alerts/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="cameras/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="monitoring" options={{ headerShown: false }} />
      <Stack.Screen name="settings/profile" options={{ headerShown: false }} />
      <Stack.Screen name="settings/security" options={{ headerShown: false }} />
      <Stack.Screen name="settings/readiness" options={{ headerShown: false }} />
      <Stack.Screen name="settings/appearance" options={{ headerShown: false }} />
    </Stack>
  );
}
