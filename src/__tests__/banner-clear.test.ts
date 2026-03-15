import { describe, it, expect } from 'vitest';
import { runWizard } from '../runner';
import { parseWizardConfig } from '../schema';
import type { WizardConfig, WizardEvent, ResolvedTheme } from '../types';
import { InquirerRenderer } from '../renderers/inquirer';

class EventSpyRenderer extends InquirerRenderer {
  events: WizardEvent[] = [];
  clearCount = 0;
  onEvent(event: WizardEvent, _theme: ResolvedTheme): void {
    this.events.push(event);
  }
  clear(): void {
    this.clearCount++;
  }
}

describe('custom banner', () => {
  it('schema accepts meta.banner as multi-line string', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test', banner: '██████\n██████' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    });
    expect(config.meta.banner).toBe('██████\n██████');
  });

  it('schema accepts meta.subtitle', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test', subtitle: 'Setup Wizard' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    });
    expect(config.meta.subtitle).toBe('Setup Wizard');
  });

  it('session:start event includes banner and subtitle', async () => {
    const spy = new EventSpyRenderer();
    const config: WizardConfig = {
      meta: { name: 'Test', banner: 'ART', subtitle: 'Sub' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    };
    await runWizard(config, { renderer: spy, mockAnswers: { a: 'x' } });
    const start = spy.events.find(e => e.type === 'session:start');
    expect(start).toBeDefined();
    if (start && start.type === 'session:start') {
      expect(start.banner).toBe('ART');
      expect(start.subtitle).toBe('Sub');
    }
  });
});

describe('clearBetweenSteps', () => {
  it('schema accepts meta.clearBetweenSteps', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test', clearBetweenSteps: true },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    });
    expect(config.meta.clearBetweenSteps).toBe(true);
  });

  it('calls renderer.clear() before each step when enabled', async () => {
    const spy = new EventSpyRenderer();
    const config: WizardConfig = {
      meta: { name: 'Test', clearBetweenSteps: true },
      steps: [
        { id: 'a', type: 'text', message: 'A?' },
        { id: 'b', type: 'text', message: 'B?' },
      ],
    };
    await runWizard(config, { renderer: spy, mockAnswers: { a: 'x', b: 'y' } });
    expect(spy.clearCount).toBe(2);
  });

  it('does not clear when clearBetweenSteps is absent', async () => {
    const spy = new EventSpyRenderer();
    const config: WizardConfig = {
      meta: { name: 'Test' },
      steps: [
        { id: 'a', type: 'text', message: 'A?' },
        { id: 'b', type: 'text', message: 'B?' },
      ],
    };
    await runWizard(config, { renderer: spy, mockAnswers: { a: 'x', b: 'y' } });
    expect(spy.clearCount).toBe(0);
  });
});
