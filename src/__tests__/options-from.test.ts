import { describe, it, expect } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseWizardConfig } from '../schema';
import { loadWizardConfig, parseWizardYAML } from '../parser';

describe('optionsFrom schema validation', () => {
  it('accepts select step with optionsFrom instead of options', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [
        { id: 's1', type: 'select', message: 'Pick', optionsFrom: './options.json' },
      ],
    });
    expect(config.steps[0]?.type).toBe('select');
  });

  it('accepts multiselect step with optionsFrom instead of options', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [
        { id: 's1', type: 'multiselect', message: 'Pick many', optionsFrom: './opts.json' },
      ],
    });
    expect(config.steps[0]?.type).toBe('multiselect');
  });

  it('accepts search step with optionsFrom instead of options', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [
        { id: 's1', type: 'search', message: 'Search', optionsFrom: './search.json' },
      ],
    });
    expect(config.steps[0]?.type).toBe('search');
  });

  it('rejects select step with both options and optionsFrom', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [
          {
            id: 's1', type: 'select', message: 'Pick',
            options: [{ value: 'a', label: 'A' }],
            optionsFrom: './options.json',
          },
        ],
      }),
    ).toThrow(/mutually exclusive|both/i);
  });

  it('rejects select step with neither options nor optionsFrom', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [
          { id: 's1', type: 'select', message: 'Pick' },
        ],
      }),
    ).toThrow(/options.*optionsFrom|must have either/i);
  });

  it('rejects multiselect step with both options and optionsFrom', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [
          {
            id: 's1', type: 'multiselect', message: 'Multi',
            options: [{ value: 'a', label: 'A' }],
            optionsFrom: './opts.json',
          },
        ],
      }),
    ).toThrow(/mutually exclusive|both/i);
  });

  it('rejects search step with neither options nor optionsFrom', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [
          { id: 's1', type: 'search', message: 'Search' },
        ],
      }),
    ).toThrow(/options.*optionsFrom|must have either/i);
  });
});

describe('optionsFrom file resolution in loadWizardConfig', () => {
  const testDir = join(tmpdir(), `grimoire-optionsfrom-test-${process.pid}`);
  const configFile = join(testDir, 'wizard.json');
  const optionsFile = join(testDir, 'langs.json');
  const subDir = join(testDir, 'sub');
  const nestedOptionsFile = join(subDir, 'items.json');

  function setup(): void {
    mkdirSync(testDir, { recursive: true });
    mkdirSync(subDir, { recursive: true });
  }

  function cleanup(): void {
    try { rmSync(testDir, { recursive: true, force: true }); } catch { }
  }

  it('resolves optionsFrom from a JSON file and populates options', async () => {
    setup();
    try {
      const options = [
        { value: 'ts', label: 'TypeScript' },
        { value: 'js', label: 'JavaScript' },
      ];
      writeFileSync(optionsFile, JSON.stringify(options));
      writeFileSync(configFile, JSON.stringify({
        meta: { name: 'OptionsFrom Test' },
        steps: [
          { id: 'lang', type: 'select', message: 'Pick', optionsFrom: './langs.json' },
        ],
      }));

      const config = await loadWizardConfig(configFile);
      const step = config.steps[0];
      expect(step?.type).toBe('select');
      if (step?.type === 'select') {
        expect(step.options).toHaveLength(2);
        expect(step.options[0]).toEqual({ value: 'ts', label: 'TypeScript' });
      }
    } finally {
      cleanup();
    }
  });

  it('resolves relative path based on config file location', async () => {
    setup();
    try {
      const items = [{ value: 'x', label: 'X' }];
      writeFileSync(nestedOptionsFile, JSON.stringify(items));
      writeFileSync(configFile, JSON.stringify({
        meta: { name: 'Relative Path Test' },
        steps: [
          { id: 'item', type: 'multiselect', message: 'Pick items', optionsFrom: './sub/items.json' },
        ],
      }));

      const config = await loadWizardConfig(configFile);
      const step = config.steps[0];
      expect(step?.type).toBe('multiselect');
      if (step?.type === 'multiselect') {
        expect(step.options).toHaveLength(1);
        expect(step.options[0]).toEqual({ value: 'x', label: 'X' });
      }
    } finally {
      cleanup();
    }
  });

  it('throws when optionsFrom file does not exist', async () => {
    setup();
    try {
      writeFileSync(configFile, JSON.stringify({
        meta: { name: 'Missing File Test' },
        steps: [
          { id: 's1', type: 'select', message: 'Pick', optionsFrom: './missing.json' },
        ],
      }));

      await expect(loadWizardConfig(configFile)).rejects.toThrow(/failed to read/i);
    } finally {
      cleanup();
    }
  });

  it('throws when optionsFrom file contains invalid JSON', async () => {
    setup();
    try {
      writeFileSync(join(testDir, 'bad.json'), 'not valid json {{{');
      writeFileSync(configFile, JSON.stringify({
        meta: { name: 'Bad JSON Test' },
        steps: [
          { id: 's1', type: 'select', message: 'Pick', optionsFrom: './bad.json' },
        ],
      }));

      await expect(loadWizardConfig(configFile)).rejects.toThrow(/invalid JSON/i);
    } finally {
      cleanup();
    }
  });

  it('throws when optionsFrom file contains a non-array value', async () => {
    setup();
    try {
      writeFileSync(join(testDir, 'obj.json'), JSON.stringify({ not: 'array' }));
      writeFileSync(configFile, JSON.stringify({
        meta: { name: 'Non-Array Test' },
        steps: [
          { id: 's1', type: 'select', message: 'Pick', optionsFrom: './obj.json' },
        ],
      }));

      await expect(loadWizardConfig(configFile)).rejects.toThrow(/must contain an array/i);
    } finally {
      cleanup();
    }
  });
});

describe('optionsFrom in parseWizardYAML', () => {
  it('throws when optionsFrom is used in YAML string mode', () => {
    const yaml = `
meta:
  name: Test
steps:
  - id: s1
    type: select
    message: Pick
    optionsFrom: ./options.json
`;
    expect(() => parseWizardYAML(yaml)).toThrow(/optionsFrom.*not supported.*parseWizardYAML/i);
  });
});
