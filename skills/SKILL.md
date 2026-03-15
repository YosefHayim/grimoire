# Grimoire Wizard Skill

## Overview

Grimoire is a config-driven CLI wizard framework. You write a YAML (or JSON) config file; grimoire runs an interactive terminal wizard. No JavaScript required for simple wizards.

Use this skill when you need to:
- Build an interactive CLI setup/deploy/config wizard
- Generate structured output (JSON/YAML/env) from user answers
- Create a CI-friendly wizard that runs non-interactively with `--mock`

**Do NOT use grimoire when:**
- You need a single yes/no prompt (use a shell `read` instead)
- You're building a full TUI application (use ink or blessed directly)
- You need real-time data or streaming output

---

## Mental Model

```
YAML config
    │
    ▼
grimoire run setup.yaml
    │
    ▼
Interactive terminal wizard (asks questions, validates, branches)
    │
    ▼
Structured output (JSON / YAML / env file) + optional shell actions
```

---

## Quick Reference: All 11 Step Types

| I want to collect...              | Use `type`    | Returns     |
|-----------------------------------|---------------|-------------|
| Free text                         | `text`        | `string`    |
| One choice from a list            | `select`      | `string`    |
| Multiple choices                  | `multiselect` | `string[]`  |
| Yes / No                          | `confirm`     | `boolean`   |
| A number                          | `number`      | `number`    |
| A secret / API key (masked)       | `password`    | `string`    |
| One choice with fuzzy search      | `search`      | `string`    |
| Long-form text (opens $EDITOR)    | `editor`      | `string`    |
| A file or directory path          | `path`        | `string`    |
| A binary toggle with custom labels| `toggle`      | `boolean`   |
| Display info only (no input)      | `note`        | nothing     |

→ Deep reference: `skills/step-types.md`

---

## Minimal Complete Wizard

```yaml
meta:
  name: My Wizard
  review: true          # show summary screen before submit

steps:
  - id: project-name
    type: text
    message: Project name?
    validate:
      - rule: required
      - rule: pattern
        value: "^[a-z0-9-]+$"
        message: Lowercase letters, numbers, hyphens only

  - id: project-type
    type: select
    message: Project type?
    options:
      - { value: app, label: Application }
      - { value: lib, label: Library }

  - id: confirm
    type: confirm
    message: Create project?
    default: true

output:
  format: json
  path: answers.json
```

Run: `grimoire run setup.yaml`
CI mode: `grimoire run setup.yaml --mock '{"project-name":"my-app","project-type":"app","confirm":true}'`

---

## CLI Commands

| Command | Description |
|---------|-------------|
| `grimoire run <config>` | Run a wizard |
| `grimoire validate <config>` | Validate config without running |
| `grimoire create [output]` | Scaffold a new wizard config interactively |
| `grimoire demo` | Run built-in demo (all 11 step types) |
| `grimoire run <config> --dry-run` | Preview steps without running |
| `grimoire run <config> --renderer clack` | Use Clack renderer (modern guide-line style) |
| `grimoire run <config> --renderer ink` | Use Ink renderer (box-drawing style) |

---

## Deep Reference Files

| Topic | File |
|-------|------|
| All 11 step types with syntax | `skills/step-types.md` |
| Conditional visibility + branching | `skills/conditions.md` |
| Validation rules + patterns | `skills/validation.md` |
| Themes, colors, spinners | `skills/theming.md` |
| Post-wizard actions + onComplete | `skills/actions.md` |
| Common wizard patterns + anti-patterns | `skills/wizard-patterns.md` |

---

## Config Top-Level Shape

```yaml
meta:                   # required
  name: string          # wizard title
  version: string       # optional semver
  description: string   # shown at startup
  review: boolean       # show summary before submit

extends: ./base.yaml    # optional: inherit from another config

checks:                 # optional: pre-flight shell commands (abort on failure)
  - name: string
    run: string
    message: string

steps: []               # required: array of step configs (see step-types.md)

output:                 # optional
  format: json | yaml | env
  path: string          # write to file instead of stdout

theme:                  # optional (see theming.md)
  preset: catppuccin | dracula | nord | tokyonight | monokai | default

actions: []             # optional: post-wizard shell commands (see actions.md)
onComplete: ./handler.ts # optional: TypeScript handler file (see actions.md)
```
