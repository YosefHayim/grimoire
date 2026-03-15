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

describe('dynamic note content', () => {
  it('calls dynamicContent function and emits note with result', async () => {
    const spy = new EventSpyRenderer();
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        { id: 'name', type: 'text', message: 'Name?' },
        {
          id: 'info',
          type: 'note' as const,
          message: 'Account Info',
          dynamicContent: async (answers: Record<string, unknown>) => {
            return `Welcome, ${String(answers.name)}!`;
          },
        },
        { id: 'ok', type: 'confirm', message: 'Continue?' },
      ],
    };

    await runWizard(config, {
      renderer: spy,
      mockAnswers: { name: 'Alice', ok: true },
    });

    const notes = spy.events.filter(e => e.type === 'note');
    const dynamicNote = notes.find(
      e => e.type === 'note' && e.body === 'Welcome, Alice!',
    );
    expect(dynamicNote).toBeDefined();
  });

  it('falls back to static description when no dynamicContent', async () => {
    const spy = new EventSpyRenderer();
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        { id: 'info', type: 'note', message: 'Hello', description: 'World' },
        { id: 'ok', type: 'confirm', message: 'OK?' },
      ],
    };

    await runWizard(config, {
      renderer: spy,
      mockAnswers: { ok: true },
    });

    const notes = spy.events.filter(e => e.type === 'note');
    expect(notes.length).toBe(1);
    if (notes[0]?.type === 'note') {
      expect(notes[0].body).toBe('World');
    }
  });

  it('dynamicContent receives accumulated answers', async () => {
    const spy = new EventSpyRenderer();
    let receivedAnswers: Record<string, unknown> = {};
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        { id: 'name', type: 'text', message: 'Name?' },
        { id: 'age', type: 'number', message: 'Age?' },
        {
          id: 'summary',
          type: 'note' as const,
          message: 'Summary',
          dynamicContent: (answers: Record<string, unknown>) => {
            receivedAnswers = answers;
            return 'ok';
          },
        },
        { id: 'done', type: 'confirm', message: 'Done?' },
      ],
    };

    await runWizard(config, {
      renderer: spy,
      mockAnswers: { name: 'Bob', age: 30, done: true },
    });

    expect(receivedAnswers.name).toBe('Bob');
    expect(receivedAnswers.age).toBe(30);
  });
});
