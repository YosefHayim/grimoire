import { describe, it, expect } from 'vitest';
import { parseWizardYAML } from '../parser';

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
