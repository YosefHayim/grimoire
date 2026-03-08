import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import type { WizardConfig } from '../types';

const configA: WizardConfig = {
  meta: { name: 'Setup' },
  steps: [{ id: 'name', type: 'text', message: 'Name?' }],
};

const configB: WizardConfig = {
  meta: { name: 'Deploy' },
  steps: [{ id: 'target', type: 'text', message: 'Target?' }],
};

describe('wizard pipelines', () => {
  it('runs multiple wizards in sequence with mock answers', async () => {
    const results = await runPipeline([
      { config: configA, mockAnswers: { name: 'my-app' } },
      { config: configB, mockAnswers: { target: 'vercel' } },
    ]);

    expect(results['Setup']).toEqual({ name: 'my-app' });
    expect(results['Deploy']).toEqual({ target: 'vercel' });
  });

  it('passes answers from wizard A as template defaults to wizard B', async () => {
    const configBWithDefault: WizardConfig = {
      meta: { name: 'Deploy' },
      steps: [{ id: 'name', type: 'text', message: 'Confirm name?' }],
    };

    const results = await runPipeline([
      { config: configA, mockAnswers: { name: 'my-app' } },
      { config: configBWithDefault, mockAnswers: {} },
    ]);

    // name from configA flows as default to configB, and since mock mode uses defaults
    expect(results['Setup']).toEqual({ name: 'my-app' });
    expect(results['Deploy']).toEqual({ name: 'my-app' });
  });

  it('skips conditional wizards when condition is not met', async () => {
    const results = await runPipeline([
      { config: configA, mockAnswers: { name: 'my-app' } },
      { config: configB, mockAnswers: { target: 'vercel' }, when: { field: 'name', equals: 'other' } },
    ]);

    expect(results['Setup']).toEqual({ name: 'my-app' });
    expect(results['Deploy']).toBeUndefined();
  });

  it('runs conditional wizard when condition is met', async () => {
    const results = await runPipeline([
      { config: configA, mockAnswers: { name: 'my-app' } },
      { config: configB, mockAnswers: { target: 'vercel' }, when: { field: 'name', equals: 'my-app' } },
    ]);

    expect(results['Setup']).toEqual({ name: 'my-app' });
    expect(results['Deploy']).toEqual({ target: 'vercel' });
  });
});
