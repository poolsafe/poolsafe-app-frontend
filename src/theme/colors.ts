/**
 * Tokens de cor do design system PoolSafe.
 *
 * Fonte da verdade: docs/design-system.md — seção 6.
 *
 * Estes tokens são a referência TypeScript para uso em
 * StyleSheet.create() e outros contextos onde as classes
 * NativeWind não forem aplicáveis.
 *
 * NativeWind usa tailwind.config.js como fonte de verdade
 * para utilitários de classe.
 */

export type ColorRole =
  | 'background'
  | 'backgroundDeep'
  | 'surface'
  | 'surfaceRaised'
  | 'surfaceGlass'
  | 'border'
  | 'borderSubtle'
  | 'textPrimary'
  | 'textSecondary'
  | 'textMuted'
  | 'textDisabled'
  | 'primary'
  | 'primaryPressed'
  | 'primarySoft'
  | 'success'
  | 'successSoft'
  | 'warning'
  | 'warningSoft'
  | 'danger'
  | 'dangerSoft'
  | 'info'
  | 'offline'
  | 'overlay';

export type ColorTokens = Record<ColorRole, string>;

export const darkColors: ColorTokens = {
  // Fundos
  background: '#041728',
  backgroundDeep: '#070E16',

  // Superfícies
  surface: '#072438',
  surfaceRaised: '#082E45',
  surfaceGlass: 'rgba(7, 36, 56, 0.78)',

  // Bordas
  border: '#175464',
  borderSubtle: 'rgba(120, 167, 181, 0.20)',

  // Texto
  textPrimary: '#F2FAFC',
  textSecondary: '#A3C2CC',
  textMuted: '#78A7B5',
  textDisabled: '#506877',

  // Ação principal
  primary: '#00D9E8',
  primaryPressed: '#00B8C6',
  primarySoft: 'rgba(0, 217, 232, 0.12)',

  // Semânticas
  success: '#00D8B4',
  successSoft: 'rgba(0, 216, 180, 0.12)',
  warning: '#F6C95C',
  warningSoft: 'rgba(246, 201, 92, 0.12)',
  danger: '#FF4D73',
  dangerSoft: 'rgba(255, 77, 115, 0.12)',
  info: '#44A8FF',
  offline: '#78909C',
  overlay: 'rgba(0, 7, 14, 0.72)',
};

export const lightColors: ColorTokens = {
  // Fundos
  background: '#F3FAFC',
  backgroundDeep: '#E2F3F7',

  // Superfícies
  surface: '#FFFFFF',
  surfaceRaised: '#F8FCFD',
  surfaceGlass: 'rgba(255, 255, 255, 0.84)',

  // Bordas
  border: '#B9DDE5',
  borderSubtle: 'rgba(7, 38, 52, 0.12)',

  // Texto
  textPrimary: '#072634',
  textSecondary: '#294D5A',
  textMuted: '#4E6D78',
  textDisabled: '#8AA0A8',

  // Ação principal
  primary: '#007B8D',
  primaryPressed: '#006272',
  primarySoft: '#DDF6F9',

  // Semânticas
  success: '#007E68',
  successSoft: '#DDF5EF',
  warning: '#755500',
  warningSoft: '#FFF4D1',
  danger: '#B4234D',
  dangerSoft: '#FFE5EB',
  info: '#006FA8',
  offline: '#607D86',
  overlay: 'rgba(1, 20, 29, 0.52)',
};
