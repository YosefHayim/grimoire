import { describe, it, expect } from 'vitest';
import { runWizard } from '../runner';
import type { WizardConfig, WizardEvent, ResolvedTheme } from '../types';
import { InquirerRenderer } from '../renderers/inquirer';

class EventSpyRenderer extends InquirerRenderer {
  events: WizardEvent[] = [];
  onEvent(event: WizardEvent, _theme: ResolvedTheme): void {
    this.events.push(event);
  }
}

describe('HookContext.showNote', () => {
  it('emits note event when showNote is called in onAfterStep', async () => {
    const spy = new EventSpyRenderer();
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        { id: 'name', type: 'text', message: 'Name?' },
        { id: 'ok', type: 'confirm', message: 'OK?' },
      ],
    };

    await runWizard(config, {
      renderer: spy,
      mockAnswers: { name: 'Alice', ok: true },
      onAfterStep: async (stepId, _value, context) => {
        if (stepId === 'name') {
          context.showNote('Info', 'Hello Alice!');
        }
      },
    });

    const notes = spy.events.filter(e => e.type === 'note');
    const infoNote = notes.find(
      e => e.type === 'note' && e.title === 'Info' && e.body === 'Hello Alice!',
    );
    expect(infoNote).toBeDefined();
  });

  it('showNote is available in onBeforeStep', async () => {
    const spy = new EventSpyRenderer();
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    };

    await runWizard(config, {
      renderer: spy,
      mockAnswers: { a: 'x' },
      onBeforeStep: async (_stepId, _step, context) => {
        context.showNote('Pre', 'Before step');
      },
    });

    const notes = spy.events.filter(e => e.type === 'note');
    expect(notes.find(e => e.type === 'note' && e.title === 'Pre')).toBeDefined();
  });
});

describe('HookContext.setNextStep', () => {
  it('overrides next step when setNextStep is called', async () => {
    const spy = new EventSpyRenderer();
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        { id: 'a', type: 'text', message: 'A?' },
        { id: 'b', type: 'text', message: 'B?' },
        { id: 'c', type: 'text', message: 'C?' },
      ],
    };

    const visited: string[] = [];
    await runWizard(config, {
      renderer: spy,
      mockAnswers: { a: 'x', c: 'z' },
      onBeforeStep: (stepId) => {
        visited.push(stepId);
      },
      onAfterStep: async (stepId, _value, context) => {
        if (stepId === 'a') {
          context.setNextStep('c');
        }
      },
    });

    expect(visited).toContain('a');
    expect(visited).not.toContain('b');
    expect(visited).toContain('c');
  });
});

describe('HookContext.answers', () => {
  it('provides current answers in context', async () => {
    let capturedAnswers: Record<string, unknown> = {};
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        { id: 'name', type: 'text', message: 'Name?' },
        { id: 'ok', type: 'confirm', message: 'OK?' },
      ],
    };

    await runWizard(config, {
      mockAnswers: { name: 'Alice', ok: true },
      onAfterStep: async (_stepId, _value, context) => {
        capturedAnswers = { ...context.answers };
      },
    });

    expect(capturedAnswers.name).toBe('Alice');
  });
});

describe('HookContext.openBrowser', () => {
  it('openBrowser is available on context', async () => {
    let hasFn = false;
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    };

    await runWizard(config, {
      mockAnswers: { a: 'x' },
      onAfterStep: async (_stepId, _value, context) => {
        hasFn = typeof context.openBrowser === 'function';
      },
    });

    expect(hasFn).toBe(true);
  });
});

describe('HookContext.prompt', () => {
  it('prompt function is available on context', async () => {
    let hasFn = false;
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    };

    await runWizard(config, {
      mockAnswers: { a: 'x' },
      onAfterStep: async (_stepId, _value, context) => {
        hasFn = typeof context.prompt === 'function';
      },
    });

    expect(hasFn).toBe(true);
  });

  it('prompt returns default value in mock mode', async () => {
    let promptResult: unknown;
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    };

    await runWizard(config, {
      mockAnswers: { a: 'x' },
      onAfterStep: async (_stepId, _value, context) => {
        promptResult = await context.prompt({
          type: 'text',
          message: 'Sub prompt?',
          default: 'fallback',
        });
      },
    });

    expect(promptResult).toBe('fallback');
  });
});

describe('backward compatibility', () => {
  it('hooks still receive stepId and value as first two args', async () => {
    const calls: Array<{ stepId: string; value: unknown }> = [];
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [{ id: 'name', type: 'text', message: 'Name?' }],
    };

    await runWizard(config, {
      mockAnswers: { name: 'Alice' },
      onAfterStep: async (stepId, value) => {
        calls.push({ stepId, value });
      },
    });

    expect(calls).toHaveLength(1);
    expect(calls[0]?.stepId).toBe('name');
    expect(calls[0]?.value).toBe('Alice');
  });
});
