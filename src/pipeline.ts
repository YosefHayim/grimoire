import { runWizard } from './runner';
import type { RunWizardOptions } from './runner';
import { evaluateCondition } from './conditions';
import type { Condition, WizardConfig } from './types';

export interface PipelineStep {
  config: WizardConfig | string;
  when?: Condition;
  mockAnswers?: Record<string, unknown>;
  options?: Omit<RunWizardOptions, 'mockAnswers' | 'templateAnswers'>;
}

export async function runPipeline(
  steps: PipelineStep[],
  globalOptions?: Omit<RunWizardOptions, 'mockAnswers' | 'templateAnswers'>,
): Promise<Record<string, Record<string, unknown>>> {
  const results: Record<string, Record<string, unknown>> = {};
  let accumulated: Record<string, unknown> = {};

  for (const step of steps) {
    let config: WizardConfig;
    if (typeof step.config === 'string') {
      const { loadWizardConfig } = await import('./parser');
      config = await loadWizardConfig(step.config);
    } else {
      config = step.config;
    }

    if (step.when && !evaluateCondition(step.when, accumulated)) {
      continue;
    }

    const answers = await runWizard(config, {
      ...globalOptions,
      ...step.options,
      mockAnswers: step.mockAnswers,
      templateAnswers: accumulated,
    });

    results[config.meta.name] = answers;
    accumulated = { ...accumulated, ...answers };
  }

  return results;
}
