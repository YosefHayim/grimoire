# Conditions Reference

Conditions control step visibility (`when`) and action execution (`when` on actions). They can only reference steps that appear **earlier** in the config array.

---

## Simple Operators

```yaml
# Equality
when: { field: project-type, equals: app }
when: { field: project-type, notEquals: lib }

# Array membership (for multiselect answers)
when: { field: features, includes: eslint }
when: { field: features, notIncludes: prettier }

# Numeric comparison
when: { field: port, greaterThan: 1024 }
when: { field: port, lessThan: 65535 }

# Presence
when: { field: description, isEmpty: true }
when: { field: description, isNotEmpty: true }
```

`field` must be the `id` of a step that appears **before** this step in the config.

---

## Compound Operators

```yaml
# ALL conditions must be true
when:
  all:
    - { field: project-type, equals: app }
    - { field: deploy-target, notEquals: none }

# ANY condition must be true
when:
  any:
    - { field: project-type, equals: app }
    - { field: project-type, equals: service }

# Negate a condition
when:
  not: { field: project-type, equals: lib }
```

Compound operators can be nested:
```yaml
when:
  all:
    - { field: project-type, equals: app }
    - any:
        - { field: framework, equals: nextjs }
        - { field: framework, equals: remix }
```

---

## Route Branching

`select` steps can branch to different steps based on the chosen value:

```yaml
- id: deploy-target
  type: select
  message: Deploy target?
  options:
    - { value: cloud, label: Cloud }
    - { value: local, label: Local }
  routes:
    cloud: cloud-region         # jump to step with id: cloud-region
    local: local-port           # jump to step with id: local-port

- id: cloud-region
  type: select
  message: Cloud region?
  options:
    - { value: us-east-1, label: US East }
  next: __done__                # end wizard after this step

- id: local-port
  type: number
  message: Local port?
  default: 3000
```

**Rules:**
- `routes` keys must exactly match option `value` strings
- Missing route key = sequential flow continues to next step
- `next: "__done__"` ends the wizard immediately after that step
- `next: "some-step-id"` jumps to any step (forward or backward — use carefully)

---

## Manual Flow Control with `next`

Any step can override the next step:

```yaml
- id: skip-advanced
  type: confirm
  message: Skip advanced config?
  next: confirm                 # always jump to confirm step

- id: advanced-timeout
  type: number
  message: Request timeout (ms)?
  default: 5000

- id: confirm
  type: confirm
  message: Proceed?
```

Use `next` sparingly — it makes flow hard to follow. Prefer `when` conditions for conditional visibility.

---

## Anti-Patterns

**Forward references (always falsy):**
```yaml
# WRONG — step-b appears after step-a, so this condition always evaluates as falsy
- id: step-a
  type: text
  message: Step A?
  when: { field: step-b, equals: something }  # step-b hasn't been answered yet

- id: step-b
  type: text
  message: Step B?
```

**Circular `next` references (infinite loop):**
```yaml
# WRONG — wizard loops forever
- id: step-a
  type: text
  message: Step A?
  next: step-b

- id: step-b
  type: text
  message: Step B?
  next: step-a
```

**Conditions on `note` steps (silently skipped):**
```yaml
# OK but confusing — note steps with false conditions are silently skipped
- id: info
  type: note
  message: "Important info"
  when: { field: some-step, equals: value }
```
