# Theming Reference

Grimoire supports 6 built-in color presets, custom color tokens, icon overrides, and 15 spinner presets.

---

## Theme Presets

```yaml
theme:
  preset: catppuccin   # or: dracula | nord | tokyonight | monokai | default
```

| Preset | Primary Color | Vibe |
|--------|--------------|------|
| `default` | Blue (#3B82F6) | Clean, neutral |
| `catppuccin` | Mauve (#CBA6F7) | Soft pastel |
| `dracula` | Purple (#BD93F9) | Dark, vibrant |
| `nord` | Frost Blue (#88C0D0) | Arctic, calm |
| `tokyonight` | Blue (#7AA2F7) | Neon city |
| `monokai` | Yellow (#E6DB74) | Classic editor |

---

## Custom Color Tokens

Override individual tokens while keeping a preset as the base:

```yaml
theme:
  preset: catppuccin
  tokens:
    primary: "#FF6B6B"          # main accent color
    secondary: "#4ECDC4"        # secondary accent
    error: "#FF4444"            # error messages
    success: "#51CF66"          # success messages
    muted: "#868E96"            # hint/placeholder text
    border: "#495057"           # box borders (ink renderer)
```

---

## Icon Overrides

```yaml
theme:
  icons:
    pointer: "→"                # selection cursor
    checked: "✓"                # selected item in multiselect
    unchecked: "○"              # unselected item in multiselect
    error: "✗"                  # validation error prefix
    info: "ℹ"                   # note step icon
```

---

## Spinner Presets

Used for loading animations during `asyncValidate` or `onComplete` handlers.

```yaml
theme:
  spinner: dots                 # built-in preset name
```

| Preset | Animation |
|--------|-----------|
| `dots` | ⠋ ⠙ ⠹ ⠸ ⠼ ⠴ ⠦ ⠧ ⠇ ⠏ |
| `dots2` | ⣾ ⣽ ⣻ ⢿ ⡿ ⣟ ⣯ ⣷ |
| `line` | - \ \| / |
| `arc` | ◜ ◠ ◝ ◞ ◡ ◟ |
| `circle` | ◡ ⊙ ◠ (default) |
| `circleHalves` | ◐ ◓ ◑ ◒ |
| `triangle` | ◢ ◣ ◤ ◥ |
| `pipe` | ┤ ┘ ┴ └ ├ ┌ ┬ ┐ |
| `arrow` | ← ↖ ↑ ↗ → ↘ ↓ ↙ |
| `arrow3` | ▹▹▹ ▸▹▹ ▸▸▹ ▸▸▸ ▹▸▸ ▹▹▸ |
| `bouncingBar` | [    ] [=   ] [==  ] ... |
| `bouncingBall` | ( ●    ) (  ●   ) ... |
| `simpleDots` | .   ..  ... |
| `aesthetic` | ▰▱▱▱▱ ▰▰▱▱▱ ... |
| `star` | ✶ ✸ ✹ ✺ ✹ ✷ |

**Custom spinner:**
```yaml
theme:
  spinner:
    frames: [">", ">>", ">>>", ">>>>"]
    interval: 120               # milliseconds between frames
```

---

## Renderer Choice

The renderer controls the visual style of the entire wizard. Set via CLI flag (not in config):

```bash
grimoire run setup.yaml --renderer inquirer   # default: classic prompts
grimoire run setup.yaml --renderer ink        # box-drawing characters, filled progress bars
grimoire run setup.yaml --renderer clack      # connected guide lines, modern UX
```

Or via TypeScript API:
```typescript
import { runWizard, ClackRenderer } from 'grimoire-wizard'
await runWizard(config, { renderer: new ClackRenderer() })
```

**When to use each renderer:**
- `inquirer` — maximum terminal compatibility, CI environments
- `ink` — rich visual style, local dev tools
- `clack` — modern SaaS-style CLI, best UX for end users

---

## Plain / No-Color Mode

```bash
grimoire run setup.yaml --plain   # no colors, no banner, no spinner
```

Useful for piping output or environments without color support.
