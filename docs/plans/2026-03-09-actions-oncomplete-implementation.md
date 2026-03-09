# Actions + onComplete Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add `{{step-id}}` interpolation in action commands (with strict error on missing), `onComplete` handler file support, dry-run preview for both, and an AI agent reference doc.

**Architecture:** Extend existing `executeActions` with strict interpolation. Add new `executeOnComplete` function. Wire both into runner post-wizard flow. Create `GRIMOIRE_REFERENCE.md` for AI agents.

**Tech Stack:** TypeScript, Zod, Node.js `child_process`, dynamic `import()`, Vitest

---

### Task 1: Strict Template Interpolation for Actions

**Files:**
- Modify: `src/template.ts`
- Test: `src/__tests__/template.test.ts`

**Step 1: Write the failing tests**

Add to `src/__tests__/template.test.ts`:

```typescript
import { resolveTemplateStrict } from '../template';

describe('resolveTemplateStrict', () => {
  it('resolves known step-ids', () => {
    expect(resolveTemplateStrict('echo {{name}}', { name: 'hello' })).toBe('echo hello');
  });

  it('resolves arrays as comma-separated', () => {
    expect(resolveTemplateStrict('{{tools}}', { tools: ['a', 'b'] })).toBe('a, b');
  });

  it('throws on unknown step-id', () => {
    expect(() => resolveTemplateStrict('echo {{missing}}', {})).toThrow(
      'Action references unknown step "missing"',
    );
  });

  it('throws on skipped step (undefined value)', () => {
    expect(() => resolveTemplateStrict('echo {{skipped}}', {})).toThrow(
      'Action references unknown step "skipped"',
    );
  });

  it('handles multiple placeholders with one missing', () => {
    expect(() => resolveTemplateStrict('{{a}} {{b}}', { a: 'ok' })).toThrow(
      'Action references unknown step "b"',
    );
  });

  it('handles boolean and number values', () => {
    expect(resolveTemplateStrict('--port={{port}} --verbose={{v}}', { port: 3000, v: true })).toBe(
      '--port=3000 --verbose=true',
    );
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `npx vitest run src/__tests__/template.test.ts`
Expected: FAIL — `resolveTemplateStrict` does not exist

**Step 3: Implement `resolveTemplateStrict`**

Add to `src/template.ts`:

```typescript
/**
 * Resolve {{stepId}} placeholders strictly — throws if any placeholder
 * references a step-id not found in the answers map.
 * Used by actions where missing answers indicate a config error.
 */
export function resolveTemplateStrict(template: string, answers: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const trimmedKey = key.trim();
    if (!(trimmedKey in answers)) {
      throw new Error(`Action references unknown step "${trimmedKey}"`);
    }
    const value = answers[trimmedKey];
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  });
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/template.test.ts`
Expected: ALL PASS

**Step 5: Export from index**

Add to `src/index.ts` after the existing `resolveTemplate` export:

```typescript
export { resolveTemplate, resolveTemplateStrict } from './template';
```

Remove the old `resolveTemplate`-only export line.

**Step 6: Update `executeActions` to use strict interpolation**

In `src/runner.ts`, change line 596:

```typescript
// OLD:
const resolvedCommand = resolveTemplate(action.run, answers);
// NEW:
const resolvedCommand = resolveTemplateStrict(action.run, answers);
```

Also update the import at line 6:

```typescript
import { resolveTemplate, resolveTemplateStrict } from './template';
```

**Step 7: Run full test suite**

Run: `npx vitest run`
Expected: ALL PASS

**Step 8: Commit**

```bash
git add src/template.ts src/__tests__/template.test.ts src/index.ts src/runner.ts
git commit -m "feat: add resolveTemplateStrict for action command interpolation"
```

---

### Task 2: `onComplete` Type, Schema, and Event Types

**Files:**
- Modify: `src/types.ts`
- Modify: `src/schema.ts`
- Modify: `src/index.ts`

**Step 1: Add `OnCompleteHandler` type and `onComplete` to `WizardConfig`**

In `src/types.ts`, add after the `ActionConfig` interface (after line 188):

```typescript
// ─── OnComplete Handler ─────────────────────────────────────────────────────

export type OnCompleteHandler = (context: {
  answers: Record<string, unknown>;
  config: WizardConfig;
}) => Promise<void> | void;
```

Add `onComplete` field to `WizardConfig` (after `actions` on line 199):

```typescript
export interface WizardConfig {
  meta: { name: string; version?: string; description?: string; review?: boolean };
  theme?: ThemeConfig;
  steps: StepConfig[];
  output?: { format: 'json' | 'env' | 'yaml'; path?: string };
  extends?: string;
  checks?: PreFlightCheck[];
  actions?: ActionConfig[];
  onComplete?: string;
}
```

**Step 2: Add oncomplete event types**

In `src/types.ts`, add after the existing action events (after line 238):

```typescript
  | { type: 'oncomplete:start' }
  | { type: 'oncomplete:pass' }
  | { type: 'oncomplete:fail'; error: string };
```

**Step 3: Add `onComplete` to Zod schema**

In `src/schema.ts`, add after line 233 (`actions` field):

```typescript
  onComplete: z.string().optional(),
```

**Step 4: Export `OnCompleteHandler` from index**

In `src/index.ts`, add to the type exports (after `ActionConfig` on line 28):

```typescript
  OnCompleteHandler,
```

**Step 5: Run typecheck and tests**

Run: `npx tsc --noEmit && npx vitest run`
Expected: ALL PASS, no type errors

**Step 6: Commit**

```bash
git add src/types.ts src/schema.ts src/index.ts
git commit -m "feat: add onComplete type, schema field, and event types"
```

---

### Task 3: `executeOnComplete` Function

**Files:**
- Modify: `src/runner.ts`
- Test: `src/__tests__/e2e.test.ts`

**Step 1: Write failing test for onComplete execution**

Add a new describe block to `src/__tests__/e2e.test.ts`:

```typescript
describe('E2E: onComplete handler', () => {
  it('calls onComplete handler with answers', async () => {
    // Create a temp handler file that writes answers to a temp file
    const tmpDir = mkdtempSync(join(tmpdir(), 'grimoire-oncomplete-'));
    const outputFile = join(tmpDir, 'output.json');
    const handlerFile = join(tmpDir, 'handler.mjs');

    writeFileSync(
      handlerFile,
      `
      import { writeFileSync } from 'node:fs';
      export default async (context) => {
        writeFileSync('${outputFile.replace(/\\/g, '\\\\')}', JSON.stringify(context.answers));
      };
      `,
    );

    const configFile = join(tmpDir, 'wizard.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        meta: { name: 'OnComplete Test' },
        onComplete: './handler.mjs',
        steps: [{ id: 'name', type: 'text', message: 'Name?' }],
      }),
    );

    const result = run(`run "${configFile}" --mock '{"name":"test-value"}'`);
    expect(result).toContain('OnComplete Test');

    const written = JSON.parse(readFileSync(outputFile, 'utf-8'));
    expect(written.name).toBe('test-value');

    // Cleanup
    rmSync(tmpDir, { recursive: true });
  });
});
```

Note: This test needs imports for `mkdtempSync`, `tmpdir`, `writeFileSync`, `readFileSync`, `rmSync`, `join`. Check existing imports in the test file and add any missing ones.

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/e2e.test.ts`
Expected: FAIL — onComplete handler not executed

**Step 3: Implement `executeOnComplete` in runner.ts**

Add before `executeActions` function (around line 582):

```typescript
async function executeOnComplete(
  handlerPath: string,
  configFilePath: string | undefined,
  answers: Record<string, unknown>,
  config: WizardConfig,
  theme: ResolvedTheme,
  renderer?: WizardRenderer,
  isDryRun?: boolean,
): Promise<void> {
  if (isDryRun) {
    console.log(`\n  ${theme.bold('Dry-run:')} would run onComplete handler: ${theme.info(handlerPath)}\n`);
    return;
  }

  if (renderer) emitEvent(renderer, { type: 'oncomplete:start' }, theme);

  const resolvedPath = configFilePath
    ? resolve(dirname(configFilePath), handlerPath)
    : resolve(handlerPath);

  try {
    const mod = await import(pathToFileURL(resolvedPath).href);
    if (typeof mod.default !== 'function') {
      throw new Error(`onComplete handler "${handlerPath}" must export a default function`);
    }
    await mod.default({ answers, config });
    if (renderer) emitEvent(renderer, { type: 'oncomplete:pass' }, theme);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (renderer) emitEvent(renderer, { type: 'oncomplete:fail', error: message }, theme);
    console.log(`\n  ${theme.error('✗')} onComplete handler failed: ${message}\n`);
    throw error;
  }
}
```

Add required imports at the top of runner.ts:

```typescript
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
```

**Step 4: Wire `executeOnComplete` into the runner post-wizard flow**

Replace lines 336-338 in runner.ts:

```typescript
// OLD:
if (state.status === 'done' && config.actions && config.actions.length > 0 && !isMock) {
  await executeActions(config.actions, state.answers, theme, renderer);
}

// NEW:
if (state.status === 'done' && !isMock) {
  if (config.onComplete) {
    await executeOnComplete(config.onComplete, options?.configFilePath, state.answers, config, theme, renderer);
  }
  if (config.actions && config.actions.length > 0) {
    await executeActions(config.actions, state.answers, theme, renderer);
  }
}
```

Note: `configFilePath` needs to be passed through `RunWizardOptions`. Add it:

```typescript
export interface RunWizardOptions {
  // ... existing fields
  configFilePath?: string;
}
```

And update `cli.ts` to pass it when calling `runWizard`:

```typescript
const answers = await runWizard(config, {
  // ... existing options
  configFilePath: fullPath,
});
```

**Step 5: Run tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 6: Commit**

```bash
git add src/runner.ts src/cli.ts src/__tests__/e2e.test.ts
git commit -m "feat: add executeOnComplete handler support"
```

---

### Task 4: Dry-Run Preview for Actions and onComplete

**Files:**
- Modify: `src/runner.ts`
- Modify: `src/cli.ts`
- Test: `src/__tests__/e2e.test.ts`

**Step 1: Write failing test for dry-run action preview**

Add to `src/__tests__/e2e.test.ts`:

```typescript
describe('E2E: dry-run with actions', () => {
  it('shows interpolated action commands in dry-run', () => {
    const tmpDir = mkdtempSync(join(tmpdir(), 'grimoire-dryrun-'));
    const configFile = join(tmpDir, 'wizard.json');
    writeFileSync(
      configFile,
      JSON.stringify({
        meta: { name: 'DryRun Actions Test' },
        steps: [{ id: 'name', type: 'text', message: 'Name?' }],
        actions: [
          { name: 'Create dir', run: 'mkdir {{name}}' },
          { name: 'Init', run: 'echo init' },
        ],
      }),
    );

    const result = run(`run "${configFile}" --dry-run`);
    expect(result).toContain('Create dir');
    expect(result).toContain('mkdir {{name}}');
    expect(result).toContain('Init');

    rmSync(tmpDir, { recursive: true });
  });
});
```

Note: dry-run currently prints steps only and returns before running the wizard. For actions dry-run, we need to update `printDryRun` in cli.ts to also show configured actions. The `{{step-id}}` won't be interpolated in this mode since we don't have answers — it shows the raw templates.

**Step 2: Update `printDryRun` in cli.ts to show actions and onComplete**

Find the `printDryRun` function in `src/cli.ts` and add action/onComplete preview at the end:

```typescript
// After the existing step printing loop, add:
if (config.onComplete) {
  console.log(`\n  ${chalk.bold('onComplete handler:')}`);
  console.log(`    ${config.onComplete}`);
}

if (config.actions && config.actions.length > 0) {
  console.log(`\n  ${chalk.bold('Actions:')}`);
  for (const action of config.actions) {
    const label = action.name ?? action.run;
    console.log(`    ${label}`);
    if (action.name) {
      console.log(`      $ ${action.run}`);
    }
    if (action.when) {
      console.log(`      when: ${JSON.stringify(action.when)}`);
    }
  }
}

console.log();
```

**Step 3: Run tests**

Run: `npx vitest run`
Expected: ALL PASS

**Step 4: Commit**

```bash
git add src/cli.ts src/__tests__/e2e.test.ts
git commit -m "feat: show actions and onComplete in --dry-run preview"
```

---

### Task 5: Example Configs with Actions and onComplete

**Files:**
- Create: `examples/yaml/with-actions.yaml`
- Create: `examples/yaml/with-oncomplete.yaml`
- Create: `examples/handlers/setup-project.ts`
- Create: `examples/json/with-actions.json`
- Create: `examples/json/with-oncomplete.json`

**Step 1: Create `examples/yaml/with-actions.yaml`**

```yaml
meta:
  name: Project Scaffolder
  description: Create a new project with actions

steps:
  - id: project-name
    type: text
    message: Project name?
    validate:
      - rule: required
      - rule: pattern
        value: "^[a-z0-9-]+$"
        message: Only lowercase letters, numbers, and hyphens

  - id: use-git
    type: confirm
    message: Initialize git repository?
    default: true

  - id: use-readme
    type: confirm
    message: Create README?
    default: true

actions:
  - name: Create project directory
    run: "mkdir -p {{project-name}}"

  - name: Initialize git
    run: "git -C {{project-name}} init"
    when:
      field: use-git
      equals: true

  - name: Create README
    run: "echo '# {{project-name}}' > {{project-name}}/README.md"
    when:
      field: use-readme
      equals: true

output:
  format: json
```

**Step 2: Create `examples/handlers/setup-project.ts`**

```typescript
import type { OnCompleteHandler } from '../../src/types';

const handler: OnCompleteHandler = async ({ answers, config }) => {
  console.log(`\n  Setting up project: ${answers['project-name']}`);
  console.log(`  Wizard: ${config.meta.name}`);
  console.log(`  Total answers: ${Object.keys(answers).length}\n`);
};

export default handler;
```

**Step 3: Create `examples/yaml/with-oncomplete.yaml`**

```yaml
meta:
  name: Project Setup with Handler
  description: Demonstrates onComplete handler

onComplete: ../handlers/setup-project.ts

steps:
  - id: project-name
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
    default: true

actions:
  - name: Log completion
    run: "echo 'Created {{project-name}} with {{language}}'"

output:
  format: json
```

**Step 4: Create JSON equivalents**

Create `examples/json/with-actions.json` and `examples/json/with-oncomplete.json` — JSON versions of the YAML configs above.

**Step 5: Run dry-run on examples to verify they parse**

```bash
npx tsx src/cli.ts run examples/yaml/with-actions.yaml --dry-run
npx tsx src/cli.ts run examples/yaml/with-oncomplete.yaml --dry-run
```

Expected: Both print step plans without errors

**Step 6: Commit**

```bash
git add examples/
git commit -m "feat: add example configs with actions and onComplete"
```

---

### Task 6: AI Agent Reference Doc (`GRIMOIRE_REFERENCE.md`)

**Files:**
- Create: `docs/GRIMOIRE_REFERENCE.md`
- Modify: `README.md`

**Step 1: Write `docs/GRIMOIRE_REFERENCE.md`**

Comprehensive single-file reference (under 500 lines) covering:

1. One-paragraph intro
2. Full config schema reference (meta, steps, output, theme, checks, extends, actions, onComplete)
3. All step types (text, select, multiselect, confirm, password, number, search, editor, path, toggle, note) with field tables
4. Conditions system (all operators, compound conditions)
5. Actions with `{{step-id}}` interpolation — strict error behavior
6. `onComplete` handler contract — type signature, resolution rules
7. Available themes (default + 5 presets)
8. 3 annotated examples (simple 5-step, medium 15-step with conditions, complex with actions + onComplete)
9. Common patterns (conditional steps, dependent choices, grouped steps, validation)
10. Anti-patterns (duplicate IDs, circular conditions, missing required fields, actions referencing non-existent steps)

**Step 2: Add AI Agent Integration section to README.md**

Add before the License section:

```markdown
## AI Agent Integration

Building wizard configs with an AI assistant? Give it this reference:

```
https://raw.githubusercontent.com/YosefHayim/grimoire/main/docs/GRIMOIRE_REFERENCE.md
```

This single file contains the complete grimoire-wizard schema, all step types, conditions, actions, handler contracts, and annotated examples — everything an AI agent needs to generate correct configs in one shot.
```

**Step 3: Commit**

```bash
git add docs/GRIMOIRE_REFERENCE.md README.md
git commit -m "docs: add AI agent reference doc and link from README"
```

---

### Task 7: Version Bump, CHANGELOG, Final Verification

**Files:**
- Modify: `package.json` (version → 0.5.0)
- Modify: `CHANGELOG.md`

**Step 1: Bump version in package.json to 0.5.0**

**Step 2: Add CHANGELOG entry**

```markdown
## [0.5.0] - 2026-03-09

### Added
- **Strict template interpolation** — `{{step-id}}` placeholders in action `run` commands are now resolved from wizard answers. Missing step-ids throw an error and abort execution.
- **`onComplete` handler** — reference a TypeScript/JavaScript file from your config. Its default export is called with `{ answers, config }` after the wizard completes, before actions run.
- **Dry-run action preview** — `--dry-run` now shows configured actions and onComplete handler alongside the step plan.
- **`oncomplete:start`, `oncomplete:pass`, `oncomplete:fail` events** — new WizardEvent types for renderer integration.
- **AI agent reference doc** — `docs/GRIMOIRE_REFERENCE.md` provides a single-file schema reference for AI assistants to generate grimoire configs.
- **Example configs** — `with-actions.yaml` and `with-oncomplete.yaml` demonstrating the new features.

### Changed
- `executeActions` now uses strict interpolation — unresolved `{{step-id}}` placeholders throw instead of being left as-is.
```

**Step 3: Run full verification**

```bash
npx tsc --noEmit
npx vitest run
npx tsup
```

Expected: All pass, zero errors

**Step 4: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: bump version to 0.5.0 and update CHANGELOG"
```
