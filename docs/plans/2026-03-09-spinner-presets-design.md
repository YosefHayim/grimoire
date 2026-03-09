# Spinner Presets Design

**Date:** 2026-03-09
**Status:** Approved

## Summary

Add a configurable spinner/loading animation system to grimoire-wizard. Developers select a spinner preset by name in their theme config, or provide custom frame arrays. Ships 15 curated presets — zero new dependencies.

## Design Decisions

| Decision | Choice |
|---|---|
| Selection method | Both YAML config + programmatic API |
| Custom spinners | Presets + custom frame arrays |
| Preset count | ~15 curated (from cli-spinners ecosystem) |
| Config placement | Inside `theme.spinner` |
| Default spinner | `circle` (current clack default, backward-compatible) |

## Config Shape

```yaml
# Named preset
theme:
  spinner: dots

# Custom frames
theme:
  spinner:
    frames: [">", ">>", ">>>", ">>>>"]
    interval: 120
```

## Presets (15)

| Name | Frames | Interval |
|---|---|---|
| dots | ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏ | 80ms |
| dots2 | ⣾⣽⣻⢿⡿⣟⣯⣷ | 80ms |
| line | -\|/ | 130ms |
| arc | ◜◠◝◞◡◟ | 100ms |
| circle | ◒◐◓◑ | 80ms |
| circleHalves | ◐◓◑◒ | 50ms |
| triangle | ◢◣◤◥ | 50ms |
| pipe | ┤┘┴└├┌┬┐ | 100ms |
| arrow | ←↖↑↗→↘↓↙ | 100ms |
| arrow3 | ▹▹▹▹▹ → ▹▹▹▹▸ | 120ms |
| bouncingBar | [====] bounce | 80ms |
| bouncingBall | ( ● ) bounce | 80ms |
| simpleDots | . .. ... | 400ms |
| aesthetic | ▰▱▱▱▱ fill | 80ms |
| star | ✶✸✹✺✹✷ | 70ms |

## Type Changes

```typescript
// ThemeConfig gains spinner field
export interface ThemeConfig {
  // ... existing
  spinner?: string | { frames: string[]; interval?: number };
}

// ResolvedTheme gains resolved spinner
export interface ResolvedTheme {
  // ... existing
  spinner: { frames: string[]; interval: number };
}
```

## Files Changed

| File | Change |
|---|---|
| `src/spinners.ts` | NEW — 15 spinner presets, types, exports |
| `src/types.ts` | Add `spinner` to `ThemeConfig` and `ResolvedTheme` |
| `src/schema.ts` | Add spinner to theme schema |
| `src/theme.ts` | Resolve spinner in `resolveTheme` |
| `src/renderers/clack.ts` | Use `theme.spinner` instead of hardcoded `S_SPINNER_FRAMES` |
| `src/renderers/symbols.ts` | Remove `S_SPINNER_FRAMES` (moved to spinners.ts) |
| `src/index.ts` | Export spinner types and presets |
| `src/__tests__/` | Tests for spinner resolution and presets |
| `docs/GRIMOIRE_REFERENCE.md` | Add spinner documentation |
| `CHANGELOG.md` | Add spinner entry |
