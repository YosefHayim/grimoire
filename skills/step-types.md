# Step Types Reference

All 11 grimoire step types. Each step shares these common fields:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | yes | Unique key in answers output. Used in conditions and interpolation. |
| `type` | string | yes | Step type (see below) |
| `message` | string | yes | Prompt text shown to user |
| `description` | string | no | Hint text shown below prompt |
| `group` | string | no | Section header displayed above this step (shown once per group) |
| `when` | Condition | no | Show step only when condition is true (see conditions.md) |
| `next` | string | no | Override which step ID comes next |
| `required` | boolean | yes (default: true) | Whether an answer is required |

---

## `text` — Free-form string input

**Use when:** Collecting names, descriptions, URLs, slugs, or any open-ended string.

```yaml
- id: project-name
  type: text
  message: Project name?
  placeholder: my-project       # shown as greyed hint
  default: my-app               # pre-filled value
  validate:
    - rule: required
    - rule: minLength
      value: 2
    - rule: maxLength
      value: 50
    - rule: pattern
      value: "^[a-z][a-z0-9-]*$"
      message: Lowercase letters, numbers, hyphens only
```

**Returns:** `string`
**Gotcha:** `pattern` value is a regex string — escape backslashes in YAML (`\\d` not `\d`).

---

## `select` — Single choice from a list

**Use when:** User must pick exactly one option. Supports route branching.

```yaml
- id: project-type
  type: select
  message: Project type?
  default: app                  # must match an option value
  options:
    - { value: app, label: Application, hint: "Full web app" }
    - { value: lib, label: Library }
    - { value: cli, label: CLI Tool, disabled: true }  # greyed out
  routes:                       # branch to different step per answer
    app: frontend-framework
    lib: package-manager
    cli: cli-language
```

**Returns:** `string` (the `value` field of chosen option)
**Gotcha:** `routes` keys must exactly match option `value` strings. Missing route = sequential flow continues.

**Loading options from file:**
```yaml
- id: region
  type: select
  message: AWS region?
  optionsFrom: ./regions.json   # cannot combine with `options`
```

---

## `multiselect` — Multiple choices

**Use when:** User can pick zero or more items from a list.

```yaml
- id: features
  type: multiselect
  message: Features to include?
  required: false               # allow empty selection
  min: 1                        # minimum selections required
  max: 3                        # maximum selections allowed
  default: [eslint, prettier]   # pre-checked values
  options:
    - { value: eslint, label: ESLint }
    - { value: prettier, label: Prettier }
    - { value: vitest, label: Vitest }
    - { value: husky, label: Husky }
```

**Returns:** `string[]`
**Gotcha:** `default` must be an array of `value` strings, not labels.

---

## `confirm` — Yes / No

**Use when:** A simple boolean decision. Renders as `(Y/n)` or `(y/N)`.

```yaml
- id: use-docker
  type: confirm
  message: Add Docker support?
  default: false                # false = default is No
```

**Returns:** `boolean`
**Gotcha:** Use `when` conditions that check `equals: true` or `equals: false` (not `"true"`/`"false"` strings).

---

## `number` — Numeric input

**Use when:** Collecting ports, counts, timeouts, or any numeric value.

```yaml
- id: port
  type: number
  message: Dev server port?
  default: 3000
  min: 1024
  max: 65535
  validate:
    - rule: min
      value: 1024
      message: Port must be >= 1024
```

**Returns:** `number`
**Gotcha:** `min`/`max` on the step config are UI constraints. `validate` rules with `min`/`max` add error messages.

---

## `password` — Masked input

**Use when:** Collecting secrets, API keys, tokens. Input is never shown or cached.

```yaml
- id: api-key
  type: password
  message: API key?
  default: $API_KEY             # reads from process.env.API_KEY
  validate:
    - rule: minLength
      value: 32
      message: API key must be at least 32 characters
```

**Returns:** `string`
**Gotcha:** Password steps are NEVER cached, even with `--cache`. Never log or interpolate password values in actions.

---

## `search` — Fuzzy-searchable single choice

**Use when:** The options list is long (10+) and users benefit from filtering.

```yaml
- id: framework
  type: search
  message: Pick a framework?
  default: nextjs
  options:
    - { value: nextjs, label: "Next.js" }
    - { value: remix, label: Remix }
    - { value: astro, label: Astro }
    - { value: nuxt, label: Nuxt }
    - { value: sveltekit, label: SvelteKit }
```

**Returns:** `string`
**Gotcha:** Same as `select` — no `routes` support on `search`.

---

## `editor` — Opens terminal editor

**Use when:** Collecting multi-line text (README content, commit messages, config blocks).

```yaml
- id: notes
  type: editor
  message: Any notes for the README?
  default: "# My Project\n\n"
  validate:
    - rule: maxLength
      value: 5000
```

**Returns:** `string` (full text from editor)
**Gotcha:** Opens `$EDITOR` (or `vi` as fallback). In CI/mock mode, the default value is used directly.

---

## `path` — File or directory path with tab-completion

**Use when:** Collecting output directories, config file paths, or any filesystem path.

```yaml
- id: output-dir
  type: path
  message: Output directory?
  default: ./my-project
  onlyDirectories: true         # only show directories in completion
  onlyFiles: false
  validate:
    - rule: required
```

**Returns:** `string`
**Gotcha:** Path is NOT validated for existence — only format. Add a `checks` pre-flight if the path must exist.

---

## `toggle` — Binary toggle with custom labels

**Use when:** A boolean choice where the two states have meaningful names (not just Yes/No).

```yaml
- id: color-scheme
  type: toggle
  message: Color scheme?
  active: Dark                  # label when true
  inactive: Light               # label when false
  default: true                 # starts on Dark
```

**Returns:** `boolean`
**Gotcha:** `active`/`inactive` are display labels only — the answer is always `true`/`false`.

---

## `note` — Display-only info box

**Use when:** Showing instructions, warnings, or section headers without collecting input.

```yaml
- id: info
  type: note
  message: "Almost done"
  description: "Review your answers on the next screen."
```

**Returns:** nothing (not included in answers output)
**Gotcha:** `note` steps with `when` conditions are skipped silently — they don't affect flow.

---

## Common Mistakes

- **Duplicate `id` values** — every step ID must be unique across the entire config
- **Using `options` + `optionsFrom` together** — pick one; both present = undefined behavior
- **`default` type mismatch** — `confirm`/`toggle` default must be `boolean`, `number` default must be `number`, `multiselect` default must be `string[]`
- **`routes` on non-`select` types** — only `select` supports `routes`
