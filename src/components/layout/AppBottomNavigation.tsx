import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Pressable, Animated, Platform } from 'react-native';
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

const useNativeDriver = Platform.OS !== 'web';

interface NavigationTabItemProps {
  route: AppBottomTabBarProps['state']['routes'][number];
  descriptor: AppBottomTabBarProps['descriptors'][string];
  isFocused: boolean;
  activeColor: string;
  inactiveColor: string;
  isDark: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

/**
 * Item individual da aba com micro-interações táteis e animações nativas de alto desempenho.
 */
function NavigationTabItem({
  route,
  descriptor,
  isFocused,
  activeColor,
  inactiveColor,
  isDark,
  onPress,
  onLongPress,
}: NavigationTabItemProps) {
  const { options } = descriptor;

  const label =
    typeof options.tabBarLabel === 'string'
      ? options.tabBarLabel
      : options.title !== undefined
        ? options.title
        : TAB_FALLBACK_LABELS[route.name] || route.name;

  const iconName = TAB_ICONS[route.name] || 'circle';
  const currentColor = isFocused ? activeColor : inactiveColor;

  // Valores animados no UI Thread nativo (60/120 FPS sem travar o JS thread)
  const pressScale = useRef(new Animated.Value(1)).current;
  const pressOpacity = useRef(new Animated.Value(1)).current;
  const focusAnim = useRef(new Animated.Value(isFocused ? 1 : 0)).current;

  // Animação de transição da aba selecionada (expansão da barra e pop do ícone)
  useEffect(() => {
    if (isFocused) {
      Animated.spring(focusAnim, {
        toValue: 1,
        friction: 7,
        tension: 140,
        useNativeDriver,
      }).start();
    } else {
      Animated.timing(focusAnim, {
        toValue: 0,
        duration: 160,
        useNativeDriver,
      }).start();
    }
  }, [isFocused, focusAnim]);

  // Feedback tátil imediato ao pressionar (scale down rápido e rebote elástico ao soltar)
  const handlePressIn = () => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 0.90,
        speed: 50,
        bounciness: 0,
        useNativeDriver,
      }),
      Animated.timing(pressOpacity, {
        toValue: 0.82,
        duration: 70,
        useNativeDriver,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(pressScale, {
        toValue: 1,
        speed: 22,
        bounciness: 8,
        useNativeDriver,
      }),
      Animated.timing(pressOpacity, {
        toValue: 1,
        duration: 120,
        useNativeDriver,
      }),
    ]).start();
  };

  const podScale = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  const indicatorScaleX = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.15, 1],
  });

  const indicatorOpacity = focusAnim.interpolate({
    inputRange: [0, 0.1, 1],
    outputRange: [0, 0.5, 1],
  });

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: isFocused }}
      accessibilityLabel={options.tabBarAccessibilityLabel || `Aba ${label}`}
      accessibilityHint={
        isFocused ? 'Aba atualmente selecionada' : `Alterna para a aba ${label}`
      }
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={styles.tabButton}
      hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [{ scale: pressScale }],
            opacity: pressOpacity,
          },
        ]}
      >
        {/* Pod circular ao redor do ícone para o item ativo (estilo Ocean Hero) */}
        <Animated.View
          style={[
            styles.iconPod,
            {
              transform: [{ scale: podScale }],
            },
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
        </Animated.View>

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
      </Animated.View>

      {/* Traço indicador inferior ciano/teal estendido até o final da seção */}
      <View style={styles.indicatorContainer}>
        <Animated.View
          style={[
            styles.indicatorBar,
            {
              backgroundColor: activeColor,
              opacity: indicatorOpacity,
              transform: [{ scaleX: indicatorScaleX }],
            },
            isDark ? styles.indicatorGlowDark : styles.indicatorGlowLight,
          ]}
        />
      </View>
    </Pressable>
  );
}

/**
 * Bottom Navigation com estética inspirada no Ocean Hero (aquática, moderna e refinada).
 *
 * Características:
 * - Micro-animação tátil de toque (spring press feedback) a 60/120 FPS sem sobrecarga de CPU.
 * - Destaque ativo por pod circular com borda e preenchimento translúcido.
 * - Ícone em destaque, tipografia semi-bold e indicador de barra inferior estendido até o final de cada seção.
 * - Transição fluida de expansão do indicador ao selecionar cada aba.
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
          const isFocused = state.index === index;

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
            <NavigationTabItem
              key={route.key}
              route={route}
              descriptor={descriptor}
              isFocused={isFocused}
              activeColor={colors.primary}
              inactiveColor={colors.textMuted}
              isDark={isDark}
              onPress={onPress}
              onLongPress={onLongPress}
            />
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
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
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
  indicatorContainer: {
    width: '100%',
    height: 3,
    marginTop: 6,
    paddingHorizontal: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicatorBar: {
    width: '50%',
    height: 3,
    borderRadius: radius.full,
  },
  indicatorGlowDark: {
    shadowColor: '#00D9E8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  indicatorGlowLight: {
    shadowColor: '#007B8D',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
  },
});
