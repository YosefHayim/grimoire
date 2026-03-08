# Grimoire v0.4.0 — Clack-Inspired UX Overhaul

**Date:** 2026-03-08
**Status:** Approved
**Approach:** B — Event-driven runner refactor + new clack-inspired renderer

## Goal

Make grimoire-wizard's terminal experience world-class by adopting the visual patterns that developers love (clack-style connected guide lines, intro/outro, collapsed steps) while adding power-user features (theme presets, progress persistence, wizard pipelines, review screen, note boxes, spinners). Zero new dependencies. Zero breaking changes.

## Architecture

### Event-Driven Runner

The runner emits `WizardEvent` objects at every meaningful moment. Renderers subscribe via an optional `onEvent` method. Old renderers ignore events (backward compatible). New renderers use events to control the full visual flow.

```typescript
type WizardEvent =
  | { type: 'session:start'; wizard: string; description?: string; totalSteps: number }
  | { type: 'session:end'; answers: Record<string, unknown>; cancelled: boolean }
  | { type: 'group:start'; group: string }
  | { type: 'step:start'; stepId: string; stepIndex: number; totalVisible: number; step: StepConfig }
  | { type: 'step:complete'; stepId: string; value: unknown; step: StepConfig }
  | { type: 'step:error'; stepId: string; error: string }
  | { type: 'step:back'; stepId: string }
  | { type: 'spinner:start'; message: string }
  | { type: 'spinner:stop'; message?: string }
  | { type: 'note'; title: string; body: string }
  | { type: 'checks:start'; checks: PreFlightCheck[] }
  | { type: 'check:pass'; name: string }
  | { type: 'check:fail'; name: string; message: string }
  | { type: 'actions:start' }
  | { type: 'action:pass'; name: string }
  | { type: 'action:fail'; name: string }
```

The `WizardRenderer` interface gets extended:

```typescript
interface WizardRenderer {
  // ... existing render methods unchanged
  onEvent?(event: WizardEvent, theme: ResolvedTheme): void;
}
```

### Renderer Architecture

```
Inquirer Renderer  — no changes, works as before
Ink Renderer       — no changes, works as before
Clack Renderer     — NEW, implements onEvent for full visual flow
```

## ClackRenderer Visual System

Uses box-drawing characters for a connected visual flow. Unicode symbols with ASCII fallbacks for Windows/CI.

### Symbols

```typescript
const S = {
  BAR_START:    '┌',   // Session start
  BAR:          '│',   // Connecting line
  BAR_END:      '└',   // Session end
  STEP_ACTIVE:  '◆',   // Active prompt (themed)
  STEP_SUBMIT:  '◇',   // Answered prompt (dimmed)
  STEP_CANCEL:  '■',   // Cancelled (red)
  STEP_ERROR:   '▲',   // Error (red)
  CORNER_TR:    '╮',   // Note box top-right
  CORNER_BR:    '╯',   // Note box bottom-right
  BAR_H:        '─',   // Horizontal bar
};
```

### Terminal Output

```
┌  Project Setup
│
◆  What is your project name?
│  my-app
│
◇  What is your project name? . my-app
│
◆  Pick a language
│  > TypeScript    JavaScript    Python
│
◇  Pick a language . TypeScript
│
◇  Next steps ───────────────╮
│  cd my-app                  │
│  npm install                │
│  npm run dev                │
╰─────────────────────────────╯
│
└  You're all set!
```

### Collapsed Steps

After a step is answered, the renderer uses ANSI escape codes (`\x1b[A` cursor up, `\x1b[2K` clear line) to replace the active prompt with a one-line summary.

Active state:
```
◆  Pick a language
│  > TypeScript    JavaScript
```

After answer:
```
◇  Pick a language . TypeScript
```

### Spinners

Animated on the guide line using `setInterval`. Frames: `◒ ◐ ◓ ◑`.

```
│
◒  Loading framework options...
│
```

Triggered automatically by:
- `optionsFrom` file loading
- Pre-flight checks
- Post-wizard actions
- Async validation

## Built-in Theme Presets

Pre-defined color palettes accessible by name.

### Config

```yaml
theme:
  preset: catppuccin
  tokens:
    primary: "#ff79c6"   # Optional overrides on top of preset
```

### Presets

| Preset | Primary | Success | Error | Warning | Info | Muted | Accent |
|--------|---------|---------|-------|---------|------|-------|--------|
| `default` | `#7C3AED` | `#10B981` | `#EF4444` | `#F59E0B` | `#3B82F6` | `#6B7280` | `#8B5CF6` |
| `catppuccin` | `#cba6f7` | `#a6e3a1` | `#f38ba8` | `#fab387` | `#74c7ec` | `#6c7086` | `#f5c2e7` |
| `dracula` | `#bd93f9` | `#50fa7b` | `#ff5555` | `#ffb86c` | `#8be9fd` | `#6272a4` | `#ff79c6` |
| `nord` | `#88c0d0` | `#a3be8c` | `#bf616a` | `#ebcb8b` | `#81a1c1` | `#4c566a` | `#b48ead` |
| `tokyonight` | `#7aa2f7` | `#9ece6a` | `#f7768e` | `#e0af68` | `#7dcfff` | `#565f89` | `#bb9af7` |
| `monokai` | `#ab9df2` | `#a9dc76` | `#ff6188` | `#ffd866` | `#78dce8` | `#727072` | `#fc9867` |

### File

`src/themes/presets.ts` — plain object map, no dependencies.

### Schema

Add optional `preset` field to `ThemeConfig`:

```typescript
interface ThemeConfig {
  preset?: 'default' | 'catppuccin' | 'dracula' | 'nord' | 'tokyonight' | 'monokai';
  tokens?: { ... };
  icons?: { ... };
}
```

Resolution order: preset defaults -> preset tokens -> user token overrides.

## Progress Persistence

Resume a wizard after Ctrl+C.

### Flow

1. On `CANCEL` -> save `WizardState` to `~/.config/grimoire/progress/{wizard-slug}.json`
2. On next run -> detect saved progress
3. Prompt: "Resume from step 4/8? (y/n)"
4. Yes -> restore state, continue from saved step
5. No -> delete progress, start fresh
6. On completion -> delete progress file

### Saved State

```json
{
  "currentStepId": "framework",
  "answers": { "project-name": "my-app", "language": "typescript" },
  "history": ["project-name", "language"],
  "savedAt": "2026-03-08T20:30:00Z"
}
```

Password step answers are excluded (same as cache).

### File

`src/progress.ts` (~60 lines)

## Wizard Pipelines

Chain multiple wizard configs. Answers flow forward as template defaults.

### YAML Format

```yaml
pipeline:
  - config: ./setup.yaml
  - config: ./deploy.yaml
    when:
      field: confirm-deploy
      equals: true
```

### Programmatic API

```typescript
import { runPipeline } from 'grimoire-wizard';

const results = await runPipeline([
  { config: './setup.yaml' },
  { config: './deploy.yaml', when: { field: 'confirm-deploy', equals: true } },
]);
// { 'Project Setup': { ... }, 'Deploy': { ... } }
```

### How It Works

1. Load and validate all configs upfront
2. Run wizard A -> collect answers
3. Pass all accumulated answers as `templateAnswers` to wizard B
4. Conditional wizards (`when`) evaluated against accumulated answers
5. Return `Record<string, Record<string, unknown>>` keyed by wizard name

### CLI

```bash
grimoire run pipeline.yaml          # Detects pipeline format
grimoire run setup.yaml deploy.yaml # Multiple configs = implicit pipeline
```

### File

`src/pipeline.ts` (~80 lines)

## Step Summary / Review Screen

Show all answers before final submission.

### Config

```yaml
meta:
  name: Project Setup
  review: true
```

### Visual (ClackRenderer)

```
│
◇  Review your answers ──────────╮
│                                 │
│  project-name    my-app         │
│  language        TypeScript     │
│  features        ESLint, Vitest │
│                                 │
╰─────────────────────────────────╯
│
◆  Everything look right?
│  > Yes, continue    No, go back
│
```

### Behavior

If "No, go back" -> prompt which step to change -> navigate back -> re-run from there -> show review again on completion.

## Note Step Type

Bordered info boxes mid-flow.

### Config

```yaml
- id: setup-info
  type: note
  message: "Setup Complete"
  description: |
    cd my-app
    npm install
    npm run dev
```

### Visual (ClackRenderer)

```
◇  Setup Complete ───────────────╮
│  cd my-app                      │
│  npm install                    │
│  npm run dev                    │
╰─────────────────────────────────╯
```

### Backward Compatibility

InquirerRenderer renders note steps as plain `console.log` text (same as current `message` type).

## File Plan

### New Files (5)

| File | Purpose | Est. Lines |
|------|---------|------------|
| `src/renderers/clack.ts` | Clack-inspired renderer | ~300 |
| `src/renderers/symbols.ts` | Unicode/ASCII symbol map with fallback | ~40 |
| `src/themes/presets.ts` | Theme preset definitions | ~80 |
| `src/progress.ts` | Progress save/restore | ~60 |
| `src/pipeline.ts` | Wizard pipeline orchestration | ~80 |

### Modified Files (~6)

| File | Changes |
|------|---------|
| `src/types.ts` | `WizardEvent` type, `ThemeConfig.preset`, `NoteStepConfig`, `WizardRenderer.onEvent` |
| `src/runner.ts` | Emit events, progress save/restore, review loop |
| `src/schema.ts` | `note` step validation, `preset` field, `review` field, `pipeline` schema |
| `src/cli.ts` | `--renderer clack` flag, `--resume` flag, multi-config pipeline detection |
| `src/index.ts` | Export new modules |
| `src/theme.ts` | Preset resolution |

### Breaking Changes: 0

### New Dependencies: 0

## Version

This work ships as **grimoire-wizard v0.4.0**.

## Implementation Order

1. Symbols + theme presets (foundation, no runner changes)
2. Event types + WizardRenderer.onEvent (types only)
3. Runner refactor (emit events at every point)
4. ClackRenderer (guide lines, collapsed steps, intro/outro)
5. Spinners (in ClackRenderer, triggered by events)
6. Note step type (schema + renderers)
7. Progress persistence (save/restore)
8. Review screen (post-loop check)
9. Wizard pipelines (new module + CLI)
10. Tests for everything
11. Update README, CHANGELOG, examples
