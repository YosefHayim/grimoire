import chalk from 'chalk';
import type { ThemeConfig, ResolvedTheme } from './types';
import { THEME_PRESETS } from './themes/presets';
import { resolveSpinner } from './spinners';

const DEFAULT_TOKENS = {
  primary: '#5B9BD5',
  success: '#6BCB77',
  error: '#FF6B6B',
  warning: '#FFD93D',
  info: '#4D96FF',
  muted: '#888888',
  accent: '#C084FC',
} as const;

const DEFAULT_ICONS = {
  step: '\u25CF',
  stepDone: '\u2713',
  stepPending: '\u25CB',
  pointer: '\u203A',
} as const;

export function resolveTheme(themeConfig?: ThemeConfig): ResolvedTheme {
  const presetTokens = themeConfig?.preset ? THEME_PRESETS[themeConfig.preset] : undefined;
  const tokens = { ...DEFAULT_TOKENS, ...presetTokens, ...themeConfig?.tokens };
  const icons = { ...DEFAULT_ICONS, ...themeConfig?.icons };

  return {
    primary: chalk.hex(tokens.primary),
    success: chalk.hex(tokens.success),
    error: chalk.hex(tokens.error),
    warning: chalk.hex(tokens.warning),
    info: chalk.hex(tokens.info),
    muted: chalk.hex(tokens.muted),
    accent: chalk.hex(tokens.accent),
    bold: chalk.bold,
    icons,
    spinner: resolveSpinner(themeConfig?.spinner),
  };
}
