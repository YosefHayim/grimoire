import { mkdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { slugify } from './cache';

const DEFAULT_PROGRESS_DIR = join(homedir(), '.config', 'grimoire', 'progress');

export interface SavedProgress {
  currentStepId: string;
  answers: Record<string, unknown>;
  history: string[];
  savedAt: string;
}

function getProgressFilePath(wizardName: string, customDir?: string): string {
  const dir = customDir ?? DEFAULT_PROGRESS_DIR;
  return join(dir, `${slugify(wizardName)}.json`);
}

export function saveProgress(
  wizardName: string,
  state: { currentStepId: string; answers: Record<string, unknown>; history: string[] },
  customDir?: string,
  excludeStepIds?: string[],
): void {
  try {
    const dir = customDir ?? DEFAULT_PROGRESS_DIR;
    mkdirSync(dir, { recursive: true });

    const excludeSet = new Set(excludeStepIds ?? []);
    const filteredAnswers: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(state.answers)) {
      if (!excludeSet.has(key)) {
        filteredAnswers[key] = value;
      }
    }

    const progress: SavedProgress = {
      currentStepId: state.currentStepId,
      answers: filteredAnswers,
      history: state.history,
      savedAt: new Date().toISOString(),
    };

    const filePath = getProgressFilePath(wizardName, customDir);
    writeFileSync(filePath, JSON.stringify(progress, null, 2) + '\n', 'utf-8');
  } catch { }
}

export function loadProgress(
  wizardName: string,
  customDir?: string,
): SavedProgress | null {
  try {
    const filePath = getProgressFilePath(wizardName, customDir);
    const raw = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed) &&
      'currentStepId' in parsed &&
      'answers' in parsed &&
      'history' in parsed &&
      'savedAt' in parsed
    ) {
      return parsed as SavedProgress;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearProgress(
  wizardName: string,
  customDir?: string,
): void {
  try {
    const filePath = getProgressFilePath(wizardName, customDir);
    unlinkSync(filePath);
  } catch { }
}
