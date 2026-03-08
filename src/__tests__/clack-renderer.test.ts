import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClackRenderer } from '../renderers/clack';
import type { WizardEvent, ResolvedTheme } from '../types';
import { resolveTheme } from '../theme';

describe('ClackRenderer', () => {
  let renderer: ClackRenderer;
  let theme: ResolvedTheme;
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    renderer = new ClackRenderer();
    theme = resolveTheme();
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  it('handles session:start event', () => {
    renderer.onEvent({ type: 'session:start', wizard: 'Test', totalSteps: 3 }, theme);
    const output = writeSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('Test');
  });

  it('handles session:end event (success)', () => {
    renderer.onEvent({ type: 'session:end', answers: {}, cancelled: false }, theme);
    const output = writeSpy.mock.calls.map(c => c[0]).join('');
    // Should contain a success-related message
    expect(output.length).toBeGreaterThan(0);
  });

  it('handles session:end event (cancelled)', () => {
    renderer.onEvent({ type: 'session:end', answers: {}, cancelled: true }, theme);
    const output = writeSpy.mock.calls.map(c => c[0]).join('');
    expect(output.length).toBeGreaterThan(0);
  });

  it('handles step:complete event', () => {
    renderer.onEvent(
      { type: 'step:complete', stepId: 'name', value: 'my-app',
        step: { id: 'name', type: 'text', message: 'Name?' } },
      theme,
    );
    expect(writeSpy).toHaveBeenCalled();
  });

  it('handles note event with bordered box', () => {
    renderer.onEvent({ type: 'note', title: 'Next Steps', body: 'npm install\nnpm run dev' }, theme);
    const output = writeSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('Next Steps');
    expect(output).toContain('npm install');
  });

  it('is a valid WizardRenderer (has all required methods)', () => {
    expect(renderer.renderText).toBeDefined();
    expect(renderer.renderSelect).toBeDefined();
    expect(renderer.onEvent).toBeDefined();
  });

  it('renderStepHeader is a no-op', () => {
    renderer.renderStepHeader(0, 5, 'Test', theme);
    expect(writeSpy).not.toHaveBeenCalled();
  });

  it('renderGroupHeader is a no-op', () => {
    renderer.renderGroupHeader('My Group', theme);
    expect(writeSpy).not.toHaveBeenCalled();
  });
});
