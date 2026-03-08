import { describe, it, expect, beforeEach, vi } from 'vitest';
import { recordSelection, getOrderedOptions, clearMruData } from '../mru';
import type { SelectChoice } from '../types';

const WIZARD_NAME = '__mru_test_wizard__';

beforeEach(() => {
  clearMruData(WIZARD_NAME);
});

describe('recordSelection', () => {
  it('records a single string value', () => {
    recordSelection(WIZARD_NAME, 'lang', 'typescript');
    const options: SelectChoice[] = [
      { value: 'javascript', label: 'JavaScript' },
      { value: 'typescript', label: 'TypeScript' },
    ];
    const ordered = getOrderedOptions(WIZARD_NAME, 'lang', options);
    expect(ordered[0]).toEqual({ value: 'typescript', label: 'TypeScript' });
    expect(ordered[1]).toEqual({ value: 'javascript', label: 'JavaScript' });
  });

  it('records an array of values (multiselect)', () => {
    recordSelection(WIZARD_NAME, 'features', ['eslint', 'vitest']);
    const options: SelectChoice[] = [
      { value: 'prettier', label: 'Prettier' },
      { value: 'eslint', label: 'ESLint' },
      { value: 'vitest', label: 'Vitest' },
    ];
    const ordered = getOrderedOptions(WIZARD_NAME, 'features', options);
    expect(ordered[0]).toEqual({ value: 'eslint', label: 'ESLint' });
    expect(ordered[1]).toEqual({ value: 'vitest', label: 'Vitest' });
    expect(ordered[2]).toEqual({ value: 'prettier', label: 'Prettier' });
  });

  it('accumulates frequency across multiple calls', () => {
    recordSelection(WIZARD_NAME, 'lang', 'go');
    recordSelection(WIZARD_NAME, 'lang', 'go');
    recordSelection(WIZARD_NAME, 'lang', 'typescript');
    const options: SelectChoice[] = [
      { value: 'typescript', label: 'TypeScript' },
      { value: 'go', label: 'Go' },
      { value: 'python', label: 'Python' },
    ];
    const ordered = getOrderedOptions(WIZARD_NAME, 'lang', options);
    expect(ordered[0]).toEqual({ value: 'go', label: 'Go' });
    expect(ordered[1]).toEqual({ value: 'typescript', label: 'TypeScript' });
    expect(ordered[2]).toEqual({ value: 'python', label: 'Python' });
  });
});

describe('getOrderedOptions', () => {
  it('returns options unchanged when no MRU data exists', () => {
    const options: SelectChoice[] = [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' },
    ];
    const ordered = getOrderedOptions(WIZARD_NAME, 'no-data', options);
    expect(ordered).toEqual(options);
  });

  it('preserves separators in their original positions', () => {
    recordSelection(WIZARD_NAME, 'mixed', 'c');
    recordSelection(WIZARD_NAME, 'mixed', 'c');
    recordSelection(WIZARD_NAME, 'mixed', 'a');

    const options: SelectChoice[] = [
      { value: 'a', label: 'A' },
      { separator: '── Group ──' },
      { value: 'b', label: 'B' },
      { value: 'c', label: 'C' },
    ];
    const ordered = getOrderedOptions(WIZARD_NAME, 'mixed', options);

    expect(ordered[0]).toEqual({ value: 'c', label: 'C' });
    expect(ordered[1]).toEqual({ separator: '── Group ──' });
    expect(ordered[2]).toEqual({ value: 'a', label: 'A' });
    expect(ordered[3]).toEqual({ value: 'b', label: 'B' });
  });

  it('does not remove any options', () => {
    recordSelection(WIZARD_NAME, 'step1', 'x');
    const options: SelectChoice[] = [
      { value: 'x', label: 'X' },
      { value: 'y', label: 'Y' },
      { value: 'z', label: 'Z' },
    ];
    const ordered = getOrderedOptions(WIZARD_NAME, 'step1', options);
    expect(ordered).toHaveLength(3);
    expect(ordered.map(o => ('value' in o ? o.value : null))).toContain('x');
    expect(ordered.map(o => ('value' in o ? o.value : null))).toContain('y');
    expect(ordered.map(o => ('value' in o ? o.value : null))).toContain('z');
  });

  it('handles options with disabled items', () => {
    recordSelection(WIZARD_NAME, 'dis', 'b');
    const options: SelectChoice[] = [
      { value: 'a', label: 'A', disabled: true },
      { value: 'b', label: 'B' },
    ];
    const ordered = getOrderedOptions(WIZARD_NAME, 'dis', options);
    expect(ordered[0]).toEqual({ value: 'b', label: 'B' });
    expect(ordered[1]).toEqual({ value: 'a', label: 'A', disabled: true });
  });

  it('handles empty options array', () => {
    const ordered = getOrderedOptions(WIZARD_NAME, 'empty', []);
    expect(ordered).toEqual([]);
  });

  it('isolates data between different step IDs', () => {
    recordSelection(WIZARD_NAME, 'step-a', 'val1');
    const options: SelectChoice[] = [
      { value: 'val1', label: 'V1' },
      { value: 'val2', label: 'V2' },
    ];
    const ordered = getOrderedOptions(WIZARD_NAME, 'step-b', options);
    expect(ordered).toEqual(options);
  });
});

describe('clearMruData', () => {
  it('clears recorded data for a wizard', () => {
    recordSelection(WIZARD_NAME, 'lang', 'rust');
    clearMruData(WIZARD_NAME);

    const options: SelectChoice[] = [
      { value: 'rust', label: 'Rust' },
      { value: 'go', label: 'Go' },
    ];
    const ordered = getOrderedOptions(WIZARD_NAME, 'lang', options);
    expect(ordered).toEqual(options);
  });
});
