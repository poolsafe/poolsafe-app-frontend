import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { RoutePlaceholder } from '@/components/dev/RoutePlaceholder';
import { AppButton } from '@/components/primitives/AppButton';
import { spacing } from '@/theme/tokens';

import { useTheme } from '@/theme/useTheme';

export default function SettingsScreen() {
  const router = useRouter();
  const { themeMode, setThemeMode, isDark } = useTheme();

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        title="Definições"
        subtitle="Configurações e informações"
        showThemeToggle={true}
      />

      <RoutePlaceholder
        title="Definições do Sistema"
        targetSlice="Fatia 10 — Definições e aparência"
        description="A seleção e persistência manual de tema (sistema/claro/escuro), visualização de dados de conta, status de permissões de notificação e logout real com revogação na API serão implementados na Fatia 10."
        devActions={
          <View style={styles.buttonGroup}>
            <AppButton
              variant={themeMode === 'dark' ? 'primary' : 'secondary'}
              title="Tema Escuro (Deep Ocean)"
              icon="moon"
              onPress={() => setThemeMode('dark')}
            />
            <AppButton
              variant={themeMode === 'light' ? 'primary' : 'secondary'}
              title="Tema Claro (Versão White)"
              icon="sun"
              onPress={() => setThemeMode('light')}
            />
            <AppButton
              variant={themeMode === 'system' ? 'primary' : 'secondary'}
              title={`Automático do Sistema (${isDark ? 'Escuro' : 'Claro'})`}
              icon="smartphone"
              onPress={() => setThemeMode('system')}
            />
            {__DEV__ && (
              <AppButton
                variant="ghost"
                title="Voltar ao Gateway de Desenvolvimento"
                icon="corner-up-left"
                onPress={() => {
                  if (router.canDismiss()) {
                    router.dismissAll();
                  } else {
                    router.navigate('/');
                  }
                }}
              />
            )}
          </View>
        }
      />
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  buttonGroup: {
    gap: spacing[2],
  },
});
