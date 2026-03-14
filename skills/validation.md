# Validation Reference

Validation rules apply to steps that accept input: `text`, `number`, `password`, `editor`, `path`.

---

## Built-in Validation Rules

```yaml
validate:
  - rule: required              # value must not be empty
  - rule: minLength
    value: 3                    # minimum string length
    message: Must be at least 3 characters   # optional custom error
  - rule: maxLength
    value: 50
  - rule: pattern
    value: "^[a-z][a-z0-9-]*$" # regex string (YAML: escape backslashes as \\)
    message: Lowercase letters, numbers, hyphens only
  - rule: min
    value: 1024                 # minimum numeric value
  - rule: max
    value: 65535
```

| Rule | Applies to | `value` type | Description |
|------|-----------|--------------|-------------|
| `required` | all | — | Value must not be empty/blank |
| `minLength` | string | `number` | Minimum character count |
| `maxLength` | string | `number` | Maximum character count |
| `pattern` | string | `string` (regex) | Must match regex |
| `min` | number | `number` | Minimum numeric value |
| `max` | number | `number` | Maximum numeric value |

---

## Common Validation Patterns

**Slug (lowercase, hyphens):**
```yaml
validate:
  - rule: required
  - rule: pattern
    value: "^[a-z][a-z0-9-]*$"
    message: Lowercase letters, numbers, hyphens only
```

**Semver:**
```yaml
validate:
  - rule: pattern
    value: "^\\d+\\.\\d+\\.\\d+$"
    message: Must be semver format (e.g. 1.0.0)
```

**URL:**
```yaml
validate:
  - rule: pattern
    value: "^https?://"
    message: Must start with http:// or https://
```

**Port number:**
```yaml
- id: port
  type: number
  min: 1024
  max: 65535
  validate:
    - rule: min
      value: 1024
    - rule: max
      value: 65535
```

**Non-empty multiline text:**
```yaml
- id: description
  type: editor
  validate:
    - rule: required
    - rule: minLength
      value: 10
      message: Description must be at least 10 characters
```

---

## Environment Variable Defaults

Any step's `default` can read from an environment variable:

```yaml
- id: api-key
  type: password
  message: API key?
  default: $API_KEY             # reads process.env.API_KEY

- id: region
  type: text
  message: AWS region?
  default: $AWS_DEFAULT_REGION

- id: port
  type: number
  message: Port?
  default: $PORT                # parsed as number automatically
```

If the env var is unset, `default` is `undefined` (step shows no pre-fill).

---

## Programmatic Async Validation (TypeScript API)

When using the TypeScript API, pass `asyncValidate` to `runWizard`:

```typescript
import { runWizard } from 'grimoire-wizard'

const answers = await runWizard(config, {
  asyncValidate: async (stepId, value) => {
    if (stepId === 'project-name') {
      const exists = await checkNameExists(value as string)
      if (exists) return 'A project with this name already exists'
    }
    return null  // null = valid
  },
})
```

`asyncValidate` runs after built-in `validate` rules pass. Return a string error message or `null`.

---

## Anti-Patterns

**Regex backslash escaping in YAML:**
```yaml
# WRONG — single backslash is invalid in YAML regex
validate:
  - rule: pattern
    value: "^\d+$"

# CORRECT — double backslash
validate:
  - rule: pattern
    value: "^\\d+$"
```

**`min`/`max` on `text` steps (use `minLength`/`maxLength`):**
```yaml
# WRONG — min/max only apply to number steps
- id: name
  type: text
  validate:
    - rule: min
      value: 3

# CORRECT
- id: name
  type: text
  validate:
    - rule: minLength
      value: 3
```

**Validating `password` output in actions:**
Never interpolate `{{password-step-id}}` in action `run` strings — passwords are masked and should never appear in shell commands.
