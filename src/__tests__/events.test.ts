import { describe, it, expect } from 'vitest';
import type { WizardEvent, WizardRenderer, NoteStepConfig } from '../types';
import { parseWizardConfig } from '../schema';

describe('WizardEvent types', () => {
  it('can create all 16 event types', () => {
    const events: WizardEvent[] = [
      { type: 'session:start', wizard: 'test', totalSteps: 5 },
      { type: 'session:end', answers: {}, cancelled: false },
      { type: 'group:start', group: 'Setup' },
      { type: 'step:start', stepId: 'name', stepIndex: 0, totalVisible: 5, step: { id: 'name', type: 'text', message: 'Name?' } },
      { type: 'step:complete', stepId: 'name', value: 'test', step: { id: 'name', type: 'text', message: 'Name?' } },
      { type: 'step:error', stepId: 'name', error: 'Required' },
      { type: 'step:back', stepId: 'name' },
      { type: 'spinner:start', message: 'Loading...' },
      { type: 'spinner:stop', message: 'Done' },
      { type: 'note', title: 'Info', body: 'Hello' },
      { type: 'checks:start', checks: [{ name: 'git', run: 'git --version', message: 'Need git' }] },
      { type: 'check:pass', name: 'git' },
      { type: 'check:fail', name: 'docker', message: 'Docker not running' },
      { type: 'actions:start' },
      { type: 'action:pass', name: 'deploy' },
      { type: 'action:fail', name: 'deploy' },
    ];
    expect(events.length).toBe(16);
  });

  it('WizardRenderer.onEvent is optional', () => {
    const renderer: Partial<WizardRenderer> = {};
    expect(renderer.onEvent).toBeUndefined();
  });
});

describe('NoteStepConfig', () => {
  it('has the correct shape', () => {
    const note: NoteStepConfig = {
      id: 'info',
      type: 'note',
      message: 'Setup Complete',
      description: 'Run npm install',
    };
    expect(note.type).toBe('note');
  });

  it('schema accepts note step type', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [
        { id: 'info', type: 'note', message: 'Hello' },
        { id: 'name', type: 'text', message: 'Name?' },
      ],
    });
    expect(config.steps[0].type).toBe('note');
  });

  it('note step can have description', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [
        { id: 'info', type: 'note', message: 'Hello', description: 'Some info' },
        { id: 'name', type: 'text', message: 'Name?' },
      ],
    });
    expect(config.steps[0].description).toBe('Some info');
  });
});
