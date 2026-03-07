import { execSync } from 'node:child_process';
import { createWizardState, getVisibleSteps, wizardReducer } from './engine';
import { resolveTheme } from './theme';
import { InquirerRenderer } from './renderers/inquirer';
import { resolveEnvDefault, resolveEnvDefaultBoolean, resolveEnvDefaultNumber } from './resolve';
import { resolveTemplate } from './template';
import { registerPlugin, getPluginStep, clearPlugins } from './plugins';
import type { GrimoirePlugin } from './plugins';
import { evaluateCondition } from './conditions';
import type { ActionConfig, PreFlightCheck, StepConfig, WizardConfig, WizardRenderer, WizardState, ResolvedTheme } from './types';

export interface RunWizardOptions {
  renderer?: WizardRenderer;
  quiet?: boolean;
  mockAnswers?: Record<string, unknown>;
  onStepComplete?: (stepId: string, value: unknown, state: WizardState) => void;
  onCancel?: (state: WizardState) => void;
  plugins?: GrimoirePlugin[];
  asyncValidate?: (stepId: string, value: unknown, answers: Record<string, unknown>) => Promise<string | null>;
}

export function runPreFlightChecks(
  checks: PreFlightCheck[],
  theme: ResolvedTheme,
): void {
  for (const check of checks) {
    try {
      execSync(check.run, { stdio: 'pipe' });
      console.log(`  ${theme.success('✓')} ${check.name}`);
    } catch {
      console.log(`  ${theme.error('✗')} ${check.name}: ${check.message}`);
      throw new Error(`Pre-flight check failed: ${check.name} — ${check.message}`);
    }
  }
  console.log();
}

function getMockValue(
  step: StepConfig,
  mockAnswers: Record<string, unknown>,
): unknown {
  if (step.id in mockAnswers) {
    return mockAnswers[step.id];
  }

  const defaultValue = getStepDefault(step);
  if (defaultValue !== undefined) {
    return defaultValue;
  }

  throw new Error(
    `Mock mode: no answer provided for step "${step.id}" and no default available`,
  );
}

function getStepDefault(step: StepConfig): unknown {
  switch (step.type) {
    case 'text':
    case 'select':
    case 'search':
    case 'editor':
    case 'path':
      return step.default;
    case 'number':
      return step.default;
    case 'confirm':
    case 'toggle':
      return step.default;
    case 'multiselect':
      return step.default;
    case 'password':
      return undefined;
  }
}

export async function runWizard(
  config: WizardConfig,
  options?: RunWizardOptions,
): Promise<Record<string, unknown>> {
  const renderer = options?.renderer ?? new InquirerRenderer();
  const theme = resolveTheme(config.theme);
  const mockAnswers = options?.mockAnswers;
  const isMock = mockAnswers !== undefined;
  const quiet = options?.quiet ?? isMock;
  let state = createWizardState(config);

  const userPlugins = options?.plugins;
  if (userPlugins) {
    for (const plugin of userPlugins) {
      registerPlugin(plugin);
    }
  }

  try {
    if (!isMock && config.checks && config.checks.length > 0) {
      runPreFlightChecks(config.checks, theme);
    }

    if (!quiet) {
      printWizardHeader(config, theme);
    }

    let previousGroup: string | undefined;

    while (state.status === 'running') {
      const visibleSteps = getVisibleSteps(config, state.answers);
      const currentStep = config.steps.find((s) => s.id === state.currentStepId);

      if (!currentStep) {
        throw new Error(`Current step not found: "${state.currentStepId}"`);
      }

      if (!isMock) {
        if (currentStep.group !== undefined && currentStep.group !== previousGroup) {
          renderer.renderGroupHeader(currentStep.group, theme);
        }
        previousGroup = currentStep.group;

        const stepIndex = visibleSteps.findIndex((s) => s.id === state.currentStepId);
        const resolvedMessage = resolveTemplate(currentStep.message, state.answers);
        renderer.renderStepHeader(stepIndex, visibleSteps.length, resolvedMessage, theme);
      }

      const pluginStep = getPluginStep(currentStep.type);
      const resolvedStep = pluginStep ? currentStep : resolveStepDefaults(currentStep);

      try {
        const value = isMock
          ? getMockValue(resolvedStep, mockAnswers)
          : pluginStep
            ? await pluginStep.render(toStepRecord(resolvedStep), state, theme)
            : await renderStep(renderer, resolvedStep, state, theme);

        if (pluginStep?.validate) {
          const pluginError = pluginStep.validate(value, toStepRecord(resolvedStep));
          if (pluginError) {
            if (isMock) {
              throw new Error(
                `Mock mode: validation failed for step "${currentStep.id}": ${pluginError}`,
              );
            }
            console.log(theme.error(`\n  ${pluginError}\n`));
            continue;
          }
        }

        const nextState = wizardReducer(state, { type: 'NEXT', value }, config);

        if (nextState.errors[currentStep.id]) {
          if (isMock) {
            throw new Error(
              `Mock mode: validation failed for step "${currentStep.id}": ${nextState.errors[currentStep.id] ?? 'unknown error'}`,
            );
          }
          console.log(theme.error(`\n  ${nextState.errors[currentStep.id]}\n`));
          state = { ...nextState, errors: {} };
          continue;
        }

        if (!isMock && options?.asyncValidate) {
          const asyncError = await options.asyncValidate(currentStep.id, value, nextState.answers);
          if (asyncError !== null) {
            console.log(theme.error(`\n  ${asyncError}\n`));
            state = { ...nextState, errors: {} };
            continue;
          }
        }

        state = nextState;
        options?.onStepComplete?.(currentStep.id, value, state);
      } catch (error: unknown) {
        if (!isMock && isUserCancel(error)) {
          state = wizardReducer(state, { type: 'CANCEL' }, config);
          options?.onCancel?.(state);
          if (!quiet) {
            console.log(theme.warning('\n  Wizard cancelled.\n'));
          }
          return state.answers;
        }
        throw error;
      }
    }

    if (state.status === 'done' && !quiet) {
      renderer.renderSummary(state.answers, config.steps, theme);
    }

    if (state.status === 'done' && config.actions && config.actions.length > 0 && !isMock) {
      await executeActions(config.actions, state.answers, theme);
    }

    return state.answers;
  } finally {
    if (userPlugins) {
      clearPlugins();
    }
  }
}

function toStepRecord(step: StepConfig): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(step)) {
    record[key] = val;
  }
  return record;
}

function renderStep(
  renderer: WizardRenderer,
  step: StepConfig,
  state: WizardState,
  theme: ResolvedTheme,
): Promise<unknown> {
  switch (step.type) {
    case 'text':
      return renderer.renderText(step, state, theme);
    case 'select':
      return renderer.renderSelect(step, state, theme);
    case 'multiselect':
      return renderer.renderMultiSelect(step, state, theme);
    case 'confirm':
      return renderer.renderConfirm(step, state, theme);
    case 'password':
      return renderer.renderPassword(step, state, theme);
    case 'number':
      return renderer.renderNumber(step, state, theme);
    case 'search':
      return renderer.renderSearch(step, state, theme);
    case 'editor':
      return renderer.renderEditor(step, state, theme);
    case 'path':
      return renderer.renderPath(step, state, theme);
    case 'toggle':
      return renderer.renderToggle(step, state, theme);
  }
}

function resolveStepDefaults(step: StepConfig): StepConfig {
  switch (step.type) {
    case 'text':
      return { ...step, default: resolveEnvDefault(step.default) };
    case 'search':
      return { ...step, default: resolveEnvDefault(step.default) };
    case 'editor':
      return { ...step, default: resolveEnvDefault(step.default) };
    case 'path':
      return { ...step, default: resolveEnvDefault(step.default) };
    case 'select':
      return { ...step, default: resolveEnvDefault(step.default) };
    case 'number': {
      const resolved = resolveEnvDefaultNumber(step.default);
      return { ...step, default: resolved };
    }
    case 'confirm': {
      const resolved = resolveEnvDefaultBoolean(step.default);
      return { ...step, default: resolved };
    }
    case 'toggle': {
      const resolved = resolveEnvDefaultBoolean(step.default);
      return { ...step, default: resolved };
    }
    case 'multiselect':
    case 'password':
      return step;
  }
}

async function executeActions(
  actions: ActionConfig[],
  answers: Record<string, unknown>,
  theme: ResolvedTheme,
): Promise<void> {
  console.log(`\n  ${theme.bold('Running actions...')}\n`);

  for (const action of actions) {
    if (action.when && !evaluateCondition(action.when, answers)) {
      continue;
    }

    const resolvedCommand = resolveTemplate(action.run, answers);
    const label = action.name ?? resolvedCommand;

    try {
      execSync(resolvedCommand, { stdio: 'pipe' });
      console.log(`  ${theme.success('✓')} ${label}`);
    } catch {
      console.log(`  ${theme.error('✗')} ${label}`);
      throw new Error(`Action failed: ${label}`);
    }
  }
  console.log();
}

function printWizardHeader(config: WizardConfig, theme: ResolvedTheme): void {
  console.log();
  console.log(`  ${theme.bold(config.meta.name)}`);
  if (config.meta.description) {
    console.log(`  ${theme.muted(config.meta.description)}`);
  }
  console.log();
}

function isUserCancel(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('User force closed') ||
      error.name === 'ExitPromptError'
    );
  }
  return false;
}
