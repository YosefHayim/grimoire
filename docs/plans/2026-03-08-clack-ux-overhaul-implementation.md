# Clack-Inspired UX Overhaul — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an event-driven runner, clack-style renderer, theme presets, progress persistence, wizard pipelines, review screen, note boxes, and spinners to grimoire-wizard v0.4.0.

**Architecture:** The runner emits `WizardEvent` objects. A new `ClackRenderer` subscribes via `onEvent()` to render connected guide lines, collapsed steps, spinners, and note boxes. Existing renderers are unchanged (backward compatible). New modules handle theme presets, progress persistence, and wizard pipelines.

**Tech Stack:** TypeScript (ESM), chalk (existing dep), @inquirer/prompts (existing dep), zod (existing dep), vitest (tests), tsup (build)

**Branch:** `dev` (all work on dev, PR to main)

**Test command:** `npx vitest run`
**Typecheck command:** `npx tsc --noEmit`
**Build command:** `npx tsup`

---

## Task 1: Unicode Symbols Module

**Files:**
- Create: `src/renderers/symbols.ts`
- Test: `src/__tests__/symbols.test.ts`

**Step 1: Write the test**

```typescript
// src/__tests__/symbols.test.ts
import { describe, it, expect } from 'vitest';
import { S_BAR, S_BAR_START, S_BAR_END, S_STEP_ACTIVE, S_STEP_SUBMIT,
         S_STEP_CANCEL, S_STEP_ERROR, S_CORNER_TR, S_CORNER_BR, S_BAR_H,
         S_SPINNER_FRAMES } from '../renderers/symbols';

describe('symbols', () => {
  it('exports all required symbols as non-empty strings', () => {
    const symbols = [S_BAR, S_BAR_START, S_BAR_END, S_STEP_ACTIVE, S_STEP_SUBMIT,
                     S_STEP_CANCEL, S_STEP_ERROR, S_CORNER_TR, S_CORNER_BR, S_BAR_H];
    for (const s of symbols) {
      expect(typeof s).toBe('string');
      expect(s.length).toBeGreaterThan(0);
    }
  });

  it('exports spinner frames as array of 4 strings', () => {
    expect(Array.isArray(S_SPINNER_FRAMES)).toBe(true);
    expect(S_SPINNER_FRAMES.length).toBe(4);
    for (const f of S_SPINNER_FRAMES) {
      expect(typeof f).toBe('string');
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/symbols.test.ts`
Expected: FAIL — cannot find module `../renderers/symbols`

**Step 3: Write the implementation**

```typescript
// src/renderers/symbols.ts

function isUnicodeSupported(): boolean {
  if (process.platform === 'win32') {
    return Boolean(process.env['WT_SESSION']) || process.env['TERM_PROGRAM'] === 'vscode';
  }
  return process.env['TERM'] !== 'linux';
}

const unicode = isUnicodeSupported();
const u = (unicodeChar: string, fallback: string): string => unicode ? unicodeChar : fallback;

export const S_BAR_START   = u('┌', 'T');
export const S_BAR         = u('│', '|');
export const S_BAR_END     = u('└', '—');
export const S_STEP_ACTIVE = u('◆', '*');
export const S_STEP_SUBMIT = u('◇', 'o');
export const S_STEP_CANCEL = u('■', 'x');
export const S_STEP_ERROR  = u('▲', 'x');
export const S_CORNER_TR   = u('╮', '+');
export const S_CORNER_BR   = u('╯', '+');
export const S_BAR_H       = u('─', '-');

export const S_SPINNER_FRAMES = unicode
  ? ['◒', '◐', '◓', '◑']
  : ['•', 'o', 'O', '0'];
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/symbols.test.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add src/renderers/symbols.ts src/__tests__/symbols.test.ts
git commit -m "feat: add unicode symbol module for clack-style rendering"
```

---

## Task 2: Theme Presets

**Files:**
- Create: `src/themes/presets.ts`
- Modify: `src/types.ts` — add `preset` field to `ThemeConfig`
- Modify: `src/theme.ts` — resolve preset tokens before user overrides
- Modify: `src/schema.ts` — add `preset` to theme schema
- Test: `src/__tests__/presets.test.ts`

**Step 1: Write the test**

```typescript
// src/__tests__/presets.test.ts
import { describe, it, expect } from 'vitest';
import { THEME_PRESETS, PRESET_NAMES } from '../themes/presets';
import { resolveTheme } from '../theme';

describe('theme presets', () => {
  it('exports all 6 preset names', () => {
    expect(PRESET_NAMES).toEqual(['default', 'catppuccin', 'dracula', 'nord', 'tokyonight', 'monokai']);
  });

  it('each preset has all 7 color tokens', () => {
    const requiredTokens = ['primary', 'success', 'error', 'warning', 'info', 'muted', 'accent'];
    for (const name of PRESET_NAMES) {
      const preset = THEME_PRESETS[name];
      expect(preset).toBeDefined();
      for (const token of requiredTokens) {
        expect(preset[token as keyof typeof preset]).toMatch(/^#[0-9a-fA-F]{6}$/);
      }
    }
  });

  it('resolveTheme applies preset tokens', () => {
    const theme = resolveTheme({ preset: 'dracula' });
    // Should use dracula colors, not defaults
    expect(theme).toBeDefined();
    expect(typeof theme.primary).toBe('function');
  });

  it('user tokens override preset tokens', () => {
    const theme = resolveTheme({ preset: 'dracula', tokens: { primary: '#FF0000' } });
    // Theme should resolve without error
    expect(theme).toBeDefined();
  });

  it('resolveTheme works without preset (backward compatible)', () => {
    const theme = resolveTheme({ tokens: { primary: '#123456' } });
    expect(theme).toBeDefined();
  });

  it('resolveTheme works with undefined config (backward compatible)', () => {
    const theme = resolveTheme(undefined);
    expect(theme).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/presets.test.ts`
Expected: FAIL — cannot find `../themes/presets` and `preset` not on `ThemeConfig`

**Step 3: Create presets module**

```typescript
// src/themes/presets.ts

export interface PresetTokens {
  primary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  muted: string;
  accent: string;
}

export const THEME_PRESETS: Record<string, PresetTokens> = {
  default: {
    primary: '#7C3AED', success: '#10B981', error: '#EF4444',
    warning: '#F59E0B', info: '#3B82F6', muted: '#6B7280', accent: '#8B5CF6',
  },
  catppuccin: {
    primary: '#cba6f7', success: '#a6e3a1', error: '#f38ba8',
    warning: '#fab387', info: '#74c7ec', muted: '#6c7086', accent: '#f5c2e7',
  },
  dracula: {
    primary: '#bd93f9', success: '#50fa7b', error: '#ff5555',
    warning: '#ffb86c', info: '#8be9fd', muted: '#6272a4', accent: '#ff79c6',
  },
  nord: {
    primary: '#88c0d0', success: '#a3be8c', error: '#bf616a',
    warning: '#ebcb8b', info: '#81a1c1', muted: '#4c566a', accent: '#b48ead',
  },
  tokyonight: {
    primary: '#7aa2f7', success: '#9ece6a', error: '#f7768e',
    warning: '#e0af68', info: '#7dcfff', muted: '#565f89', accent: '#bb9af7',
  },
  monokai: {
    primary: '#ab9df2', success: '#a9dc76', error: '#ff6188',
    warning: '#ffd866', info: '#78dce8', muted: '#727072', accent: '#fc9867',
  },
};

export const PRESET_NAMES = Object.keys(THEME_PRESETS) as Array<keyof typeof THEME_PRESETS>;
```

**Step 4: Add `preset` to `ThemeConfig` in `src/types.ts`**

Add `preset?: string;` to the `ThemeConfig` interface, before `tokens`.

**Step 5: Update `src/theme.ts` to resolve presets**

Import `THEME_PRESETS` from `./themes/presets`. In `resolveTheme`, if `themeConfig?.preset` is set and exists in `THEME_PRESETS`, use its tokens as the base (before user overrides).

Resolution order: `DEFAULT_TOKENS` -> `preset tokens` -> `user tokens`.

```typescript
export function resolveTheme(themeConfig?: ThemeConfig): ResolvedTheme {
  const presetTokens = themeConfig?.preset && THEME_PRESETS[themeConfig.preset]
    ? THEME_PRESETS[themeConfig.preset]
    : {};
  const tokens = { ...DEFAULT_TOKENS, ...presetTokens, ...themeConfig?.tokens };
  const icons = { ...DEFAULT_ICONS, ...themeConfig?.icons };
  // ... rest unchanged
}
```

**Step 6: Update `src/schema.ts`**

Add `preset: z.enum(['default', 'catppuccin', 'dracula', 'nord', 'tokyonight', 'monokai']).optional()` to `themeConfigSchema`.

**Step 7: Run test to verify it passes**

Run: `npx vitest run src/__tests__/presets.test.ts`
Expected: PASS

**Step 8: Run full test suite**

Run: `npx vitest run`
Expected: All 210+ tests pass (no regressions)

**Step 9: Commit**

```bash
git add src/themes/presets.ts src/__tests__/presets.test.ts src/types.ts src/theme.ts src/schema.ts
git commit -m "feat: add built-in theme presets (catppuccin, dracula, nord, tokyonight, monokai)"
```

---

## Task 3: WizardEvent Type + onEvent Interface

**Files:**
- Modify: `src/types.ts` — add `WizardEvent` type, add `NoteStepConfig`, extend `WizardRenderer` with optional `onEvent`
- Modify: `src/schema.ts` — add `note` step to `stepConfigSchema` discriminated union
- Test: `src/__tests__/events.test.ts`

**Step 1: Write the test**

```typescript
// src/__tests__/events.test.ts
import { describe, it, expect } from 'vitest';
import type { WizardEvent, WizardRenderer, ResolvedTheme, NoteStepConfig } from '../types';

describe('WizardEvent types', () => {
  it('can create all event types', () => {
    const events: WizardEvent[] = [
      { type: 'session:start', wizard: 'test', totalSteps: 5 },
      { type: 'session:end', answers: {}, cancelled: false },
      { type: 'group:start', group: 'Setup' },
      { type: 'step:start', stepId: 'name', stepIndex: 0, totalVisible: 5, step: { id: 'name', type: 'text', message: 'Name?' } },
      { type: 'step:complete', stepId: 'name', value: 'test', step: { id: 'name', type: 'text', message: 'Name?' } },
      { type: 'step:error', stepId: 'name', error: 'Required' },
      { type: 'step:back', stepId: 'name' },
      { type: 'spinner:start', message: 'Loading...' },
      { type: 'spinner:stop', message: 'Done' },
      { type: 'note', title: 'Info', body: 'Hello' },
      { type: 'checks:start', checks: [{ name: 'git', run: 'git --version', message: 'Need git' }] },
      { type: 'check:pass', name: 'git' },
      { type: 'check:fail', name: 'docker', message: 'Docker not running' },
      { type: 'actions:start' },
      { type: 'action:pass', name: 'deploy' },
      { type: 'action:fail', name: 'deploy' },
    ];
    expect(events.length).toBe(16);
  });

  it('WizardRenderer.onEvent is optional', () => {
    // A renderer without onEvent should be valid
    const renderer: Partial<WizardRenderer> = {};
    expect(renderer.onEvent).toBeUndefined();
  });
});

describe('NoteStepConfig', () => {
  it('has the correct shape', () => {
    const note: NoteStepConfig = {
      id: 'info',
      type: 'note',
      message: 'Setup Complete',
      description: 'Run npm install',
    };
    expect(note.type).toBe('note');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/events.test.ts`
Expected: FAIL — `WizardEvent` and `NoteStepConfig` don't exist

**Step 3: Add types to `src/types.ts`**

Add after the `WizardTransition` type:

```typescript
// ─── Wizard Events ──────────────────────────────────────────────────────────

export type WizardEvent =
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
  | { type: 'action:fail'; name: string };
```

Add `NoteStepConfig`:

```typescript
export interface NoteStepConfig extends BaseStepConfig {
  type: 'note';
}
```

Add `NoteStepConfig` to the `StepConfig` union.

Add `onEvent` to `WizardRenderer`:

```typescript
export interface WizardRenderer {
  // ... existing methods ...
  onEvent?(event: WizardEvent, theme: ResolvedTheme): void;
}
```

**Step 4: Update `src/schema.ts`**

Add `noteStepSchema`:

```typescript
const noteStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('note'),
});
```

Add `noteStepSchema` to the `stepConfigSchema` discriminated union array.
Export `noteStepSchema` alongside the other schema exports.

**Step 5: Update `src/index.ts`**

Add `NoteStepConfig` and `WizardEvent` to the type exports.

**Step 6: Run test to verify it passes**

Run: `npx vitest run src/__tests__/events.test.ts`
Expected: PASS

**Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass (existing `note` type in message step tests should still work; the `note` type is new to the discriminated union)

**Step 8: Commit**

```bash
git add src/types.ts src/schema.ts src/index.ts src/__tests__/events.test.ts
git commit -m "feat: add WizardEvent type, NoteStepConfig, and optional onEvent to WizardRenderer"
```

---

## Task 4: Runner Event Emission

**Files:**
- Modify: `src/runner.ts` — emit events at every meaningful point
- Test: `src/__tests__/runner-events.test.ts`

**Step 1: Write the test**

```typescript
// src/__tests__/runner-events.test.ts
import { describe, it, expect } from 'vitest';
import { runWizard } from '../runner';
import type { WizardConfig, WizardEvent, WizardRenderer, ResolvedTheme } from '../types';

// A spy renderer that records all events
class EventSpyRenderer implements Partial<WizardRenderer> {
  events: WizardEvent[] = [];

  onEvent(event: WizardEvent, _theme: ResolvedTheme): void {
    this.events.push(event);
  }
}

const basicConfig: WizardConfig = {
  meta: { name: 'Test Wizard' },
  steps: [
    { id: 'name', type: 'text', message: 'Name?' },
    { id: 'confirm', type: 'confirm', message: 'OK?' },
  ],
};

describe('runner event emission', () => {
  it('emits session:start and session:end in mock mode', async () => {
    const spy = new EventSpyRenderer();
    await runWizard(basicConfig, {
      renderer: spy as unknown as WizardRenderer,
      mockAnswers: { name: 'test', confirm: true },
    });

    const types = spy.events.map(e => e.type);
    expect(types).toContain('session:start');
    expect(types).toContain('session:end');
  });

  it('emits step:start and step:complete for each step', async () => {
    const spy = new EventSpyRenderer();
    await runWizard(basicConfig, {
      renderer: spy as unknown as WizardRenderer,
      mockAnswers: { name: 'test', confirm: true },
    });

    const stepStarts = spy.events.filter(e => e.type === 'step:start');
    const stepCompletes = spy.events.filter(e => e.type === 'step:complete');
    expect(stepStarts.length).toBe(2);
    expect(stepCompletes.length).toBe(2);
  });

  it('session:end has cancelled=false on success', async () => {
    const spy = new EventSpyRenderer();
    await runWizard(basicConfig, {
      renderer: spy as unknown as WizardRenderer,
      mockAnswers: { name: 'test', confirm: true },
    });

    const end = spy.events.find(e => e.type === 'session:end');
    expect(end).toBeDefined();
    if (end && end.type === 'session:end') {
      expect(end.cancelled).toBe(false);
    }
  });

  it('emits group:start when group changes', async () => {
    const configWithGroups: WizardConfig = {
      meta: { name: 'Grouped' },
      steps: [
        { id: 'a', type: 'text', message: 'A?', group: 'Section 1' },
        { id: 'b', type: 'text', message: 'B?', group: 'Section 2' },
      ],
    };
    const spy = new EventSpyRenderer();
    await runWizard(configWithGroups, {
      renderer: spy as unknown as WizardRenderer,
      mockAnswers: { a: 'x', b: 'y' },
    });

    const groupEvents = spy.events.filter(e => e.type === 'group:start');
    expect(groupEvents.length).toBe(2);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/runner-events.test.ts`
Expected: FAIL — `onEvent` is never called by the runner

**Step 3: Modify `src/runner.ts`**

Add a helper function at the top:

```typescript
function emitEvent(renderer: WizardRenderer, event: WizardEvent, theme: ResolvedTheme): void {
  if (renderer.onEvent) {
    renderer.onEvent(event, theme);
  }
}
```

Then emit events at the following points in `runWizard`:
- After `printWizardHeader` → `emitEvent(renderer, { type: 'session:start', wizard: config.meta.name, description: config.meta.description, totalSteps: getVisibleSteps(config, {}).length }, theme)`
- Before `renderStepHeader` → `emitEvent(renderer, { type: 'step:start', stepId: currentStep.id, stepIndex, totalVisible: visibleSteps.length, step: currentStep }, theme)`
- After successful step → `emitEvent(renderer, { type: 'step:complete', stepId: currentStep.id, value, step: currentStep }, theme)`
- On validation error → `emitEvent(renderer, { type: 'step:error', stepId: currentStep.id, error: errorMsg }, theme)`
- On group change → `emitEvent(renderer, { type: 'group:start', group: resolvedGroup }, theme)`
- On cancel → `emitEvent(renderer, { type: 'session:end', answers: state.answers, cancelled: true }, theme)`
- On done → `emitEvent(renderer, { type: 'session:end', answers: state.answers, cancelled: false }, theme)`
- Pre-flight checks start → `emitEvent(renderer, { type: 'checks:start', checks: config.checks }, theme)`
- Each check pass/fail → `check:pass` / `check:fail` events
- Actions start → `emitEvent(renderer, { type: 'actions:start' }, theme)`
- Each action pass/fail → `action:pass` / `action:fail` events

Also emit `note` events for note step types: when the runner hits a step with `type === 'note'`, emit `{ type: 'note', title: step.message, body: step.description ?? '' }` and skip it (don't prompt).

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/runner-events.test.ts`
Expected: PASS

**Step 5: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 6: Commit**

```bash
git add src/runner.ts src/__tests__/runner-events.test.ts
git commit -m "feat: emit WizardEvent from runner at every meaningful point"
```

---

## Task 5: ClackRenderer

**Files:**
- Create: `src/renderers/clack.ts`
- Modify: `src/index.ts` — export `ClackRenderer`
- Modify: `src/cli.ts` — add `clack` as `--renderer` option
- Test: `src/__tests__/clack-renderer.test.ts`

**Step 1: Write the test**

```typescript
// src/__tests__/clack-renderer.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ClackRenderer } from '../renderers/clack';
import type { WizardEvent, ResolvedTheme } from '../types';
import { resolveTheme } from '../theme';

describe('ClackRenderer', () => {
  let renderer: ClackRenderer;
  let theme: ResolvedTheme;
  let writeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    renderer = new ClackRenderer();
    theme = resolveTheme();
    writeSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  });

  it('handles session:start event', () => {
    renderer.onEvent({ type: 'session:start', wizard: 'Test', totalSteps: 3 }, theme);
    const output = writeSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('Test');
  });

  it('handles session:end event (success)', () => {
    renderer.onEvent({ type: 'session:end', answers: {}, cancelled: false }, theme);
    const output = writeSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('all set');
  });

  it('handles session:end event (cancelled)', () => {
    renderer.onEvent({ type: 'session:end', answers: {}, cancelled: true }, theme);
    const output = writeSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('Cancelled');
  });

  it('handles step:complete event', () => {
    renderer.onEvent(
      { type: 'step:complete', stepId: 'name', value: 'my-app',
        step: { id: 'name', type: 'text', message: 'Name?' } },
      theme,
    );
    // Should have written something
    expect(writeSpy).toHaveBeenCalled();
  });

  it('handles note event', () => {
    renderer.onEvent({ type: 'note', title: 'Next Steps', body: 'npm install\nnpm run dev' }, theme);
    const output = writeSpy.mock.calls.map(c => c[0]).join('');
    expect(output).toContain('Next Steps');
    expect(output).toContain('npm install');
  });

  it('is a valid WizardRenderer', () => {
    expect(renderer.renderText).toBeDefined();
    expect(renderer.renderSelect).toBeDefined();
    expect(renderer.onEvent).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/clack-renderer.test.ts`
Expected: FAIL — cannot find `../renderers/clack`

**Step 3: Implement ClackRenderer**

Create `src/renderers/clack.ts`. The renderer:
- Extends or copies the InquirerRenderer for all `render*` methods (uses the same @inquirer/prompts)
- Overrides `renderStepHeader` and `renderGroupHeader` to use the guide line
- Implements `onEvent` for session:start, session:end, step:complete (collapsed), step:error, note, spinners
- Uses symbols from `./symbols.ts`
- Uses chalk (already a dep) for coloring

The `onEvent` handler:
- `session:start` → writes `┌  {wizard name}` + `│`
- `step:start` → writes `│` (guide line before the inquirer prompt renders)
- `step:complete` → uses ANSI escapes to clear the prompt output and replace with `◇  {message} · {value}`
- `step:error` → writes `▲  {error}` on guide line
- `session:end` → writes `│` + `└  You're all set!` or `■  Cancelled`
- `note` → writes bordered box with `╮` / `│` / `╯`
- `group:start` → writes group name on guide line
- `spinner:start` → starts `setInterval` animation
- `spinner:stop` → clears interval, writes final message

The `renderStepHeader` override prints nothing (the header is handled by `step:start` event + the inquirer prompt's own message). The `renderSummary` renders a note-style box with all answers.

**Step 4: Update `src/index.ts`**

Add `export { ClackRenderer } from './renderers/clack';`

**Step 5: Update `src/cli.ts`**

Change the `--renderer` option choices from `inquirer | ink` to `inquirer | ink | clack`.
Import and use `ClackRenderer` when `--renderer clack` is passed.

**Step 6: Run test to verify it passes**

Run: `npx vitest run src/__tests__/clack-renderer.test.ts`
Expected: PASS

**Step 7: Run full test suite + typecheck**

Run: `npx vitest run && npx tsc --noEmit`
Expected: All pass

**Step 8: Commit**

```bash
git add src/renderers/clack.ts src/__tests__/clack-renderer.test.ts src/index.ts src/cli.ts
git commit -m "feat: add ClackRenderer with guide lines, collapsed steps, intro/outro, notes"
```

---

## Task 6: Progress Persistence

**Files:**
- Create: `src/progress.ts`
- Modify: `src/runner.ts` — save on cancel, restore on start
- Modify: `src/cli.ts` — add `--resume` flag
- Modify: `src/index.ts` — export progress functions
- Test: `src/__tests__/progress.test.ts`

**Step 1: Write the test**

```typescript
// src/__tests__/progress.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, rmSync, existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { saveProgress, loadProgress, clearProgress } from '../progress';

describe('progress persistence', () => {
  const testDir = join(tmpdir(), 'grimoire-progress-test');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('saves and loads progress', () => {
    const state = {
      currentStepId: 'step-2',
      answers: { 'step-1': 'hello' },
      history: ['step-1'],
    };
    saveProgress('Test Wizard', state, testDir);

    const loaded = loadProgress('Test Wizard', testDir);
    expect(loaded).toBeDefined();
    expect(loaded?.currentStepId).toBe('step-2');
    expect(loaded?.answers).toEqual({ 'step-1': 'hello' });
    expect(loaded?.history).toEqual(['step-1']);
    expect(loaded?.savedAt).toBeDefined();
  });

  it('returns null when no progress exists', () => {
    const loaded = loadProgress('Nonexistent', testDir);
    expect(loaded).toBeNull();
  });

  it('clears progress', () => {
    saveProgress('Test Wizard', { currentStepId: 'a', answers: {}, history: [] }, testDir);
    clearProgress('Test Wizard', testDir);
    const loaded = loadProgress('Test Wizard', testDir);
    expect(loaded).toBeNull();
  });

  it('excludes password answers from saved progress', () => {
    const state = {
      currentStepId: 'step-3',
      answers: { 'step-1': 'hello', 'api-key': 'secret123' },
      history: ['step-1', 'api-key'],
    };
    saveProgress('Test Wizard', state, testDir, ['api-key']);

    const loaded = loadProgress('Test Wizard', testDir);
    expect(loaded?.answers).toEqual({ 'step-1': 'hello' });
    expect(loaded?.answers['api-key']).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/progress.test.ts`
Expected: FAIL — cannot find `../progress`

**Step 3: Implement `src/progress.ts`**

```typescript
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { slugify } from './cache';

export interface SavedProgress {
  currentStepId: string;
  answers: Record<string, unknown>;
  history: string[];
  savedAt: string;
}

function getProgressDir(customDir?: string): string {
  return customDir ?? join(homedir(), '.config', 'grimoire', 'progress');
}

function getProgressPath(wizardName: string, customDir?: string): string {
  return join(getProgressDir(customDir), `${slugify(wizardName)}.json`);
}

export function saveProgress(
  wizardName: string,
  state: { currentStepId: string; answers: Record<string, unknown>; history: string[] },
  customDir?: string,
  excludeStepIds?: string[],
): void {
  const dir = getProgressDir(customDir);
  mkdirSync(dir, { recursive: true });

  const answers = { ...state.answers };
  if (excludeStepIds) {
    for (const id of excludeStepIds) {
      delete answers[id];
    }
  }

  const progress: SavedProgress = {
    currentStepId: state.currentStepId,
    answers,
    history: state.history,
    savedAt: new Date().toISOString(),
  };

  writeFileSync(getProgressPath(wizardName, customDir), JSON.stringify(progress, null, 2));
}

export function loadProgress(wizardName: string, customDir?: string): SavedProgress | null {
  const path = getProgressPath(wizardName, customDir);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as SavedProgress;
  } catch {
    return null;
  }
}

export function clearProgress(wizardName: string, customDir?: string): void {
  const path = getProgressPath(wizardName, customDir);
  rmSync(path, { force: true });
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/__tests__/progress.test.ts`
Expected: PASS

**Step 5: Integrate into runner**

In `src/runner.ts`:
- On cancel: save progress (excluding password step IDs)
- At start of `runWizard`: check for saved progress, if found and not mock mode, prompt to resume (use `@inquirer/prompts` confirm)
- On completion: clear progress

**Step 6: Add `--resume` flag to CLI**

In `src/cli.ts`, add `--no-resume` flag (resume is enabled by default, `--no-resume` to skip).

**Step 7: Update `src/index.ts`**

Export `saveProgress`, `loadProgress`, `clearProgress` from `./progress`.

**Step 8: Run full test suite**

Run: `npx vitest run`
Expected: All tests pass

**Step 9: Commit**

```bash
git add src/progress.ts src/__tests__/progress.test.ts src/runner.ts src/cli.ts src/index.ts
git commit -m "feat: add progress persistence (resume wizard after Ctrl+C)"
```

---

## Task 7: Review Screen

**Files:**
- Modify: `src/types.ts` — add `review?: boolean` to meta
- Modify: `src/schema.ts` — add `review` to meta schema
- Modify: `src/runner.ts` — post-loop review check
- Test: `src/__tests__/review.test.ts`

**Step 1: Write the test**

```typescript
// src/__tests__/review.test.ts
import { describe, it, expect } from 'vitest';
import { parseWizardConfig } from '../schema';

describe('review screen schema', () => {
  it('accepts review: true in meta', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test', review: true },
      steps: [{ id: 'a', type: 'text', message: 'A?', options: undefined }],
    });
    expect(config.meta.review).toBe(true);
  });

  it('defaults review to undefined', () => {
    const config = parseWizardConfig({
      meta: { name: 'Test' },
      steps: [{ id: 'a', type: 'text', message: 'A?' }],
    });
    expect(config.meta.review).toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL — `review` not in meta schema

**Step 3: Add `review` to types and schema**

In `src/types.ts`, update `WizardConfig.meta`:
```typescript
meta: { name: string; version?: string; description?: string; review?: boolean };
```

In `src/schema.ts`, add `review: z.boolean().optional()` to the meta object schema.

**Step 4: Implement review in runner**

In `src/runner.ts`, after the wizard loop completes with `status === 'done'`:
- If `config.meta.review === true` and not mock mode:
  1. Emit `note` event with title "Review your answers" and formatted answer body
  2. Show a confirm prompt: "Everything look right?"
  3. If no → show a select prompt with step IDs → jump to that step → re-enter loop → review again
  4. If yes → continue to summary

**Step 5: Run test + full suite**

Run: `npx vitest run`
Expected: All pass

**Step 6: Commit**

```bash
git add src/types.ts src/schema.ts src/runner.ts src/__tests__/review.test.ts
git commit -m "feat: add step summary/review screen before final submission"
```

---

## Task 8: Wizard Pipelines

**Files:**
- Create: `src/pipeline.ts`
- Modify: `src/cli.ts` — detect pipeline format and multi-config args
- Modify: `src/index.ts` — export `runPipeline`
- Modify: `src/schema.ts` — add pipeline schema
- Test: `src/__tests__/pipeline.test.ts`

**Step 1: Write the test**

```typescript
// src/__tests__/pipeline.test.ts
import { describe, it, expect } from 'vitest';
import { runPipeline } from '../pipeline';
import type { WizardConfig } from '../types';

const configA: WizardConfig = {
  meta: { name: 'Setup' },
  steps: [{ id: 'name', type: 'text', message: 'Name?' }],
};

const configB: WizardConfig = {
  meta: { name: 'Deploy' },
  steps: [{ id: 'target', type: 'text', message: 'Target?' }],
};

describe('wizard pipelines', () => {
  it('runs multiple wizards in sequence with mock answers', async () => {
    const results = await runPipeline([
      { config: configA, mockAnswers: { name: 'my-app' } },
      { config: configB, mockAnswers: { target: 'vercel' } },
    ]);

    expect(results['Setup']).toEqual({ name: 'my-app' });
    expect(results['Deploy']).toEqual({ target: 'vercel' });
  });

  it('passes answers from wizard A as template defaults to wizard B', async () => {
    const configBWithDefault: WizardConfig = {
      meta: { name: 'Deploy' },
      steps: [{ id: 'name', type: 'text', message: 'Confirm name?' }],
    };

    const results = await runPipeline([
      { config: configA, mockAnswers: { name: 'my-app' } },
      { config: configBWithDefault, mockAnswers: {} },
    ]);

    // name from configA flows as default to configB
    expect(results['Setup']).toEqual({ name: 'my-app' });
    expect(results['Deploy']).toEqual({ name: 'my-app' });
  });

  it('skips conditional wizards when condition is not met', async () => {
    const results = await runPipeline([
      { config: configA, mockAnswers: { name: 'my-app' } },
      { config: configB, mockAnswers: { target: 'vercel' }, when: { field: 'name', equals: 'other' } },
    ]);

    expect(results['Setup']).toEqual({ name: 'my-app' });
    expect(results['Deploy']).toBeUndefined();
  });

  it('runs conditional wizard when condition is met', async () => {
    const results = await runPipeline([
      { config: configA, mockAnswers: { name: 'my-app' } },
      { config: configB, mockAnswers: { target: 'vercel' }, when: { field: 'name', equals: 'my-app' } },
    ]);

    expect(results['Setup']).toEqual({ name: 'my-app' });
    expect(results['Deploy']).toEqual({ target: 'vercel' });
  });
});
```

**Step 2: Run test to verify it fails**

Expected: FAIL — `../pipeline` doesn't exist

**Step 3: Implement `src/pipeline.ts`**

```typescript
import { runWizard } from './runner';
import type { RunWizardOptions } from './runner';
import { evaluateCondition } from './conditions';
import type { Condition, WizardConfig } from './types';

export interface PipelineStep {
  config: WizardConfig | string; // WizardConfig object or path to config file
  when?: Condition;
  mockAnswers?: Record<string, unknown>;
  options?: Omit<RunWizardOptions, 'mockAnswers' | 'templateAnswers'>;
}

export async function runPipeline(
  steps: PipelineStep[],
  globalOptions?: Omit<RunWizardOptions, 'mockAnswers' | 'templateAnswers'>,
): Promise<Record<string, Record<string, unknown>>> {
  const results: Record<string, Record<string, unknown>> = {};
  let accumulated: Record<string, unknown> = {};

  for (const step of steps) {
    // Resolve config if it's a path string
    let config: WizardConfig;
    if (typeof step.config === 'string') {
      const { loadWizardConfig } = await import('./parser');
      config = await loadWizardConfig(step.config);
    } else {
      config = step.config;
    }

    // Check condition against accumulated answers
    if (step.when && !evaluateCondition(step.when, accumulated)) {
      continue;
    }

    const answers = await runWizard(config, {
      ...globalOptions,
      ...step.options,
      mockAnswers: step.mockAnswers,
      templateAnswers: accumulated,
    });

    results[config.meta.name] = answers;
    accumulated = { ...accumulated, ...answers };
  }

  return results;
}
```

**Step 4: Export from `src/index.ts`**

```typescript
export { runPipeline } from './pipeline';
export type { PipelineStep } from './pipeline';
```

**Step 5: Update CLI to detect pipeline format**

In `src/cli.ts`, when multiple config files are passed as args (or when a single file has `pipeline:` as top-level key), use `runPipeline`.

**Step 6: Run test to verify it passes**

Run: `npx vitest run src/__tests__/pipeline.test.ts`
Expected: PASS

**Step 7: Run full test suite**

Run: `npx vitest run`
Expected: All pass

**Step 8: Commit**

```bash
git add src/pipeline.ts src/__tests__/pipeline.test.ts src/index.ts src/cli.ts
git commit -m "feat: add wizard pipelines (chain configs, forward answers)"
```

---

## Task 9: Update README, CHANGELOG, Examples

**Files:**
- Modify: `README.md` — document clack renderer, theme presets, progress persistence, pipelines, review, notes
- Modify: `CHANGELOG.md` — add v0.4.0 section
- Create: `examples/yaml/themed-catppuccin.yaml` — example using preset
- Create: `examples/yaml/pipeline.yaml` — pipeline example
- Modify: `package.json` — bump version to 0.4.0

**Step 1: Update CHANGELOG.md**

Add v0.4.0 section at the top with all new features.

**Step 2: Update README.md**

Add sections for:
- Clack renderer (with terminal screenshots/ASCII art)
- Theme presets (table of presets, how to use in config)
- Progress persistence (auto-resume)
- Wizard pipelines (YAML and programmatic)
- Review screen
- Note step type

Update the "Features" bullet list with new entries.

**Step 3: Create example configs**

`examples/yaml/themed-catppuccin.yaml` — a simple wizard using `preset: catppuccin`
`examples/yaml/pipeline.yaml` — a two-wizard pipeline

**Step 4: Bump version**

Update `package.json` version from `0.3.1` to `0.4.0`.

**Step 5: Run full test suite + typecheck + build**

Run: `npx vitest run && npx tsc --noEmit && npx tsup`
Expected: All pass, build succeeds

**Step 6: Commit**

```bash
git add README.md CHANGELOG.md examples/ package.json
git commit -m "docs: update README, CHANGELOG, and examples for v0.4.0"
```

---

## Task 10: E2E Tests for New Features

**Files:**
- Modify: `src/__tests__/e2e.test.ts` — add E2E tests for clack renderer, presets, notes, pipelines

**Step 1: Add E2E tests**

Add tests for:
- `grimoire run examples/yaml/basic.yaml --renderer clack --mock '...'` — verify clack renderer doesn't crash
- `grimoire run examples/yaml/themed-catppuccin.yaml --mock '...'` — verify preset theme works
- `grimoire run examples/yaml/pipeline.yaml --mock '...'` — verify pipeline execution
- `grimoire validate` with a config containing `note` step type — verify it passes validation

**Step 2: Run E2E tests**

Run: `npx vitest run src/__tests__/e2e.test.ts`
Expected: All pass

**Step 3: Run full suite + typecheck + build**

Run: `npx vitest run && npx tsc --noEmit && npx tsup`
Expected: All pass

**Step 4: Commit**

```bash
git add src/__tests__/e2e.test.ts
git commit -m "test: add E2E tests for clack renderer, presets, notes, pipelines"
```

---

## Final Verification

After all tasks are complete:

1. `npx vitest run` — all tests pass
2. `npx tsc --noEmit` — no type errors
3. `npx tsup` — build succeeds
4. `grimoire demo --renderer clack` — visual verification of the clack renderer
5. `git log --oneline` — verify commit history is clean

Then push to `dev` and open PR to `main`.
