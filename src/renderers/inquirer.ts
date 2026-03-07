import {
  input,
  select,
  checkbox,
  confirm,
  password,
  number,
  search,
  editor,
} from '@inquirer/prompts';
import type {
  ConfirmStepConfig,
  EditorStepConfig,
  MultiSelectStepConfig,
  NumberStepConfig,
  PasswordStepConfig,
  PathStepConfig,
  ResolvedTheme,
  SearchStepConfig,
  SelectStepConfig,
  StepConfig,
  TextStepConfig,
  ToggleStepConfig,
  WizardRenderer,
  WizardState,
} from '../types';

export class InquirerRenderer implements WizardRenderer {
  renderStepHeader(
    stepIndex: number,
    totalVisible: number,
    message: string,
    theme: ResolvedTheme,
  ): void {
    const barWidth = 20;
    const filledCount = totalVisible > 0 ? Math.round((stepIndex / totalVisible) * barWidth) : 0;
    const remainingCount = barWidth - filledCount;
    const filledBar = theme.success('\u2588'.repeat(filledCount));
    const remainingBar = theme.muted('\u2591'.repeat(remainingCount));
    const counter = theme.muted(`Step ${String(stepIndex + 1)}/${String(totalVisible)}`);
    const stepMessage = theme.muted(`\u2014 ${message}`);
    console.log(`\n  [${filledBar}${remainingBar}]  ${counter} ${stepMessage}`);
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

  async renderSearch(
    step: SearchStepConfig,
    _state: WizardState,
    theme: ResolvedTheme,
  ): Promise<string> {
    return search({
      message: step.message,
      source: (input) => {
        const term = (input ?? '').toLowerCase();
        return step.options
          .filter((opt) => !opt.disabled && opt.label.toLowerCase().includes(term))
          .map((opt) => ({
            name: opt.label,
            value: opt.value,
            description: opt.hint,
          }));
      },
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });
  }

  async renderEditor(
    step: EditorStepConfig,
    _state: WizardState,
    theme: ResolvedTheme,
  ): Promise<string> {
    return editor({
      message: step.message,
      default: step.default,
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });
  }

  async renderPath(
    step: PathStepConfig,
    state: WizardState,
    theme: ResolvedTheme,
  ): Promise<string> {
    const existingAnswer = state.answers[step.id];
    const defaultValue =
      typeof existingAnswer === 'string' ? existingAnswer : step.default;

    return input({
      message: step.message,
      default: defaultValue,
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });
  }

  async renderToggle(
    step: ToggleStepConfig,
    state: WizardState,
    theme: ResolvedTheme,
  ): Promise<boolean> {
    const existingAnswer = state.answers[step.id];
    const activeLabel = step.active ?? 'On';
    const inactiveLabel = step.inactive ?? 'Off';

    const defaultValue =
      typeof existingAnswer === 'boolean'
        ? (existingAnswer ? activeLabel : inactiveLabel)
        : (step.default === true ? activeLabel : inactiveLabel);

    const result = await select({
      message: step.message,
      choices: [
        { name: activeLabel, value: activeLabel },
        { name: inactiveLabel, value: inactiveLabel },
      ],
      default: defaultValue,
      theme: { prefix: { idle: theme.icons.pointer, done: theme.icons.stepDone } },
    });

    return result === activeLabel;
  }

  renderGroupHeader(group: string, theme: ResolvedTheme): void {
    console.log(`\n  ${theme.accent('\u2500\u2500')} ${theme.bold(group)} ${theme.accent('\u2500\u2500')}\n`);
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
