import { describe, it, expect, afterEach } from 'vitest';
import {
  registerPlugin,
  getPluginStep,
  clearPlugins,
} from '../plugins';
import type { GrimoirePlugin, StepPlugin } from '../plugins';

const mockStepPlugin: StepPlugin = {
  async render() {
    return 'mock-value';
  },
};

afterEach(() => {
  clearPlugins();
});

describe('registerPlugin', () => {
  it('registers a plugin step type', () => {
    const plugin: GrimoirePlugin = {
      name: 'test-plugin',
      steps: { customType: mockStepPlugin },
    };
    registerPlugin(plugin);
    expect(getPluginStep('customType')).toBe(mockStepPlugin);
  });

  it('throws on built-in type override', () => {
    const builtIns = ['text', 'select', 'multiselect', 'confirm', 'password',
      'number', 'search', 'editor', 'path', 'toggle'];

    for (const typeName of builtIns) {
      const plugin: GrimoirePlugin = {
        name: `bad-plugin-${typeName}`,
        steps: { [typeName]: mockStepPlugin },
      };
      expect(() => registerPlugin(plugin)).toThrow(`Cannot override built-in step type "${typeName}"`);
    }
  });

  it('throws on duplicate registration', () => {
    const plugin1: GrimoirePlugin = {
      name: 'plugin-1',
      steps: { myStep: mockStepPlugin },
    };
    const plugin2: GrimoirePlugin = {
      name: 'plugin-2',
      steps: { myStep: mockStepPlugin },
    };
    registerPlugin(plugin1);
    expect(() => registerPlugin(plugin2)).toThrow('already registered');
  });
});

describe('getPluginStep', () => {
  it('returns registered plugin step', () => {
    const plugin: GrimoirePlugin = {
      name: 'test',
      steps: { custom: mockStepPlugin },
    };
    registerPlugin(plugin);
    expect(getPluginStep('custom')).toBe(mockStepPlugin);
  });

  it('returns undefined for unregistered type', () => {
    expect(getPluginStep('nonexistent')).toBeUndefined();
  });
});

describe('clearPlugins', () => {
  it('removes all registered plugins', () => {
    const plugin: GrimoirePlugin = {
      name: 'test',
      steps: { custom: mockStepPlugin },
    };
    registerPlugin(plugin);
    expect(getPluginStep('custom')).toBe(mockStepPlugin);

    clearPlugins();
    expect(getPluginStep('custom')).toBeUndefined();
  });
});
