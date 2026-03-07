# grimoire

A wizard's spell book. Your config is the spell, the CLI is the magic.

---

Grimoire is a config-driven CLI wizard framework for Node.js. You write a YAML or JSON file describing your prompts, branching logic, and output format, then grimoire handles the rest: rendering interactive prompts, tracking navigation history, evaluating conditions, and writing structured output. No code required for simple wizards. Full TypeScript support when you need to go deeper.

## Features

- **Config-driven** — define wizards in YAML or JSON, no boilerplate
- **6 input types** — text, select, multiselect, confirm, password, number
- **Conditional branching** — show or skip steps based on previous answers using `when`
- **Route-based navigation** — select steps can branch to different step sequences
- **Back-navigation** — built-in history stack lets users go back through steps
- **Theming** — semantic color tokens and icon overrides for full visual control
- **Structured output** — export answers as JSON, YAML, or `.env` format
- **Validation rules** — required, length, pattern, numeric range
- **TypeScript-first** — full type exports, zero `any` in the public API

## Quick Start

```bash
npm install -g grimoire-wizard
```

Create a file called `setup.yaml`:

```yaml
meta:
  name: Project Setup
  description: Let's get your project configured.

steps:
  - id: project-name
    type: text
    message: What is your project name?
    validate:
      - rule: required
      - rule: minLength
        value: 2

  - id: language
    type: select
    message: Pick a language
    options:
      - { value: typescript, label: TypeScript }
      - { value: javascript, label: JavaScript }

output:
  format: json
```

Then run it:

```bash
npx grimoire run setup.yaml
```

## Installation

```bash
npm install grimoire-wizard
```

Node.js >= 18 required. ESM only.

## CLI Usage

### Running a wizard

```bash
grimoire run <config>
```

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Override the output file path |
| `-f, --format <format>` | Override the output format (`json`, `yaml`, `env`) |
| `-q, --quiet` | Suppress header and summary output |

### Validating a config

```bash
grimoire validate <config>
```

Parses and validates your config file against the schema without running any prompts. Exits with a non-zero code if the config is invalid.

## Config Format

A grimoire config has four top-level sections: `meta`, `theme` (optional), `steps`, and `output`.

```yaml
meta:
  name: My Wizard
  description: A short description shown at startup.

theme:
  tokens:
    primary: "#cba6f7"
    success: "#a6e3a1"
  icons:
    step: "⬤"
    stepDone: "✔"
    stepPending: "◯"
    pointer: "❯"

steps:
  - id: step-id
    type: text
    message: What do you want to know?

output:
  format: json
  path: output.json
```

### Step types

Every step requires `id`, `type`, and `message`. All other fields are optional unless noted.

#### `text`

A free-form text input.

```yaml
- id: projectName
  type: text
  message: What is your project name?
  default: my-app
  validate:
    - rule: required
    - rule: minLength
      value: 2
    - rule: maxLength
      value: 64
    - rule: pattern
      value: "^[a-z0-9-]+$"
      message: Only lowercase letters, numbers, and hyphens
```

#### `select`

A single-choice list.

```yaml
- id: language
  type: select
  message: Pick a language
  options:
    - label: TypeScript
      value: typescript
    - label: JavaScript
      value: javascript
```

#### `multiselect`

A multi-choice list. Returns an array of selected values.

```yaml
- id: features
  type: multiselect
  message: Select features to include
  options:
    - label: ESLint
      value: eslint
    - label: Prettier
      value: prettier
    - label: Husky
      value: husky
```

#### `confirm`

A yes/no prompt. Returns a boolean.

```yaml
- id: useTypeScript
  type: confirm
  message: Use TypeScript?
  default: true
```

#### `password`

A masked text input. The value is included in output but never echoed to the terminal.

```yaml
- id: apiKey
  type: password
  message: Enter your API key
  validate:
    - rule: required
```

#### `number`

A numeric input. Supports `min`, `max`, and `step` directly on the step config.

```yaml
- id: experience
  type: number
  message: Years of experience
  default: 3
  min: 0
  max: 50
```

## Conditions

Use the `when` field on any step to show it only when a condition is met. If the condition evaluates to false, the step is skipped and its `id` is not included in the output.

```yaml
- id: ts-config
  type: select
  message: Which tsconfig preset?
  when:
    field: language
    equals: typescript
  options:
    - { value: strict, label: Strict }
    - { value: base, label: Base }
```

### Available operators

| Operator | Description |
|----------|-------------|
| `equals` | `{ field, equals }` — field value equals the given value |
| `notEquals` | `{ field, notEquals }` — field value does not equal the given value |
| `includes` | `{ field, includes }` — array field includes the given value |
| `notIncludes` | `{ field, notIncludes }` — array field does not include the given value |
| `greaterThan` | `{ field, greaterThan }` — numeric field is greater than the given value |
| `lessThan` | `{ field, lessThan }` — numeric field is less than the given value |
| `isEmpty` | `{ field, isEmpty: true }` — field is empty, null, or an empty array |
| `isNotEmpty` | `{ field, isNotEmpty: true }` — field is not empty |

### Compound conditions

Combine conditions with `all`, `any`, or `not`:

```yaml
when:
  all:
    - field: language
      equals: typescript
    - field: features
      includes: eslint
```

```yaml
when:
  any:
    - field: project-type
      equals: web
    - field: project-type
      equals: api
```

```yaml
when:
  not:
    field: skip-tests
    equals: true
```

## Routes

A `select` step can branch to different step sequences based on the chosen value. Set `routes` to a map of option values to step IDs. Grimoire will jump to the mapped step instead of the next step in the list.

```yaml
- id: projectType
  type: select
  message: What kind of project?
  options:
    - label: Web App
      value: web
    - label: REST API
      value: api
    - label: CLI Tool
      value: cli
    - label: Library
      value: lib
  routes:
    web: webFramework
    api: apiFramework
    cli: cliFramework
    lib: libFramework

- id: webFramework
  type: select
  message: Which web framework?
  options:
    - label: Next.js
      value: nextjs
    - label: Remix
      value: remix

- id: apiFramework
  type: select
  message: Which API framework?
  options:
    - label: Express
      value: express
    - label: Fastify
      value: fastify
```

Steps that aren't reached via routing are skipped and excluded from output.

## Validation

Add a `validate` array to any step. Rules are checked in order and the first failure stops validation.

```yaml
validate:
  - rule: required
  - rule: minLength
    value: 2
  - rule: maxLength
    value: 128
  - rule: pattern
    value: "^[a-zA-Z0-9_-]+$"
    message: Only letters, numbers, underscores, and hyphens allowed
  - rule: min
    value: 0
  - rule: max
    value: 100
```

| Rule | Applies to | Description |
|------|-----------|-------------|
| `required` | all | Value must not be empty |
| `minLength` | text, password | Minimum character count |
| `maxLength` | text, password | Maximum character count |
| `pattern` | text, password | Must match the given regex string |
| `min` | number | Minimum numeric value |
| `max` | number | Maximum numeric value |

All rules accept an optional `message` field to override the default error text.

## Theming

Define a `theme` block in your config to customize colors and icons. Colors accept any CSS hex string. Grimoire maps them to semantic tokens used throughout the UI.

```yaml
theme:
  tokens:
    primary: "#89b4fa"
    success: "#a6e3a1"
    error: "#f38ba8"
    warning: "#fab387"
    info: "#74c7ec"
    muted: "#6c7086"
    accent: "#cba6f7"
  icons:
    step: "⬤"
    stepDone: "✔"
    stepPending: "◯"
    pointer: "❯"
```

All tokens are optional. Any token you omit falls back to the grimoire default.

## Programmatic API

You can run wizards from code using the same engine the CLI uses.

```typescript
import { loadWizardConfig, runWizard, defineWizard } from 'grimoire-wizard'

// Load and run from a config file
const config = await loadWizardConfig('./setup.yaml')
const answers = await runWizard(config)
console.log(answers)
```

### `defineWizard()`

Use `defineWizard()` for type-safe inline config authoring:

```typescript
import { defineWizard, runWizard } from 'grimoire-wizard'

const config = defineWizard({
  meta: {
    name: 'Deploy Config',
    description: 'Configure your deployment target.',
  },
  steps: [
    {
      id: 'environment',
      type: 'select',
      message: 'Target environment?',
      options: [
        { label: 'Production', value: 'prod' },
        { label: 'Staging', value: 'staging' },
      ],
    },
    {
      id: 'confirm',
      type: 'confirm',
      message: 'Ready to deploy?',
      default: false,
    },
  ],
  output: {
    format: 'json',
  },
})

const answers = await runWizard(config, {
  quiet: false,
  onStepComplete: (stepId, value, state) => {
    console.log(`${stepId} answered`)
  },
  onCancel: () => {
    console.log('Wizard cancelled')
    process.exit(1)
  },
})
```

### `RunWizardOptions`

| Option | Type | Description |
|--------|------|-------------|
| `renderer` | `WizardRenderer` | Custom renderer (defaults to `InquirerRenderer`) |
| `quiet` | `boolean` | Suppress title and description output |
| `onStepComplete` | `(stepId, value, state) => void` | Called after each step |
| `onCancel` | `(state) => void` | Called when the user cancels |

### Exported types

```typescript
import type {
  WizardConfig,
  StepConfig,
  TextStepConfig,
  SelectStepConfig,
  MultiSelectStepConfig,
  ConfirmStepConfig,
  PasswordStepConfig,
  NumberStepConfig,
  SelectOption,
  ValidationRule,
  Condition,
  ThemeConfig,
  ResolvedTheme,
  WizardState,
  WizardTransition,
  WizardRenderer,
} from 'grimoire-wizard'
```

### Utility functions

```typescript
import {
  parseWizardConfig,    // Parse and validate a raw config object
  parseWizardYAML,      // Parse a YAML string into a WizardConfig
  evaluateCondition,    // Evaluate a Condition against a state map
  isStepVisible,        // Check if a step should be shown given current answers
  createWizardState,    // Create an initial WizardState from a config
  wizardReducer,        // Pure reducer for wizard state transitions
  getVisibleSteps,      // Get all currently visible steps
  resolveNextStep,      // Resolve the next step ID (respects routes)
  validateStepAnswer,   // Run validation rules against a value
  resolveTheme,         // Merge a ThemeConfig with defaults
} from 'grimoire-wizard'
```

## Output Formats

Set `output.format` in your config or pass `-f` on the CLI.

### JSON

```yaml
output:
  format: json
  path: answers.json
```

```json
{
  "project-name": "my-app",
  "language": "typescript",
  "features": ["eslint", "prettier"]
}
```

### YAML

```yaml
output:
  format: yaml
  path: answers.yaml
```

```yaml
project-name: my-app
language: typescript
features:
  - eslint
  - prettier
```

### env

```yaml
output:
  format: env
  path: .env
```

```
PROJECT_NAME=my-app
LANGUAGE=typescript
FEATURES=eslint,prettier
```

Step IDs are converted to `SCREAMING_SNAKE_CASE`. Array values are joined with commas.

## Examples

The `examples/` directory contains three ready-to-run configs:

### `examples/basic.yaml`

A 6-step project setup wizard covering the core input types: project name (text with validation), description (text), language (select), features (multiselect), license (select), and confirm (confirm). Good starting point for your own configs.

```bash
grimoire run examples/basic.yaml
```

### `examples/conditional.yaml`

An 11-step wizard that branches based on project type. A `select` step with `routes` sends users down one of four paths (web, api, cli, lib), each with its own framework selection step. Additional steps use `when` conditions to show or hide options based on earlier answers.

```bash
grimoire run examples/conditional.yaml
```

### `examples/themed.yaml`

An 8-step wizard styled with the Catppuccin Mocha color palette. Demonstrates all seven color tokens and custom icon overrides. The wizard itself walks through an account setup scenario with username, email, role, experience, interests, newsletter, and password steps.

```bash
grimoire run examples/themed.yaml
```

## License

MIT. PRs welcome.
