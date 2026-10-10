import React from 'react';
import { View, StyleSheet, ScrollView, Pressable } from 'react-native';

import { AppBackground } from '@/components/layout/AppBackground';
import { ScreenHeader } from '@/components/layout/ScreenHeader';
import { AppCard } from '@/components/primitives/AppCard';
import { AppText } from '@/components/primitives/AppText';
import { AppIcon, FeatherIconName } from '@/components/primitives/AppIcon';
import { useTheme } from '@/theme/useTheme';
import { spacing, radius } from '@/theme/tokens';
import type { ThemeMode } from '@/theme/ThemeContext';

interface ThemeOption {
  mode: ThemeMode;
  title: string;
  description: string;
  icon: FeatherIconName;
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    mode: 'dark',
    title: 'Tema Escuro (Deep Ocean)',
    description: 'Interface em tons escuros oceânicos com brilho ciano, ideal para ambientes de baixa iluminação.',
    icon: 'moon',
  },
  {
    mode: 'light',
    title: 'Tema Claro (Versão White)',
    description: 'Interface com fundo branco límpido e alto contraste visual.',
    icon: 'sun',
  },
  {
    mode: 'system',
    title: 'Automático do Sistema',
    description: 'Acompanha a configuração padrão do seu smartphone automaticamente.',
    icon: 'smartphone',
  },
];

export default function AppearanceSettingsScreen() {
  const { themeMode, setThemeMode, colors, isDark } = useTheme();

  return (
    <AppBackground edges={['top', 'left', 'right']}>
      <ScreenHeader
        showBack={true}
        title="Aparência"
        subtitle="Personalize o tema visual do aplicativo"
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.optionsList}>
          {THEME_OPTIONS.map((option) => {
            const isSelected = themeMode === option.mode;

            return (
              <Pressable
                key={option.mode}
                onPress={() => setThemeMode(option.mode)}
                accessibilityRole="radio"
                accessibilityState={{ selected: isSelected }}
                accessibilityLabel={`${option.title}${isSelected ? ', selecionado' : ''}`}
                style={({ pressed }) => [
                  styles.optionWrapper,
                  pressed && styles.pressed,
                ]}
              >
                <AppCard
                  variant={isSelected ? 'raised' : 'default'}
                  style={[
                    styles.optionCard,
                    isSelected && {
                      borderColor: colors.primary,
                      borderWidth: 1.5,
                      backgroundColor: isDark
                        ? 'rgba(0, 217, 232, 0.08)'
                        : 'rgba(0, 123, 141, 0.06)',
                    },
                  ]}
                >
                  <View style={styles.cardRow}>
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: isSelected
                            ? isDark
                              ? 'rgba(0, 217, 232, 0.20)'
                              : 'rgba(0, 123, 141, 0.15)'
                            : isDark
                              ? 'rgba(255, 255, 255, 0.06)'
                              : 'rgba(0, 0, 0, 0.04)',
                        },
                      ]}
                    >
                      <AppIcon
                        name={option.icon}
                        size={22}
                        color={isSelected ? colors.primary : colors.textMuted}
                        decorative={true}
                      />
                    </View>

                    <View style={styles.textContainer}>
                      <AppText
                        variant="heading3"
                        style={[
                          styles.optionTitle,
                          isSelected && { color: colors.primary },
                        ]}
                      >
                        {option.title}
                      </AppText>
                      <AppText
                        variant="small"
                        colorRole="textSecondary"
                        style={styles.optionDescription}
                      >
                        {option.description}
                      </AppText>
                    </View>

                    <View
                      style={[
                        styles.radioCircle,
                        {
                          borderColor: isSelected ? colors.primary : colors.border,
                        },
                      ]}
                    >
                      {isSelected && (
                        <View
                          style={[
                            styles.radioDot,
                            { backgroundColor: colors.primary },
                          ]}
                        />
                      )}
                    </View>
                  </View>
                </AppCard>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </AppBackground>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    padding: spacing[4],
    paddingBottom: spacing[8],
  },
  optionsList: {
    gap: spacing[3],
  },
  optionWrapper: {
    borderRadius: radius.medium,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  optionCard: {
    padding: spacing[4],
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  optionDescription: {
    lineHeight: 18,
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: spacing[1],
  },
  radioDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
