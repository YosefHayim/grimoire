import { describe, it, expect } from 'vitest';
import { runWizard } from '../runner';
import type { WizardConfig, SelectOption } from '../types';

describe('optionsFrom as function', () => {
  it('resolves options from async function at runtime', async () => {
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        {
          id: 'choice',
          type: 'select' as const,
          message: 'Pick one',
          options: [],
          optionsFrom: async () => [
            { value: 'a', label: 'Alpha' },
            { value: 'b', label: 'Beta' },
          ],
        },
      ],
    };

    const answers = await runWizard(config, {
      mockAnswers: { choice: 'a' },
    });

    expect(answers.choice).toBe('a');
  });

  it('receives current answers in the callback', async () => {
    let receivedAnswers: Record<string, unknown> = {};
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        { id: 'name', type: 'text' as const, message: 'Name?' },
        {
          id: 'choice',
          type: 'select' as const,
          message: 'Pick one',
          options: [],
          optionsFrom: async (answers: Record<string, unknown>): Promise<SelectOption[]> => {
            receivedAnswers = answers;
            return [{ value: 'x', label: 'X' }];
          },
        },
      ],
    };

    await runWizard(config, { mockAnswers: { name: 'Alice', choice: 'x' } });
    expect(receivedAnswers.name).toBe('Alice');
  });

  it('works with multiselect steps', async () => {
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        {
          id: 'picks',
          type: 'multiselect' as const,
          message: 'Pick',
          options: [],
          optionsFrom: async () => [
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ],
        },
      ],
    };

    const answers = await runWizard(config, {
      mockAnswers: { picks: ['a'] },
    });
    expect(answers.picks).toEqual(['a']);
  });
});
