import { describe, it, expect } from 'vitest';
import {
  createWizardState,
  validateStepAnswer,
  resolveNextStep,
  wizardReducer,
  getVisibleSteps,
} from '../engine';
import type {
  StepConfig,
  WizardConfig,
  WizardState,
  TextStepConfig,
  SelectStepConfig,
  NumberStepConfig,
  MultiSelectStepConfig,
  EditorStepConfig,
  PathStepConfig,
} from '../types';

function makeConfig(steps: StepConfig[]): WizardConfig {
  return { meta: { name: 'Test' }, steps };
}

const textStep: TextStepConfig = {
  id: 'name',
  type: 'text',
  message: 'Enter name',
};

const selectStep: SelectStepConfig = {
  id: 'lang',
  type: 'select',
  message: 'Pick language',
  options: [
    { value: 'ts', label: 'TypeScript' },
    { value: 'js', label: 'JavaScript' },
  ],
};

describe('createWizardState', () => {
  it('returns first step as current with empty answers/history and running status', () => {
    const config = makeConfig([textStep, selectStep]);
    const state = createWizardState(config);

    expect(state.currentStepId).toBe('name');
    expect(state.answers).toEqual({});
    expect(state.history).toEqual([]);
    expect(state.status).toBe('running');
    expect(state.errors).toEqual({});
  });

  it('throws if no visible steps', () => {
    const invisibleStep: TextStepConfig = {
      ...textStep,
      when: { field: 'nonexistent', equals: 'impossible' },
    };
    const config = makeConfig([invisibleStep]);
    expect(() => createWizardState(config)).toThrow('No visible steps');
  });
});

describe('validateStepAnswer', () => {
  it('returns error when required field is empty', () => {
    expect(validateStepAnswer(textStep, '')).toBe('This field is required');
  });

  it('returns null when required field is filled', () => {
    expect(validateStepAnswer(textStep, 'Alice')).toBeNull();
  });

  it('returns null when optional field is empty', () => {
    const optionalStep: TextStepConfig = { ...textStep, required: false };
    expect(validateStepAnswer(optionalStep, '')).toBeNull();
  });

  it('returns error for required empty array', () => {
    const msStep: MultiSelectStepConfig = {
      id: 'tags',
      type: 'multiselect',
      message: 'Pick tags',
      options: [{ value: 'a', label: 'A' }],
    };
    expect(validateStepAnswer(msStep, [])).toBe('This field is required');
  });

  describe('text validation rules', () => {
    it('returns error for minLength violation', () => {
      const step: TextStepConfig = {
        ...textStep,
        validate: [{ rule: 'minLength', value: 5 }],
      };
      expect(validateStepAnswer(step, 'ab')).toBe('Must be at least 5 characters');
    });

    it('returns error for maxLength violation', () => {
      const step: TextStepConfig = {
        ...textStep,
        validate: [{ rule: 'maxLength', value: 3 }],
      };
      expect(validateStepAnswer(step, 'abcde')).toBe('Must be at most 3 characters');
    });

    it('returns error for pattern violation', () => {
      const step: TextStepConfig = {
        ...textStep,
        validate: [{ rule: 'pattern', value: '^[a-z]+$' }],
      };
      expect(validateStepAnswer(step, 'ABC')).toBe('Must match pattern: ^[a-z]+$');
    });

    it('returns null when all rules pass', () => {
      const step: TextStepConfig = {
        ...textStep,
        validate: [
          { rule: 'minLength', value: 2 },
          { rule: 'maxLength', value: 10 },
        ],
      };
      expect(validateStepAnswer(step, 'hello')).toBeNull();
    });
  });

  describe('number validation', () => {
    const numStep: NumberStepConfig = {
      id: 'count',
      type: 'number',
      message: 'Enter count',
      min: 1,
      max: 100,
    };

    it('returns error when below min', () => {
      expect(validateStepAnswer(numStep, 0)).toBe('Must be at least 1');
    });

    it('returns error when above max', () => {
      expect(validateStepAnswer(numStep, 101)).toBe('Must be at most 100');
    });

    it('returns null when within range', () => {
      expect(validateStepAnswer(numStep, 50)).toBeNull();
    });
  });

  describe('multiselect validation', () => {
    const msStep: MultiSelectStepConfig = {
      id: 'features',
      type: 'multiselect',
      message: 'Pick features',
      options: [
        { value: 'a', label: 'A' },
        { value: 'b', label: 'B' },
        { value: 'c', label: 'C' },
      ],
      min: 1,
      max: 2,
      required: false,
    };

    it('returns error when below min', () => {
      expect(validateStepAnswer(msStep, [])).toBe('Select at least 1 option');
    });

    it('returns error when above max', () => {
      expect(validateStepAnswer(msStep, ['a', 'b', 'c'])).toBe('Select at most 2 options');
    });

    it('returns null when within range', () => {
      expect(validateStepAnswer(msStep, ['a'])).toBeNull();
    });
  });

  describe('editor and path types with validation rules', () => {
    it('validates editor step with minLength', () => {
      const editorStep: EditorStepConfig = {
        id: 'bio',
        type: 'editor',
        message: 'Write bio',
        validate: [{ rule: 'minLength', value: 10 }],
      };
      expect(validateStepAnswer(editorStep, 'short')).toBe('Must be at least 10 characters');
    });

    it('validates path step with pattern', () => {
      const pathStep: PathStepConfig = {
        id: 'dir',
        type: 'path',
        message: 'Enter path',
        validate: [{ rule: 'pattern', value: '^\\/.*' }],
      };
      expect(validateStepAnswer(pathStep, '/home/user')).toBeNull();
    });
  });
});

describe('resolveNextStep', () => {
  it('follows explicit next', () => {
    const step1: TextStepConfig = { ...textStep, next: 'lang' };
    const config = makeConfig([step1, selectStep]);
    expect(resolveNextStep(config, step1, 'Alice', { name: 'Alice' })).toBe('lang');
  });

  it('follows route on select', () => {
    const routedSelect: SelectStepConfig = {
      ...selectStep,
      routes: { ts: 'name' },
    };
    const config = makeConfig([routedSelect, textStep]);
    expect(resolveNextStep(config, routedSelect, 'ts', {})).toBe('name');
  });

  it('falls through to next in array when no next specified', () => {
    const config = makeConfig([textStep, selectStep]);
    expect(resolveNextStep(config, textStep, 'Alice', {})).toBe('lang');
  });

  it('returns __done__ when next is __done__', () => {
    const doneStep: TextStepConfig = { ...textStep, next: '__done__' };
    const config = makeConfig([doneStep, selectStep]);
    expect(resolveNextStep(config, doneStep, 'val', {})).toBe('__done__');
  });

  it('returns __done__ for route with __done__', () => {
    const routedSelect: SelectStepConfig = {
      ...selectStep,
      routes: { ts: '__done__' },
    };
    const config = makeConfig([routedSelect, textStep]);
    expect(resolveNextStep(config, routedSelect, 'ts', {})).toBe('__done__');
  });

  it('skips invisible steps', () => {
    const hidden: TextStepConfig = {
      id: 'hidden',
      type: 'text',
      message: 'Hidden',
      when: { field: 'lang', equals: 'rust' },
    };
    const final: TextStepConfig = {
      id: 'final',
      type: 'text',
      message: 'Final',
    };
    const config = makeConfig([textStep, hidden, final]);
    expect(resolveNextStep(config, textStep, 'Alice', { lang: 'ts' })).toBe('final');
  });

  it('returns __done__ when last step has no next', () => {
    const config = makeConfig([textStep]);
    expect(resolveNextStep(config, textStep, 'Alice', {})).toBe('__done__');
  });
});

describe('wizardReducer', () => {
  function makeState(overrides: Partial<WizardState> = {}): WizardState {
    return {
      currentStepId: 'name',
      answers: {},
      history: [],
      status: 'running',
      errors: {},
      ...overrides,
    };
  }

  describe('NEXT', () => {
    it('advances to next step, stores answer, adds to history', () => {
      const config = makeConfig([textStep, selectStep]);
      const state = makeState();
      const next = wizardReducer(state, { type: 'NEXT', value: 'Alice' }, config);

      expect(next.currentStepId).toBe('lang');
      expect(next.answers['name']).toBe('Alice');
      expect(next.history).toEqual(['name']);
      expect(next.status).toBe('running');
    });

    it('returns errors when validation fails and does not advance', () => {
      const config = makeConfig([textStep, selectStep]);
      const state = makeState();
      const next = wizardReducer(state, { type: 'NEXT', value: '' }, config);

      expect(next.currentStepId).toBe('name');
      expect(next.errors['name']).toBe('This field is required');
      expect(next.history).toEqual([]);
    });

    it('sets status to done on last step', () => {
      const config = makeConfig([textStep]);
      const state = makeState();
      const next = wizardReducer(state, { type: 'NEXT', value: 'Alice' }, config);

      expect(next.status).toBe('done');
      expect(next.answers['name']).toBe('Alice');
    });
  });

  describe('BACK', () => {
    it('goes to previous step from history', () => {
      const config = makeConfig([textStep, selectStep]);
      const state = makeState({
        currentStepId: 'lang',
        history: ['name'],
        answers: { name: 'Alice' },
      });
      const prev = wizardReducer(state, { type: 'BACK' }, config);

      expect(prev.currentStepId).toBe('name');
      expect(prev.history).toEqual([]);
    });

    it('returns same state when history is empty', () => {
      const config = makeConfig([textStep]);
      const state = makeState();
      const prev = wizardReducer(state, { type: 'BACK' }, config);

      expect(prev).toBe(state);
    });

    it('deletes answer when keepValuesOnPrevious is false', () => {
      const noKeep: TextStepConfig = {
        id: 'step2',
        type: 'text',
        message: 'Step 2',
        keepValuesOnPrevious: false,
      };
      const config = makeConfig([textStep, noKeep]);
      const state = makeState({
        currentStepId: 'step2',
        history: ['name'],
        answers: { name: 'Alice', step2: 'val' },
      });
      const prev = wizardReducer(state, { type: 'BACK' }, config);

      expect(prev.answers['step2']).toBeUndefined();
      expect(prev.answers['name']).toBe('Alice');
    });
  });

  describe('JUMP', () => {
    it('goes to specified step', () => {
      const config = makeConfig([textStep, selectStep]);
      const state = makeState();
      const jumped = wizardReducer(state, { type: 'JUMP', stepId: 'lang' }, config);

      expect(jumped.currentStepId).toBe('lang');
      expect(jumped.history).toEqual(['name']);
    });
  });

  describe('CANCEL', () => {
    it('sets status to cancelled', () => {
      const config = makeConfig([textStep]);
      const state = makeState();
      const cancelled = wizardReducer(state, { type: 'CANCEL' }, config);

      expect(cancelled.status).toBe('cancelled');
    });
  });
});

describe('getVisibleSteps', () => {
  it('filters out invisible steps', () => {
    const hidden: TextStepConfig = {
      id: 'hidden',
      type: 'text',
      message: 'Hidden',
      when: { field: 'lang', equals: 'rust' },
    };
    const visible: TextStepConfig = {
      id: 'visible',
      type: 'text',
      message: 'Visible',
    };
    const config = makeConfig([textStep, hidden, visible]);
    const steps = getVisibleSteps(config, { lang: 'ts' });

    expect(steps).toHaveLength(2);
    expect(steps.map(s => s.id)).toEqual(['name', 'visible']);
  });
});
