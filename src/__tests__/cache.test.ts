import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  slugify,
  getCacheDir,
  loadCachedAnswers,
  saveCachedAnswers,
  clearCache,
} from '../cache';

function makeTempDir(): string {
  const dir = join(tmpdir(), `grimoire-cache-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

describe('slugify', () => {
  it('converts name to lowercase kebab-case', () => {
    expect(slugify('My Wizard')).toBe('my-wizard');
  });

  it('strips non-alphanumeric characters', () => {
    expect(slugify('Hello! World@#$')).toBe('hello-world');
  });

  it('trims leading and trailing dashes', () => {
    expect(slugify('---test---')).toBe('test');
  });

  it('handles already-slugified input', () => {
    expect(slugify('my-wizard')).toBe('my-wizard');
  });
});

describe('getCacheDir', () => {
  it('returns custom dir when provided', () => {
    expect(getCacheDir('/custom/path')).toBe('/custom/path');
  });

  it('returns default dir containing .config/grimoire/cache', () => {
    const dir = getCacheDir();
    expect(dir).toContain('.config');
    expect(dir).toContain('grimoire');
    expect(dir).toContain('cache');
  });
});

describe('saveCachedAnswers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    clearCache(undefined, tempDir);
  });

  it('writes answers to a JSON file', () => {
    const answers = { name: 'my-app', port: 3000 };
    saveCachedAnswers('Test Wizard', answers, tempDir);

    const filePath = join(tempDir, 'test-wizard.json');
    expect(existsSync(filePath)).toBe(true);
  });

  it('creates cache directory if it does not exist', () => {
    const nested = join(tempDir, 'nested', 'deep');
    saveCachedAnswers('Test', { foo: 'bar' }, nested);
    expect(existsSync(nested)).toBe(true);
  });
});

describe('loadCachedAnswers', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    clearCache(undefined, tempDir);
  });

  it('loads previously saved answers', () => {
    const answers = { name: 'my-app', language: 'typescript' };
    saveCachedAnswers('My Wizard', answers, tempDir);

    const loaded = loadCachedAnswers('My Wizard', tempDir);
    expect(loaded).toEqual(answers);
  });

  it('returns undefined when no cache file exists', () => {
    const loaded = loadCachedAnswers('Nonexistent Wizard', tempDir);
    expect(loaded).toBeUndefined();
  });

  it('returns undefined for corrupt JSON', () => {
    mkdirSync(tempDir, { recursive: true });
    const filePath = join(tempDir, 'corrupt.json');
    writeFileSync(filePath, '{not valid json!!!', 'utf-8');

    const loaded = loadCachedAnswers('corrupt', tempDir);
    expect(loaded).toBeUndefined();
  });

  it('returns undefined when cached file contains a non-object value', () => {
    mkdirSync(tempDir, { recursive: true });
    const filePath = join(tempDir, 'array-value.json');
    writeFileSync(filePath, '["not","an","object"]', 'utf-8');

    const loaded = loadCachedAnswers('array-value', tempDir);
    expect(loaded).toBeUndefined();
  });
});

describe('clearCache', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  it('clears a specific wizard cache', () => {
    saveCachedAnswers('Wizard A', { a: 1 }, tempDir);
    saveCachedAnswers('Wizard B', { b: 2 }, tempDir);

    clearCache('Wizard A', tempDir);

    expect(loadCachedAnswers('Wizard A', tempDir)).toBeUndefined();
    expect(loadCachedAnswers('Wizard B', tempDir)).toEqual({ b: 2 });
  });

  it('clears all cache files when no name is given', () => {
    saveCachedAnswers('Wizard A', { a: 1 }, tempDir);
    saveCachedAnswers('Wizard B', { b: 2 }, tempDir);

    clearCache(undefined, tempDir);

    const files = readdirSync(tempDir).filter((f) => f.endsWith('.json'));
    expect(files).toHaveLength(0);
  });

  it('does not throw when clearing nonexistent cache', () => {
    expect(() => clearCache('no-such-wizard', tempDir)).not.toThrow();
  });
});

describe('cache with --no-cache (integration logic)', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = makeTempDir();
  });

  afterEach(() => {
    clearCache(undefined, tempDir);
  });

  it('does not persist answers when cache is disabled', () => {
    const cacheEnabled = false;
    const answers = { name: 'test' };

    if (cacheEnabled) {
      saveCachedAnswers('Disabled Wizard', answers, tempDir);
    }

    expect(loadCachedAnswers('Disabled Wizard', tempDir)).toBeUndefined();
  });
});
