import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { parseWizardYAML, loadWizardConfig } from '../parser';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('parseWizardYAML', () => {
  it('parses valid YAML string and returns WizardConfig', () => {
    const yaml = `
meta:
  name: Test Wizard
steps:
  - id: name
    type: text
    message: Enter name
`;
    const config = parseWizardYAML(yaml);
    expect(config.meta.name).toBe('Test Wizard');
    expect(config.steps).toHaveLength(1);
    expect(config.steps[0]?.id).toBe('name');
  });

  it('throws on invalid YAML', () => {
    const badYaml = `
meta:
  name: Test
steps: not_an_array
`;
    expect(() => parseWizardYAML(badYaml)).toThrow();
  });

  it('detects cycle A→B→C→A and throws', () => {
    const yaml = `
meta:
  name: Cycle Test
steps:
  - id: a
    type: text
    message: A
    next: b
  - id: b
    type: text
    message: B
    next: c
  - id: c
    type: text
    message: C
    next: a
`;
    expect(() => parseWizardYAML(yaml)).toThrow(/Cycle detected/);
  });

  it('throws when extends is present in YAML string mode', () => {
    const yaml = `
meta:
  name: Child
extends: ./base.yaml
steps:
  - id: s1
    type: text
    message: Hi
`;
    expect(() => parseWizardYAML(yaml)).toThrow(/extends.*not supported/);
  });
});

describe('loadWizardConfig — optionsFrom', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = join(tmpdir(), `grimoire-parser-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('resolves optionsFrom from a JSON file', async () => {
    writeFileSync(
      join(tempDir, 'opts.json'),
      JSON.stringify([{ value: 'a', label: 'A' }, { value: 'b', label: 'B' }]),
    );
    writeFileSync(
      join(tempDir, 'json-opts.yaml'),
      'meta:\n  name: JSON Options\nsteps:\n  - id: pick\n    type: select\n    message: Pick one\n    optionsFrom: ./opts.json\n',
    );

    const config = await loadWizardConfig(join(tempDir, 'json-opts.yaml'));
    const step = config.steps[0];
    expect(step?.type).toBe('select');
    if (step?.type === 'select') {
      expect(step.options).toHaveLength(2);
      expect(step.options[0]).toEqual({ value: 'a', label: 'A' });
    }
  });

  it('resolves optionsFrom from a YAML file', async () => {
    writeFileSync(
      join(tempDir, 'opts.yaml'),
      '- value: x\n  label: X\n- value: "y"\n  label: "Y"\n',
    );
    writeFileSync(
      join(tempDir, 'yaml-opts.yaml'),
      'meta:\n  name: YAML Options\nsteps:\n  - id: pick\n    type: select\n    message: Pick one\n    optionsFrom: ./opts.yaml\n',
    );

    const config = await loadWizardConfig(join(tempDir, 'yaml-opts.yaml'));
    const step = config.steps[0];
    expect(step?.type).toBe('select');
    if (step?.type === 'select') {
      expect(step.options).toHaveLength(2);
      expect(step.options[0]).toEqual({ value: 'x', label: 'X' });
    }
  });

  it('throws when optionsFrom points to nonexistent file', async () => {
    writeFileSync(
      join(tempDir, 'missing-opts.yaml'),
      'meta:\n  name: Missing\nsteps:\n  - id: pick\n    type: select\n    message: Pick\n    optionsFrom: ./nonexistent.json\n',
    );

    await expect(loadWizardConfig(join(tempDir, 'missing-opts.yaml'))).rejects.toThrow(
      /failed to read optionsFrom/,
    );
  });
});
