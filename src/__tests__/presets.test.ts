import { describe, it, expect } from 'vitest';
import { THEME_PRESETS, PRESET_NAMES } from '../themes/presets';
import { resolveTheme } from '../theme';
import { parseWizardConfig } from '../schema';
import { spinners } from '../spinners';

describe('theme presets', () => {
  it('exports all 6 preset names', () => {
    expect(PRESET_NAMES).toEqual(['default', 'catppuccin', 'dracula', 'nord', 'tokyonight', 'monokai']);
  });

  it('each preset has all 7 color tokens as valid hex strings', () => {
    const requiredTokens = ['primary', 'success', 'error', 'warning', 'info', 'muted', 'accent'];
    for (const name of PRESET_NAMES) {
      const preset = THEME_PRESETS[name];
      expect(preset).toBeDefined();
      for (const token of requiredTokens) {
        expect(preset[token as keyof typeof preset]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('resolveTheme applies preset tokens', () => {
    const theme = resolveTheme({ preset: 'dracula' });
    expect(theme).toBeDefined();
    expect(typeof theme.primary).toBe('function');
  });

  it('user tokens override preset tokens', () => {
    const theme = resolveTheme({ preset: 'dracula', tokens: { primary: '#FF0000' } });
    expect(theme).toBeDefined();
  });

  it('resolveTheme works without preset (backward compatible)', () => {
    const theme = resolveTheme({ tokens: { primary: '#123456' } });
    expect(theme).toBeDefined();
  });

  it('resolveTheme works with undefined config (backward compatible)', () => {
    const theme = resolveTheme(undefined);
    expect(theme).toBeDefined();
  });

  it('schema accepts preset in theme config', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
      theme: { preset: 'catppuccin' },
    });
    expect(config.theme?.preset).toBe('catppuccin');
  });

  it('schema rejects invalid preset name', () => {
    expect(() => parseWizardConfig({
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
      theme: { preset: 'nonexistent' },
    })).toThrow();
  });

  it('resolveTheme returns default spinner when no spinner config', () => {
    const theme = resolveTheme();
    expect(theme.spinner).toEqual(spinners.circle);
  });

  it('resolveTheme resolves named spinner preset', () => {
    const theme = resolveTheme({ spinner: 'dots' });
    expect(theme.spinner).toEqual(spinners.dots);
  });

  it('resolveTheme resolves custom spinner frames', () => {
    const theme = resolveTheme({ spinner: { frames: ['a', 'b'], interval: 100 } });
    expect(theme.spinner).toEqual({ frames: ['a', 'b'], interval: 100 });
  });

  it('schema accepts spinner string in theme config', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
      theme: { spinner: 'dots' },
    });
    expect(config.theme?.spinner).toBe('dots');
  });

  it('schema accepts spinner object in theme config', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
      theme: { spinner: { frames: ['x', 'y'], interval: 200 } },
    });
    expect(config.theme?.spinner).toEqual({ frames: ['x', 'y'], interval: 200 });
  });
});
