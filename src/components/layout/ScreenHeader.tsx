import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';

import { AppText } from '../primitives/AppText';
import { AppButton } from '../primitives/AppButton';
import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/tokens';

export interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showThemeToggle?: boolean;
  style?: ViewStyle;
}

/**
 * Cabeçalho estrutural compartilhado das telas do PoolSafe.
 *
 * Oferece affordance de navegação acessível e hierarquia clara
 * entre título, subtítulo e ações de contexto.
 */
export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  rightAction,
  showThemeToggle = false,
  style,
}: ScreenHeaderProps) {
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <View style={[styles.header, style]}>
      <View style={styles.leftContainer}>
        {showBack && (
          <View style={styles.backButtonContainer}>
            <AppButton
              variant="icon"
              icon="arrow-left"
              accessibilityLabel="Voltar à tela anterior"
              accessibilityHint="Retorna para a tela de onde você veio"
              onPress={handleBack}
            />
          </View>
        )}
        <View style={styles.titlesContainer}>
          <AppText variant="heading2" numberOfLines={1}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="small" colorRole="textMuted" numberOfLines={1} style={styles.subtitle}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
      </View>

      {rightAction !== undefined ? (
        <View style={styles.rightContainer}>{rightAction}</View>
      ) : showThemeToggle ? (
        <View style={styles.rightContainer}>
          <AppButton
            variant="icon"
            icon={isDark ? 'sun' : 'moon'}
            accessibilityLabel={isDark ? 'Mudar para tema claro (white)' : 'Mudar para tema escuro'}
            accessibilityHint="Alterna a interface entre tema escuro e claro"
            onPress={toggleTheme}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minHeight: 56,
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButtonContainer: {
    marginRight: spacing[2],
  },
  titlesContainer: {
    flex: 1,
  },
  subtitle: {
    marginTop: 2,
  },
  rightContainer: {
    marginLeft: spacing[3],
  },
});
