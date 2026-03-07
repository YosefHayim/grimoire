import { createWizardState, getVisibleSteps, wizardReducer } from './engine';
import { resolveTheme } from './theme';
import { InquirerRenderer } from './renderers/inquirer';
import type { StepConfig, WizardConfig, WizardRenderer, WizardState, ResolvedTheme } from './types';

export interface RunWizardOptions {
  renderer?: WizardRenderer;
  quiet?: boolean;
  onStepComplete?: (stepId: string, value: unknown, state: WizardState) => void;
  onCancel?: (state: WizardState) => void;
}

export async function runWizard(
  config: WizardConfig,
  options?: RunWizardOptions,
): Promise<Record<string, unknown>> {
  const renderer = options?.renderer ?? new InquirerRenderer();
  const theme = resolveTheme(config.theme);
  const quiet = options?.quiet ?? false;
  let state = createWizardState(config);

  if (!quiet) {
    printWizardHeader(config, theme);
  }

  while (state.status === 'running') {
    const visibleSteps = getVisibleSteps(config, state.answers);
    const currentStep = config.steps.find((s) => s.id === state.currentStepId);

    if (!currentStep) {
      throw new Error(`Current step not found: "${state.currentStepId}"`);
    }

    const stepIndex = visibleSteps.findIndex((s) => s.id === state.currentStepId);
    renderer.renderStepHeader(stepIndex, visibleSteps.length, currentStep.message, theme);

    try {
      const value = await renderStep(renderer, currentStep, state, theme);
      const nextState = wizardReducer(state, { type: 'NEXT', value }, config);

      if (nextState.errors[currentStep.id]) {
        console.log(theme.error(`\n  ${nextState.errors[currentStep.id]}\n`));
        state = { ...nextState, errors: {} };
        continue;
      }

      state = nextState;
      options?.onStepComplete?.(currentStep.id, value, state);
    } catch (error: unknown) {
      if (isUserCancel(error)) {
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

  return state.answers;
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
  }
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
