import { describe, it, expect } from 'vitest';
import { runWizard } from '../runner';
import type { WizardConfig, WizardEvent, WizardRenderer, ResolvedTheme } from '../types';
import { InquirerRenderer } from '../renderers/inquirer';

class EventSpyRenderer extends InquirerRenderer {
  events: WizardEvent[] = [];

  onEvent(event: WizardEvent, _theme: ResolvedTheme): void {
    this.events.push(event);
  }
}

const basicConfig: WizardConfig = {
  meta: { name: 'Test Wizard' },
  steps: [
    { id: 'name', type: 'text', message: 'Name?' },
    { id: 'ok', type: 'confirm', message: 'OK?' },
  ],
};

describe('runner event emission', () => {
  it('emits session:start and session:end in mock mode', async () => {
    const spy = new EventSpyRenderer();
    await runWizard(basicConfig, {
      renderer: spy,
      mockAnswers: { name: 'test', ok: true },
    });

    const types = spy.events.map(e => e.type);
    expect(types).toContain('session:start');
    expect(types).toContain('session:end');
  });

  it('emits step:start and step:complete for each step in mock mode', async () => {
    const spy = new EventSpyRenderer();
    await runWizard(basicConfig, {
      renderer: spy,
      mockAnswers: { name: 'test', ok: true },
    });

    const stepStarts = spy.events.filter(e => e.type === 'step:start');
    const stepCompletes = spy.events.filter(e => e.type === 'step:complete');
    expect(stepStarts.length).toBe(2);
    expect(stepCompletes.length).toBe(2);
  });

  it('session:end has cancelled=false on successful completion', async () => {
    const spy = new EventSpyRenderer();
    await runWizard(basicConfig, {
      renderer: spy,
      mockAnswers: { name: 'test', ok: true },
    });

    const end = spy.events.find(e => e.type === 'session:end');
    expect(end).toBeDefined();
    if (end && end.type === 'session:end') {
      expect(end.cancelled).toBe(false);
      expect(end.answers).toEqual({ name: 'test', ok: true });
    }
  });

  it('emits group:start when group changes', async () => {
    const groupedConfig: WizardConfig = {
      meta: { name: 'Grouped' },
      steps: [
        { id: 'a', type: 'text', message: 'A?', group: 'Section 1' },
        { id: 'b', type: 'text', message: 'B?', group: 'Section 2' },
      ],
    };
    const spy = new EventSpyRenderer();
    await runWizard(groupedConfig, {
      renderer: spy,
      mockAnswers: { a: 'x', b: 'y' },
    });

    const groupEvents = spy.events.filter(e => e.type === 'group:start');
    expect(groupEvents.length).toBe(2);
  });

  it('emits note event for note step type', async () => {
    const noteConfig: WizardConfig = {
      meta: { name: 'With Note' },
      steps: [
        { id: 'info', type: 'note', message: 'Hello', description: 'World' },
        { id: 'name', type: 'text', message: 'Name?' },
      ],
    };
    const spy = new EventSpyRenderer();
    await runWizard(noteConfig, {
      renderer: spy,
      mockAnswers: { name: 'test' },
    });

    const noteEvents = spy.events.filter(e => e.type === 'note');
    expect(noteEvents.length).toBe(1);
    if (noteEvents[0] && noteEvents[0].type === 'note') {
      expect(noteEvents[0].title).toBe('Hello');
      expect(noteEvents[0].body).toBe('World');
    }
  });

  it('step:start includes correct stepIndex and totalVisible', async () => {
    const spy = new EventSpyRenderer();
    await runWizard(basicConfig, {
      renderer: spy,
      mockAnswers: { name: 'test', ok: true },
    });

    const starts = spy.events.filter(e => e.type === 'step:start');
    if (starts[0] && starts[0].type === 'step:start') {
      expect(starts[0].stepIndex).toBe(0);
      expect(starts[0].totalVisible).toBe(2);
      expect(starts[0].stepId).toBe('name');
    }
    if (starts[1] && starts[1].type === 'step:start') {
      expect(starts[1].stepIndex).toBe(1);
      expect(starts[1].stepId).toBe('ok');
    }
  });

  it('session:start includes wizard name and totalSteps', async () => {
    const spy = new EventSpyRenderer();
    await runWizard(basicConfig, {
      renderer: spy,
      mockAnswers: { name: 'test', ok: true },
    });

    const start = spy.events.find(e => e.type === 'session:start');
    expect(start).toBeDefined();
    if (start && start.type === 'session:start') {
      expect(start.wizard).toBe('Test Wizard');
      expect(start.totalSteps).toBe(2);
    }
  });
});
