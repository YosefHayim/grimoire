import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { saveProgress, loadProgress, clearProgress } from '../progress';

describe('progress persistence', () => {
  const testDir = join(tmpdir(), 'grimoire-progress-test');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('saves and loads progress', () => {
    const state = {
      currentStepId: 'step-2',
      answers: { 'step-1': 'hello' },
      history: ['step-1'],
    };
    saveProgress('Test Wizard', state, testDir);

    const loaded = loadProgress('Test Wizard', testDir);
    expect(loaded).toBeDefined();
    expect(loaded?.currentStepId).toBe('step-2');
    expect(loaded?.answers).toEqual({ 'step-1': 'hello' });
    expect(loaded?.history).toEqual(['step-1']);
    expect(loaded?.savedAt).toBeDefined();
  });

  it('returns null when no progress exists', () => {
    const loaded = loadProgress('Nonexistent', testDir);
    expect(loaded).toBeNull();
  });

  it('clears progress', () => {
    saveProgress('Test Wizard', { currentStepId: 'a', answers: {}, history: [] }, testDir);
    clearProgress('Test Wizard', testDir);
    const loaded = loadProgress('Test Wizard', testDir);
    expect(loaded).toBeNull();
  });

  it('excludes password answers from saved progress', () => {
    const state = {
      currentStepId: 'step-3',
      answers: { 'step-1': 'hello', 'api-key': 'secret123' },
      history: ['step-1', 'api-key'],
    };
    saveProgress('Test Wizard', state, testDir, ['api-key']);

    const loaded = loadProgress('Test Wizard', testDir);
    expect(loaded?.answers).toEqual({ 'step-1': 'hello' });
    expect(loaded?.answers['api-key']).toBeUndefined();
  });
});
