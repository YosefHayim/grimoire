import { describe, it, expect } from 'vitest';
import { spinners, resolveSpinner, DEFAULT_SPINNER } from '../spinners';
import type { SpinnerConfig, SpinnerName } from '../spinners';

describe('spinners', () => {
  it('exports 15 spinner presets', () => {
    expect(Object.keys(spinners)).toHaveLength(15);
  });

  it('every preset has frames array and positive interval', () => {
    for (const [name, config] of Object.entries(spinners)) {
      expect(config.frames.length, `${name} should have frames`).toBeGreaterThan(0);
      expect(config.interval, `${name} should have positive interval`).toBeGreaterThan(0);
    }
  });

  it('default spinner is circle', () => {
    expect(DEFAULT_SPINNER).toBe('circle');
  });
});

describe('resolveSpinner', () => {
  it('returns default spinner when no config', () => {
    const result = resolveSpinner();
    expect(result).toEqual(spinners.circle);
  });

  it('resolves named preset', () => {
    const result = resolveSpinner('dots');
    expect(result).toEqual(spinners.dots);
  });

  it('throws on unknown preset name', () => {
    expect(() => resolveSpinner('nonexistent')).toThrow('Unknown spinner preset: "nonexistent"');
  });

  it('resolves custom frames with default interval', () => {
    const result = resolveSpinner({ frames: ['a', 'b', 'c'] });
    expect(result).toEqual({ frames: ['a', 'b', 'c'], interval: 80 });
  });

  it('resolves custom frames with custom interval', () => {
    const result = resolveSpinner({ frames: ['x', 'y'], interval: 200 });
    expect(result).toEqual({ frames: ['x', 'y'], interval: 200 });
  });
});
