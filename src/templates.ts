import { mkdirSync, readFileSync, writeFileSync, unlinkSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { slugify } from './cache';

const TEMPLATES_DIR = join(homedir(), '.config', 'grimoire', 'templates');

function getWizardTemplateDir(wizardName: string): string {
  return join(TEMPLATES_DIR, slugify(wizardName));
}

function getTemplateFilePath(wizardName: string, templateName: string): string {
  return join(getWizardTemplateDir(wizardName), `${slugify(templateName)}.json`);
}

export function saveTemplate(
  wizardName: string,
  templateName: string,
  answers: Record<string, unknown>,
  excludeKeys?: string[],
): void {
  try {
    const dir = getWizardTemplateDir(wizardName);
    mkdirSync(dir, { recursive: true });
    const filePath = getTemplateFilePath(wizardName, templateName);
    let answersToSave = answers;
    if (excludeKeys && excludeKeys.length > 0) {
      const excluded = new Set(excludeKeys);
      answersToSave = Object.fromEntries(
        Object.entries(answers).filter(([k]) => !excluded.has(k)),
      );
    }
    writeFileSync(filePath, JSON.stringify(answersToSave, null, 2) + '\n', 'utf-8');
  } catch { }
}

export function loadTemplate(
  wizardName: string,
  templateName: string,
): Record<string, unknown> | undefined {
  try {
    const filePath = getTemplateFilePath(wizardName, templateName);
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

export function listTemplates(wizardName: string): string[] {
  try {
    const dir = getWizardTemplateDir(wizardName);
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''));
  } catch {
    return [];
  }
}

export function deleteTemplate(wizardName: string, templateName: string): void {
  try {
    const filePath = getTemplateFilePath(wizardName, templateName);
    unlinkSync(filePath);
  } catch { }
}
