import { describe, it, expect } from 'vitest';
import { parseWizardConfig } from '../schema';

describe('parseWizardConfig', () => {
  it('parses valid minimal config', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test Wizard' },
      steps: [
        { id: 'name', type: 'text', message: 'Enter name' },
      ],
    });
    expect(config.meta.name).toBe('Test Wizard');
    expect(config.steps).toHaveLength(1);
  });

  it('parses valid config with all 10 step types', () => {
    const config = parseWizardConfig({
      meta: { name: 'Full Wizard', version: '1.0.0' },
      steps: [
        { id: 's1', type: 'text', message: 'Text' },
        {
          id: 's2', type: 'select', message: 'Select',
          options: [{ value: 'a', label: 'A' }],
        },
        {
          id: 's3', type: 'multiselect', message: 'Multi',
          options: [{ value: 'x', label: 'X' }],
        },
        { id: 's4', type: 'confirm', message: 'Confirm?' },
        { id: 's5', type: 'password', message: 'Password' },
        { id: 's6', type: 'number', message: 'Number' },
        {
          id: 's7', type: 'search', message: 'Search',
          options: [{ value: 'q', label: 'Q' }],
        },
        { id: 's8', type: 'editor', message: 'Editor' },
        { id: 's9', type: 'path', message: 'Path' },
        { id: 's10', type: 'toggle', message: 'Toggle' },
      ],
    });
    expect(config.steps).toHaveLength(10);
  });

  it('throws on missing meta', () => {
    expect(() =>
      parseWizardConfig({
        steps: [{ id: 'x', type: 'text', message: 'Hi' }],
      }),
    ).toThrow();
  });

  it('throws on empty steps array', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [],
      }),
    ).toThrow();
  });

  it('throws on duplicate step IDs', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [
          { id: 'dup', type: 'text', message: 'First' },
          { id: 'dup', type: 'text', message: 'Second' },
        ],
      }),
    ).toThrow(/Duplicate step ID/);
  });

  it('throws on unknown next step reference', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [
          { id: 's1', type: 'text', message: 'Hi', next: 'nonexistent' },
        ],
      }),
    ).toThrow(/unknown next step/);
  });

  it('throws when route key does not match option value', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [
          {
            id: 's1', type: 'select', message: 'Pick',
            options: [{ value: 'a', label: 'A' }],
            routes: { z: 's1' },
          },
        ],
      }),
    ).toThrow(/does not match any option value/);
  });

  it('throws when min > max on number step', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [
          { id: 'n', type: 'number', message: 'Num', min: 10, max: 5 },
        ],
      }),
    ).toThrow(/min.*greater than max/);
  });

  it('throws on invalid hex color in theme', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        theme: { tokens: { primary: 'red' } },
        steps: [{ id: 's1', type: 'text', message: 'Hi' }],
      }),
    ).toThrow();
  });

  it('parses config with extends field', () => {
    const config = parseWizardConfig({
      meta: { name: 'Child' },
      extends: './base.yaml',
      steps: [{ id: 's1', type: 'text', message: 'Hi' }],
    });
    expect(config.extends).toBe('./base.yaml');
  });

  it('parses config with checks array', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      checks: [
        { name: 'node', run: 'node --version', message: 'Node required' },
      ],
      steps: [{ id: 's1', type: 'text', message: 'Hi' }],
    });
    expect(config.checks).toHaveLength(1);
  });

  it('parses config with full theme (tokens + icons)', () => {
    const config = parseWizardConfig({
      meta: { name: 'Themed' },
      theme: {
        tokens: {
          primary: '#FF0000',
          success: '#00FF00',
          error: '#FF0000',
          warning: '#FFFF00',
          info: '#0000FF',
          muted: '#888888',
          accent: '#FF00FF',
        },
        icons: {
          step: '◆',
          stepDone: '✓',
          stepPending: '○',
          pointer: '▶',
        },
      },
      steps: [{ id: 's1', type: 'text', message: 'Hi' }],
    });
    expect(config.theme?.tokens?.primary).toBe('#FF0000');
    expect(config.theme?.icons?.pointer).toBe('▶');
  });

  it('parses valid config with select step using optionsFrom', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [
        {
          id: 's1', type: 'select', message: 'Pick one',
          optionsFrom: './options.json',
        },
      ],
    });
    expect(config.steps).toHaveLength(1);
  });

  it('parses valid config with multiselect step using optionsFrom', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [
        {
          id: 's1', type: 'multiselect', message: 'Pick many',
          optionsFrom: './options.yaml',
        },
      ],
    });
    expect(config.steps).toHaveLength(1);
  });

  it('throws when step has both options and optionsFrom', () => {
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
    ).toThrow(/both/);
  });

  it('throws when select step has neither options nor optionsFrom', () => {
    expect(() =>
      parseWizardConfig({
        meta: { name: 'Test' },
        steps: [
          { id: 's1', type: 'select', message: 'Pick' },
        ],
      }),
    ).toThrow(/must have either/);
  });
});
