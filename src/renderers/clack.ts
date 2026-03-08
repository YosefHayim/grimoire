import chalk from 'chalk';
import { InquirerRenderer } from './inquirer';
import {
  S_BAR,
  S_BAR_START,
  S_BAR_END,
  S_BAR_H,
  S_STEP_SUBMIT,
  S_STEP_CANCEL,
  S_STEP_ERROR,
  S_CORNER_TR,
  S_CORNER_BR,
  S_SPINNER_FRAMES,
} from './symbols';
import type { ResolvedTheme, StepConfig, WizardEvent } from '../types';

export class ClackRenderer extends InquirerRenderer {
  private spinnerInterval: ReturnType<typeof setInterval> | undefined;
  private spinnerFrameIndex = 0;

  override renderStepHeader(): void {}

  override renderGroupHeader(): void {}

  override renderSummary(
    answers: Record<string, unknown>,
    steps: StepConfig[],
    theme: ResolvedTheme,
  ): void {
    const entries: Array<{ id: string; display: string }> = [];
    for (const step of steps) {
      const answer = answers[step.id];
      if (answer === undefined) continue;
      const display = Array.isArray(answer)
        ? answer.map(String).join(', ')
        : String(answer);
      entries.push({ id: step.id, display });
    }

    if (entries.length === 0) return;

    const title = 'Summary';
    const lines = entries.map((e) => `${e.id}: ${e.display}`);
    this.writeNoteBox(title, lines, theme);
  }

  onEvent(event: WizardEvent, theme: ResolvedTheme): void {
    switch (event.type) {
      case 'session:start':
        this.handleSessionStart(event, theme);
        break;
      case 'session:end':
        this.handleSessionEnd(event, theme);
        break;
      case 'step:start':
        process.stdout.write(`${chalk.gray(S_BAR)}\n`);
        break;
      case 'step:complete':
        this.handleStepComplete(event, theme);
        break;
      case 'step:error':
        process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.error(`${S_STEP_ERROR}  ${event.error}`)}\n`);
        break;
      case 'step:back':
        process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.muted('\u21a9 Back')}\n`);
        break;
      case 'group:start':
        process.stdout.write(`${chalk.gray(S_BAR)}\n`);
        process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.accent(event.group)}\n`);
        break;
      case 'note':
        this.writeNoteBox(event.title, event.body.split('\n'), theme);
        break;
      case 'spinner:start':
        this.startSpinner(event.message, theme);
        break;
      case 'spinner:stop':
        this.stopSpinner(event.message, theme);
        break;
      case 'checks:start':
        process.stdout.write(`${chalk.gray(S_BAR)}\n`);
        process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.bold('Running checks...')}\n`);
        break;
      case 'check:pass':
        process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.success(S_STEP_SUBMIT)}  ${event.name}\n`);
        break;
      case 'check:fail':
        process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.error(S_STEP_ERROR)}  ${event.name}: ${event.message}\n`);
        break;
      case 'actions:start':
        process.stdout.write(`${chalk.gray(S_BAR)}\n`);
        process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.bold('Running actions...')}\n`);
        break;
      case 'action:pass':
        process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.success(S_STEP_SUBMIT)}  ${event.name}\n`);
        break;
      case 'action:fail':
        process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.error(S_STEP_ERROR)}  ${event.name}\n`);
        break;
    }
  }

  private handleSessionStart(
    event: Extract<WizardEvent, { type: 'session:start' }>,
    theme: ResolvedTheme,
  ): void {
    process.stdout.write(`${chalk.gray(S_BAR_START)}  ${theme.bold(event.wizard)}\n`);
    if (event.description) {
      process.stdout.write(`${chalk.gray(S_BAR)}  ${theme.muted(event.description)}\n`);
    }
    process.stdout.write(`${chalk.gray(S_BAR)}\n`);
  }

  private handleSessionEnd(
    event: Extract<WizardEvent, { type: 'session:end' }>,
    theme: ResolvedTheme,
  ): void {
    if (event.cancelled) {
      process.stdout.write(`${theme.warning(S_STEP_CANCEL)}  Cancelled\n`);
    } else {
      process.stdout.write(`${chalk.gray(S_BAR_END)}  ${theme.success("You're all set!")}\n`);
    }
  }

  private handleStepComplete(
    event: Extract<WizardEvent, { type: 'step:complete' }>,
    theme: ResolvedTheme,
  ): void {
    const displayValue = event.step.type === 'password'
      ? '****'
      : this.formatValue(event.value);
    process.stdout.write(
      `${chalk.gray(S_STEP_SUBMIT)}  ${event.step.message} ${chalk.gray('\u00b7')} ${theme.muted(displayValue)}\n`,
    );
  }

  private formatValue(value: unknown): string {
    if (Array.isArray(value)) return value.map(String).join(', ');
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return String(value);
  }

  private writeNoteBox(title: string, lines: string[], _theme: ResolvedTheme): void {
    const maxLen = Math.max(title.length, ...lines.map((l) => l.length));
    const padded = maxLen + 2;
    const topLine = `${S_BAR_H.repeat(padded - title.length - 1)}${S_CORNER_TR}`;
    const bottomLine = `${S_BAR_H.repeat(padded)}${S_CORNER_BR}`;

    process.stdout.write(`${chalk.gray(S_BAR)}\n`);
    process.stdout.write(`${chalk.gray(S_BAR)}  ${chalk.gray(`\u256D${S_BAR_H} ${title} ${topLine}`)}\n`);
    for (const line of lines) {
      const pad = ' '.repeat(maxLen - line.length);
      process.stdout.write(`${chalk.gray(S_BAR)}  ${chalk.gray(S_BAR)} ${line}${pad} ${chalk.gray(S_BAR)}\n`);
    }
    process.stdout.write(`${chalk.gray(S_BAR)}  ${chalk.gray(`\u256E${bottomLine}`)}\n`);
  }

  private startSpinner(message: string, _theme: ResolvedTheme): void {
    this.spinnerFrameIndex = 0;
    this.spinnerInterval = setInterval(() => {
      const frame = S_SPINNER_FRAMES[this.spinnerFrameIndex % S_SPINNER_FRAMES.length];
      process.stdout.write(`\r${chalk.gray(S_BAR)}  ${chalk.cyan(frame ?? '')}  ${message}`);
      this.spinnerFrameIndex++;
    }, 80);
  }

  private stopSpinner(message: string | undefined, theme: ResolvedTheme): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = undefined;
    }
    const finalMessage = message ?? 'Done';
    process.stdout.write(`\r${chalk.gray(S_BAR)}  ${theme.success(S_STEP_SUBMIT)}  ${finalMessage}\n`);
  }
}
