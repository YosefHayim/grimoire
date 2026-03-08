import { mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

const DEFAULT_CACHE_DIR = join(homedir(), '.config', 'grimoire', 'cache');

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function getCacheDir(customDir?: string): string {
  return customDir ?? DEFAULT_CACHE_DIR;
}

function getCacheFilePath(wizardName: string, customDir?: string): string {
  return join(getCacheDir(customDir), `${slugify(wizardName)}.json`);
}

export function loadCachedAnswers(
  wizardName: string,
  customDir?: string,
): Record<string, unknown> | undefined {
  try {
    const filePath = getCacheFilePath(wizardName, customDir);
    const raw = readFileSync(filePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function saveCachedAnswers(
  wizardName: string,
  answers: Record<string, unknown>,
  customDir?: string,
): void {
  try {
    const dir = getCacheDir(customDir);
    mkdirSync(dir, { recursive: true });
    const filePath = getCacheFilePath(wizardName, customDir);
    writeFileSync(filePath, JSON.stringify(answers, null, 2) + '\n', 'utf-8');
  } catch { }
}

export function clearCache(wizardName?: string, customDir?: string): void {
  try {
    const dir = getCacheDir(customDir);
    if (wizardName) {
      const filePath = getCacheFilePath(wizardName, customDir);
      unlinkSync(filePath);
    } else {
      const files = readdirSync(dir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          unlinkSync(join(dir, file));
        }
      }
    }
  } catch { }
}
