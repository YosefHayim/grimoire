import { describe, it, expect } from 'vitest';
import { S_BAR, S_BAR_START, S_BAR_END, S_STEP_ACTIVE, S_STEP_SUBMIT,
         S_STEP_CANCEL, S_STEP_ERROR, S_CORNER_TR, S_CORNER_BR, S_BAR_H,
         S_SPINNER_FRAMES } from '../renderers/symbols';

describe('symbols', () => {
  it('exports all required symbols as non-empty strings', () => {
    const symbols = [S_BAR, S_BAR_START, S_BAR_END, S_STEP_ACTIVE, S_STEP_SUBMIT,
                     S_STEP_CANCEL, S_STEP_ERROR, S_CORNER_TR, S_CORNER_BR, S_BAR_H];
    for (const s of symbols) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it('exports spinner frames as array of 4 strings', () => {
    expect(Array.isArray(S_SPINNER_FRAMES)).toBe(true);
    expect(S_SPINNER_FRAMES.length).toBe(4);
    for (const f of S_SPINNER_FRAMES) {
      expect(typeof f).toBe('string');
    }
  });
});
