# Wizard Patterns

Common wizard archetypes and the patterns that make them work well.

---

## Pattern 1: Project Scaffolder

**Shape:** name → type → type-specific options → features → confirm → scaffold

```yaml
meta:
  name: Project Scaffolder
  review: true

steps:
  - id: project-name
    type: text
    message: Project name?
    validate:
      - rule: required
      - rule: pattern
        value: "^[a-z][a-z0-9-]*$"
        message: Lowercase letters, numbers, hyphens only

  - id: project-type
    type: select
    message: Project type?
    options:
      - { value: web, label: Web App }
      - { value: api, label: REST API }
      - { value: cli, label: CLI Tool }
    routes:
      web: frontend-framework
      api: api-framework
      cli: cli-language

  - id: frontend-framework
    type: select
    message: Frontend framework?
    group: Stack
    when: { field: project-type, equals: web }
    options:
      - { value: nextjs, label: "Next.js" }
      - { value: remix, label: Remix }
    next: features

  - id: api-framework
    type: select
    message: API framework?
    group: Stack
    when: { field: project-type, equals: api }
    options:
      - { value: fastify, label: Fastify }
      - { value: express, label: Express }
    next: features

  - id: cli-language
    type: select
    message: Language?
    group: Stack
    when: { field: project-type, equals: cli }
    options:
      - { value: ts, label: TypeScript }
      - { value: go, label: Go }

  - id: features
    type: multiselect
    message: Features to include?
    required: false
    options:
      - { value: eslint, label: ESLint }
      - { value: prettier, label: Prettier }
      - { value: vitest, label: Vitest }
      - { value: docker, label: Docker }

  - id: confirm
    type: confirm
    message: Create project?
    default: true

output:
  format: json
  path: .scaffold.json

actions:
  - name: Scaffold project
    run: npx create-{{project-type}}-app {{project-name}}
    when: { field: confirm, equals: true }
```

---

## Pattern 2: Deploy Wizard

**Shape:** environment → region → confirm → deploy

```yaml
meta:
  name: Deploy
  description: Deploy to production

checks:
  - name: AWS CLI configured
    run: aws sts get-caller-identity
    message: Run 'aws configure' first

steps:
  - id: environment
    type: select
    message: Target environment?
    options:
      - { value: staging, label: Staging }
      - { value: production, label: Production }

  - id: region
    type: select
    message: AWS region?
    when: { field: environment, equals: production }
    options:
      - { value: us-east-1, label: US East (N. Virginia) }
      - { value: eu-west-1, label: EU (Ireland) }

  - id: confirm
    type: confirm
    message: Deploy to production?
    default: false

actions:
  - name: Deploy
    run: npm run deploy -- --env {{environment}} --region {{region}}
    when: { field: confirm, equals: true }
```

---

## Pattern 3: Config Generator

**Shape:** grouped steps → output to file

```yaml
meta:
  name: Database Config

steps:
  - id: db-host
    type: text
    message: Database host?
    group: Database
    default: localhost

  - id: db-port
    type: number
    message: Database port?
    group: Database
    default: 5432

  - id: db-name
    type: text
    message: Database name?
    group: Database
    validate:
      - rule: required

  - id: db-user
    type: text
    message: Database user?
    group: Database
    default: $DB_USER

  - id: db-password
    type: password
    message: Database password?
    group: Database
    default: $DB_PASSWORD

  - id: app-port
    type: number
    message: Application port?
    group: Server
    default: 3000

output:
  format: env
  path: .env.local
```

---

## Pattern 4: CI-Friendly Wizard

Any wizard can run non-interactively. Design for CI from the start:

```yaml
meta:
  name: Release Wizard

steps:
  - id: version
    type: text
    message: Release version?
    validate:
      - rule: required
      - rule: pattern
        value: "^\\d+\\.\\d+\\.\\d+$"
        message: Must be semver (e.g. 1.2.3)

  - id: channel
    type: select
    message: Release channel?
    default: stable
    options:
      - { value: stable, label: Stable }
      - { value: beta, label: Beta }
      - { value: alpha, label: Alpha }

  - id: confirm
    type: confirm
    message: Publish release?
    default: false
```

**CI usage:**
```bash
# Non-interactive with all answers pre-supplied
grimoire run release.yaml \
  --mock '{"version":"1.2.3","channel":"stable","confirm":true}' \
  --json > release-output.json

# Dry run to preview without executing
grimoire run release.yaml --dry-run
```

---

## Pattern 5: Wizard with Inheritance

Use `extends` to share common steps across multiple wizards:

```yaml
# base.yaml
steps:
  - id: project-name
    type: text
    message: Project name?
    validate:
      - rule: required
  - id: author
    type: text
    message: Author name?
    default: $GIT_AUTHOR_NAME
```

```yaml
# web-wizard.yaml
extends: ./base.yaml
meta:
  name: Web Project Setup

steps:
  - id: framework
    type: select
    message: Framework?
    options:
      - { value: nextjs, label: "Next.js" }
      - { value: remix, label: Remix }
```

The child config inherits all steps from `base.yaml` and appends its own.

---

## Anti-Patterns

**Too many steps without groups:**
```yaml
# BAD — 15 ungrouped steps feel like an interrogation
steps:
  - id: name ...
  - id: type ...
  # ... 13 more without groups

# GOOD — use group: to create logical sections
steps:
  - id: name
    group: Project
  - id: type
    group: Project
  - id: db-host
    group: Database
```

**Asking for info you can derive:**
```yaml
# BAD — don't ask for the output path if you can construct it
- id: output-path
  type: path
  message: Output path?

# GOOD — derive it in actions
actions:
  - run: mkdir -p ./projects/{{project-name}}
```

**No `review: true` for destructive wizards:**
```yaml
# BAD — deploy wizard with no review screen
meta:
  name: Deploy

# GOOD — always show review for irreversible actions
meta:
  name: Deploy
  review: true
```

**Skipping `checks` for external dependencies:**
```yaml
# BAD — wizard fails mid-run if gh CLI isn't installed
actions:
  - run: gh repo create {{name}}

# GOOD — fail fast with a clear message
checks:
  - name: GitHub CLI
    run: gh --version
    message: Install GitHub CLI from https://cli.github.com
```
