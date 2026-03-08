<p align="center">
  <img src="grimoire-pro.png" alt="Grimoire" width="720" />
</p>

<h1 align="center">grimoire</h1>

<p align="center">
  A wizard's spell book. Your config is the spell, the CLI is the magic.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/grimoire-wizard"><img src="https://img.shields.io/npm/v/grimoire-wizard" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/npm/l/grimoire-wizard" alt="license" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/node/v/grimoire-wizard" alt="node" /></a>
  <a href="https://github.com/YosefHayim/grimoire/actions"><img src="https://img.shields.io/github/actions/workflow/status/YosefHayim/grimoire/ci.yml?label=tests" alt="tests" /></a>
</p>

---

Grimoire is a config-driven CLI wizard framework for Node.js. You write a YAML or JSON file describing your prompts, branching logic, and output format, then grimoire handles the rest: rendering interactive prompts, tracking navigation history, evaluating conditions, and writing structured output. No code required for simple wizards. Full TypeScript support when you need to go deeper. It works equally well as a standalone CLI tool, a library embedded in your own tooling, or a non-interactive automation step in CI/CD pipelines.

## Features

- **10 input types** — text, select, multiselect, confirm, password, number, search, editor, path, toggle
- **Conditional branching** — show or skip steps based on previous answers using `when` conditions
- **Route-based navigation** — select steps can branch to different step sequences
- **Back-navigation** — built-in history stack lets users go back through steps
- **Step groups** — organize steps into named sections with visual headers
- **Visual progress bar** — step counter shown at each prompt
- **Theming** — 7 semantic color tokens and 4 icon overrides for full visual control
- **Structured output** — export answers as JSON, YAML, or `.env` format
- **Config inheritance** — `extends` keyword merges a base config into your wizard
- **Pre-flight checks** — run shell commands before the wizard starts; abort on failure
- **Plugin system** — register custom step types with their own render and validate logic
- **`$ENV_VAR` resolution** — use environment variables as default values in any step
- **Async validation** — hook into step completion to run async checks (API calls, file system, etc.)
- **`--dry-run` preview** — print the full step plan without running any prompts
- **`--mock` non-interactive mode** — supply preset answers as JSON for CI/CD pipelines
- **`--json` structured output** — emit a machine-readable JSON result envelope for AI agents and scripts
- **JSON Schema** — `grimoire.schema.json` for IDE autocomplete in VS Code and any JSON Schema-aware editor
- **Shell completions** — bash, zsh, and fish completion scripts via `grimoire completion`
- **`grimoire create` scaffolder** — interactively generate a new wizard config file
- **`grimoire demo` showcase** — run a built-in demo that exercises all 10 step types
- **Answer caching** — previous answers become defaults on the next run; password steps are never cached
- **Templates** — save and load named answer presets per wizard
- **MRU ordering** — frequently selected options float to the top of select/multiselect/search lists
- **`optionsFrom`** — load select/multiselect/search options from an external JSON or YAML file
- **Lifecycle hooks** — `onBeforeStep` and `onAfterStep` callbacks in the programmatic API
- **Ink renderer** — alternative renderer with box-drawing characters and progress percentages
- **Clack-style renderer** — connected `│` guide lines, `◇` collapsed steps, `┌`/`└` session framing, bordered note boxes
- **6 theme presets** — catppuccin, dracula, nord, tokyonight, monokai; set `preset` in your theme config
- **Note step type** — display bordered info boxes inline in the wizard flow
- **Progress persistence** — auto-resume from where you left off after Ctrl+C; `--no-resume` to disable
- **Step review screen** — review all answers before final submission; set `review: true` in meta
- **Wizard pipelines** — chain multiple wizard configs, forwarding answers between them
- **ASCII art banner** — figlet + gradient banner shown at startup; suppressed with `--plain`
- **`--plain` / `--no-color` flags** — disable colors and banner for plain-text environments

## Quick Start

```bash
npm install -g grimoire-wizard
```

Create `setup.yaml`:

```yaml
meta:
  name: Project Setup

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

Run it:

```bash
grimoire run setup.yaml
```

Or scaffold a new config interactively:

```bash
grimoire create my-wizard.yaml
```

## Installation

```bash
npm install grimoire-wizard
```

Node.js >= 18 required. ESM only — your project must use `"type": "module"` or import from `.mjs` files.

## CLI Commands

### `grimoire run <config>`

Run a wizard from a config file. Accepts `.yaml`, `.json`, `.js`, or `.ts` files.

```bash
grimoire run setup.yaml
grimoire run setup.yaml -o answers.json
grimoire run setup.yaml --dry-run
grimoire run setup.yaml --mock '{"project-name":"my-app","language":"typescript"}'
grimoire run setup.yaml --json
```

| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Write answers to a file |
| `-f, --format <format>` | Output format: `json`, `yaml`, or `env` (default: `json`) |
| `-q, --quiet` | Suppress header and summary output |
| `--dry-run` | Print the step plan without running any prompts |
| `--mock <json>` | Run non-interactively with preset answers (JSON object string) |
| `--json` | Emit a structured JSON result envelope to stdout |
| `--no-cache` | Disable answer caching for this run |
| `--no-resume` | Disable progress resume for this run |
| `--template <name>` | Load a saved template as default answers |
| `--renderer <type>` | Renderer to use: `inquirer` (default), `ink`, or `clack` |
| `--plain` | Plain output mode (no colors, no banner) |
| `--no-color` | Disable colored output |

#### `--dry-run`

Prints every step with its type, ID, prompt message, visibility status, and any conditions or routes. Useful for reviewing a config before running it.

```
  Dry Run: "Project Setup"

  Step  1  text         project-name         "What is your project name?"
  Step  2  select       language             "Pick a language"
```

#### `--mock`

Runs the wizard without any interactive prompts. Pass a JSON object where keys are step IDs and values are the answers. Steps with defaults will use their defaults if not provided in the mock object.

```bash
grimoire run setup.yaml --mock '{"project-name":"my-app","language":"typescript"}'
```

#### `--json`

Suppresses all interactive output and emits a single JSON object to stdout:

```json
{
  "ok": true,
  "wizard": "Project Setup",
  "answers": {
    "project-name": "my-app",
    "language": "typescript"
  },
  "stepsCompleted": 2,
  "format": "json"
}
```

On error, emits `{ "ok": false, "error": "..." }` and exits with code 1.

---

### `grimoire validate <config>`

Parse and validate a config file without running any prompts. Exits with a non-zero code if the config is invalid.

```bash
grimoire validate setup.yaml
#   Valid wizard config: "Project Setup"
#   2 steps defined
```

---

### `grimoire create [output]`

Interactively scaffold a new wizard config file. Asks for a wizard name, description, number of steps, step types, output format, and optional theme. Writes a ready-to-run YAML file.

```bash
grimoire create                  # writes to wizard.yaml
grimoire create my-wizard.yaml   # writes to my-wizard.yaml
```

---

### `grimoire demo`

Run the built-in demo wizard that exercises all 10 step types, step groups, and theming.

```bash
grimoire demo
```

---

### `grimoire completion <shell>`

Print a shell completion script to stdout. Pipe it into your shell's completion directory.

```bash
grimoire completion bash
grimoire completion zsh
grimoire completion fish
```

See [Shell Completions](#shell-completions) for installation instructions.

---

### `grimoire cache clear [name]`

Delete cached answers for a specific wizard, or all wizards if no name is given.

```bash
grimoire cache clear                  # clears all cached answers
grimoire cache clear "Project Setup"  # clears cache for one wizard
```

---

### `grimoire template list <wizard-name>`

List all saved templates for a wizard.

```bash
grimoire template list "Project Setup"
#   Templates for "Project Setup":
#     - staging
#     - production
```

---

### `grimoire template delete <wizard-name> <template-name>`

Delete a saved template.

```bash
grimoire template delete "Project Setup" staging
```

---

## Config Format

A grimoire config has these top-level sections:

| Section | Required | Description |
|---------|----------|-------------|
| `meta` | yes | Wizard name, version, description |
| `steps` | yes | Array of step definitions |
| `output` | no | Output format and file path |
| `theme` | no | Color tokens and icon overrides |
| `checks` | no | Pre-flight shell commands |
| `extends` | no | Path to a base config to inherit from |

```yaml
meta:
  name: My Wizard
  version: 1.0.0
  description: A short description shown at startup.

extends: ./base.yaml

theme:
  tokens:
    primary: "#cba6f7"
  icons:
    pointer: ">"

checks:
  - name: Git available
    run: git --version
    message: Git is required.

steps:
  - id: project-name
    type: text
    message: What is your project name?

output:
  format: json
  path: answers.json
```

### `meta`

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Wizard name, shown in the header |
| `version` | no | Config version string |
| `description` | no | Short description shown below the name |

---

## Step Types Reference

Every step requires `id`, `type`, and `message`. All other fields are optional unless noted.

### `text`

Free-form text input with optional placeholder, default, and validation.

```yaml
- id: project-name
  type: text
  message: What is your project name?
  placeholder: my-awesome-project
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

### `select`

Single-choice list. Returns the selected `value` string. Options can have a `hint` and can be `disabled`.

```yaml
- id: language
  type: select
  message: Pick a language
  default: typescript
  options:
    - { value: typescript, label: TypeScript }
    - { value: javascript, label: JavaScript }
    - { value: python, label: Python }
    - { value: go, label: Go, hint: "Fast and simple" }
    - { value: rust, label: Rust, disabled: true }
  routes:
    typescript: ts-config
    python: python-version
```

Instead of inline `options`, use `optionsFrom` to load options from an external file. See [Dynamic Options (`optionsFrom`)](#dynamic-options-optionsfrom).

### `multiselect`

Multi-choice list. Returns an array of selected `value` strings. Use `min` and `max` to constrain selection count.

```yaml
- id: features
  type: multiselect
  message: Select features to include
  min: 1
  max: 4
  options:
    - { value: eslint, label: ESLint, hint: Linting }
    - { value: prettier, label: Prettier, hint: Formatting }
    - { value: vitest, label: Vitest, hint: Testing }
    - { value: husky, label: Husky, hint: "Git hooks" }
```

Supports `optionsFrom` as an alternative to inline `options`. See [Dynamic Options (`optionsFrom`)](#dynamic-options-optionsfrom).

### `confirm`

Yes/no prompt. Returns a boolean.

```yaml
- id: use-typescript
  type: confirm
  message: Use TypeScript?
  default: true
```

### `password`

Masked text input. The value is included in output but never echoed to the terminal.

```yaml
- id: api-key
  type: password
  message: Enter your API key
  validate:
    - rule: required
    - rule: minLength
      value: 32
      message: API keys must be at least 32 characters
```

### `number`

Numeric input. Supports `min`, `max`, and `step` constraints.

```yaml
- id: port
  type: number
  message: Dev server port
  default: 3000
  min: 1024
  max: 65535
  step: 1
```

### `search`

Searchable single-choice list with fuzzy filtering. Useful for long option lists.

```yaml
- id: framework
  type: search
  message: Search for a framework
  placeholder: Type to filter...
  options:
    - { value: nextjs, label: "Next.js" }
    - { value: remix, label: Remix }
    - { value: astro, label: Astro }
    - { value: sveltekit, label: SvelteKit }
    - { value: nuxt, label: Nuxt }
    - { value: gatsby, label: Gatsby }
```

Supports `optionsFrom` as an alternative to inline `options`. See [Dynamic Options (`optionsFrom`)](#dynamic-options-optionsfrom).

### `editor`

Opens a multi-line text editor in the terminal. Returns the full text content when the user saves and exits.

```yaml
- id: readme-content
  type: editor
  message: Write your README content
  default: "# My Project\n\nA short description."
  required: false
```

### `path`

File system path input with tab-completion for existing paths.

```yaml
- id: project-dir
  type: path
  message: Where should we create the project?
  placeholder: ./my-project
  default: .
  validate:
    - rule: required
```

### `toggle`

A binary toggle with custom labels for each state. Returns a boolean.

```yaml
- id: dark-mode
  type: toggle
  message: Color scheme
  active: Dark
  inactive: Light
  default: true
```

### `note`

Displays a bordered info box inline in the wizard flow. No input is collected. Useful for showing instructions, warnings, or section headers between prompts.

```yaml
- id: info
  type: note
  message: Setup Complete
  description: "Run npm install to get started"
```

The `message` becomes the box title and `description` is the body text. Note steps are skipped in `--mock` mode and excluded from the answers output.

---

## Dynamic Options (`optionsFrom`)

`select`, `multiselect`, and `search` steps can load their options from an external JSON or YAML file instead of defining them inline. This is useful when the option list is large, shared across multiple wizards, or generated by another tool.

```yaml
- id: framework
  type: select
  message: Pick a framework
  optionsFrom: ./frameworks.json
```

`frameworks.json`:

```json
[
  { "value": "nextjs", "label": "Next.js" },
  { "value": "remix", "label": "Remix" },
  { "value": "astro", "label": "Astro" }
]
```

Or as YAML:

```yaml
# frameworks.yaml
- value: nextjs
  label: Next.js
- value: remix
  label: Remix
- value: astro
  label: Astro
```

```yaml
- id: framework
  type: select
  message: Pick a framework
  optionsFrom: ./frameworks.yaml
```

The path in `optionsFrom` is resolved relative to the config file. Absolute paths are also accepted. You cannot use both `options` and `optionsFrom` on the same step. `optionsFrom` is not supported in `parseWizardYAML`; use `loadWizardConfig` with a file path instead.

---

## Step Groups

Add a `group` field to any step to display a section header when that group starts. The header is shown once, the first time a step in that group is reached.

```yaml
steps:
  - id: name
    type: text
    group: "Project Info"
    message: Project name?

  - id: description
    type: text
    group: "Project Info"
    message: Short description?

  - id: framework
    type: select
    group: "Tech Stack"
    message: Pick a framework
    options:
      - { value: react, label: React }
      - { value: vue, label: Vue }
```

---

## Conditions

Use the `when` field on any step to show it only when a condition is met. Steps that don't pass their condition are skipped and excluded from the output.

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

### Condition operators

| Operator | Shape | Description |
|----------|-------|-------------|
| `equals` | `{ field, equals }` | Field value equals the given value |
| `notEquals` | `{ field, notEquals }` | Field value does not equal the given value |
| `includes` | `{ field, includes }` | Array field includes the given value |
| `notIncludes` | `{ field, notIncludes }` | Array field does not include the given value |
| `greaterThan` | `{ field, greaterThan }` | Numeric field is greater than the given value |
| `lessThan` | `{ field, lessThan }` | Numeric field is less than the given value |
| `isEmpty` | `{ field, isEmpty: true }` | Field is empty, null, or an empty array |
| `isNotEmpty` | `{ field, isNotEmpty: true }` | Field is not empty |

### Compound conditions

Combine conditions with `all`, `any`, or `not`:

```yaml
# All conditions must be true
when:
  all:
    - field: language
      equals: typescript
    - field: features
      includes: eslint

# Any condition must be true
when:
  any:
    - field: project-type
      equals: web
    - field: project-type
      equals: api

# Negate a condition
when:
  not:
    field: skip-tests
    equals: true
```

---

## Routes

A `select` step can branch to different step sequences based on the chosen value. Set `routes` to a map of option values to step IDs. Grimoire jumps to the mapped step instead of the next step in the list.

```yaml
- id: project-type
  type: select
  message: What kind of project?
  options:
    - { value: web, label: "Web App" }
    - { value: api, label: "REST API" }
    - { value: cli, label: "CLI Tool" }
  routes:
    web: web-framework
    api: api-framework
    cli: cli-features

- id: web-framework
  type: select
  message: Which web framework?
  options:
    - { value: nextjs, label: "Next.js" }
    - { value: remix, label: Remix }
  next: deploy

- id: api-framework
  type: select
  message: Which API framework?
  options:
    - { value: express, label: Express }
    - { value: fastify, label: Fastify }
  next: deploy

- id: cli-features
  type: multiselect
  message: CLI features to include
  options:
    - { value: args, label: "Argument parsing" }
    - { value: colors, label: "Colored output" }
  next: deploy

- id: deploy
  type: select
  message: Deployment target?
  options:
    - { value: vercel, label: Vercel }
    - { value: docker, label: Docker }
```

Steps not reached via routing are skipped and excluded from output. Use `next` on any step to override the default sequential flow and jump to a specific step ID. The special value `__done__` ends the wizard immediately.

---

## Validation

Add a `validate` array to any step that supports it (`text`, `password`, `editor`, `path`). Rules are checked in order and the first failure stops validation.

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
| `minLength` | text, password, editor, path | Minimum character count |
| `maxLength` | text, password, editor, path | Maximum character count |
| `pattern` | text, password, editor, path | Must match the given regex string |
| `min` | number | Minimum numeric value |
| `max` | number | Maximum numeric value |

All rules accept an optional `message` field to override the default error text.

---

## Theming

Define a `theme` block in your config to customize colors and icons. Colors accept any 6-digit hex string. All tokens are optional and fall back to grimoire's defaults.

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
    step: "●"
    stepDone: "✔"
    stepPending: "○"
    pointer: "❯"
```

### Color tokens

| Token | Used for |
|-------|---------|
| `primary` | Step headers, active selections |
| `success` | Completion messages, check marks |
| `error` | Validation errors, failed checks |
| `warning` | Cancellation messages |
| `info` | Informational text |
| `muted` | Descriptions, secondary text |
| `accent` | Highlights, group headers |

### Icons

| Icon | Used for |
|------|---------|
| `step` | Current step indicator |
| `stepDone` | Completed step indicator |
| `stepPending` | Upcoming step indicator |
| `pointer` | Selection cursor in lists |

### Theme presets

Instead of specifying individual tokens, pick a built-in preset with a single line:

```yaml
theme:
  preset: catppuccin
```

| Preset | Primary color | Style |
|--------|--------------|-------|
| `default` | `#7C3AED` | Purple |
| `catppuccin` | `#cba6f7` | Soft lavender (Mocha) |
| `dracula` | `#bd93f9` | Purple on dark |
| `nord` | `#88c0d0` | Arctic blue |
| `tokyonight` | `#7aa2f7` | Night blue |
| `monokai` | `#a6e22e` | Vibrant green |

Any `tokens` or `icons` you set alongside `preset` override the preset's values.

---

## Environment Variables

Any `default` field that starts with `$` is treated as an environment variable reference. Grimoire resolves it at runtime from `process.env`. If the variable is not set, the literal string (e.g., `$MY_VAR`) is used as the default.

```yaml
- id: api-url
  type: text
  message: API base URL
  default: $API_BASE_URL

- id: port
  type: number
  message: Port number
  default: $PORT

- id: debug
  type: confirm
  message: Enable debug mode?
  default: $DEBUG_MODE
```

Supported on: `text`, `select`, `search`, `editor`, `path`, `number`, `confirm`, `toggle`.

---

## Config Inheritance

Use `extends` to inherit from a base config. The child config's `steps`, `theme`, `output`, and `checks` replace the base config's values entirely. The `meta` from the child takes precedence.

```yaml
# base.yaml
meta:
  name: Base Wizard
theme:
  tokens:
    primary: "#7C3AED"
steps:
  - id: name
    type: text
    message: Project name?
    validate:
      - rule: required
output:
  format: json
```

```yaml
# extended.yaml
extends: ./base.yaml

meta:
  name: Extended Wizard
  description: Extends base config with additional steps

steps:
  - id: name
    type: text
    message: Project name?
    validate:
      - rule: required

  - id: language
    type: select
    message: Language?
    options:
      - { value: typescript, label: TypeScript }
      - { value: javascript, label: JavaScript }

  - id: confirm
    type: confirm
    message: Create project?
    next: __done__

output:
  format: yaml
  path: project-config.yaml
```

The `extends` path is resolved relative to the child config file.

---

## Pre-flight Checks

The `checks` block runs shell commands before the wizard starts. If any command exits with a non-zero code, grimoire prints the associated `message` and aborts. Pre-flight checks are skipped in `--mock` mode.

```yaml
checks:
  - name: Node.js installed
    run: node --version
    message: "Node.js is required. Install from https://nodejs.org"

  - name: Git available
    run: git --version
    message: "Git is required. Install from https://git-scm.com"

  - name: Docker running
    run: docker info
    message: "Docker must be running before deployment."
```

| Field | Required | Description |
|-------|----------|-------------|
| `name` | yes | Display name shown in the pre-flight output |
| `run` | yes | Shell command to execute |
| `message` | yes | Error message shown if the command fails |

---

## Plugin System

Plugins let you register custom step types with their own render and validate logic. A plugin is a plain object with a `name` and a `steps` map.

```typescript
import { runWizard, defineWizard } from 'grimoire-wizard'
import type { GrimoirePlugin } from 'grimoire-wizard'

const myPlugin: GrimoirePlugin = {
  name: 'my-plugin',
  steps: {
    'date-picker': {
      async render(config, state, theme) {
        // config is the raw step config object
        // state is the current WizardState
        // theme is the ResolvedTheme
        const answer = await myDatePickerPrompt(config.message as string)
        return answer
      },
      validate(value, config) {
        if (!value) return 'A date is required'
        return null  // null means valid
      },
    },
  },
}

const config = defineWizard({
  meta: { name: 'My Wizard' },
  steps: [
    {
      id: 'launch-date',
      type: 'date-picker',
      message: 'Pick a launch date',
    } as any,
  ],
  output: { format: 'json' },
})

const answers = await runWizard(config, {
  plugins: [myPlugin],
})
```

Built-in step types (`text`, `select`, `multiselect`, `confirm`, `password`, `number`, `search`, `editor`, `path`, `toggle`) cannot be overridden by plugins.

### Plugin interfaces

```typescript
interface GrimoirePlugin {
  name: string;
  steps: Record<string, StepPlugin>;
}

interface StepPlugin {
  render(
    config: Record<string, unknown>,
    state: WizardState,
    theme: ResolvedTheme
  ): Promise<unknown>;
  validate?(value: unknown, config: Record<string, unknown>): string | null;
}
```

---

## Programmatic API

### Core functions

```typescript
import { loadWizardConfig, runWizard, defineWizard } from 'grimoire-wizard'

// Load from a file (YAML, JSON, JS, or TS)
const config = await loadWizardConfig('./setup.yaml')
const answers = await runWizard(config)
console.log(answers)
```

### `defineWizard(config)`

Identity function that returns the config unchanged. Its value is type inference: TypeScript will check your config object against `WizardConfig` at compile time.

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
  output: { format: 'json' },
})

const answers = await runWizard(config, {
  onStepComplete: (stepId, value, state) => {
    console.log(`${stepId} answered: ${String(value)}`)
  },
  onCancel: (state) => {
    console.log('Wizard cancelled')
    process.exit(1)
  },
})
```

### `RunWizardOptions`

| Option | Type | Description |
|--------|------|-------------|
| `renderer` | `WizardRenderer` | Custom renderer (defaults to `InquirerRenderer`) |
| `quiet` | `boolean` | Suppress title, description, and summary output |
| `plain` | `boolean` | Disable colors and banner (plain-text mode) |
| `mockAnswers` | `Record<string, unknown>` | Preset answers for non-interactive mode |
| `templateAnswers` | `Record<string, unknown>` | Pre-loaded template answers used as defaults |
| `onBeforeStep` | `(stepId, step, state) => void \| Promise<void>` | Called before each step is rendered |
| `onAfterStep` | `(stepId, value, state) => void \| Promise<void>` | Called after each step completes, before moving on |
| `onStepComplete` | `(stepId, value, state) => void` | Called after each step completes |
| `onCancel` | `(state) => void` | Called when the user cancels with Ctrl+C |
| `plugins` | `GrimoirePlugin[]` | Custom step type plugins |
| `asyncValidate` | `(stepId, value, answers) => Promise<string \| null>` | Async validation hook called after each step |
| `cache` | `boolean \| { dir?: string }` | Enable/disable answer caching, or set a custom cache directory (default: `true`) |
| `mru` | `boolean` | Enable/disable MRU ordering for select/multiselect/search steps (default: `true`) |

### Async validation

The `asyncValidate` hook runs after each step's synchronous validation passes. Return a string to show as an error and re-prompt the step, or return `null` to accept the value.

```typescript
const answers = await runWizard(config, {
  asyncValidate: async (stepId, value, answers) => {
    if (stepId === 'username') {
      const taken = await checkUsernameAvailability(value as string)
      if (taken) return 'That username is already taken'
    }
    return null
  },
})
```

### Lifecycle hooks

`onBeforeStep` fires just before a step is rendered. `onAfterStep` fires after the user answers but before the wizard advances. Both can be async.

```typescript
const answers = await runWizard(config, {
  onBeforeStep: async (stepId, step, state) => {
    console.log(`About to render: ${stepId}`)
  },
  onAfterStep: async (stepId, value, state) => {
    await logAnswer(stepId, value)
  },
})
```

### Ink renderer

The `InkRenderer` is an alternative to the default `InquirerRenderer`. It uses box-drawing characters, a filled progress bar with percentage, and formatted step headers.

```typescript
import { runWizard } from 'grimoire-wizard'
import { InkRenderer } from 'grimoire-wizard/renderers/ink'

const answers = await runWizard(config, {
  renderer: new InkRenderer(),
})
```

Or from the CLI:

```bash
grimoire run setup.yaml --renderer ink
```

### Clack renderer

The `ClackRenderer` gives your wizard a clack-style visual flow: a continuous `│` guide line connects all prompts, answered steps collapse to a single `◇ Question · answer` line, and the session opens with a `┌` header and closes with a `└` outro. Note steps render as bordered boxes. Spinners animate during async operations.

```bash
grimoire run setup.yaml --renderer clack
```

Or programmatically:

```typescript
import { runWizard } from 'grimoire-wizard'
import { ClackRenderer } from 'grimoire-wizard'

const answers = await runWizard(config, {
  renderer: new ClackRenderer(),
})
```

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
  SearchStepConfig,
  EditorStepConfig,
  PathStepConfig,
  ToggleStepConfig,
  NoteStepConfig,
  SelectOption,
  ValidationRule,
  Condition,
  ThemeConfig,
  ResolvedTheme,
  WizardState,
  WizardTransition,
  WizardRenderer,
  WizardEvent,
  PreFlightCheck,
  RunWizardOptions,
  GrimoirePlugin,
  StepPlugin,
} from 'grimoire-wizard'
```

### Utility functions

```typescript
import {
  parseWizardConfig,    // Parse and validate a raw config object against the schema
  parseWizardYAML,      // Parse a YAML string into a WizardConfig
  evaluateCondition,    // Evaluate a Condition against an answers map
  isStepVisible,        // Check if a step should be shown given current answers
  createWizardState,    // Create an initial WizardState from a config
  wizardReducer,        // Pure reducer for wizard state transitions
  getVisibleSteps,      // Get all currently visible steps given current answers
  resolveNextStep,      // Resolve the next step ID (respects routes and next fields)
  validateStepAnswer,   // Run validation rules against a value
  resolveTheme,         // Merge a ThemeConfig with defaults into a ResolvedTheme
  resolveEnvDefault,    // Resolve a $ENV_VAR string from process.env
  runPreFlightChecks,   // Run a checks array and throw on first failure
  registerPlugin,       // Register a GrimoirePlugin into the global registry
  getPluginStep,        // Look up a registered StepPlugin by type name
  clearPlugins,         // Clear all registered plugins
  // Cache
  loadCachedAnswers,    // Load cached answers for a wizard by name
  saveCachedAnswers,    // Save answers to the cache for a wizard
  clearCache,           // Delete cached answers (one wizard or all)
  // MRU
  recordSelection,      // Record a user's selection for MRU tracking
  getOrderedOptions,    // Return options sorted by selection frequency
  // Templates
  saveTemplate,         // Save a named answer preset for a wizard
  loadTemplate,         // Load a named answer preset
  listTemplates,        // List all saved template names for a wizard
  deleteTemplate,       // Delete a named template
  // Banner
  renderBanner,         // Render the ASCII art banner for a wizard name
  // Renderers
  ClackRenderer,        // Clack-style renderer with guide lines and collapsed steps
  // Pipelines
  runPipeline,          // Chain multiple wizard configs in sequence
  // Progress persistence
  saveProgress,         // Save wizard progress to disk
  loadProgress,         // Load saved wizard progress
  clearProgress,        // Delete saved wizard progress
} from 'grimoire-wizard'
```

---

## Answer Caching

Grimoire remembers your answers between runs. The next time you run the same wizard, cached answers become the default values for each step, so you only need to change what's different.

Password steps are never cached.

Cache files are stored in `~/.config/grimoire/cache/` as JSON, one file per wizard (named by slugifying the wizard's `meta.name`).

Caching is enabled by default. Disable it for a single run with `--no-cache`:

```bash
grimoire run setup.yaml --no-cache
```

Clear the cache from the CLI:

```bash
grimoire cache clear                  # clears all wizards
grimoire cache clear "Project Setup"  # clears one wizard
```

Control caching in the programmatic API via the `cache` option:

```typescript
// Disable caching entirely
const answers = await runWizard(config, { cache: false })

// Use a custom cache directory
const answers = await runWizard(config, { cache: { dir: '/tmp/my-cache' } })
```

---

## Progress Persistence

If you press Ctrl+C mid-wizard, grimoire saves your progress automatically. The next time you run the same wizard, it resumes from where you left off, with all previous answers pre-filled.

Progress files are stored in `~/.config/grimoire/progress/` as JSON, one file per wizard.

Disable resume for a single run:

```bash
grimoire run setup.yaml --no-resume
```

Or programmatically:

```typescript
const answers = await runWizard(config, { resume: false })
```

Manage progress files directly:

```typescript
import { saveProgress, loadProgress, clearProgress } from 'grimoire-wizard'

const saved = loadProgress('Project Setup')
clearProgress('Project Setup')
```

---

## Review Screen

Set `review: true` in your wizard's `meta` block to show a summary of all answers before the wizard completes. The user can confirm or go back to change any answer.

```yaml
meta:
  name: Deploy Wizard
  review: true
```

The review screen lists every answered step with its question and value. Selecting an answer jumps back to that step. Confirming submits the wizard.

---

## Wizard Pipelines

Pipelines let you chain multiple wizard configs in sequence. Each wizard's answers are forwarded to the next, so later wizards can reference earlier answers in their `when` conditions and `default` values.

```typescript
import { runPipeline } from 'grimoire-wizard'

const results = await runPipeline([
  { config: setupConfig },
  { config: deployConfig, when: { field: 'name', equals: 'my-app' } },
])
```

Each entry in the array accepts:

| Field | Type | Description |
|-------|------|-------------|
| `config` | `WizardConfig` | The wizard config to run |
| `mockAnswers` | `Record<string, unknown>` | Preset answers for this stage |
| `when` | `Condition` | Skip this stage if the condition is not met |

`runPipeline` returns an array of answer objects, one per stage that ran. Stages that are skipped via `when` return `null`.

---

## Templates

Templates are named answer presets. Save a set of answers under a name, then load them as defaults on future runs. Useful for environments like staging vs. production that share the same wizard but need different values.

Templates are stored in `~/.config/grimoire/templates/<wizard-slug>/`.

### Saving a template

Templates are saved programmatically after a run:

```typescript
import { runWizard, saveTemplate } from 'grimoire-wizard'

const answers = await runWizard(config)
saveTemplate('Project Setup', 'production', answers)
```

### Loading a template via CLI

```bash
grimoire run setup.yaml --template production
```

Template answers become the defaults for each step. The user can still change any value.

### Managing templates

```bash
grimoire template list "Project Setup"
grimoire template delete "Project Setup" production
```

### Programmatic API

```typescript
import { saveTemplate, loadTemplate, listTemplates, deleteTemplate } from 'grimoire-wizard'

saveTemplate('Project Setup', 'staging', answers)

const staging = loadTemplate('Project Setup', 'staging')

const names = listTemplates('Project Setup')
// ['production', 'staging']

deleteTemplate('Project Setup', 'staging')
```

---

## MRU (Most Recently Used) Ordering

For `select`, `multiselect`, and `search` steps, grimoire tracks which options you pick and floats the most frequently chosen ones to the top of the list on subsequent runs. Options you've never picked stay in their original order below.

MRU data is stored in `~/.config/grimoire/mru/` and is per-wizard, per-step.

MRU ordering is enabled by default. Disable it programmatically:

```typescript
const answers = await runWizard(config, { mru: false })
```

There's no CLI flag for this. It's a programmatic-only option.

---

## Banner

When grimoire starts a wizard in interactive mode, it renders the wizard name as ASCII art using figlet with a purple-to-blue-to-green gradient. If figlet rendering fails for any reason, it falls back to plain bold text.

The banner is suppressed in `--quiet` mode and in `--plain` mode. Use `--plain` to get clean, color-free output suitable for terminals that don't support ANSI codes or for piping:

```bash
grimoire run setup.yaml --plain
```

The `NO_COLOR` environment variable also disables colors and the banner:

```bash
NO_COLOR=1 grimoire run setup.yaml
```

---

## CI/CD Integration

Combine `--mock` and `--json` to run wizards non-interactively in pipelines and capture structured output.

```bash
# Run with preset answers, capture JSON output
grimoire run deploy.yaml \
  --mock '{"environment":"staging","version":"1.2.3","confirm":true}' \
  --json > deploy-answers.json

# Use the output in subsequent steps
cat deploy-answers.json | jq '.answers.environment'
```

The `--json` flag always emits to stdout. On success:

```json
{
  "ok": true,
  "wizard": "Deployment Wizard",
  "answers": { "environment": "staging", "version": "1.2.3" },
  "stepsCompleted": 3,
  "format": "json"
}
```

On failure:

```json
{
  "ok": false,
  "error": "Mock mode: no answer provided for step \"confirm\" and no default available"
}
```

Exit code is `0` on success and `1` on failure, so pipelines can branch on the result.

---

## JSON Schema

Grimoire ships a JSON Schema at `schema/grimoire.schema.json`. Add it to your editor for autocomplete and inline validation of config files.

### VS Code

Add this to your workspace `.vscode/settings.json`:

```json
{
  "yaml.schemas": {
    "./node_modules/grimoire-wizard/schema/grimoire.schema.json": "*.wizard.yaml"
  }
}
```

Or add a `$schema` comment at the top of any config file:

```yaml
# yaml-language-server: $schema=./node_modules/grimoire-wizard/schema/grimoire.schema.json
meta:
  name: My Wizard
```

### Other editors

Point your editor's JSON Schema support at:

```
./node_modules/grimoire-wizard/schema/grimoire.schema.json
```

---

## Shell Completions

### Bash

```bash
grimoire completion bash > ~/.bash_completion.d/grimoire
source ~/.bash_completion.d/grimoire
```

Or add to your `.bashrc`:

```bash
eval "$(grimoire completion bash)"
```

### Zsh

```bash
grimoire completion zsh > ~/.zsh/completions/_grimoire
```

Make sure `~/.zsh/completions` is in your `$fpath`. Then reload:

```bash
autoload -Uz compinit && compinit
```

### Fish

```bash
grimoire completion fish > ~/.config/fish/completions/grimoire.fish
```

---

## Examples

The `examples/` directory contains ready-to-run configs in both YAML (`examples/yaml/`) and JSON (`examples/json/`) formats. Every YAML example (except `base.yaml` and `extended.yaml`, which use `extends:`) has a JSON equivalent.

### `examples/yaml/basic.yaml`

A 6-step project setup wizard covering the core input types: project name (text with validation and pattern), description (optional text), language (select with default), features (multiselect with min), license (select), and confirm. Good starting point for your own configs.

```bash
grimoire run examples/yaml/basic.yaml
grimoire run examples/json/basic.json   # JSON equivalent
```

### `examples/yaml/conditional.yaml`

An 11-step wizard that branches based on project type. A `select` step with `routes` sends users down one of four paths (web, api, cli, lib), each with its own framework or feature selection step. Additional steps use `when` conditions to show or hide options based on earlier answers.

```bash
grimoire run examples/yaml/conditional.yaml
```

### `examples/yaml/themed.yaml`

An 8-step account setup wizard styled with the Catppuccin Mocha color palette. Demonstrates all 7 color tokens and custom icon overrides. Steps cover username, email, role, experience, interests, newsletter, password, and confirm.

```bash
grimoire run examples/yaml/themed.yaml
```

### `examples/yaml/demo.yaml`

The built-in demo config used by `grimoire demo`. Exercises all 10 step types across 4 named groups: Text Inputs (text, editor, path, password), Selections (select, multiselect, search), Toggles and Numbers (toggle, number), and Confirmation (confirm).

```bash
grimoire run examples/yaml/demo.yaml
# or
grimoire demo
```

### `examples/yaml/all-features.yaml`

A focused showcase of the newer step types: search, path, toggle, editor, and number, organized into two groups (Project Setup and Configuration).

```bash
grimoire run examples/yaml/all-features.yaml
```

### `examples/yaml/base.yaml`

A minimal base config with a name step, optional description, and confirm. Intended to be inherited via `extends`.

```bash
grimoire run examples/yaml/base.yaml
```

### `examples/yaml/extended.yaml`

Extends `base.yaml` and adds a language select step. Demonstrates how `extends` merges configs and how the child's `output` and `meta` override the base.

```bash
grimoire run examples/yaml/extended.yaml
```

### `examples/yaml/with-checks.yaml`

A deployment wizard with two pre-flight checks (Node.js and Git). Shows how `checks` abort the wizard before any prompts if the environment isn't ready.

```bash
grimoire run examples/yaml/with-checks.yaml
```

### `examples/yaml/themed-catppuccin.yaml`

A 3-step project setup wizard using the `catppuccin` theme preset. Shows how a single `preset` line replaces manual token configuration.

```bash
grimoire run examples/yaml/themed-catppuccin.yaml
grimoire run examples/json/themed-catppuccin.json   # JSON equivalent
```

### `examples/yaml/pipeline.yaml`

A multi-stage wizard demonstrating the pipeline concept using `note` steps as stage dividers. Shows how to structure a wizard that covers multiple logical phases in a single config.

```bash
grimoire run examples/yaml/pipeline.yaml
```

---

## License

MIT. PRs welcome.
