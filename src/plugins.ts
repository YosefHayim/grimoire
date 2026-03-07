import type { WizardState, ResolvedTheme } from './types';

// ─── Plugin Interfaces ──────────────────────────────────────────────────────

export interface StepPlugin {
  render(config: Record<string, unknown>, state: WizardState, theme: ResolvedTheme): Promise<unknown>;
  validate?(value: unknown, config: Record<string, unknown>): string | null;
}

export interface GrimoirePlugin {
  name: string;
  steps: Record<string, StepPlugin>;
}

// ─── Built-in Step Types (protected from override) ──────────────────────────

const BUILT_IN_STEP_TYPES = new Set([
  'text',
  'select',
  'multiselect',
  'confirm',
  'password',
  'number',
  'search',
  'editor',
  'path',
  'toggle',
]);

// ─── Plugin Registry ────────────────────────────────────────────────────────

const pluginStepRegistry = new Map<string, StepPlugin>();

export function registerPlugin(plugin: GrimoirePlugin): void {
  for (const [stepType, stepPlugin] of Object.entries(plugin.steps)) {
    if (BUILT_IN_STEP_TYPES.has(stepType)) {
      throw new Error(`Cannot override built-in step type "${stepType}"`);
    }
    if (pluginStepRegistry.has(stepType)) {
      throw new Error(`Step type "${stepType}" is already registered`);
    }
    pluginStepRegistry.set(stepType, stepPlugin);
  }
}

export function getPluginStep(stepType: string): StepPlugin | undefined {
  return pluginStepRegistry.get(stepType);
}

export function clearPlugins(): void {
  pluginStepRegistry.clear();
}
