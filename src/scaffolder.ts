import { input, select, confirm, number } from '@inquirer/prompts';
import { stringify } from 'yaml';
import { writeFileSync } from 'node:fs';
import { relative } from 'node:path';

// ─── Types for scaffolded config ─────────────────────────────────────────────

interface ScaffoldedOption {
  value: string;
  label: string;
}

interface ScaffoldedStep {
  id: string;
  type: string;
  message: string;
  required?: boolean;
  options?: ScaffoldedOption[];
}

interface ScaffoldedConfig {
  meta: {
    name: string;
    description?: string;
  };
  steps: ScaffoldedStep[];
  output: {
    format: string;
    path?: string;
  };
  theme?: {
    tokens: {
      primary: string;
    };
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STEP_TYPE_CHOICES = [
  { name: 'text', value: 'text' },
  { name: 'select', value: 'select' },
  { name: 'multiselect', value: 'multiselect' },
  { name: 'confirm', value: 'confirm' },
  { name: 'password', value: 'password' },
  { name: 'number', value: 'number' },
  { name: 'search', value: 'search' },
  { name: 'editor', value: 'editor' },
  { name: 'path', value: 'path' },
  { name: 'toggle', value: 'toggle' },
];

const TYPES_WITH_OPTIONS = new Set(['select', 'multiselect', 'search']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isUserCancel(error: unknown): boolean {
  if (error instanceof Error) {
    return (
      error.message.includes('User force closed') ||
      error.name === 'ExitPromptError'
    );
  }
  return false;
}

// ─── Main scaffolder ─────────────────────────────────────────────────────────

export async function scaffoldWizard(outputPath: string): Promise<void> {
  try {
    // 1. Wizard name
    const wizardName = await input({
      message: 'Wizard name',
      validate: (val) => val.trim().length > 0 || 'Name is required',
    });

    // 2. Description (optional)
    const description = await input({
      message: 'Description (optional)',
    });

    // 3. Number of steps
    const rawStepCount = await number({
      message: 'How many steps?',
      default: 3,
      min: 1,
      max: 20,
    });
    const stepCount = rawStepCount ?? 3;

    // 4. Collect steps
    const steps: ScaffoldedStep[] = [];

    for (let i = 0; i < stepCount; i++) {
      console.log(`\n  Step ${String(i + 1)} of ${String(stepCount)}`);

      const stepId = await input({
        message: 'Step ID',
        validate: (val) =>
          /^[a-z][a-z0-9-]*$/.test(val) ||
          'Must be lowercase, start with a letter, hyphens only (e.g., my-step)',
      });

      const stepType = await select({
        message: 'Step type',
        choices: STEP_TYPE_CHOICES,
      });

      const stepMessage = await input({
        message: 'Prompt message',
        validate: (val) => val.trim().length > 0 || 'Message is required',
      });

      const step: ScaffoldedStep = {
        id: stepId,
        type: stepType,
        message: stepMessage,
      };

      if (TYPES_WITH_OPTIONS.has(stepType)) {
        const rawOptions = await input({
          message: 'Options (comma-separated values)',
          validate: (val) =>
            val.split(',').some((v) => v.trim().length > 0) ||
            'At least one option is required',
        });

        step.options = rawOptions
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length > 0)
          .map((v) => ({
            value: v,
            label: v.charAt(0).toUpperCase() + v.slice(1),
          }));
      }

      const isRequired = await confirm({
        message: 'Is this a required field?',
        default: true,
      });

      if (!isRequired) {
        step.required = false;
      }

      steps.push(step);
    }

    // 5. Output format
    const format = await select({
      message: 'Output format',
      choices: [
        { name: 'JSON', value: 'json' },
        { name: 'YAML', value: 'yaml' },
        { name: 'ENV', value: 'env' },
      ],
    });

    // 6. Output file path (optional)
    const outputFilePath = await input({
      message: 'Output file path (optional)',
    });

    // 7. Theme
    const wantTheme = await confirm({
      message: 'Do you want a theme?',
      default: false,
    });

    let primaryColor = '';
    if (wantTheme) {
      primaryColor = await input({
        message: 'Primary color (hex)',
        default: '#5B9BD5',
        validate: (val) =>
          /^#[0-9A-Fa-f]{6}$/.test(val) ||
          'Must be a valid hex color (e.g., #5B9BD5)',
      });
    }

    const meta: ScaffoldedConfig['meta'] = { name: wizardName };
    if (description.length > 0) {
      meta.description = description;
    }

    const outputConfig: ScaffoldedConfig['output'] = { format };
    if (outputFilePath.length > 0) {
      outputConfig.path = outputFilePath;
    }

    const config: ScaffoldedConfig = {
      meta,
      steps,
      output: outputConfig,
    };

    if (wantTheme) {
      config.theme = { tokens: { primary: primaryColor } };
    }

    const yamlContent = stringify(config);
    writeFileSync(outputPath, yamlContent, 'utf-8');

    const displayPath = relative(process.cwd(), outputPath);
    console.log(`\n  \u2713 Created wizard config: ${outputPath}`);
    console.log(`  Run it with: grimoire run ${displayPath}\n`);
  } catch (error) {
    if (isUserCancel(error)) {
      console.log('\n  Wizard creation cancelled.\n');
      return;
    }
    throw error;
  }
}
