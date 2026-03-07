import {
  input,
  select,
  checkbox,
  confirm,
  password,
  number,
} from '@inquirer/prompts';
import type {
  ConfirmStepConfig,
  MultiSelectStepConfig,
  NumberStepConfig,
  PasswordStepConfig,
  ResolvedTheme,
  SelectStepConfig,
  StepConfig,
  TextStepConfig,
  WizardRenderer,
  WizardState,
} from '../types';

export class InquirerRenderer implements WizardRenderer {
  renderStepHeader(
    stepIndex: number,
    totalVisible: number,
    _message: string,
    theme: ResolvedTheme,
  ): void {
    const filled = theme.icons.stepDone.repeat(stepIndex);
    const current = theme.icons.step;
    const remaining = theme.icons.stepPending.repeat(
      Math.max(0, totalVisible - stepIndex - 1),
    );
    const progress = `${theme.success(filled)}${theme.primary(current)}${theme.muted(remaining)}`;
    const label = theme.muted(`Step ${String(stepIndex + 1)}/${String(totalVisible)}`);
    console.log(`\n  ${progress}  ${label}`);
  }

  async renderText(
    step: TextStepConfig,
    state: WizardState,
    theme: ResolvedTheme,
  ): Promise<string> {
    const existingAnswer = state.answers[step.id];
    const defaultValue =
      typeof existingAnswer === 'string'
        ? existingAnswer
        : step.default;

    return input({
      message: step.message,
      default: defaultValue,
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });
  }

  async renderSelect(
    step: SelectStepConfig,
    state: WizardState,
    theme: ResolvedTheme,
  ): Promise<string> {
    const existingAnswer = state.answers[step.id];
    const defaultValue =
      typeof existingAnswer === 'string' ? existingAnswer : step.default;

    return select({
      message: step.message,
      choices: step.options.map((opt) => ({
        name: opt.label,
        value: opt.value,
        description: opt.hint,
        disabled: opt.disabled,
      })),
      default: defaultValue,
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });
  }

  async renderMultiSelect(
    step: MultiSelectStepConfig,
    state: WizardState,
    theme: ResolvedTheme,
  ): Promise<string[]> {
    const existingAnswer = state.answers[step.id];
    const previousSelections: string[] | undefined = Array.isArray(existingAnswer)
      ? existingAnswer.filter((v): v is string => typeof v === 'string')
      : step.default;

    return checkbox({
      message: step.message,
      choices: step.options.map((opt) => ({
        name: opt.label,
        value: opt.value,
        checked: previousSelections?.includes(opt.value) ?? false,
        disabled: opt.disabled,
      })),
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });
  }

  async renderConfirm(
    step: ConfirmStepConfig,
    state: WizardState,
    theme: ResolvedTheme,
  ): Promise<boolean> {
    const existingAnswer = state.answers[step.id];
    const defaultValue =
      typeof existingAnswer === 'boolean' ? existingAnswer : step.default;

    return confirm({
      message: step.message,
      default: defaultValue ?? true,
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });
  }

  async renderPassword(
    step: PasswordStepConfig,
    _state: WizardState,
    theme: ResolvedTheme,
  ): Promise<string> {
    return password({
      message: step.message,
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });
  }

  async renderNumber(
    step: NumberStepConfig,
    state: WizardState,
    theme: ResolvedTheme,
  ): Promise<number> {
    const existingAnswer = state.answers[step.id];
    const defaultValue =
      typeof existingAnswer === 'number' ? existingAnswer : step.default;

    const result = await number({
      message: step.message,
      default: defaultValue,
      min: step.min,
      max: step.max,
      step: step.step,
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });

    return result ?? defaultValue ?? 0;
  }

  renderSummary(
    answers: Record<string, unknown>,
    steps: StepConfig[],
    theme: ResolvedTheme,
  ): void {
    console.log(`\n${theme.muted('\u2500'.repeat(40))}`);
    console.log(`  ${theme.bold('Summary')}\n`);

    for (const step of steps) {
      const answer = answers[step.id];
      if (answer === undefined) continue;

      const display = Array.isArray(answer)
        ? answer.map(String).join(', ')
        : String(answer);

      console.log(
        `  ${theme.muted(step.id.padEnd(20))} ${theme.primary(display)}`,
      );
    }

    console.log(theme.muted('\u2500'.repeat(40)));
  }

  clear(): void {
    process.stdout.write('\x1B[2J\x1B[0f');
  }
}
