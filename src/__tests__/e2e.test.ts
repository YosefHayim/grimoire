import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readdirSync } from 'node:fs';
import { parseWizardConfig } from '../schema';
import { loadWizardConfig } from '../parser';

const ROOT = resolve(import.meta.dirname, '..', '..');
const CLI = resolve(ROOT, 'dist', 'cli.js');
const EXAMPLES = resolve(ROOT, 'examples');

function run(args: string): string {
  return execSync(`node ${CLI} ${args}`, {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 15000,
  });
}

function runJson(args: string): { ok: boolean; wizard?: string; answers?: Record<string, unknown>; stepsCompleted?: number; error?: string } {
  const output = run(args);
  return JSON.parse(output) as { ok: boolean; wizard?: string; answers?: Record<string, unknown>; stepsCompleted?: number; error?: string };
}

function runExpectFail(args: string): string {
  try {
    execSync(`node ${CLI} ${args}`, {
      cwd: ROOT,
      encoding: 'utf-8',
      timeout: 15000,
    });
    throw new Error('Expected command to fail');
  } catch (error: unknown) {
    if (error instanceof Error && 'stdout' in error) {
      return (error as Error & { stdout: string }).stdout;
    }
    throw error;
  }
}

beforeAll(() => {
  execSync('npx tsup', { cwd: ROOT, stdio: 'pipe', timeout: 30000 });
});

describe('E2E: basic.yaml with mock answers', () => {
  it('produces correct JSON output with all answers', () => {
    const mock = JSON.stringify({
      'project-name': 'my-app',
      'description': 'A test project',
      'language': 'typescript',
      'features': ['linting', 'testing'],
      'license': 'mit',
      'confirm': true,
    });

    const result = runJson(`run examples/basic.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Project Setup Wizard');
    expect(result.answers?.['project-name']).toBe('my-app');
    expect(result.answers?.['language']).toBe('typescript');
    expect(result.answers?.['features']).toEqual(['linting', 'testing']);
    expect(result.stepsCompleted).toBe(6);
  });
});

describe('E2E: conditional.yaml with mock answers', () => {
  it('follows web route correctly', () => {
    const mock = JSON.stringify({
      'project-name': 'webapp',
      'project-type': 'web',
      'web-framework': 'nextjs',
      'styling': 'tailwind',
      'database': 'postgres',
      'auth': 'jwt',
      'deploy': 'vercel',
      'confirm': true,
    });

    const result = runJson(`run examples/conditional.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.answers?.['project-type']).toBe('web');
    expect(result.answers?.['web-framework']).toBe('nextjs');
    expect(result.answers?.['styling']).toBe('tailwind');
    expect(result.answers?.['cli-features']).toBeUndefined();
  });

  it('follows cli route correctly', () => {
    const mock = JSON.stringify({
      'project-name': 'mycli',
      'project-type': 'cli',
      'cli-features': ['args', 'colors'],
      'deploy': 'npm',
      'confirm': true,
    });

    const result = runJson(`run examples/conditional.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.answers?.['project-type']).toBe('cli');
    expect(result.answers?.['cli-features']).toEqual(['args', 'colors']);
    expect(result.answers?.['web-framework']).toBeUndefined();
  });
});

describe('E2E: themed.yaml with mock answers', () => {
  it('collects all themed wizard answers', () => {
    const mock = JSON.stringify({
      'username': 'testuser',
      'email': 'test@example.com',
      'role': 'developer',
      'experience': 5,
      'interests': ['frontend', 'backend'],
      'newsletter': true,
      'password': 'securepass123',
      'confirm': true,
    });

    const result = runJson(`run examples/themed.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Catppuccin Setup');
    expect(result.answers?.['username']).toBe('testuser');
    expect(result.answers?.['role']).toBe('developer');
    expect(result.answers?.['experience']).toBe(5);
    expect(result.stepsCompleted).toBe(8);
  });
});

describe('E2E: with-checks.yaml with mock', () => {
  it('skips pre-flight checks in mock mode', () => {
    const mock = JSON.stringify({
      'environment': 'staging',
      'version': '1.0.0',
      'confirm': true,
    });

    const result = runJson(`run examples/with-checks.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.answers?.['environment']).toBe('staging');
    expect(result.stepsCompleted).toBe(3);
  });
});

describe('E2E: --dry-run', () => {
  it('outputs step plan without running prompts', () => {
    const output = run('run examples/basic.yaml --dry-run');

    expect(output).toContain('Dry Run');
    expect(output).toContain('Project Setup Wizard');
    expect(output).toContain('text');
    expect(output).toContain('select');
    expect(output).toContain('multiselect');
    expect(output).toContain('project-name');
    expect(output).toContain('language');
  });
});

describe('E2E: invalid config', () => {
  it('returns error for nonexistent file', () => {
    const output = runExpectFail('run nonexistent.yaml --json');
    const result = JSON.parse(output) as { ok: boolean; error: string };

    expect(result.ok).toBe(false);
    expect(result.error).toContain('ENOENT');
  });
});

describe('E2E: mock with missing required answers', () => {
  it('errors when required step has no mock answer and no default', () => {
    const output = runExpectFail(`run examples/basic.yaml --mock '{}' --json`);
    const result = JSON.parse(output) as { ok: boolean; error: string };

    expect(result.ok).toBe(false);
    expect(result.error).toContain('Mock mode');
    expect(result.error).toContain('no answer provided');
  });
});

describe('E2E: extended.yaml (config inheritance)', () => {
  it('merges extended config with base', () => {
    const mock = JSON.stringify({
      'name': 'inherited-project',
      'language': 'python',
      'description': 'Testing extends',
      'confirm': true,
    });

    const result = runJson(`run examples/extended.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Extended Project Wizard');
    expect(result.answers?.['name']).toBe('inherited-project');
    expect(result.answers?.['language']).toBe('python');
    expect(result.stepsCompleted).toBe(4);
  });
});

describe('E2E: --json flag', () => {
  it('emits structured JSON envelope on success', () => {
    const mock = JSON.stringify({
      'project-name': 'json-test',
      'description': 'Testing json',
      'language': 'go',
      'features': ['ci'],
      'license': 'apache-2.0',
      'confirm': true,
    });

    const result = runJson(`run examples/basic.yaml --mock '${mock}' --json`);

    expect(result).toHaveProperty('ok', true);
    expect(result).toHaveProperty('wizard');
    expect(result).toHaveProperty('answers');
    expect(result).toHaveProperty('stepsCompleted');
    expect(result).toHaveProperty('format', 'json');
  });

  it('emits structured JSON envelope on error', () => {
    const output = runExpectFail(`run examples/basic.yaml --mock '{}' --json`);
    const result = JSON.parse(output) as { ok: boolean; error: string };

    expect(result).toHaveProperty('ok', false);
    expect(result).toHaveProperty('error');
    expect(typeof result.error).toBe('string');
  });
});

describe('E2E: validate all example configs', () => {
  const exampleFiles = readdirSync(EXAMPLES)
    .filter((f) => f.endsWith('.yaml') || f.endsWith('.json'));

  it.each(exampleFiles)('parses %s without errors', async (filename) => {
    const fullPath = resolve(EXAMPLES, filename);
    const config = await loadWizardConfig(fullPath);

    expect(config.meta).toBeDefined();
    expect(config.meta.name).toBeTruthy();
    expect(config.steps.length).toBeGreaterThan(0);

    parseWizardConfig(config);
  });
});
