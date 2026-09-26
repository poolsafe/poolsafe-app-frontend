import React from 'react';
import { Tabs } from 'expo-router';

import { AppBottomNavigation } from '@/components/layout/AppBottomNavigation';

/**
 * Layout da Bottom Navigation do PoolSafe.
 *
 * Implementa as 4 abas canônicas na ordem obrigatória:
 * 1. Home ('home')
 * 2. Histórico ('clock')
 * 3. Câmeras ('video')
 * 4. Definições ('settings')
 *
 * Estilizado com pod circular ativo, indicador inferior ciano/teal
 * e suporte nativo tanto para o tema escuro quanto para o tema claro (white).
 */
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <AppBottomNavigation {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarAccessibilityLabel: 'Aba Home',
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Histórico',
          tabBarAccessibilityLabel: 'Aba Histórico de Alertas',
        }}
      />
      <Tabs.Screen
        name="cameras"
        options={{
          title: 'Câmeras',
          tabBarAccessibilityLabel: 'Aba Câmeras Autorizadas',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Definições',
          tabBarAccessibilityLabel: 'Aba Definições e Configurações',
        }}
      />
    </Tabs>
  );
}

