import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import type { SelectChoice } from './types';

// ─── MRU Storage Path ────────────────────────────────────────────────────────

const MRU_DIR = join(homedir(), '.config', 'grimoire', 'mru');

type MruStepData = Record<string, number>;
type MruWizardData = Record<string, MruStepData>;

// ─── Internal Helpers ────────────────────────────────────────────────────────

function getMruFilePath(wizardName: string): string {
  const safeName = wizardName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(MRU_DIR, `${safeName}.json`);
}

function loadMruData(wizardName: string): MruWizardData {
  const filePath = getMruFilePath(wizardName);
  try {
    if (!existsSync(filePath)) {
      return {};
    }
    const raw = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as MruWizardData;
  } catch {
    return {};
  }
}

function saveMruData(wizardName: string, data: MruWizardData): void {
  const filePath = getMruFilePath(wizardName);
  try {
    mkdirSync(MRU_DIR, { recursive: true });
    writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  } catch {
    // Silent fail — MRU is non-critical
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function recordSelection(
  wizardName: string,
  stepId: string,
  value: string | string[],
): void {
  const data = loadMruData(wizardName);
  const stepData: MruStepData = data[stepId] ?? {};

  const values = Array.isArray(value) ? value : [value];
  for (const v of values) {
    stepData[v] = (stepData[v] ?? 0) + 1;
  }

  data[stepId] = stepData;
  saveMruData(wizardName, data);
}

export function getOrderedOptions(
  wizardName: string,
  stepId: string,
  options: SelectChoice[],
): SelectChoice[] {
  const data = loadMruData(wizardName);
  const stepData: MruStepData = data[stepId] ?? {};

  if (Object.keys(stepData).length === 0) {
    return options;
  }

  const separatorIndices = new Map<number, SelectChoice>();
  const selectableOptions: SelectChoice[] = [];

  for (let i = 0; i < options.length; i++) {
    const opt = options[i]!;
    if ('separator' in opt) {
      separatorIndices.set(i, opt);
    } else {
      selectableOptions.push(opt);
    }
  }

  const sorted = [...selectableOptions].sort((a, b) => {
    if (!('value' in a) || !('value' in b)) return 0;
    const countA = stepData[a.value] ?? 0;
    const countB = stepData[b.value] ?? 0;
    return countB - countA;
  });

  const result: SelectChoice[] = [];
  let sortedIndex = 0;

  for (let i = 0; i < options.length; i++) {
    const sep = separatorIndices.get(i);
    if (sep) {
      result.push(sep);
    } else {
      const next = sorted[sortedIndex];
      if (next) {
        result.push(next);
      }
      sortedIndex++;
    }
  }

  return result;
}

export function clearMruData(wizardName: string): void {
  const filePath = getMruFilePath(wizardName);
  try {
    if (existsSync(filePath)) {
      writeFileSync(filePath, '{}', 'utf-8');
    }
  } catch {
    // Silent fail — MRU is non-critical
  }
}
