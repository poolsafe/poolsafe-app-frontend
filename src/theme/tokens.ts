/**
 * Tokens estruturais e de design system do PoolSafe.
 *
 * Fonte da verdade: docs/design-system.md — seções 7, 8, 9, 10, 11 e 18.
 *
 * Este arquivo concentra tokens não dependentes de troca dinâmica de cores:
 * - Tipografia (escala tipográfica, pesos e famílias de fonte)
 * - Espaçamentos (base 4)
 * - Raios de curvatura (border-radius)
 * - Alvos de toque (touch targets)
 * - Movimento e durações de transição
 * - Gradientes
 */

export const fontFamilies = {
  // Inter para a interface geral
  inter: {
    regular: 'Inter_400Regular',
    semiBold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
    extraBold: 'Inter_800ExtraBold',
  },
  // JetBrains Mono apenas para telemetria, badges e estados técnicos
  jetbrainsMono: {
    semiBold: 'JetBrainsMono_600SemiBold',
  },
} as const;

export const typography = {
  display: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800' as const,
    fontFamily: fontFamilies.inter.extraBold,
  },
  heading1: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800' as const,
    fontFamily: fontFamilies.inter.extraBold,
  },
  heading2: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '700' as const,
    fontFamily: fontFamilies.inter.bold,
  },
  heading3: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700' as const,
    fontFamily: fontFamilies.inter.bold,
  },
  bodyLarge: {
    fontSize: 18,
    lineHeight: 27,
    fontWeight: '400' as const,
    fontFamily: fontFamilies.inter.regular,
  },
  body: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '400' as const,
    fontFamily: fontFamilies.inter.regular,
  },
  bodyStrong: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '600' as const,
    fontFamily: fontFamilies.inter.semiBold,
  },
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400' as const,
    fontFamily: fontFamilies.inter.regular,
  },
  smallStrong: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600' as const,
    fontFamily: fontFamilies.inter.semiBold,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '400' as const,
    fontFamily: fontFamilies.inter.regular,
  },
  telemetry: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '600' as const,
    fontFamily: fontFamilies.jetbrainsMono.semiBold,
    letterSpacing: 0.8,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
} as const;

export const radius = {
  small: 8,
  medium: 12,
  large: 16,
  xlarge: 20,
  panel: 24,
  full: 999,
} as const;

export const layout = {
  touchTargetMin: 44,
  buttonHeight: 48,
  screenPaddingHorizontal: spacing[4],
  cardPadding: spacing[4],
  cardGap: spacing[3],
  sectionGap: spacing[6],
} as const;

export const motion = {
  fast: 120,
  base: 180,
  slow: 240,
} as const;

export const gradients = {
  dark: {
    background: ['#041728', '#02111E'] as const,
    aqua: ['#064D6A', '#033447'] as const,
    safe: ['#064B52', '#04343A'] as const,
    alert: ['#3B1E35', '#24192B'] as const,
    blue: ['#0A2852', '#071D3D'] as const,
  },
  light: {
    background: ['#F3FAFC', '#E2F3F7'] as const,
    aqua: ['#E6F7FA', '#D3EEF4'] as const,
    safe: ['#E4F7F2', '#D1EFE8'] as const,
    alert: ['#FCE9ED', '#F7D6DE'] as const,
    blue: ['#EBF3FA', '#D9E7F5'] as const,
  },
} as const;
