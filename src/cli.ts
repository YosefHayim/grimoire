#!/usr/bin/env node

import { program } from 'commander';
import { loadWizardConfig } from './parser';
import { runWizard } from './runner';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { stringify as yamlStringify } from 'yaml';

program
  .name('grimoire')
  .description('Config-driven CLI wizard framework')
  .version('0.1.0');

program
  .command('run')
  .description('Run a wizard from a config file')
  .argument('<config>', 'Path to wizard config file (.yaml, .json, .js, .ts)')
  .option('-o, --output <path>', 'Write answers to file')
  .option('-f, --format <format>', 'Output format: json, env, yaml', 'json')
  .option('-q, --quiet', 'Suppress header and summary output')
  .action(async (configPath: string, opts: { output?: string; format?: string; quiet?: boolean }) => {
    try {
      const fullPath = resolve(configPath);
      const config = await loadWizardConfig(fullPath);

      const answers = await runWizard(config, { quiet: opts.quiet });

      if (opts.output) {
        const format = opts.format ?? config.output?.format ?? 'json';
        const outputPath = resolve(opts.output);
        const content = formatOutput(answers, format);
        writeFileSync(outputPath, content, 'utf-8');
        console.log(`\n  Answers written to: ${outputPath}\n`);
      }
    } catch (error) {
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
      console.log(`\n  \u2713 Valid wizard config: "${config.meta.name}"`);
      console.log(`  ${String(config.steps.length)} steps defined\n`);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`\n  \u2717 Invalid config: ${error.message}\n`);
      }
      process.exit(1);
    }
  });

program.parse();

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
