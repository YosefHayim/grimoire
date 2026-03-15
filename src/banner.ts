import figlet from 'figlet';
import gradient from 'gradient-string';
import type { ResolvedTheme } from './types';

const GRIMOIRE_GRADIENT = gradient(['#C084FC', '#5B9BD5', '#6BCB77']);

/**
 * Render a figlet ASCII art banner for the wizard name.
 * Falls back to plain bold text if figlet rendering fails.
 */
export function renderBanner(
  name: string,
  theme: ResolvedTheme,
  options?: { plain?: boolean; icon?: string },
): string {
  const icon = options?.icon;
  const prefix = icon ? `${icon}  ` : '';

  if (options?.plain) {
    return `  ${prefix}${theme.bold(name)}`;
  }

  try {
    const art = figlet.textSync(name, {
      font: 'Small',
      horizontalLayout: 'default',
    });

    const lines = art
      .split('\n')
      .map((line) => `  ${line}`)
      .join('\n');

    const banner = GRIMOIRE_GRADIENT(lines);
    return icon ? `  ${icon}\n${banner}` : banner;
  } catch {
    return `  ${prefix}${theme.bold(name)}`;
  }
}
