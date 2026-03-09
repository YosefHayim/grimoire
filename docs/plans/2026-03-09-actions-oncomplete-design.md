# v0.5.0 Design: Actions + onComplete Handler System

**Date:** 2026-03-09
**Status:** Approved
**Approach:** Minimal Extension (Approach A)

## Summary

Extend grimoire-wizard with two post-wizard execution mechanisms:

1. **`{{step-id}}` template interpolation** in action `run` strings — replace placeholders with wizard answers before executing shell commands.
2. **`onComplete` handler** — reference a TypeScript/JavaScript file whose default export runs after the wizard completes, before actions.
3. **AI agent reference doc** — a single markdown file at a GitHub URL containing the full grimoire-wizard schema reference, so AI assistants can generate perfect configs in one shot.

## Design Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Missing `{{step-id}}` in action | Throw error, abort | Fail fast — misconfigured template is a bug |
| `onComplete` config placement | Top-level field | Same level as `steps`, `actions` — discoverable |
| Execution order | `onComplete` first → `actions` second | Handler can prepare state for actions |
| Action failure | Abort remaining actions | Consistent fail-fast behavior |
| `--dry-run` | Show preview of interpolated commands + handler path | Helps debug configs |
| `--mock` mode | Skip both `onComplete` and `actions` | Consistent with current behavior |

## Existing Infrastructure

The codebase already has partial actions support:

- `ActionConfig` interface in `src/types.ts` (lines 184-188)
- `actions` field on `WizardConfig` (line 199)
- `WizardEvent` types: `actions:start`, `action:pass`, `action:fail` (lines 236-238)
- `executeActions` function in `src/runner.ts` (line 583+)
- Zod schema validation for actions in `src/schema.ts` (line 233)

What's missing: template interpolation, `onComplete` field/handler, dry-run preview, new event types.

## Section 1: Template Interpolation

### Behavior

Before running each action's `run` command, all `{{step-id}}` placeholders are replaced with the corresponding wizard answer.

### Implementation

New utility function:

```typescript
function interpolateTemplate(template: string, answers: Record<string, unknown>): string
```

- Regex: `/\{\{([^}]+)\}\}/g`
- Looks up each captured step-id in the answers map
- Array answers (multi-select) → joined with comma: `"a,b,c"`
- Boolean/number answers → converted to string
- Step-id not found → throws `GrimoireError`: `Action references unknown step "{{foo}}"`

Called inside `executeActions` before `exec()`.

### Example

```yaml
actions:
  - name: "Create project"
    run: "mkdir -p {{output-dir}}/{{project-name}}"
  - name: "Init git"
    run: "git init {{output-dir}}/{{project-name}}"
    when:
      stepId: use-git
      equals: true
```

## Section 2: onComplete Handler

### Config Shape

Top-level `onComplete` field — a file path string:

```yaml
title: My Wizard
onComplete: ./handlers/setup-project.ts
steps:
  - id: name
    type: text
    message: "Project name?"
actions:
  - run: "echo Done with {{name}}"
```

### Handler File Contract

```typescript
import type { OnCompleteHandler } from 'grimoire-wizard';

const handler: OnCompleteHandler = async (context) => {
  const { answers, config } = context;
  console.log(`Setting up ${answers['name']}...`);
};

export default handler;
```

### Exported Type

```typescript
export type OnCompleteHandler = (context: {
  answers: Record<string, unknown>;
  config: WizardConfig;
}) => Promise<void> | void;
```

### Implementation

New function:

```typescript
async function executeOnComplete(
  handlerPath: string,
  answers: Record<string, unknown>,
  config: WizardConfig,
  theme: ResolvedTheme,
  renderer?: WizardRenderer,
  isDryRun?: boolean,
): Promise<void>
```

- Resolves `handlerPath` relative to the config file's directory (not cwd)
- Uses `await import(resolvedPath)` to load the module
- Calls `.default(context)` — if no default export, throws `GrimoireError`
- Wrapped in try/catch — errors reported with handler file path
- Skipped in `--mock` mode
- In `--dry-run`, prints: `Would run onComplete handler: ./handlers/setup-project.ts`

### Schema Addition

```typescript
onComplete: z.string().optional()
```

## Section 3: Runner Integration

### Execution Flow

Post-wizard flow (after steps complete and review screen shown):

1. `onComplete` handler runs (if defined)
2. `actions` run sequentially (if defined, with `{{step-id}}` interpolation)

### Mode Behavior

| Mode | onComplete | actions |
|---|---|---|
| Normal | Runs | Runs (interpolated) |
| `--mock` | Skipped | Skipped |
| `--dry-run` | Prints path | Prints interpolated commands |

### Dry-Run Output

```
◆ Dry-run: would execute the following:

  ◆ onComplete handler: ./handlers/setup-project.ts

  ◆ Action: Create project
    $ mkdir -p my-app/output

  ◆ Action: Init git
    $ git init my-app/output
```

### Error Behavior

- `onComplete` throws → error reported, actions are NOT run
- Action fails (non-zero exit) → remaining actions aborted
- Both emit `WizardEvent` types

### New Event Types

```typescript
| { type: 'oncomplete:start' }
| { type: 'oncomplete:pass' }
| { type: 'oncomplete:fail'; error: string }
```

### Runner Code Change

Current:
```typescript
if (!isMock && config.actions?.length) {
  await executeActions(config.actions, answers, theme, renderer);
}
```

Becomes:
```typescript
if (!isMock) {
  if (config.onComplete) {
    await executeOnComplete(config.onComplete, answers, config, theme, renderer, isDryRun);
  }
  if (config.actions?.length) {
    await executeActions(config.actions, answers, theme, renderer, isDryRun);
  }
}
```

## Section 4: AI Agent Reference Doc

### What It Is

A comprehensive markdown reference file in the repo that AI agents can fetch to generate perfect grimoire configs.

### Location

- File: `docs/GRIMOIRE_REFERENCE.md`
- URL: `https://raw.githubusercontent.com/YosefHayim/grimoire/main/docs/GRIMOIRE_REFERENCE.md`

### README Addition

```markdown
## AI Agent Integration

Building wizard configs with an AI assistant? Give it this reference:

https://raw.githubusercontent.com/YosefHayim/grimoire/main/docs/GRIMOIRE_REFERENCE.md
```

### Content (under 500 lines)

1. What grimoire-wizard is (one paragraph)
2. Full config schema reference — every field, type, default
3. All 7 step types with examples
4. Conditions system
5. Actions with `{{step-id}}` interpolation
6. `onComplete` handler contract
7. Available themes (all 6 presets)
8. 3 annotated examples (simple, medium, complex)
9. Common patterns
10. Anti-patterns

## Files Changed

| File | Change |
|---|---|
| `src/types.ts` | Add `onComplete` to `WizardConfig`, add `OnCompleteHandler` type, add oncomplete events |
| `src/schema.ts` | Add `onComplete` to Zod schema |
| `src/runner.ts` | Add `interpolateTemplate`, `executeOnComplete`, update post-wizard flow, add dry-run preview |
| `src/index.ts` | Export `OnCompleteHandler` type |
| `src/cli.ts` | Pass `isDryRun` flag through to execution functions |
| `src/__tests__/` | Tests for interpolation, onComplete, dry-run, error cases |
| `examples/` | Example configs demonstrating actions + onComplete |
| `docs/GRIMOIRE_REFERENCE.md` | AI agent reference doc |
| `README.md` | Add AI agent integration section |
| `CHANGELOG.md` | v0.5.0 entry |
