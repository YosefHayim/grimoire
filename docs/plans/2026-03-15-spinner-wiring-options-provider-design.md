# Spinner Wiring + Options Provider Design

**Date:** 2026-03-15
**Status:** Approved

## Summary

Close the 2 remaining gaps that prevent grimoire-wizard from replicating fresh-squeeze's wizard 1:1.

## Gap 1: Wire Spinner Events

**Problem:** `spinner:start`/`spinner:stop` event types exist in `WizardEvent`, ClackRenderer handles them, but the runner never emits them.

**Fix:** Emit spinner events around pre-flight checks, actions, and onComplete in `src/runner.ts`.

- Before pre-flight checks → `spinner:start` with check command
- After each check pass/fail → `spinner:stop`
- Before onComplete → `spinner:start` with "Running handler..."
- After onComplete → `spinner:stop`
- Before each action → `spinner:start` with action name
- After each action → `spinner:stop`

~30 lines changed in runner.ts. Backward-compatible — renderers without `onEvent` ignore these.

## Gap 2: Async Dynamic Options (`optionsProvider`)

**Problem:** Fresh-squeeze fetches options from APIs (stores, products). Grimoire's `optionsFrom` only loads static files.

**Fix:** Add `optionsProvider` callback to `RunWizardOptions`.

```typescript
export interface RunWizardOptions {
  optionsProvider?: (
    stepId: string,
    answers: Record<string, unknown>,
  ) => Promise<Array<{ value: string; label: string }> | undefined>;
}
```

Runner change: Before rendering a select/multiselect/search step, if `optionsProvider` is defined, call it with a spinner. If it returns options, override the step's static options.

Programmatic API only — not YAML-configurable (async API calls require code).

## Files Changed

| File | Change |
|---|---|
| `src/runner.ts` | Emit spinner events around checks/actions/onComplete; call optionsProvider before select steps |
| `src/types.ts` | Add `optionsProvider` to `RunWizardOptions` (if not already there) |
| `src/index.ts` | Ensure RunWizardOptions is exported |
| `src/__tests__/` | Tests for spinner emission and optionsProvider |
| `CHANGELOG.md` | Add entries |
