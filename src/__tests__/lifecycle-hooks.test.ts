import { describe, it, expect } from 'vitest';
import { runWizard } from '../runner';
import type { WizardConfig, StepConfig, WizardState } from '../types';

function makeConfig(steps: StepConfig[]): WizardConfig {
  return { meta: { name: 'Hook Test' }, steps };
}

describe('lifecycle hooks', () => {
  describe('onBeforeStep', () => {
    it('is called before each step in mock mode', async () => {
      const calls: Array<{ stepId: string; stateStepId: string }> = [];

      const config = makeConfig([
        { id: 'name', type: 'text', message: 'Name?', default: 'Alice' },
        { id: 'lang', type: 'select', message: 'Lang?', options: [{ value: 'ts', label: 'TS' }], default: 'ts' },
      ]);

      await runWizard(config, {
        mockAnswers: {},
        onBeforeStep: (stepId, _step, state) => {
          calls.push({ stepId, stateStepId: state.currentStepId });
        },
      });

      expect(calls).toHaveLength(2);
      expect(calls[0]?.stepId).toBe('name');
      expect(calls[1]?.stepId).toBe('lang');
    });

    it('receives the correct step config', async () => {
      const receivedSteps: StepConfig[] = [];

      const config = makeConfig([
        { id: 'q1', type: 'confirm', message: 'Sure?', default: true },
      ]);

      await runWizard(config, {
        mockAnswers: {},
        onBeforeStep: (_id, step) => {
          receivedSteps.push(step);
        },
      });

      expect(receivedSteps).toHaveLength(1);
      expect(receivedSteps[0]?.id).toBe('q1');
      expect(receivedSteps[0]?.type).toBe('confirm');
    });

    it('supports async hooks', async () => {
      let hookCalled = false;

      const config = makeConfig([
        { id: 'q', type: 'text', message: 'Q?', default: 'x' },
      ]);

      await runWizard(config, {
        mockAnswers: {},
        onBeforeStep: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          hookCalled = true;
        },
      });

      expect(hookCalled).toBe(true);
    });
  });

  describe('onAfterStep', () => {
    it('is called after validation passes with the step value', async () => {
      const calls: Array<{ stepId: string; value: unknown }> = [];

      const config = makeConfig([
        { id: 'name', type: 'text', message: 'Name?', default: 'Alice' },
        { id: 'ok', type: 'confirm', message: 'OK?', default: true },
      ]);

      await runWizard(config, {
        mockAnswers: {},
        onAfterStep: (stepId, value) => {
          calls.push({ stepId, value });
        },
      });

      expect(calls).toHaveLength(2);
      expect(calls[0]).toEqual({ stepId: 'name', value: 'Alice' });
      expect(calls[1]).toEqual({ stepId: 'ok', value: true });
    });

    it('receives the post-transition state with updated answers', async () => {
      const states: WizardState[] = [];

      const config = makeConfig([
        { id: 'a', type: 'text', message: 'A?', default: 'val-a' },
        { id: 'b', type: 'text', message: 'B?', default: 'val-b' },
      ]);

      await runWizard(config, {
        mockAnswers: {},
        onAfterStep: (_id, _val, state) => {
          states.push({ ...state, answers: { ...state.answers } });
        },
      });

      expect(states).toHaveLength(2);
      expect(states[0]?.answers).toHaveProperty('a', 'val-a');
      expect(states[1]?.answers).toHaveProperty('b', 'val-b');
    });

    it('supports async hooks', async () => {
      let hookCalled = false;

      const config = makeConfig([
        { id: 'q', type: 'text', message: 'Q?', default: 'x' },
      ]);

      await runWizard(config, {
        mockAnswers: {},
        onAfterStep: async () => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          hookCalled = true;
        },
      });

      expect(hookCalled).toBe(true);
    });
  });

  describe('both hooks together', () => {
    it('calls onBeforeStep before onAfterStep for the same step', async () => {
      const order: string[] = [];

      const config = makeConfig([
        { id: 'step1', type: 'text', message: 'Q?', default: 'x' },
      ]);

      await runWizard(config, {
        mockAnswers: {},
        onBeforeStep: (stepId) => { order.push(`before:${stepId}`); },
        onAfterStep: (stepId) => { order.push(`after:${stepId}`); },
      });

      expect(order).toEqual(['before:step1', 'after:step1']);
    });

    it('interleaves correctly across multiple steps', async () => {
      const order: string[] = [];

      const config = makeConfig([
        { id: 's1', type: 'text', message: 'A?', default: 'a' },
        { id: 's2', type: 'text', message: 'B?', default: 'b' },
      ]);

      await runWizard(config, {
        mockAnswers: {},
        onBeforeStep: (stepId) => { order.push(`before:${stepId}`); },
        onAfterStep: (stepId) => { order.push(`after:${stepId}`); },
      });

      expect(order).toEqual([
        'before:s1', 'after:s1',
        'before:s2', 'after:s2',
      ]);
    });
  });
});
