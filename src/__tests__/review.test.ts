import { describe, it, expect } from 'vitest';
import { parseWizardConfig } from '../schema';

describe('review screen schema', () => {
  it('accepts review: true in meta', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test', review: true },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    });
    expect(config.meta.review).toBe(true);
  });

  it('defaults review to undefined', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    });
    expect(config.meta.review).toBeUndefined();
  });

  it('rejects non-boolean review values', () => {
    expect(() => {
      parseWizardConfig({
        meta: { name: 'Test', review: 'yes' },
        steps: [{ id: 'a', type: 'text', message: 'A?' }],
      });
    }).toThrow();
  });

  it('accepts review: false', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test', review: false },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    });
    expect(config.meta.review).toBe(false);
  });
});
