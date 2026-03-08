import type {
  StepConfig,
  ValidationRule,
  WizardConfig,
  WizardState,
  WizardTransition,
} from './types';
import { isStepVisible } from './conditions';

export function createWizardState(config: WizardConfig): WizardState {
  const firstVisible = config.steps.find((s) => isStepVisible(s, {}));
  if (!firstVisible) {
    throw new Error('No visible steps in wizard configuration');
  }

  return {
    currentStepId: firstVisible.id,
    answers: {},
    history: [],
    status: 'running',
    errors: {},
  };
}

export function validateStepAnswer(
  step: StepConfig,
  value: unknown,
): string | null {
  if (step.type === 'message') {
    return null;
  }

  const isRequired = step.required !== false;

  if (isRequired) {
    if (value === undefined || value === null || value === '') {
      return 'This field is required';
    }
    if (Array.isArray(value) && value.length === 0) {
      return 'This field is required';
    }
  }

  if ((step.type === 'text' || step.type === 'password' || step.type === 'editor' || step.type === 'path') && step.validate) {
    const strValue = typeof value === 'string' ? value : String(value ?? '');
    for (const rule of step.validate) {
      const error = applyValidationRule(rule, strValue);
      if (error) return error;
    }
  }

  if (step.type === 'number' && typeof value === 'number') {
    if (step.min !== undefined && value < step.min) {
      return `Must be at least ${String(step.min)}`;
    }
    if (step.max !== undefined && value > step.max) {
      return `Must be at most ${String(step.max)}`;
    }
  }

  if (step.type === 'multiselect' && Array.isArray(value)) {
    if (step.min !== undefined && value.length < step.min) {
      return `Select at least ${String(step.min)} option${step.min === 1 ? '' : 's'}`;
    }
    if (step.max !== undefined && value.length > step.max) {
      return `Select at most ${String(step.max)} option${step.max === 1 ? '' : 's'}`;
    }
  }

  return null;
}

export function resolveNextStep(
  config: WizardConfig,
  currentStep: StepConfig,
  answer: unknown,
  answers: Record<string, unknown>,
): string {
  let targetId: string | undefined;

  if (currentStep.type === 'select' && currentStep.routes) {
    const route = currentStep.routes[String(answer)];
    if (route === '__done__') return '__done__';
    if (route) targetId = route;
  }

  if (!targetId && currentStep.next) {
    if (currentStep.next === '__done__') return '__done__';
    targetId = currentStep.next;
  }

  if (!targetId) {
    const currentIndex = config.steps.findIndex(s => s.id === currentStep.id);
    const nextInArray = config.steps[currentIndex + 1];
    if (!nextInArray) return '__done__';
    targetId = nextInArray.id;
  }

  const targetIndex = config.steps.findIndex(s => s.id === targetId);
  if (targetIndex < 0) return '__done__';

  for (let i = targetIndex; i < config.steps.length; i++) {
    const step = config.steps[i];
    if (step && isStepVisible(step, answers)) {
      return step.id;
    }
  }

  return '__done__';
}

export function getVisibleSteps(
  config: WizardConfig,
  answers: Record<string, unknown>,
): StepConfig[] {
  return config.steps.filter(s => isStepVisible(s, answers));
}

export function wizardReducer(
  state: WizardState,
  transition: WizardTransition,
  config: WizardConfig,
): WizardState {
  switch (transition.type) {
    case 'NEXT': {
      const currentStep = findStepOrThrow(config, state.currentStepId);

      const validationError = validateStepAnswer(currentStep, transition.value);
      if (validationError) {
        return {
          ...state,
          errors: { ...state.errors, [state.currentStepId]: validationError },
        };
      }

      const updatedAnswers = {
        ...state.answers,
        [state.currentStepId]: transition.value,
      };

      const nextStepId = resolveNextStep(
        config,
        currentStep,
        transition.value,
        updatedAnswers,
      );

      if (nextStepId === '__done__') {
        return {
          ...state,
          answers: updatedAnswers,
          history: [...state.history, state.currentStepId],
          status: 'done',
          errors: {},
        };
      }

      const finalAnswers = cleanOrphanedAnswers(
        config,
        updatedAnswers,
        state.currentStepId,
        nextStepId,
      );

      return {
        ...state,
        currentStepId: nextStepId,
        answers: finalAnswers,
        history: [...state.history, state.currentStepId],
        status: 'running',
        errors: {},
      };
    }

    case 'BACK': {
      if (state.history.length === 0) {
        return state;
      }

      const previousStepId = state.history[state.history.length - 1]!;
      const currentStep = config.steps.find(s => s.id === state.currentStepId);
      const newAnswers = { ...state.answers };

      if (currentStep && currentStep.keepValuesOnPrevious === false) {
        delete newAnswers[currentStep.id];
      }

      return {
        ...state,
        currentStepId: previousStepId,
        answers: newAnswers,
        history: state.history.slice(0, -1),
        status: 'running',
        errors: {},
      };
    }

    case 'JUMP': {
      findStepOrThrow(config, transition.stepId);

      return {
        ...state,
        currentStepId: transition.stepId,
        history: [...state.history, state.currentStepId],
        status: 'running',
        errors: {},
      };
    }

    case 'CANCEL': {
      return { ...state, status: 'cancelled' };
    }
  }
}

function findStepOrThrow(config: WizardConfig, stepId: string): StepConfig {
  const step = config.steps.find(s => s.id === stepId);
  if (!step) {
    throw new Error(`Step not found: "${stepId}"`);
  }
  return step;
}

function cleanOrphanedAnswers(
  config: WizardConfig,
  answers: Record<string, unknown>,
  _fromStepId: string,
  _toStepId: string,
): Record<string, unknown> {
  const cleaned = { ...answers };
  for (const step of config.steps) {
    if (step.id in cleaned && !isStepVisible(step, cleaned)) {
      delete cleaned[step.id];
    }
  }
  return cleaned;
}

function applyValidationRule(rule: ValidationRule, value: string): string | null {
  switch (rule.rule) {
    case 'required':
      return !value.trim() ? (rule.message ?? 'This field is required') : null;
    case 'minLength':
      return value.length < rule.value
        ? (rule.message ?? `Must be at least ${String(rule.value)} characters`)
        : null;
    case 'maxLength':
      return value.length > rule.value
        ? (rule.message ?? `Must be at most ${String(rule.value)} characters`)
        : null;
    case 'pattern': {
      const regex = new RegExp(rule.value);
      return !regex.test(value)
        ? (rule.message ?? `Must match pattern: ${rule.value}`)
        : null;
    }
    case 'min':
    case 'max':
    default:
      return null;
  }
}
