# Grimoire — Architecture

> A config-driven CLI wizard framework. You write a YAML file. It runs an interactive wizard. No code required.

## Why Grimoire Exists

Every CLI tool eventually needs a setup wizard. The patterns are always the same — ask questions, branch on answers, validate input, write output — yet every team rebuilds this from scratch. Grimoire replaces that with a single YAML config:

```yaml
steps:
  - id: name
    type: text
    message: Project name?
  - id: lang
    type: select
    message: Language?
    options:
      - { value: ts, label: TypeScript }
      - { value: js, label: JavaScript }
```

That config is the wizard. No JavaScript. No React. No plumbing. Run `grimoire run setup.yaml` and it works.

## What Makes Grimoire Different

| Feature | Inquirer.js | Yeoman | Plop | **Grimoire** |
|---------|------------|--------|------|-------------|
| Config-driven (no code) | No | No | Partial | **Yes** |
| Conditional branching | Manual | Manual | No | **Declarative** |
| Back-navigation | No | No | No | **Built-in** |
| Route-based flows | No | No | No | **Yes** |
| Multiple renderers | No | No | No | **3 renderers** |
| Theme presets | No | No | No | **6 presets** |
| Progress persistence | No | No | No | **Auto-resume** |
| Pipeline chaining | No | Partial | No | **Yes** |
| CI/CD mock mode | No | No | No | **`--mock` + `--json`** |
| Zero-code wizards | No | No | Partial | **Full** |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLI (cli.ts)                             │
│  grimoire run / validate / create / demo / cache / template     │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Parser Layer   │
                    │  parser.ts      │
                    │  schema.ts      │
                    └────────┬────────┘
                             │ WizardConfig
                    ┌────────▼────────┐
                    │  Runner Layer   │
                    │  runner.ts      │◄──── RunWizardOptions
                    │  pipeline.ts    │      (renderer, plugins,
                    └────────┬────────┘       hooks, cache, etc.)
                             │
              ┌──────────────┼──────────────┐
              │              │              │
     ┌────────▼────┐  ┌─────▼─────┐  ┌─────▼──────┐
     │   Engine    │  │ Renderer  │  │  Services  │
     │  engine.ts  │  │ Interface │  │  cache.ts  │
     │ conditions  │  │           │  │  mru.ts    │
     │             │  │ inquirer  │  │ progress   │
     │ Pure state  │  │ ink       │  │ templates  │
     │ machine     │  │ clack     │  │ plugins    │
     └─────────────┘  └───────────┘  └────────────┘
```

## Core Layers

### 1. Config Layer — `schema.ts` + `parser.ts` + `types.ts`

Everything starts with a config file. YAML, JSON, JS, or TS — Grimoire normalizes it into a `WizardConfig` object validated by Zod schemas.

```
YAML/JSON file
    │
    ▼
parser.ts ─── loadWizardConfig()
    │           ├─ cosmiconfig for file loading
    │           ├─ YAML/JSON parsing
    │           ├─ optionsFrom resolution (external option files)
    │           └─ extends inheritance (merge base configs)
    │
    ▼
schema.ts ─── parseWizardConfig()
                ├─ Zod discriminated union for 11 step types
                ├─ Condition schema (8 operators + all/any/not compounds)
                ├─ Theme schema (preset enum + hex color tokens)
                └─ Action/check schemas
```

**Key type**: `WizardConfig`
```typescript
interface WizardConfig {
  meta: { name: string; version?: string; description?: string; review?: boolean };
  theme?: ThemeConfig;   // 6 presets + 7 color tokens + 4 icons
  steps: StepConfig[];   // 11 step types (text, select, confirm, password, ...)
  output?: { format: 'json' | 'env' | 'yaml'; path?: string };
  checks?: PreFlightCheck[];  // Shell commands that must pass before wizard starts
  actions?: ActionConfig[];   // Shell commands to run after wizard completes
  extends?: string;           // Inherit from another config file
}
```

### 2. Engine Layer — `engine.ts` + `conditions.ts`

The engine is a **pure state machine**. No I/O. No rendering. No side effects. Given a state and a transition, it returns the next state.

```
                    ┌──────────────────────┐
                    │     WizardState      │
                    │  ─────────────────   │
                    │  currentStepId       │
                    │  answers: {}         │
                    │  history: []         │
                    │  status: 'running'   │
                    │  errors: {}          │
                    └──────────┬───────────┘
                               │
              WizardTransition │  NEXT(value) | BACK | JUMP(stepId) | CANCEL
                               │
                    ┌──────────▼───────────┐
                    │   wizardReducer()    │
                    │  ─────────────────   │
                    │  1. Validate answer  │
                    │  2. Resolve routing  │
                    │  3. Skip invisible   │
                    │  4. Clean orphans    │
                    │  5. Return new state │
                    └──────────────────────┘
```

**Why this matters**: Because the engine is pure, it's testable without mocking terminals. It's also renderer-agnostic — the same state machine drives Inquirer prompts, Ink TUI, and Clack-style output identically.

**Condition evaluation** (`conditions.ts`) supports 8 operators:

| Operator | Example |
|----------|---------|
| `equals` | `{ field: "lang", equals: "ts" }` |
| `notEquals` | `{ field: "lang", notEquals: "js" }` |
| `includes` | `{ field: "features", includes: "eslint" }` |
| `notIncludes` | `{ field: "features", notIncludes: "prettier" }` |
| `greaterThan` | `{ field: "port", greaterThan: 1024 }` |
| `lessThan` | `{ field: "count", lessThan: 100 }` |
| `isEmpty` | `{ field: "name", isEmpty: true }` |
| `isNotEmpty` | `{ field: "name", isNotEmpty: true }` |

Plus compound operators: `{ all: [...] }`, `{ any: [...] }`, `{ not: ... }`

### 3. Runner Layer — `runner.ts`

The runner is the orchestrator. It connects the engine, renderer, and services into a loop:

```
runWizard(config, options)
    │
    ├─ 1. Resolve theme (preset → tokens → chalk functions)
    ├─ 2. Load cached answers / saved progress
    ├─ 3. Run pre-flight checks (shell commands)
    ├─ 4. Emit session:start event
    │
    ├─ 5. WIZARD LOOP ◄───────────────────────────────────┐
    │      │                                               │
    │      ├─ Emit group:start (if group changed)          │
    │      ├─ Emit step:start                              │
    │      ├─ Call onBeforeStep hook                       │
    │      ├─ Resolve defaults (env vars, cache, template) │
    │      ├─ Apply MRU ordering                           │
    │      ├─ Render step (via renderer)                   │
    │      ├─ Validate (sync + async)                      │
    │      ├─ Call onAfterStep hook                        │
    │      ├─ Engine: wizardReducer(state, NEXT, config)   │
    │      ├─ Emit step:complete                           │
    │      └─ Loop until status !== 'running' ─────────────┘
    │
    ├─ 6. Review screen (if meta.review === true)
    ├─ 7. Run post-wizard actions
    ├─ 8. Save cache / clear progress
    ├─ 9. Emit session:end event
    └─ 10. Return answers
```

**Event emission**: The runner emits 16 `WizardEvent` types at every meaningful point. Renderers subscribe via `onEvent()` to drive their visual output — this is what makes the Clack renderer work without modifying the runner.

### 4. Renderer Layer — `renderers/`

Grimoire has a renderer interface. The runner never touches `stdout` for prompts — it delegates to whichever renderer is active.

```
WizardRenderer (interface)
    │
    ├─ renderText(step, state, theme)     → Promise<string>
    ├─ renderSelect(step, state, theme)   → Promise<string>
    ├─ renderMultiSelect(...)             → Promise<string[]>
    ├─ renderConfirm(...)                 → Promise<boolean>
    ├─ renderPassword(...)                → Promise<string>
    ├─ renderNumber(...)                  → Promise<number>
    ├─ renderSearch(...)                  → Promise<string>
    ├─ renderEditor(...)                  → Promise<string>
    ├─ renderPath(...)                    → Promise<string>
    ├─ renderToggle(...)                  → Promise<boolean>
    ├─ renderMessage(...)                 → void
    ├─ renderStepHeader(...)              → void
    ├─ renderGroupHeader(...)             → void
    ├─ renderSummary(...)                 → void
    ├─ clear()                            → void
    └─ onEvent?(event, theme)             → void   ← NEW in v0.4.0
```

**Three built-in renderers:**

| Renderer | Style | Use Case |
|----------|-------|----------|
| `InquirerRenderer` | Classic terminal prompts with progress bar | Default, maximum compatibility |
| `InkRenderer` | Box-drawing characters, filled progress bars | Enhanced TUI look |
| `ClackRenderer` | Connected `│` guide lines, `◇` collapsed steps, `┌`/`└` framing | Modern, beautiful CLI UX |

The Clack renderer extends InquirerRenderer (inherits all prompt methods) and adds visual output via `onEvent()`:

```
┌  My Wizard
│
◇  Project name? · my-app
│
◇  Language? · TypeScript
│
│  ╭─ Next Steps ────────────────╮
│  │ Run npm install             │
│  │ Then npm run dev            │
│  ╰─────────────────────────────╯
│
└  You're all set!
```

### 5. Service Layer

**Cache** (`cache.ts`) — Previous answers become defaults on the next run. Password steps are never cached. Stored in `~/.config/grimoire/cache/`.

**MRU** (`mru.ts`) — Frequently selected options float to the top of select/multiselect lists on subsequent runs.

**Templates** (`templates.ts`) — Named answer presets. Save a "production" template and reload it with `--template production`.

**Progress** (`progress.ts`) — If the user hits Ctrl+C mid-wizard, their progress is saved. Next run auto-resumes from where they left off.

**Plugins** (`plugins.ts`) — Register custom step types with their own render and validate logic.

**Theme** (`theme.ts` + `themes/presets.ts`) — 6 built-in presets (catppuccin, dracula, nord, tokyonight, monokai, default). Resolution order: `DEFAULT_TOKENS → preset → user overrides`.

## Data Flow

### Interactive Mode

```
User types: grimoire run setup.yaml

  1. CLI parses args                                          cli.ts
  2. Load config file (YAML → JS object)                     parser.ts
  3. Validate against Zod schema                              schema.ts
  4. Resolve extends inheritance                              parser.ts
  5. Resolve optionsFrom (external option files)              parser.ts
  6. Create WizardState (pure data)                           engine.ts
  7. Load cached answers + check for saved progress           cache.ts, progress.ts
  8. Run pre-flight checks (git --version, etc.)              runner.ts
  9. Enter wizard loop:
     a. Evaluate step visibility (when conditions)            conditions.ts
     b. Resolve env var defaults ($PORT → 3000)               resolve.ts
     c. Apply MRU ordering to select options                  mru.ts
     d. Render prompt via active renderer                     renderers/*.ts
     e. Validate answer (sync rules + async hook)             engine.ts
     f. Advance state machine                                 engine.ts
     g. Emit WizardEvent to renderer                          runner.ts
  10. On completion: render summary, run actions              runner.ts
  11. Save cache, clear progress                              cache.ts, progress.ts
  12. Return answers object                                   runner.ts
```

### Mock / CI Mode

```
User types: grimoire run setup.yaml --mock '{"name":"app"}' --json

  Same flow as above, BUT:
  - Steps use mock values instead of prompts (no terminal I/O)
  - Pre-flight checks are skipped
  - Output is a structured JSON envelope: { ok: true, answers: {...} }
  - Exit code 0 on success, 1 on validation failure
```

### Pipeline Mode

```
runPipeline([
  { config: setupConfig },
  { config: deployConfig, when: { field: "env", equals: "prod" } },
])

  1. Run wizard A → collect answers A
  2. Accumulated = { ...answersA }
  3. Evaluate wizard B's when condition against accumulated
  4. If condition passes → run wizard B with accumulated as templateAnswers
  5. Accumulated = { ...answersA, ...answersB }
  6. Return { "Setup": answersA, "Deploy": answersB }
```

## File Map

```
src/
├── cli.ts              CLI commands (run, validate, create, demo, etc.)
├── parser.ts           Config loading (YAML, JSON, JS, TS + extends + optionsFrom)
├── schema.ts           Zod validation schemas for all config types
├── types.ts            TypeScript interfaces (WizardConfig, StepConfig, WizardEvent, etc.)
├── engine.ts           Pure state machine (wizardReducer, resolveNextStep, validateStepAnswer)
├── conditions.ts       Condition evaluation (8 operators + compound)
├── runner.ts           Orchestrator (wizard loop, events, hooks, cache, progress, review)
├── pipeline.ts         Multi-wizard chaining with answer forwarding
├── theme.ts            Theme resolution (preset → tokens → chalk functions)
├── resolve.ts          $ENV_VAR resolution for default values
├── template.ts         {{stepId}} template interpolation
├── cache.ts            Answer persistence between runs
├── mru.ts              Most-recently-used option ordering
├── progress.ts         Ctrl+C resume (save/load/clear wizard progress)
├── templates.ts        Named answer presets (save/load/list/delete)
├── plugins.ts          Custom step type registration
├── scaffolder.ts       Interactive config file generator (grimoire create)
├── completions.ts      Shell completion scripts (bash, zsh, fish)
├── banner.ts           ASCII art figlet banner with gradient
├── define.ts           defineWizard() type-safe identity function
├── index.ts            Public API exports
│
├── renderers/
│   ├── inquirer.ts     Default renderer (uses @inquirer/prompts)
│   ├── ink.ts          Box-drawing TUI renderer
│   ├── clack.ts        Clack-style guide line renderer
│   └── symbols.ts      Unicode/ASCII symbol map with platform detection
│
├── themes/
│   └── presets.ts      6 color presets (catppuccin, dracula, nord, etc.)
│
└── __tests__/          21 test files, 261 tests
    ├── engine.test.ts       State machine tests (34 tests)
    ├── conditions.test.ts   Condition evaluation (39 tests)
    ├── e2e.test.ts          End-to-end CLI tests (35 tests)
    ├── schema.test.ts       Schema validation (16 tests)
    └── ...                  (17 more test files)
```

## Design Decisions

### Why a pure state machine?

The engine has zero dependencies on terminals, renderers, or the filesystem. `wizardReducer(state, transition, config)` is a pure function — same input always produces the same output. This enables:

- **Testing without mocks** — 34 engine tests run in milliseconds
- **Renderer independence** — swap rendering without touching logic
- **Future portability** — the same engine could drive a React web form

### Why event-driven rendering?

The runner emits 16 event types (`session:start`, `step:complete`, `note`, `spinner:start`, etc.). Renderers subscribe via `onEvent()`. This means:

- Adding a new renderer requires zero changes to the runner
- Renderers can add arbitrary visual features (guide lines, spinners) without modifying core logic
- Multiple renderers can listen simultaneously (logging + rendering)

### Why config-driven?

Most CLI wizard tools require JavaScript code. This creates a barrier: non-developers can't create wizards, and even developers spend time on plumbing instead of logic. With Grimoire:

- **YAML is the interface** — readable by anyone, editable by anything
- **Schema validation catches errors early** — typos in config caught before runtime
- **JSON Schema provides IDE autocomplete** — VS Code highlights errors as you type
- **Configs are portable** — share a `.yaml` file, not a codebase

### Why three renderers?

Different contexts need different visual styles:

- **Inquirer** — maximum compatibility, works in every terminal
- **Ink** — enhanced TUI for developers who want something nicer
- **Clack** — beautiful connected flow for modern CLI tools

The renderer interface means any team can build their own renderer without forking Grimoire.

### Why zero new dependencies for v0.4.0?

The entire Clack-style rendering, theme presets, progress persistence, pipelines, and review screen were built with zero new npm dependencies. Every feature uses:

- `node:fs`, `node:path`, `node:os` — Node.js built-ins
- `chalk` — already a dependency
- `@inquirer/prompts` — already a dependency

This keeps the install fast and the dependency tree shallow.

## Stats

| Metric | Count |
|--------|-------|
| Source files | 24 |
| Source lines | ~4,200 |
| Test files | 21 |
| Test lines | ~2,900 |
| Total tests | 261 |
| Step types | 11 (text, select, multiselect, confirm, password, number, search, editor, path, toggle, note) |
| Condition operators | 8 + 3 compound |
| Event types | 16 |
| Renderers | 3 (inquirer, ink, clack) |
| Theme presets | 6 |
| Runtime deps | 8 |
| Dev deps | 6 |

## Version History

| Version | What Changed |
|---------|-------------|
| **0.1.0** | Core engine, basic step types, YAML parsing |
| **0.2.0** | 11 step types, conditions, routes, back-nav, groups, theming, plugins, checks, actions, CLI, JSON Schema, 119 tests |
| **0.3.0** | Answer caching, templates, MRU ordering, lifecycle hooks, Ink renderer, banner, `optionsFrom`, shell completions, 210 tests |
| **0.3.1** | npm Trusted Publishing (OIDC) |
| **0.4.0** | Event-driven architecture, Clack renderer, 6 theme presets, progress persistence, review screen, wizard pipelines, note step type, 261 tests |
