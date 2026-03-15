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

## Install

```bash
npm install -g grimoire-wizard
```

---

## Quick Start

Create `setup.yaml`:

```yaml
meta:
  name: Project Setup
  review: true

steps:
  - id: project-name
    type: text
    message: Project name?
    validate:
      - rule: required
      - rule: pattern
        value: "^[a-z0-9-]+$"

  - id: project-type
    type: select
    message: What kind of project?
    options:
      - { value: web, label: "Web App" }
      - { value: api, label: "REST API" }
      - { value: cli, label: "CLI Tool" }
    routes:
      web: framework
      api: framework
      cli: features

  - id: framework
    type: search
    message: Pick a framework
    options:
      - { value: nextjs, label: "Next.js" }
      - { value: remix, label: Remix }
      - { value: fastify, label: Fastify }
      - { value: express, label: Express }

  - id: features
    type: multiselect
    message: Features to include
    min: 1
    options:
      - { value: eslint, label: ESLint }
      - { value: prettier, label: Prettier }
      - { value: vitest, label: Vitest }
      - { value: husky, label: Husky }

  - id: port
    type: number
    message: Dev server port
    default: 3000
    min: 1024
    max: 65535

  - id: output-dir
    type: path
    message: Output directory
    default: ./my-project

  - id: theme
    type: toggle
    message: Color scheme
    active: Dark
    inactive: Light
    default: true

  - id: ts-strict
    type: confirm
    message: Enable strict TypeScript?
    default: true
    when:
      field: project-type
      notEquals: cli

  - id: notes
    type: editor
    message: Any notes for the README?

  - id: api-key
    type: password
    message: API key (optional)

  - id: info
    type: note
    message: "Almost done"
    description: "Review your answers on the next screen."

  - id: confirm
    type: confirm
    message: Create project?
    default: true

output:
  format: json
  path: answers.json

theme:
  preset: catppuccin
```

Run it:

```bash
grimoire run setup.yaml
```

---

## Why grimoire?

- **No code required** for simple wizards. Write YAML, get a polished interactive CLI.
- **CI-friendly** — `--mock '{"step-id":"value"}'` runs non-interactively; `--json` emits structured output.
- **TypeScript API** when you need lifecycle hooks, async validation, plugins, or pipelines.
- **Post-wizard actions** — shell commands with `{{step-id}}` interpolation run after completion.

---

## Step Types

| type | returns | use case |
|------|---------|----------|
| `text` | `string` | Free-form input with validation |
| `select` | `string` | Single choice from a list; supports `routes` |
| `multiselect` | `string[]` | Multiple choices; `min`/`max` constraints |
| `confirm` | `boolean` | Yes/no prompt |
| `password` | `string` | Masked input, never cached |
| `number` | `number` | Numeric input with `min`/`max`/`step` |
| `search` | `string` | Fuzzy-searchable single choice |
| `editor` | `string` | Opens terminal editor, returns full text |
| `path` | `string` | Path input with tab-completion |
| `toggle` | `boolean` | Binary toggle with custom labels |
| `note` | — | Inline info box, no input collected |

---

## CLI

| command | description |
|---------|-------------|
| `grimoire run <config>` | Run a wizard. Flags: `--mock`, `--json`, `--dry-run`, `--template`, `--renderer` |
| `grimoire validate <config>` | Parse and validate without running |
| `grimoire create [output]` | Scaffold a new wizard config interactively |
| `grimoire demo` | Run the built-in demo (all 11 step types) |
| `grimoire completion <shell>` | Print bash/zsh/fish completion script |
| `grimoire cache clear [name]` | Clear cached answers |
| `grimoire template list/delete` | Manage named answer presets |

---

## Config Shape

```yaml
# meta (required)
meta:
  name: string          # wizard title
  version: string       # optional semver
  description: string   # shown at startup
  review: boolean       # show review screen before submit

# extends (optional) — inherit from a base config
extends: ./base.yaml

# checks (optional) — pre-flight shell commands, abort on failure
checks:
  - name: string
    run: string         # shell command
    message: string     # error if non-zero exit

# steps (required) — array of step definitions
steps:
  - id: string          # unique key in answers output
    type: string        # see step types table
    message: string     # prompt text
    group: string       # section header (shown once per group)
    when: Condition     # show only if condition passes
    next: string        # override sequential flow; "__done__" to end
    default: any        # initial value; "$ENV_VAR" reads from env
    validate: Rule[]    # required, minLength, maxLength, pattern, min, max

# output (optional)
output:
  format: json | yaml | env
  path: string          # write answers to file

# theme (optional)
theme:
  preset: catppuccin | dracula | nord | tokyonight | monokai
  tokens:               # override individual color tokens
    primary: "#hex"
  icons:
    pointer: ">"
```

---

## Programmatic API

```typescript
import { defineWizard, runWizard, runPipeline } from 'grimoire-wizard'

const config = defineWizard({
  meta: { name: 'Deploy' },
  steps: [
    { id: 'env', type: 'select', message: 'Target?',
      options: [{ value: 'prod', label: 'Production' }, { value: 'staging', label: 'Staging' }] },
    { id: 'confirm', type: 'confirm', message: 'Deploy now?', default: false },
  ],
  output: { format: 'json' },
})

const answers = await runWizard(config, {
  mockAnswers: { env: 'staging', confirm: true },  // CI mode
  onStepComplete: (stepId, value) => console.log(stepId, value),
  onCancel: () => process.exit(1),
  asyncValidate: async (stepId, value) => {
    if (stepId === 'env' && value === 'prod') return 'Use staging first'
    return null
  },
  plugins: [],   // GrimoirePlugin[] for custom step types
  cache: true,   // persist answers as defaults on next run
})
```

Key `RunWizardOptions`: `mockAnswers`, `templateAnswers`, `onBeforeStep`, `onAfterStep`, `onStepComplete`, `onCancel`, `asyncValidate`, `plugins`, `cache`, `mru`, `renderer`, `quiet`, `plain`.

---

## AI Agent Integration

Paste this URL into Claude, ChatGPT, or any LLM to generate correct wizard configs instantly:

```
https://raw.githubusercontent.com/YosefHayim/grimoire/main/docs/GRIMOIRE_REFERENCE.md
```

The reference doc covers the full schema, all step types, conditions, routes, actions, and annotated examples.

---

## Contributing

Open to contributors. Check the [issues](https://github.com/YosefHayim/grimoire/issues) for good first tasks, or open one if you have an idea.

---

## Requirements

Node.js >= 18. ESM only (`"type": "module"` or `.mjs`).

## License

MIT
