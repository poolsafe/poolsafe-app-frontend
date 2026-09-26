import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { ComponentProps } from 'react';
import type { Tabs } from 'expo-router';

export type AppBottomTabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

import { useTheme } from '@/theme/useTheme';
import { AppIcon, FeatherIconName } from '@/components/primitives/AppIcon';
import { AppText } from '@/components/primitives/AppText';
import { radius, spacing } from '@/theme/tokens';

const TAB_ICONS: Record<string, FeatherIconName> = {
  index: 'home',
  history: 'clock',
  cameras: 'video',
  settings: 'settings',
};

const TAB_FALLBACK_LABELS: Record<string, string> = {
  index: 'Home',
  history: 'Histórico',
  cameras: 'Câmeras',
  settings: 'Definições',
};

/**
 * Bottom Navigation com estética inspirada no Ocean Hero (aquática, moderna e refinada).
 *
 * Características:
 * - Destaque ativo por pod circular com borda e preenchimento translúcido.
 * - Ícone em destaque, tipografia semi-bold e indicador de barra (pill) inferior brilhante.
 * - Versão escura profunda (cyan glow) e versão clara / white luminosa e cristalina.
 * - Itens inativos minimalistas e limpos com alvos de toque generosos (>= 48x48dp).
 * - Integração robusta com a Safe Area inferior (gestures do Android / home bar do iOS).
 */
export function AppBottomNavigation({
  state,
  descriptors,
  navigation,
  insets,
}: AppBottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const safeAreaInsets = useSafeAreaInsets();

  // Garante safe area bottom consistente
  const bottomPadding = Math.max(safeAreaInsets.bottom, insets.bottom, spacing[2]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? 'rgba(5, 23, 38, 0.96)' : 'rgba(255, 255, 255, 0.98)',
          borderTopColor: isDark ? 'rgba(0, 217, 232, 0.18)' : 'rgba(7, 38, 52, 0.08)',
          paddingBottom: bottomPadding,
        },
        isDark ? styles.shadowDark : styles.shadowLight,
      ]}
      accessibilityRole="tablist"
    >
      <View style={styles.tabsRow}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          if (!descriptor) return null;
          const { options } = descriptor;
          const isFocused = state.index === index;

          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : options.title !== undefined
              ? options.title
              : TAB_FALLBACK_LABELS[route.name] || route.name;

          const iconName = TAB_ICONS[route.name] || 'circle';

          const activeColor = colors.primary;
          const inactiveColor = colors.textMuted;
          const currentColor = isFocused ? activeColor : inactiveColor;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          const onLongPress = () => {
            navigation.emit({
              type: 'tabLongPress',
              target: route.key,
            });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: isFocused }}
              accessibilityLabel={options.tabBarAccessibilityLabel || `Aba ${label}`}
              accessibilityHint={
                isFocused ? 'Aba atualmente selecionada' : `Alterna para a aba ${label}`
              }
              onPress={onPress}
              onLongPress={onLongPress}
              style={({ pressed }) => [
                styles.tabButton,
                pressed && styles.tabButtonPressed,
              ]}
              hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
            >
              {/* Pod circular ao redor do ícone para o item ativo (estilo Ocean Hero) */}
              <View
                style={[
                  styles.iconPod,
                  isFocused && {
                    backgroundColor: isDark
                      ? 'rgba(0, 217, 232, 0.14)'
                      : 'rgba(0, 123, 141, 0.10)',
                    borderColor: isDark
                      ? 'rgba(0, 217, 232, 0.45)'
                      : 'rgba(0, 123, 141, 0.30)',
                    borderWidth: 1.5,
                  },
                  isFocused && isDark && styles.podGlowDark,
                  isFocused && !isDark && styles.podGlowLight,
                ]}
              >
                {options.tabBarIcon ? (
                  options.tabBarIcon({
                    focused: isFocused,
                    color: currentColor,
                    size: 22,
                  })
                ) : (
                  <AppIcon
                    name={iconName}
                    size={22}
                    color={currentColor}
                    decorative={true}
                  />
                )}
              </View>

              {/* Rótulo da aba */}
              <AppText
                variant="caption"
                style={[
                  styles.label,
                  {
                    color: currentColor,
                    fontWeight: isFocused ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </AppText>

              {/* Traço indicador inferior ciano/teal para a aba ativa (Ocean Hero style) */}
              <View
                style={[
                  styles.indicatorPill,
                  {
                    backgroundColor: isFocused ? activeColor : 'transparent',
                  },
                  isFocused && isDark && styles.indicatorGlowDark,
                ]}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    paddingTop: spacing[2],
    elevation: 10,
  },
  shadowDark: {
    shadowColor: '#00D9E8',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
  },
  shadowLight: {
    shadowColor: '#072634',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: spacing[2],
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingVertical: 2,
  },
  tabButtonPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  iconPod: {
    width: 44,
    height: 38,
    borderRadius: radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 2,
  },
  podGlowDark: {
    shadowColor: '#00D9E8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
  },
  podGlowLight: {
    shadowColor: '#007B8D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  label: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    marginTop: 1,
  },
  indicatorPill: {
    width: 14,
    height: 2.5,
    borderRadius: radius.full,
    marginTop: 4,
  },
  indicatorGlowDark: {
    shadowColor: '#00D9E8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
});
