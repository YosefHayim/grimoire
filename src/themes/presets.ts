export interface PresetTokens {
  primary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  muted: string;
  accent: string;
}

export const THEME_PRESETS: Record<string, PresetTokens> = {
  default: {
    primary: '#7C3AED',
    success: '#10B981',
    error: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
    muted: '#6B7280',
    accent: '#8B5CF6',
  },
  catppuccin: {
    primary: '#cba6f7',
    success: '#a6e3a1',
    error: '#f38ba8',
    warning: '#fab387',
    info: '#74c7ec',
    muted: '#6c7086',
    accent: '#f5c2e7',
  },
  dracula: {
    primary: '#bd93f9',
    success: '#50fa7b',
    error: '#ff5555',
    warning: '#ffb86c',
    info: '#8be9fd',
    muted: '#6272a4',
    accent: '#ff79c6',
  },
  nord: {
    primary: '#88c0d0',
    success: '#a3be8c',
    error: '#bf616a',
    warning: '#ebcb8b',
    info: '#81a1c1',
    muted: '#4c566a',
    accent: '#b48ead',
  },
  tokyonight: {
    primary: '#7aa2f7',
    success: '#9ece6a',
    error: '#f7768e',
    warning: '#e0af68',
    info: '#7dcfff',
    muted: '#565f89',
    accent: '#bb9af7',
  },
  monokai: {
    primary: '#ab9df2',
    success: '#a9dc76',
    error: '#ff6188',
    warning: '#ffd866',
    info: '#78dce8',
    muted: '#727072',
    accent: '#fc9867',
  },
};

export const PRESET_NAMES = Object.keys(THEME_PRESETS) as string[];
