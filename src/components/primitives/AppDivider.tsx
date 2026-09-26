import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';

import { useTheme } from '@/theme/useTheme';
import { spacing } from '@/theme/tokens';

export interface AppDividerProps {
  marginVertical?: number;
  style?: ViewStyle;
}

/**
 * Primitiva de divisor sutil do PoolSafe.
 */
export function AppDivider({
  marginVertical = spacing[4],
  style,
}: AppDividerProps) {
  const { colors } = useTheme();

  return (
    <View
      accessible={false}
      aria-hidden={true}
      style={[
        styles.divider,
        {
          backgroundColor: colors.borderSubtle,
          marginVertical,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    width: '100%',
  },
});
