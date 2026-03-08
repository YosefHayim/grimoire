import { execSync } from 'node:child_process';
import { createWizardState, getVisibleSteps, wizardReducer } from './engine';
import { resolveTheme } from './theme';
import { InquirerRenderer } from './renderers/inquirer';
import { resolveEnvDefault, resolveEnvDefaultBoolean, resolveEnvDefaultNumber } from './resolve';
import { resolveTemplate } from './template';
import { renderBanner } from './banner';
import { registerPlugin, getPluginStep, clearPlugins } from './plugins';
import type { GrimoirePlugin } from './plugins';
import { evaluateCondition } from './conditions';
import { loadCachedAnswers, saveCachedAnswers } from './cache';
import { recordSelection, getOrderedOptions } from './mru';
import type { ActionConfig, PreFlightCheck, SelectChoice, StepConfig, WizardConfig, WizardRenderer, WizardState, ResolvedTheme } from './types';

export interface RunWizardOptions {
  renderer?: WizardRenderer;
  quiet?: boolean;
  plain?: boolean;
  mockAnswers?: Record<string, unknown>;
  templateAnswers?: Record<string, unknown>;
  onBeforeStep?: (stepId: string, step: StepConfig, state: WizardState) => Promise<void> | void;
  onAfterStep?: (stepId: string, value: unknown, state: WizardState) => Promise<void> | void;
  onStepComplete?: (stepId: string, value: unknown, state: WizardState) => void;
  onCancel?: (state: WizardState) => void;
  plugins?: GrimoirePlugin[];
  asyncValidate?: (stepId: string, value: unknown, answers: Record<string, unknown>) => Promise<string | null>;
  cache?: boolean | { dir?: string };
  mru?: boolean;
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

  if (step.type === 'message') {
    return true;
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
    case 'message':
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
  const cacheEnabled = !isMock && options?.cache !== false;
  const cacheDir = typeof options?.cache === 'object' ? options.cache.dir : undefined;
  const mruEnabled = !isMock && options?.mru !== false;
  let state = createWizardState(config);

  const cachedAnswers = cacheEnabled
    ? loadCachedAnswers(config.meta.name, cacheDir)
    : undefined;

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
      printWizardHeader(config, theme, options?.plain);
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
          const resolvedGroup = resolveTemplate(currentStep.group, state.answers);
          renderer.renderGroupHeader(resolvedGroup, theme);
        }
        previousGroup = currentStep.group;

        const stepIndex = visibleSteps.findIndex((s) => s.id === state.currentStepId);
        const resolvedMessage = resolveTemplate(currentStep.message, state.answers);
        const resolvedDescription = currentStep.description ? resolveTemplate(currentStep.description, state.answers) : undefined;
        renderer.renderStepHeader(stepIndex, visibleSteps.length, resolvedMessage, theme, resolvedDescription);
      }

      if (options?.onBeforeStep) {
        await options.onBeforeStep(currentStep.id, currentStep, state);
      }

      const pluginStep = getPluginStep(currentStep.type);
      const resolvedStep = pluginStep ? currentStep : resolveStepDefaults(currentStep, cachedAnswers);
      const withTemplate = options?.templateAnswers
        ? applyTemplateDefaults(resolvedStep, options.templateAnswers)
        : resolvedStep;
      const templatedStep = resolveStepTemplates(withTemplate, state.answers);
      const mruStep = mruEnabled ? applyMruOrdering(templatedStep, config.meta.name) : templatedStep;

      try {
        const value = isMock
          ? getMockValue(mruStep, mockAnswers)
          : pluginStep
            ? await pluginStep.render(toStepRecord(mruStep), state, theme)
            : await renderStep(renderer, mruStep, state, theme);

        if (pluginStep?.validate) {
          const pluginError = pluginStep.validate(value, toStepRecord(templatedStep));
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
          const errorMsg = resolveTemplate(nextState.errors[currentStep.id] ?? '', state.answers);
          if (isMock) {
            throw new Error(
              `Mock mode: validation failed for step "${currentStep.id}": ${errorMsg}`,
            );
          }
          console.log(theme.error(`\n  ${errorMsg}\n`));
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

        if (options?.onAfterStep) {
          await options.onAfterStep(currentStep.id, value, nextState);
        }

        state = nextState;

        if (mruEnabled && isSelectLikeStep(currentStep.type)) {
          recordSelection(config.meta.name, currentStep.id, value as string | string[]);
        }

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

    if (state.status === 'done' && cacheEnabled) {
      const passwordStepIds = new Set(
        config.steps.filter((s) => s.type === 'password').map((s) => s.id),
      );
      const answersToCache: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(state.answers)) {
        if (!passwordStepIds.has(key)) {
          answersToCache[key] = value;
        }
      }
      saveCachedAnswers(config.meta.name, answersToCache, cacheDir);
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
    case 'message':
      renderer.renderMessage(step, state, theme);
      return Promise.resolve(true);
  }
}

function resolveStepDefaults(
  step: StepConfig,
  cachedAnswers?: Record<string, unknown>,
): StepConfig {
  switch (step.type) {
    case 'text': {
      const envResolved = resolveEnvDefault(step.default);
      const fallback = envResolved ?? getCachedDefault<string>(step.id, cachedAnswers);
      return { ...step, default: fallback };
    }
    case 'search': {
      const envResolved = resolveEnvDefault(step.default);
      const fallback = envResolved ?? getCachedDefault<string>(step.id, cachedAnswers);
      return { ...step, default: fallback };
    }
    case 'editor': {
      const envResolved = resolveEnvDefault(step.default);
      const fallback = envResolved ?? getCachedDefault<string>(step.id, cachedAnswers);
      return { ...step, default: fallback };
    }
    case 'path': {
      const envResolved = resolveEnvDefault(step.default);
      const fallback = envResolved ?? getCachedDefault<string>(step.id, cachedAnswers);
      return { ...step, default: fallback };
    }
    case 'select': {
      const envResolved = resolveEnvDefault(step.default);
      const fallback = envResolved ?? getCachedDefault<string>(step.id, cachedAnswers);
      return { ...step, default: fallback };
    }
    case 'number': {
      const resolved = resolveEnvDefaultNumber(step.default);
      const fallback = resolved ?? getCachedDefault<number>(step.id, cachedAnswers);
      return { ...step, default: fallback };
    }
    case 'confirm': {
      const resolved = resolveEnvDefaultBoolean(step.default);
      const fallback = resolved ?? getCachedDefault<boolean>(step.id, cachedAnswers);
      return { ...step, default: fallback };
    }
    case 'toggle': {
      const resolved = resolveEnvDefaultBoolean(step.default);
      const fallback = resolved ?? getCachedDefault<boolean>(step.id, cachedAnswers);
      return { ...step, default: fallback };
    }
    case 'multiselect': {
      const fallback = step.default ?? getCachedDefault<string[]>(step.id, cachedAnswers);
      return { ...step, default: fallback };
    }
    case 'password':
    case 'message':
      return step;
  }
}

function getCachedDefault<T>(
  stepId: string,
  cachedAnswers?: Record<string, unknown>,
): T | undefined {
  if (!cachedAnswers || !(stepId in cachedAnswers)) return undefined;
  return cachedAnswers[stepId] as T;
}

function applyTemplateDefaults(step: StepConfig, templateAnswers: Record<string, unknown>): StepConfig {
  if (!(step.id in templateAnswers)) return step;
  if (step.type === 'password' || step.type === 'message') return step;

  const value = templateAnswers[step.id];

  switch (step.type) {
    case 'text':
    case 'select':
    case 'search':
    case 'editor':
    case 'path':
      return { ...step, default: typeof value === 'string' ? value : step.default };
    case 'number':
      return { ...step, default: typeof value === 'number' ? value : step.default };
    case 'confirm':
    case 'toggle':
      return { ...step, default: typeof value === 'boolean' ? value : step.default };
    case 'multiselect':
      return { ...step, default: Array.isArray(value) ? (value as string[]) : step.default };
  }
}

function isSelectLikeStep(type: string): boolean {
  return type === 'select' || type === 'multiselect' || type === 'search';
}

function applyMruOrdering(step: StepConfig, wizardName: string): StepConfig {
  if (step.type === 'select') {
    return { ...step, options: getOrderedOptions(wizardName, step.id, step.options) };
  }
  if (step.type === 'multiselect') {
    return { ...step, options: getOrderedOptions(wizardName, step.id, step.options) };
  }
  if (step.type === 'search') {
    return { ...step, options: getOrderedOptions(wizardName, step.id, step.options) };
  }
  return step;
}

function resolveChoiceTemplates(
  options: SelectChoice[],
  answers: Record<string, unknown>,
): SelectChoice[] {
  return options.map((opt) => {
    if ('separator' in opt) return opt;
    return {
      ...opt,
      label: resolveTemplate(opt.label, answers),
      hint: opt.hint ? resolveTemplate(opt.hint, answers) : undefined,
    };
  });
}

function resolveStepTemplates(step: StepConfig, answers: Record<string, unknown>): StepConfig {
  switch (step.type) {
    case 'text':
      return {
        ...step,
        placeholder: step.placeholder ? resolveTemplate(step.placeholder, answers) : undefined,
        default: step.default ? resolveTemplate(step.default, answers) : undefined,
        description: step.description ? resolveTemplate(step.description, answers) : undefined,
      };
    case 'select':
      return {
        ...step,
        options: resolveChoiceTemplates(step.options, answers),
        description: step.description ? resolveTemplate(step.description, answers) : undefined,
      };
    case 'multiselect':
      return {
        ...step,
        options: resolveChoiceTemplates(step.options, answers),
        description: step.description ? resolveTemplate(step.description, answers) : undefined,
      };
    case 'search':
      return {
        ...step,
        placeholder: step.placeholder ? resolveTemplate(step.placeholder, answers) : undefined,
        options: resolveChoiceTemplates(step.options, answers),
        description: step.description ? resolveTemplate(step.description, answers) : undefined,
      };
    case 'path':
      return {
        ...step,
        placeholder: step.placeholder ? resolveTemplate(step.placeholder, answers) : undefined,
        default: step.default ? resolveTemplate(step.default, answers) : undefined,
        description: step.description ? resolveTemplate(step.description, answers) : undefined,
      };
    case 'editor':
      return {
        ...step,
        default: step.default ? resolveTemplate(step.default, answers) : undefined,
        description: step.description ? resolveTemplate(step.description, answers) : undefined,
      };
    case 'password':
    case 'number':
    case 'confirm':
    case 'toggle':
    case 'message':
      return {
        ...step,
        description: step.description ? resolveTemplate(step.description, answers) : undefined,
      };
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
    const resolvedName = action.name ? resolveTemplate(action.name, answers) : undefined;
    const label = resolvedName ?? resolvedCommand;

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

function printWizardHeader(config: WizardConfig, theme: ResolvedTheme, plain?: boolean): void {
  console.log();
  console.log(renderBanner(config.meta.name, theme, { plain }));
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
