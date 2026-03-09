# Grimoire Wizard Config Reference

Grimoire is a config-driven CLI wizard framework. This reference contains everything needed to generate correct grimoire wizard configs. Read it once and produce correct configs without guessing.

---

## Config Structure

Top-level fields for any grimoire config (YAML or JSON):

| Field | Required | Type | Description |
|-------|----------|------|-------------|
| `meta` | yes | object | Wizard metadata |
| `steps` | yes | array | Ordered list of step configs |
| `theme` | no | object | Visual theming |
| `output` | no | object | Result serialization |
| `extends` | no | string | Path to base config to inherit from |
| `checks` | no | string[] | Pre-flight shell commands (abort on failure) |
| `actions` | no | Action[] | Post-wizard shell commands |
| `onComplete` | no | string | Path to TS/JS handler file |

**`meta`** fields: `name: string` (required), `version?: string`, `description?: string`, `review?: boolean` (show summary before submit).

**`theme`** fields: `preset?: string`, `tokens?: { primary, secondary, error, ... }`, `icons?: { pointer, checked, ... }`, `spinner?: string | { frames: string[], interval?: number }`.

**`spinner`** — loading animation preset name or custom frames. Available presets: `dots`, `dots2`, `line`, `arc`, `circle` (default), `circleHalves`, `triangle`, `pipe`, `arrow`, `arrow3`, `bouncingBar`, `bouncingBall`, `simpleDots`, `aesthetic`, `star`. Custom: `{ frames: [">", ">>", ">>>"], interval: 120 }`.

**`output`** fields: `format: 'json' | 'env' | 'yaml'`, `path?: string` (write to file instead of stdout).

---

## Step Types

All steps share these common fields:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | required | Unique identifier; used in conditions and interpolation |
| `type` | string | required | Step type (see below) |
| `message` | string | required | Prompt text shown to user |
| `description` | string | — | Hint text shown below prompt |
| `group` | string | — | Section header displayed above this step |
| `when` | Condition | — | Show step only when condition is true |
| `next` | string | — | Override which step ID comes next |
| `required` | boolean | `true` | Whether an answer is required |

| Type | Returns | Extra Fields |
|------|---------|-------------|
| `text` | `string` | `default?`, `validate?`, `placeholder?` |
| `select` | `string` | `options`, `optionsFrom?`, `default?`, `routes?` |
| `multiselect` | `string[]` | `options`, `optionsFrom?`, `default?`, `min?`, `max?` |
| `confirm` | `boolean` | `default?` |
| `password` | `string` (masked) | `validate?` |
| `number` | `number` | `default?`, `min?`, `max?`, `validate?` |
| `search` | `string` | `options`, `optionsFrom?`, `default?` |
| `editor` | `string` | `default?`, `validate?` |
| `path` | `string` | `default?`, `validate?`, `onlyDirectories?`, `onlyFiles?` |
| `toggle` | `boolean` | `default?`, `active?`, `inactive?` |
| `note` | nothing | `note: string` (required; display-only, no input) |

`options` shape: `{ value: string, label?: string, hint?: string, disabled?: boolean }`.
`optionsFrom`: path to external JSON/YAML file — cannot be combined with `options`.
`routes` (select only): `Record<value, stepId>` — branches to a different step per answer.

---

## Conditions

Used in `when` fields on steps and `when` fields on actions.

**Simple operators:**
```yaml
when: { field: type, equals: app }
when: { field: type, notEquals: lib }
when: { field: features, includes: eslint }
when: { field: features, notIncludes: prettier }
when: { field: count, greaterThan: 5 }
when: { field: count, lessThan: 10 }
when: { field: name, isEmpty: true }
when: { field: name, isNotEmpty: true }
```

**Compound operators:**
```yaml
when:
  all:
    - { field: type, equals: app }
    - { field: deploy, equals: cloud }

when:
  any:
    - { field: type, equals: app }
    - { field: type, equals: service }

when:
  not: { field: type, equals: lib }
```

`field` must reference a step `id` that appears **before** this step in the config.

---

## Validation

Applied via `validate: ValidationRule[]` on steps that accept text/number input.

| Rule | Applies to | Fields |
|------|-----------|--------|
| `required` | all | — |
| `minLength` | string | `value: number` |
| `maxLength` | string | `value: number` |
| `pattern` | string | `value: string` (regex) |
| `min` | number | `value: number` |
| `max` | number | `value: number` |

Each rule accepts an optional `message: string` to override the default error text.

```yaml
validate:
  - rule: minLength
    value: 3
    message: Must be at least 3 characters
  - rule: pattern
    value: '^[a-z][a-z0-9-]*$'
    message: Lowercase letters, numbers, hyphens only
```

---

## Routes

`select` steps can branch to different steps based on the chosen value:

```yaml
- id: deploy_target
  type: select
  message: Deploy target?
  options:
    - { value: cloud, label: Cloud }
    - { value: local, label: Local }
  routes:
    cloud: cloud_region
    local: local_port
```

Use `next: "__done__"` on any step to end the wizard immediately after that step.

---

## Actions

Run shell commands after the wizard completes. Actions run sequentially after `onComplete`. A failed action aborts remaining actions.

```yaml
actions:
  - name: Init repo
    run: git init && git add .
  - name: Install deps
    run: npm install
    when: { field: install_deps, equals: true }
  - name: Create project
    run: npx create-app {{project_name}} --type {{project_type}}
```

**Interpolation:** `{{step-id}}` is replaced with the answer for that step. Referencing a non-existent step ID throws an error and aborts.

Action fields: `name?: string`, `run: string` (required), `when?: Condition`.

---

## onComplete Handler

`onComplete` is a file path string (resolved relative to the config file). The file must export a default async function:

```typescript
export default async ({ answers, config }: { answers: Record<string, unknown>, config: unknown }) => {
  // answers is a map of step id -> answer value
  // config is the full parsed wizard config
}
```

Runs before actions. Skipped in mock/dry-run mode.

---

## Theme Presets

Set with `theme: { preset: <name> }`. Available presets:

| Preset | Primary Color |
|--------|--------------|
| `default` | Blue (#3B82F6) |
| `catppuccin` | Mauve (#CBA6F7) |
| `dracula` | Purple (#BD93F9) |
| `nord` | Frost Blue (#88C0D0) |
| `tokyonight` | Blue (#7AA2F7) |
| `monokai` | Yellow (#E6DB74) |

---

## Annotated Examples

### Simple (5 steps)

```yaml
meta:
  name: Quick Setup
steps:
  - id: name
    type: text
    message: Project name?
    validate:
      - rule: required
      - rule: minLength
        value: 2
  - id: type
    type: select
    message: Project type?
    options:
      - { value: app, label: Application }
      - { value: lib, label: Library }
  - id: features
    type: multiselect
    message: Features to include?
    required: false
    options:
      - { value: eslint, label: ESLint }
      - { value: prettier, label: Prettier }
      - { value: tests, label: Testing }
  - id: private
    type: confirm
    message: Private package?
    default: true
  - id: license
    type: select
    message: License?
    options:
      - { value: mit, label: MIT }
      - { value: apache, label: Apache 2.0 }
      - { value: none, label: None }
output:
  format: json
```

### Medium (conditions, groups, routes)

```yaml
meta:
  name: App Scaffolder
  review: true
theme:
  preset: tokyonight
steps:
  - id: app_name
    type: text
    message: Application name?
    group: Project
    validate:
      - rule: required
      - rule: pattern
        value: '^[a-z][a-z0-9-]*$'
        message: Lowercase, numbers, hyphens only

  - id: app_type
    type: select
    message: Application type?
    group: Project
    options:
      - { value: web, label: Web App }
      - { value: api, label: REST API }
      - { value: cli, label: CLI Tool }
    routes:
      web: frontend_framework
      api: api_framework
      cli: cli_language

  - id: frontend_framework
    type: select
    message: Frontend framework?
    group: Stack
    when: { field: app_type, equals: web }
    options:
      - { value: react, label: React }
      - { value: vue, label: Vue }
      - { value: svelte, label: Svelte }

  - id: api_framework
    type: select
    message: API framework?
    group: Stack
    when: { field: app_type, equals: api }
    options:
      - { value: express, label: Express }
      - { value: fastify, label: Fastify }
      - { value: hono, label: Hono }

  - id: cli_language
    type: select
    message: Language?
    group: Stack
    when: { field: app_type, equals: cli }
    options:
      - { value: ts, label: TypeScript }
      - { value: go, label: Go }

  - id: add_docker
    type: confirm
    message: Add Docker support?
    group: Infrastructure
    default: false

  - id: docker_base
    type: select
    message: Base image?
    group: Infrastructure
    when: { field: add_docker, equals: true }
    options:
      - { value: node:20-alpine, label: Node 20 Alpine }
      - { value: node:20-slim, label: Node 20 Slim }

  - id: deploy_target
    type: select
    message: Deploy target?
    group: Infrastructure
    options:
      - { value: vercel, label: Vercel }
      - { value: fly, label: Fly.io }
      - { value: none, label: None }

output:
  format: yaml
  path: .scaffold.yaml
```

### Complex (actions + onComplete)

```yaml
meta:
  name: Full Project Init
  description: Scaffold, install, and push to GitHub
steps:
  - id: repo_name
    type: text
    message: Repository name?
    validate:
      - rule: required
      - rule: pattern
        value: '^[a-zA-Z0-9_-]+$'

  - id: description
    type: text
    message: Short description?
    required: false

  - id: visibility
    type: select
    message: Repository visibility?
    options:
      - { value: public, label: Public }
      - { value: private, label: Private }

  - id: init_git
    type: confirm
    message: Initialize git and push to GitHub?
    default: true

  - id: install_deps
    type: confirm
    message: Run npm install after scaffolding?
    default: true

onComplete: ./scripts/scaffold-handler.ts

actions:
  - name: Install dependencies
    run: npm install
    when: { field: install_deps, equals: true }
  - name: Init git repo
    run: git init && git add . && git commit -m "Initial commit"
    when: { field: init_git, equals: true }
  - name: Create GitHub repo and push
    run: gh repo create {{repo_name}} --{{visibility}} --push --source=.
    when: { field: init_git, equals: true }

output:
  format: json
  path: .project.json
```

---

## Common Patterns

### Conditional step visibility
```yaml
- id: use_db
  type: confirm
  message: Use a database?
- id: db_type
  type: select
  message: Database?
  when: { field: use_db, equals: true }
  options:
    - { value: postgres, label: PostgreSQL }
    - { value: sqlite, label: SQLite }
```

### Route branching (dependent steps)
```yaml
- id: cloud
  type: select
  message: Cloud provider?
  options:
    - { value: aws, label: AWS }
    - { value: gcp, label: GCP }
  routes:
    aws: aws_region
    gcp: gcp_zone
- id: aws_region
  type: select
  message: AWS region?
  options:
    - { value: us-east-1, label: US East }
  next: __done__
- id: gcp_zone
  type: select
  message: GCP zone?
  options:
    - { value: us-central1, label: US Central }
```

### Grouped steps for logical sections
```yaml
- id: db_host
  type: text
  message: Database host?
  group: Database
- id: db_port
  type: number
  message: Database port?
  group: Database
  default: 5432
- id: app_port
  type: number
  message: App port?
  group: Server
  default: 3000
```

### Environment variable defaults
```yaml
- id: api_key
  type: password
  message: API key?
  default: $API_KEY   # resolves from process.env.API_KEY
- id: region
  type: text
  message: Region?
  default: $AWS_DEFAULT_REGION
```

### Compound conditions
```yaml
- id: advanced_config
  type: confirm
  message: Configure advanced options?
  when:
    all:
      - { field: app_type, equals: api }
      - { field: deploy_target, notEquals: none }
```

---

## Anti-Patterns

**Duplicate step IDs** — every `id` must be unique across the entire config. Duplicates cause unpredictable behavior.

**Circular `next` references** — if step A points `next: B` and step B points `next: A`, the wizard loops forever.

**`when` referencing future steps** — conditions can only reference steps that appear earlier in the array. Forward references always evaluate as falsy.

**Actions referencing non-existent step IDs** — `{{missing_id}}` in an action's `run` string throws an error and aborts all remaining actions.

**Using `options` and `optionsFrom` together** — pick one. If both are present, behavior is undefined.

**Skipping `id` on steps used in conditions** — any step referenced by a `when` condition or `routes` map must have an `id`.
