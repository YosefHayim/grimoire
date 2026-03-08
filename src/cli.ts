#!/usr/bin/env node

import chalk from 'chalk';
import { program } from 'commander';
import { loadWizardConfig } from './parser';
import { runWizard } from './runner';
import { getVisibleSteps } from './engine';
import { resolveTheme } from './theme';
import { resolveTemplate } from './template';
import { scaffoldWizard } from './scaffolder';
import { bashCompletion, zshCompletion, fishCompletion } from './completions';
import { clearCache } from './cache';
import { listTemplates, deleteTemplate, loadTemplate } from './templates';
import { InkRenderer } from './renderers/ink';
import { ClackRenderer } from './renderers/clack';
import type { WizardRenderer } from './types';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify as yamlStringify } from 'yaml';
import type { Condition, WizardConfig } from './types';

let plainMode = false;

function applyColorMode(opts: { color?: boolean; plain?: boolean }): void {
  if (opts.plain || opts.color === false || process.env['NO_COLOR'] !== undefined) {
    chalk.level = 0;
    plainMode = true;
  }
}

interface RunCommandOpts {
  output?: string;
  format?: string;
  quiet?: boolean;
  dryRun?: boolean;
  mock?: string;
  json?: boolean;
  cache?: boolean;
  renderer?: string;
  template?: string;
}

program
  .name('grimoire')
  .description('Config-driven CLI wizard framework')
  .version('0.3.1')
  .option('--no-color', 'Disable colored output')
  .option('--plain', 'Plain output mode (no colors, no banner)')
  .hook('preAction', () => {
    const globalOpts = program.opts<{ color?: boolean; plain?: boolean }>();
    applyColorMode(globalOpts);
  });

program
  .command('run')
  .description('Run a wizard from a config file')
  .argument('<config>', 'Path to wizard config file (.yaml, .json, .js, .ts)')
  .option('-o, --output <path>', 'Write answers to file')
  .option('-f, --format <format>', 'Output format: json, env, yaml', 'json')
  .option('-q, --quiet', 'Suppress header and summary output')
  .option('--dry-run', 'Show step plan without running the wizard')
  .option('--mock <json>', 'Run wizard with preset answers (JSON string)')
  .option('--json', 'Output structured JSON result to stdout')
  .option('--no-cache', 'Disable answer caching for this run')
  .option('--renderer <type>', 'Renderer to use: inquirer (default), ink, or clack', 'inquirer')
  .option('--template <name>', 'Load a saved template as defaults')
  .action(async (configPath: string, opts: RunCommandOpts) => {
    try {
      const fullPath = resolve(configPath);
      const config = await loadWizardConfig(fullPath);

      if (opts.dryRun) {
        printDryRun(config);
        return;
      }

      const mockAnswers = parseMockAnswers(opts.mock);
      const isJsonOutput = opts.json === true;
      const renderer = resolveRenderer(opts.renderer);

      let templateAnswers: Record<string, unknown> | undefined;
      if (opts.template) {
        templateAnswers = loadTemplate(config.meta.name, opts.template);
        if (!templateAnswers) {
          console.error(`\n  Template "${opts.template}" not found for "${config.meta.name}".\n`);
          process.exit(1);
        }
      }

      const answers = await runWizard(config, {
        renderer,
        quiet: opts.quiet ?? isJsonOutput,
        plain: plainMode,
        mockAnswers,
        templateAnswers,
        cache: opts.cache,
      });

      const rawOutputPath = opts.output ?? config.output?.path;
      const outputPath = rawOutputPath ? resolve(resolveTemplate(rawOutputPath, answers)) : undefined;

      if (isJsonOutput) {
        const stepsCompleted = Object.keys(answers).length;
        const result = {
          ok: true,
          wizard: config.meta.name,
          answers,
          stepsCompleted,
          format: 'json',
        };
        const jsonStr = JSON.stringify(result, null, 2);
        console.log(jsonStr);
        if (outputPath) {
          writeFileSync(outputPath, jsonStr + '\n', 'utf-8');
        }
        return;
      }

      if (outputPath) {
        const format = opts.format ?? config.output?.format ?? 'json';
        const content = formatOutput(answers, format);
        writeFileSync(outputPath, content, 'utf-8');
        if (!opts.quiet) {
          console.log(`\n  Answers written to: ${outputPath}\n`);
        }
      }
    } catch (error) {
      if (opts.json) {
        const result = {
          ok: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };
        console.log(JSON.stringify(result, null, 2));
        process.exit(1);
      }
      if (error instanceof Error) {
        console.error(`\n  Error: ${error.message}\n`);
      }
      process.exit(1);
    }
  });

program
  .command('validate')
  .description('Validate a wizard config file without running it')
  .argument('<config>', 'Path to wizard config file')
  .action(async (configPath: string) => {
    try {
      const fullPath = resolve(configPath);
      const config = await loadWizardConfig(fullPath);
      console.log(`\n  ✓ Valid wizard config: "${config.meta.name}"`);
      console.log(`  ${String(config.steps.length)} steps defined\n`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n  ✗ Invalid config: ${error.message}\n`);
      }
      process.exit(1);
    }
  });

program
  .command('create')
  .description('Interactively scaffold a new wizard config file')
  .argument('[output]', 'Output file path', 'wizard.yaml')
  .action(async (output: string) => {
    try {
      const resolvedPath = resolve(output);
      await scaffoldWizard(resolvedPath);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n  Error: ${error.message}\n`);
      }
      process.exit(1);
    }
  });

program
  .command('demo')
  .description('Run a demo wizard showcasing all step types')
  .action(async () => {
    try {
      const demoPath = resolve(
        fileURLToPath(import.meta.url),
        '..',
        '..',
        'examples',
        'yaml',
        'demo.yaml',
      );
      const config = await loadWizardConfig(demoPath);
      await runWizard(config);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n  Error: ${error.message}\n`);
      }
      process.exit(1);
    }
  });

program
  .command('completion')
  .description('Output shell completion script')
  .argument('<shell>', 'Shell type: bash, zsh, or fish')
  .action((shell: string) => {
    switch (shell) {
      case 'bash':
        console.log(bashCompletion());
        break;
      case 'zsh':
        console.log(zshCompletion());
        break;
      case 'fish':
        console.log(fishCompletion());
        break;
      default:
        console.error(`Unknown shell: ${shell}. Supported: bash, zsh, fish`);
        process.exit(1);
    }
  });

const cacheCommand = program
  .command('cache')
  .description('Manage cached wizard answers');

cacheCommand
  .command('clear')
  .description('Delete cached wizard answers')
  .argument('[name]', 'Wizard name to clear (clears all if omitted)')
  .action((name?: string) => {
    clearCache(name);
    if (name) {
      console.log(`\n  Cache cleared for "${name}".\n`);
    } else {
      console.log('\n  All cached answers cleared.\n');
    }
  });

const templateCommand = program
  .command('template')
  .description('Manage saved wizard answer templates');

templateCommand
  .command('list')
  .description('List saved templates for a wizard')
  .argument('<wizard-name>', 'Wizard name')
  .action((wizardName: string) => {
    const templates = listTemplates(wizardName);
    if (templates.length === 0) {
      console.log(`\n  No templates found for "${wizardName}".\n`);
      return;
    }
    console.log(`\n  Templates for "${wizardName}":\n`);
    for (const t of templates) {
      console.log(`    - ${t}`);
    }
    console.log();
  });

templateCommand
  .command('delete')
  .description('Delete a saved template')
  .argument('<wizard-name>', 'Wizard name')
  .argument('<template-name>', 'Template name')
  .action((wizardName: string, templateName: string) => {
    deleteTemplate(wizardName, templateName);
    console.log(`\n  Template "${templateName}" deleted from "${wizardName}".\n`);
  });

program.parse();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseMockAnswers(
  mockJson: string | undefined,
): Record<string, unknown> | undefined {
  if (mockJson === undefined) {
    return undefined;
  }
  try {
    const parsed: unknown = JSON.parse(mockJson);
    if (!isRecord(parsed)) {
      throw new Error('--mock value must be a JSON object');
    }
    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error(`--mock value is not valid JSON: ${error.message}`);
    }
    throw error;
  }
}

function printDryRun(config: WizardConfig): void {
  const theme = resolveTheme(config.theme);
  const visibleSteps = getVisibleSteps(config, {});

  console.log();
  console.log(`  ${theme.bold('Dry Run:')} "${config.meta.name}"`);
  if (config.meta.description) {
    console.log(`  ${theme.muted(config.meta.description)}`);
  }
  console.log();

  if (config.checks && config.checks.length > 0) {
    console.log(`  ${theme.bold('Pre-flight checks:')}`);
    for (const check of config.checks) {
      console.log(`    ${theme.muted('•')} ${check.name}: ${theme.muted(check.run)}`);
    }
    console.log();
  }

  for (let i = 0; i < config.steps.length; i++) {
    const step = config.steps[i];
    if (!step) continue;

    const isVisible = visibleSteps.some((v) => v.id === step.id);
    const num = String(i + 1).padStart(2, ' ');
    const typeStr = step.type.padEnd(12);
    const idStr = step.id.padEnd(20);
    const msg = `"${step.message}"`;

    const parts: string[] = [];

    if (!isVisible) {
      parts.push('(hidden)');
    }

    if (step.required === false) {
      parts.push('(optional)');
    }

    if (step.type === 'multiselect') {
      if (step.min !== undefined) parts.push(`min:${String(step.min)}`);
      if (step.max !== undefined) parts.push(`max:${String(step.max)}`);
    }

    if (step.when) {
      parts.push(`[when: ${formatCondition(step.when)}]`);
    }

    if (step.type === 'select' && step.routes) {
      const routeParts = Object.entries(step.routes)
        .map(([k, v]) => `${k}→${v}`)
        .join(', ');
      parts.push(`routes: {${routeParts}}`);
    }

    if (step.next) {
      parts.push(`→ ${step.next}`);
    }

    const suffix = parts.length > 0 ? `  ${parts.join('  ')}` : '';
    console.log(`  Step ${num}  ${typeStr} ${idStr} ${msg}${suffix}`);
  }

  console.log();

  if (config.actions && config.actions.length > 0) {
    console.log(`  ${theme.bold('Post-wizard actions:')}`);
    for (const action of config.actions) {
      const label = action.name ?? action.run;
      const whenStr = action.when ? `  [when: ${formatCondition(action.when)}]` : '';
      console.log(`    ${theme.muted('•')} ${label}: ${theme.muted(action.run)}${whenStr}`);
    }
    console.log();
  }
}

function formatCondition(condition: Condition): string {
  if ('all' in condition) {
    return `all(${condition.all.map(formatCondition).join(', ')})`;
  }
  if ('any' in condition) {
    return `any(${condition.any.map(formatCondition).join(', ')})`;
  }
  if ('not' in condition) {
    return `not(${formatCondition(condition.not)})`;
  }
  if ('equals' in condition) {
    return `${condition.field} equals ${String(condition.equals)}`;
  }
  if ('notEquals' in condition) {
    return `${condition.field} notEquals ${String(condition.notEquals)}`;
  }
  if ('includes' in condition) {
    return `${condition.field} includes ${String(condition.includes)}`;
  }
  if ('notIncludes' in condition) {
    return `${condition.field} notIncludes ${String(condition.notIncludes)}`;
  }
  if ('greaterThan' in condition) {
    return `${condition.field} > ${String(condition.greaterThan)}`;
  }
  if ('lessThan' in condition) {
    return `${condition.field} < ${String(condition.lessThan)}`;
  }
  if ('isEmpty' in condition) {
    return `${condition.field} isEmpty`;
  }
  if ('isNotEmpty' in condition) {
    return `${condition.field} isNotEmpty`;
  }
  return 'unknown';
}

function resolveRenderer(rendererName?: string): WizardRenderer | undefined {
  if (!rendererName || rendererName === 'inquirer') {
    return undefined;
  }
  if (rendererName === 'ink') {
    return new InkRenderer();
  }
  if (rendererName === 'clack') {
    return new ClackRenderer();
  }
  throw new Error(`Unknown renderer: "${rendererName}". Supported: inquirer, ink, clack`);
}

function toEnvKey(key: string): string {
  return key.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
}

function formatOutput(answers: Record<string, unknown>, format: string): string {
  switch (format) {
    case 'json':
      return JSON.stringify(answers, null, 2) + '\n';
    case 'env':
      return Object.entries(answers)
        .map(([key, value]) => {
          const strValue = Array.isArray(value)
            ? value.join(',')
            : String(value);
          return `${toEnvKey(key)}=${strValue}`;
        })
        .join('\n') + '\n';
    case 'yaml':
      return yamlStringify(answers);
    default:
      return JSON.stringify(answers, null, 2) + '\n';
  }
}
