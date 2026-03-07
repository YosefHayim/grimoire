# Grimoire — AI Agent & Developer Quick Reference

> Config-driven CLI wizard framework. Define interactive terminal wizards in YAML. No code required.

## Install & Run

```bash
npm install -g grimoire-wizard
grimoire run wizard.yaml          # run a wizard
grimoire validate wizard.yaml     # validate config
grimoire create                   # scaffold new config interactively
grimoire demo                     # see all 10 step types in action
grimoire run wizard.yaml --dry-run   # preview steps without running
grimoire run wizard.yaml --mock '{"name":"test"}' --json  # CI mode
```

## Config Structure

```yaml
meta:
  name: "My Wizard"
  description: "Optional description"

# Optional: pre-flight checks (fail = abort)
checks:
  - name: "Git installed"
    run: "git --version"
    message: "Git is required"

# Optional: inherit from base config
extends: ./base.yaml

# Optional: theme colors (hex) and icons
theme:
  tokens:
    primary: "#89b4fa"
    success: "#a6e3a1"
    error: "#f38ba8"

steps:
  - id: step-id          # unique, used in conditions and output
    type: text            # see Step Types below
    message: "Prompt text shown to user"
    group: "Section Name" # optional: groups steps under headers
    when:                 # optional: show/skip based on previous answers
      field: other-step
      equals: some-value
    next: another-step    # optional: jump to step (default: next in list)
    default: "value"      # optional: pre-filled default
    validate:             # optional: validation rules
      - rule: required

# Optional: write answers to file
output:
  format: json            # json | yaml | env
  path: output.json

# Optional: run commands after wizard completes
actions:
  - name: "Setup project"
    run: "mkdir -p {{project-name}}"  # {{stepId}} = answer interpolation
    when:
      field: confirm
      equals: true
```

## Step Types

| Type | Returns | Key Options |
|------|---------|-------------|
| `text` | string | `placeholder`, `default`, `validate` |
| `password` | string | `validate` (masked input) |
| `number` | number | `default`, `min`, `max`, `step` |
| `select` | string | `options[]`, `default`, `routes` (branching) |
| `multiselect` | string[] | `options[]`, `default[]`, `min`, `max` |
| `confirm` | boolean | `default` |
| `toggle` | boolean | `default`, `active`, `inactive` (custom labels) |
| `search` | string | `options[]`, `placeholder` (fuzzy search) |
| `editor` | string | `default`, `validate` (opens $EDITOR) |
| `path` | string | `default`, `placeholder`, `validate` (file path) |

Options format: `{ value: "id", label: "Display Text", hint: "optional" }`

## Conditions (when)

```yaml
# Simple
when: { field: language, equals: typescript }
when: { field: features, includes: eslint }
when: { field: port, greaterThan: 1024 }
when: { field: name, isEmpty: true }

# Compound
when:
  all:
    - { field: platform, equals: web }
    - { field: mode, notEquals: production }
when:
  any:
    - { field: env, equals: staging }
    - { field: env, equals: production }
when:
  not: { field: skip, equals: true }
```

Operators: `equals`, `notEquals`, `includes`, `notIncludes`, `greaterThan`, `lessThan`, `isEmpty`, `isNotEmpty`

## Routes (branching)

```yaml
- id: platform
  type: select
  options:
    - { value: web, label: Web }
    - { value: ios, label: iOS }
  routes:
    web: web-config    # jump to web-config step
    ios: native-config # jump to native-config step
```

Use `next: __done__` to end the wizard at any step.

## Validation

```yaml
validate:
  - rule: required
  - rule: minLength
    value: 2
  - rule: maxLength
    value: 64
  - rule: pattern
    value: "^[a-z0-9-]+$"
    message: "Only lowercase, numbers, hyphens"
  - rule: min       # number steps
    value: 0
  - rule: max
    value: 100
```

## Template Interpolation

Use `{{stepId}}` in step messages and action commands. Resolved at runtime from previous answers.

```yaml
- id: name
  type: text
  message: "Project name?"

- id: confirm
  type: confirm
  message: "Create {{name}}?"  # shows "Create my-app?"
```

## Environment Variables

Defaults support `$ENV_VAR` resolution:

```yaml
- id: token
  type: text
  default: "$API_TOKEN"  # reads from process.env.API_TOKEN
```

## CLI Flags

| Flag | Description |
|------|-------------|
| `-o, --output <path>` | Write answers to file |
| `-f, --format <fmt>` | Output format: json, yaml, env |
| `-q, --quiet` | Suppress UI output |
| `--dry-run` | Preview step plan |
| `--mock <json>` | Non-interactive with preset answers |
| `--json` | Structured JSON output (for AI agents) |

## Programmatic Usage

```typescript
import { loadWizardConfig, runWizard, defineWizard } from 'grimoire-wizard';

const config = await loadWizardConfig('./wizard.yaml');
const answers = await runWizard(config, {
  quiet: false,
  mockAnswers: { name: 'test' },          // skip prompts
  asyncValidate: async (stepId, value) => { // runtime validation
    if (stepId === 'email') {
      const exists = await checkEmail(value);
      return exists ? 'Email taken' : null;
    }
    return null;
  },
  onStepComplete: (stepId, value) => console.log(stepId, value),
  onCancel: () => process.exit(1),
});
```

## JSON Schema (IDE Autocomplete)

Add to VS Code settings:

```json
{
  "yaml.schemas": {
    "./node_modules/grimoire-wizard/schema/grimoire.schema.json": "*.grimoire.yaml"
  }
}
```

Or inline in YAML:

```yaml
# yaml-language-server: $schema=./node_modules/grimoire-wizard/schema/grimoire.schema.json
```

## Complete Example

```yaml
meta:
  name: "Deploy Config"
  description: "Configure deployment target"

checks:
  - name: "Docker running"
    run: "docker info"
    message: "Start Docker first"

theme:
  tokens:
    primary: "#7c3aed"
    success: "#10b981"
    error: "#ef4444"

steps:
  - id: environment
    type: select
    group: "Target"
    message: "Deploy to?"
    options:
      - { value: staging, label: "Staging" }
      - { value: production, label: "Production" }

  - id: tag
    type: text
    group: "Target"
    message: "Version tag for {{environment}}"
    default: "latest"
    validate:
      - rule: required
      - rule: pattern
        value: "^(latest|v\\d+\\.\\d+\\.\\d+)$"
        message: "Must be 'latest' or semver (v1.0.0)"

  - id: replicas
    type: number
    group: "Scaling"
    message: "Number of replicas"
    default: 3
    min: 1
    max: 10

  - id: notify
    type: confirm
    group: "Notifications"
    message: "Send Slack notification?"
    default: true

  - id: confirm
    type: confirm
    group: "Review"
    message: "Deploy {{tag}} to {{environment}} ({{replicas}} replicas)?"
    next: __done__

output:
  format: json
  path: deploy-config.json

actions:
  - name: "Deploy"
    run: "echo 'Deploying {{tag}} to {{environment}}'"
    when:
      field: confirm
      equals: true
  - name: "Notify team"
    run: "echo 'Notifying Slack...'"
    when:
      all:
        - { field: confirm, equals: true }
        - { field: notify, equals: true }
```
