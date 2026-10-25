export type ThemeColors = {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textSubtle: string;
  /** Apple Music red. */
  primary: string;
  primaryPressed: string;
  onPrimary: string;
  danger: string;
};

export const darkColors: ThemeColors = {
  background: '#0b0b0d',
  surface: '#15151a',
  border: '#26262e',
  text: '#f2f2f5',
  textMuted: '#8e8e98',
  textSubtle: '#6c6c78',
  primary: '#fa243c',
  primaryPressed: '#d61a30',
  onPrimary: '#ffffff',
  danger: '#ff6b6b',
};

export const lightColors: ThemeColors = {
  background: '#f7f7f9',
  surface: '#ffffff',
  border: '#e2e2e8',
  text: '#111114',
  textMuted: '#6b6b76',
  textSubtle: '#8f8f9a',
  primary: '#fa243c',
  primaryPressed: '#d61a30',
  onPrimary: '#ffffff',
  danger: '#d02b3c',
};
