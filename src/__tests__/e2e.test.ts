import { describe, it, expect, beforeAll } from 'vitest';
import { execSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { readdirSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

    const result = runJson(`run examples/yaml/basic.yaml --mock '${mock}' --json`);

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

    const result = runJson(`run examples/yaml/conditional.yaml --mock '${mock}' --json`);

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

    const result = runJson(`run examples/yaml/conditional.yaml --mock '${mock}' --json`);

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

    const result = runJson(`run examples/yaml/themed.yaml --mock '${mock}' --json`);

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

    const result = runJson(`run examples/yaml/with-checks.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.answers?.['environment']).toBe('staging');
    expect(result.stepsCompleted).toBe(3);
  });
});

describe('E2E: --dry-run', () => {
  it('outputs step plan without running prompts', () => {
    const output = run('run examples/yaml/basic.yaml --dry-run');

    expect(output).toContain('Dry Run');
    expect(output).toContain('Project Setup Wizard');
    expect(output).toContain('text');
    expect(output).toContain('select');
    expect(output).toContain('multiselect');
    expect(output).toContain('project-name');
    expect(output).toContain('language');
  });

  it('shows onComplete handler in dry-run output', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'grimoire-dryrun-oc-'));
    const configFile = join(tmpDir, 'wizard.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        meta: { name: 'DryRun OnComplete Test' },
        onComplete: './handlers/my-handler.ts',
        steps: [{ id: 'name', type: 'text', message: 'Name?' }],
        actions: [{ name: 'Echo', run: 'echo hello' }],
      }),
    );

    const result = run(`run "${configFile}" --dry-run`);
    expect(result).toContain('onComplete handler');
    expect(result).toContain('./handlers/my-handler.ts');
    expect(result).toContain('Echo');

    rmSync(tmpDir, { recursive: true });
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
    const output = runExpectFail(`run examples/yaml/basic.yaml --mock '{}' --json`);
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

    const result = runJson(`run examples/yaml/extended.yaml --mock '${mock}' --json`);

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

    const result = runJson(`run examples/yaml/basic.yaml --mock '${mock}' --json`);

    expect(result).toHaveProperty('ok', true);
    expect(result).toHaveProperty('wizard');
    expect(result).toHaveProperty('answers');
    expect(result).toHaveProperty('stepsCompleted');
    expect(result).toHaveProperty('format', 'json');
  });

  it('emits structured JSON envelope on error', () => {
    const output = runExpectFail(`run examples/yaml/basic.yaml --mock '{}' --json`);
    const result = JSON.parse(output) as { ok: boolean; error: string };

    expect(result).toHaveProperty('ok', false);
    expect(result).toHaveProperty('error');
    expect(typeof result.error).toBe('string');
  });
});

describe('E2E: validate all example configs', () => {
  const yamlFiles = readdirSync(resolve(EXAMPLES, 'yaml'))
    .filter((f) => f.endsWith('.yaml'))
    .map((f) => `yaml/${f}`);
  const jsonFiles = readdirSync(resolve(EXAMPLES, 'json'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => `json/${f}`);
  const exampleFiles = [...yamlFiles, ...jsonFiles];

  it.each(exampleFiles)('parses %s without errors', async (filename) => {
    const fullPath = resolve(EXAMPLES, filename);
    const config = await loadWizardConfig(fullPath);

    expect(config.meta).toBeDefined();
    expect(config.meta.name).toBeTruthy();
    expect(config.steps.length).toBeGreaterThan(0);

    parseWizardConfig(config);
  });
});

describe('E2E: clack renderer', () => {
  it('runs basic wizard with clack renderer in mock mode', () => {
    const mock = JSON.stringify({
      'project-name': 'clack-test',
      'description': 'Testing clack',
      'language': 'typescript',
      'features': ['linting'],
      'license': 'mit',
      'confirm': true,
    });

    const output = run(`run examples/yaml/basic.yaml --renderer clack --mock '${mock}' --json`);

    // Clack renderer outputs decorative lines before JSON
    expect(output).toContain('┌');
    expect(output).toContain('◇');

    const jsonMatch = output.match(/\n(\{[\s\S]*\})\s*$/);
    const result = JSON.parse(jsonMatch![1]) as { ok: boolean; wizard?: string; answers?: Record<string, unknown> };

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Project Setup Wizard');
    expect(result.answers?.['project-name']).toBe('clack-test');
  });
});

describe('E2E: themed-catppuccin.yaml with preset', () => {
  it('runs wizard with catppuccin preset', () => {
    const mock = JSON.stringify({
      'project-name': 'catppuccin-app',
      'framework': 'nextjs',
      'confirm': true,
    });

    const result = runJson(`run examples/yaml/themed-catppuccin.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Catppuccin Themed Setup');
    expect(result.answers?.['project-name']).toBe('catppuccin-app');
    expect(result.answers?.['framework']).toBe('nextjs');
  });
});

describe('E2E: note step type', () => {
  it('validates config with note steps', () => {
    const output = run('validate examples/yaml/pipeline.yaml');
    expect(output).toContain('Valid wizard config');
    expect(output).toContain('Pipeline Demo');
  });

  it('runs pipeline demo with note steps in mock mode', () => {
    const mock = JSON.stringify({
      'project-name': 'pipeline-app',
      'language': 'typescript',
      'confirm': true,
    });

    const result = runJson(`run examples/yaml/pipeline.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Pipeline Demo');
    expect(result.answers?.['project-name']).toBe('pipeline-app');
  });
});

describe('E2E: wizard pipelines', () => {
  it('runs pipeline with file path configs', async () => {
    const { runPipeline } = await import('../pipeline');

    const results = await runPipeline([
      {
        config: resolve(EXAMPLES, 'yaml', 'themed-catppuccin.yaml'),
        mockAnswers: { 'project-name': 'pipe-app', 'framework': 'astro', 'confirm': true },
      },
    ]);

    expect(results['Catppuccin Themed Setup']).toBeDefined();
    expect(results['Catppuccin Themed Setup']['project-name']).toBe('pipe-app');
  });
});

describe('E2E: clack renderer with preset theme', () => {
  it('combines clack renderer with catppuccin preset', () => {
    const mock = JSON.stringify({
      'project-name': 'clack-catppuccin',
      'framework': 'remix',
      'confirm': true,
    });

    const output = run(`run examples/yaml/themed-catppuccin.yaml --renderer clack --mock '${mock}' --json`);

    expect(output).toContain('┌');
    expect(output).toContain('◇');

    const jsonMatch = output.match(/\n(\{[\s\S]*\})\s*$/);
    const result = JSON.parse(jsonMatch![1]) as { ok: boolean; answers?: Record<string, unknown> };

    expect(result.ok).toBe(true);
    expect(result.answers?.['project-name']).toBe('clack-catppuccin');
    expect(result.answers?.['framework']).toBe('remix');
  });
});

describe('E2E: appstore-screenshot-wizard.yaml with mock answers', () => {
  it('runs with gemini provider and custom devices', () => {
    const mock = JSON.stringify({
      'generation-mode': 'app_store_screenshots',
      'platform-preset': 'custom',
      'providers': ['gemini'],
      'app-name': 'TestApp',
      'app-description': 'A test application for screenshots',
      'visual-style': 'photorealistic',
      'screenshot-count': 5,
      'reference-images': 'none',
      'design-reference': 'none',
      'device-targets': ['iphone', 'ipad'],
      'gemini-image-model': 'gemini-3.1-flash-image-preview',
      'gemini-text-model': 'gemini-2.5-flash',
      'headline-prefix': '',
      'cta-badge': '',
      'want-locales': false,
      'advanced-options': [],
      'confirm-generate': true,
      'save-template-name': '',
    });

    const result = runJson(`run examples/yaml/appstore-screenshot-wizard.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('App Store Screenshot Wizard');
    expect(result.answers?.['app-name']).toBe('TestApp');
    expect(result.answers?.['providers']).toEqual(['gemini']);
    expect(result.answers?.['visual-style']).toBe('photorealistic');
    // OpenAI model steps should be skipped (provider not selected)
    expect(result.answers?.['openai-image-model']).toBeUndefined();
    expect(result.answers?.['openai-text-model']).toBeUndefined();
  });

  it('skips platform-preset for non-app-store mode', () => {
    const mock = JSON.stringify({
      'generation-mode': 'web_ui',
      'providers': ['gemini'],
      'app-name': 'WebApp',
      'app-description': 'A web application for testing',
      'visual-style': 'flat-2d',
      'screenshot-count': 3,
      'reference-images': 'none',
      'design-reference': 'none',
      'device-targets': ['iphone'],
      'gemini-image-model': 'gemini-3.1-flash-image-preview',
      'gemini-text-model': 'gemini-2.5-flash',
      'headline-prefix': '',
      'cta-badge': '',
      'want-locales': false,
      'advanced-options': [],
      'confirm-generate': true,
      'save-template-name': '',
    });

    const result = runJson(`run examples/yaml/appstore-screenshot-wizard.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    // platform-preset should be skipped for non-app_store_screenshots mode
    expect(result.answers?.['platform-preset']).toBeUndefined();
    expect(result.answers?.['generation-mode']).toBe('web_ui');
  });
});

describe('E2E: brief-builder.yaml with mock answers', () => {
  it('runs with iOS platform', () => {
    const mock = JSON.stringify({
      'platform': 'mobile-ios',
      'product-name': 'MyiOSApp',
      'product-description': 'A beautiful iOS application',
      'targets-ios': ['iphone-6.7'],
      'font-family': 'SF Pro, system-ui',
      'color-primary': '#007AFF',
      'color-secondary': '#5856D6',
      'color-accent': '#FF9500',
      'color-background': '#F2F2F7',
      'color-surface': '#FFFFFF',
      'color-text': '#000000',
      'color-text-secondary': '#8E8E93',
      'corner-radius': 'rounded',
      'button-style': 'filled with label',
      'card-style': 'elevated with shadow',
      'spacing': 'comfortable',
      'mood': 'clean-professional',
      'references': '',
      'screen-1-name': 'Home',
      'screen-1-description': 'Main dashboard screen',
      'screen-1-elements': 'nav-bar, cards, tabs',
      'screen-2-name': 'Profile',
      'screen-2-description': 'User profile screen',
      'screen-2-elements': 'avatar, stats, settings',
      'add-more-screens': false,
      'brief-name': 'my-ios-app',
      'confirm-brief': true,
    });

    const result = runJson(`run examples/yaml/brief-builder.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Concept Brief Builder');
    expect(result.answers?.['platform']).toBe('mobile-ios');
    expect(result.answers?.['product-name']).toBe('MyiOSApp');
    // Game-specific steps should be skipped
    expect(result.answers?.['character-1-archetype']).toBeUndefined();
    expect(result.answers?.['game-stats']).toBeUndefined();
    // Web-specific steps should be skipped
    expect(result.answers?.['web-layout']).toBeUndefined();
  });
});

describe('E2E: batch-generate.yaml with mock answers', () => {
  it('configures batch with one app', () => {
    const mock = JSON.stringify({
      'shared-image-model': 'gemini-3.1-flash-image-preview',
      'shared-text-model': 'gemini-2.5-flash',
      'shared-count': 10,
      'shared-providers': ['gemini'],
      'shared-device-targets': ['iphone'],
      'app-1-name': 'FirstApp',
      'app-1-description': 'First app in the batch run',
      'app-1-visual-style': 'auto',
      'app-1-count': 10,
      'add-app-2': false,
      'confirm-batch': true,
    });

    const result = runJson(`run examples/yaml/batch-generate.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Batch Generation Setup');
    expect(result.answers?.['app-1-name']).toBe('FirstApp');
    // App 2 should be skipped
    expect(result.answers?.['app-2-name']).toBeUndefined();
  });
});

describe('E2E: cost-analyzer.yaml with mock answers', () => {
  it('configures full cost report', () => {
    const mock = JSON.stringify({
      'report-type': 'full',
      'output-format': 'summary',
      'save-report': true,
      'confirm-analyze': true,
    });

    const result = runJson(`run examples/yaml/cost-analyzer.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Cost Analysis Report');
    expect(result.answers?.['report-type']).toBe('full');
    // since-date and run-id should be skipped for full report
    expect(result.answers?.['since-date']).toBeUndefined();
    expect(result.answers?.['run-id']).toBeUndefined();
  });
});

describe('E2E: appstore-upload.yaml with mock answers', () => {
  it('collects upload credentials', () => {
    const mock = JSON.stringify({
      'run-id': '2024-01-15T10-30-00',
      'issuer-id': 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',
      'key-id': 'ABC123DEF4',
      'key-path': '/tmp/AuthKey.p8',
      'app-id': '1234567890',
      'localization-id': 'en-US',
      'display-type': 'APP_IPHONE_67',
      'confirm-upload': true,
    });

    const result = runJson(`run examples/yaml/appstore-upload.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('App Store Connect Upload');
    expect(result.answers?.['issuer-id']).toBe('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx');
    expect(result.answers?.['display-type']).toBe('APP_IPHONE_67');
  });
});

describe('E2E: scraper-selector.yaml with mock answers', () => {
  it('selects a scraper and output settings', () => {
    const mock = JSON.stringify({
      'scraper': 'reelshort',
      'output-dir': './data/scraped',
      'output-format': 'json',
      'confirm-scrape': true,
    });

    const result = runJson(`run examples/yaml/scraper-selector.yaml --mock '${mock}' --json`);

    expect(result.ok).toBe(true);
    expect(result.wizard).toBe('Web Scraper CLI');
    expect(result.answers?.['scraper']).toBe('reelshort');
    expect(result.answers?.['output-format']).toBe('json');
  });
});

describe('E2E: onComplete handler', () => {
  it('parses config with onComplete and runs in mock mode (onComplete skipped)', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'grimoire-oncomplete-'));
    const configFile = join(tmpDir, 'wizard.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        meta: { name: 'OnComplete Test' },
        onComplete: './handler.mjs',
        steps: [{ id: 'name', type: 'text', message: 'Name?' }],
      }),
    );

    const result = run(`run "${configFile}" --mock '{"name":"test-value"}' --plain`);
    expect(result).toContain('OnComplete Test');

    rmSync(tmpDir, { recursive: true });
  });
});
