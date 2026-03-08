import {
  input,
  select,
  checkbox,
  confirm,
  password,
  number,
  search,
  editor,
  Separator,
} from '@inquirer/prompts';
import type {
  ConfirmStepConfig,
  EditorStepConfig,
  MessageStepConfig,
  MultiSelectStepConfig,
  NumberStepConfig,
  PasswordStepConfig,
  PathStepConfig,
  ResolvedTheme,
  SearchStepConfig,
  SelectOption,
  SelectStepConfig,
  StepConfig,
  TextStepConfig,
  ToggleStepConfig,
  WizardRenderer,
  WizardState,
} from '../types';

function boxLine(text: string, theme: ResolvedTheme): string {
  const line = '\u2500'.repeat(Math.max(0, 40 - text.length));
  return `${theme.accent('\u250C\u2500')} ${theme.bold(text)} ${theme.accent(`${line}\u2510`)}`;
}

export class InkRenderer implements WizardRenderer {
  renderStepHeader(
    stepIndex: number,
    totalVisible: number,
    message: string,
    theme: ResolvedTheme,
    description?: string,
  ): void {
    const barWidth = 30;
    const progress = totalVisible > 0 ? stepIndex / totalVisible : 0;
    const filledCount = Math.round(progress * barWidth);
    const remainingCount = barWidth - filledCount;

    const filledBar = theme.success('\u2593'.repeat(filledCount));
    const remainingBar = theme.muted('\u2591'.repeat(remainingCount));
    const pct = `${String(Math.round(progress * 100))}%`;
    const counter = theme.muted(`Step ${String(stepIndex + 1)}/${String(totalVisible)}`);

    console.log();
    console.log(`  ${theme.accent('\u250C')} ${counter} ${theme.muted(pct)}`);
    console.log(`  ${theme.accent('\u2502')} [${filledBar}${remainingBar}]`);
    console.log(`  ${theme.accent('\u2514\u2500')} ${theme.primary(message)}`);

    if (description) {
      console.log(`     ${theme.muted(description)}`);
    }
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

    const choices = step.options.map((opt) => {
      if ('separator' in opt) {
        return new Separator(opt.separator);
      }
      return {
        name: opt.label,
        value: opt.value,
        description: opt.hint,
        disabled: opt.disabled,
      };
    });

    return select({
      message: step.message,
      choices,
      default: defaultValue,
      pageSize: step.pageSize,
      loop: step.loop,
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

    const choices = step.options.map((opt) => {
      if ('separator' in opt) {
        return new Separator(opt.separator);
      }
      return {
        name: opt.label,
        value: opt.value,
        checked: previousSelections?.includes(opt.value) ?? false,
        disabled: opt.disabled,
      };
    });

    return checkbox({
      message: step.message,
      choices,
      pageSize: step.pageSize,
      loop: step.loop,
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
      source: (term) => {
        const query = (term ?? '').toLowerCase();
        return step.options
          .filter((opt): opt is SelectOption => 'value' in opt)
          .filter((opt) => !opt.disabled && opt.label.toLowerCase().includes(query))
          .map((opt) => ({
            name: opt.label,
            value: opt.value,
            description: opt.hint,
          }));
      },
      pageSize: step.pageSize,
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

  renderMessage(step: MessageStepConfig, _state: WizardState, theme: ResolvedTheme): void {
    if (step.description) {
      console.log(`  ${theme.muted(step.description)}`);
    }
    console.log();
  }

  renderGroupHeader(group: string, theme: ResolvedTheme): void {
    console.log();
    console.log(`  ${boxLine(group, theme)}`);
    console.log();
  }

  renderSummary(
    answers: Record<string, unknown>,
    steps: StepConfig[],
    theme: ResolvedTheme,
  ): void {
    const divider = theme.accent('\u2500'.repeat(50));
    console.log();
    console.log(`  ${divider}`);
    console.log(`  ${theme.accent('\u2502')} ${theme.bold('Summary')}`);
    console.log(`  ${divider}`);

    for (const step of steps) {
      const answer = answers[step.id];
      if (answer === undefined) continue;

      const display = Array.isArray(answer)
        ? answer.map(String).join(', ')
        : String(answer);

      const label = theme.muted(step.id.padEnd(24));
      const value = theme.primary(display);
      console.log(`  ${theme.accent('\u2502')} ${label} ${value}`);
    }

    console.log(`  ${divider}`);
  }

  clear(): void {
    process.stdout.write('\x1B[2J\x1B[0f');
  }
}
