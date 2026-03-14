# Actions & onComplete Reference

After a wizard completes, grimoire can run shell commands (`actions`) and/or call a TypeScript handler (`onComplete`).

**Execution order:** `onComplete` runs first, then `actions` sequentially. A failed action aborts remaining actions.

---

## `actions` — Post-wizard shell commands

```yaml
actions:
  - name: Install dependencies       # optional display name
    run: npm install                 # shell command (required)
    when: { field: install-deps, equals: true }  # optional condition

  - name: Init git repo
    run: git init && git add . && git commit -m "Initial commit"

  - name: Create GitHub repo
    run: gh repo create {{repo-name}} --{{visibility}} --push --source=.
```

**`{{step-id}}` interpolation:** Any `{{step-id}}` in a `run` string is replaced with the answer for that step.

```yaml
actions:
  - name: Create project directory
    run: mkdir -p {{output-dir}}/{{project-name}}
  - name: Copy template
    run: cp -r templates/{{project-type}}/ {{output-dir}}/{{project-name}}/
```

**Conditional actions:**
```yaml
actions:
  - name: Run tests
    run: npm test
    when: { field: run-tests, equals: true }
  - name: Deploy
    run: npm run deploy -- --env {{deploy-env}}
    when:
      all:
        - { field: deploy, equals: true }
        - { field: deploy-env, notEquals: none }
```

---

## `onComplete` — TypeScript handler

`onComplete` is a path to a TypeScript/JavaScript file (resolved relative to the config file):

```yaml
onComplete: ./scripts/scaffold-handler.ts
```

The file must export a default async function:

```typescript
// scripts/scaffold-handler.ts
export default async ({
  answers,
  config,
}: {
  answers: Record<string, unknown>
  config: unknown
}) => {
  const name = answers['project-name'] as string
  const type = answers['project-type'] as string

  // Do anything: write files, call APIs, run git commands
  await scaffoldProject(name, type)
}
```

**When to use `onComplete` vs `actions`:**
- Use `actions` for simple shell commands with answer interpolation
- Use `onComplete` for complex logic: file generation, API calls, conditional branching in code, error handling

---

## Pre-flight Checks

Run shell commands before the wizard starts. Abort with an error message if any fail:

```yaml
checks:
  - name: Git installed
    run: git --version
    message: Git is required. Install from https://git-scm.com
  - name: Node version
    run: node -e "if(parseInt(process.version.slice(1)) < 18) process.exit(1)"
    message: Node.js 18+ is required
  - name: GitHub CLI authenticated
    run: gh auth status
    message: Run 'gh auth login' first
```

Checks run before the banner and first step. Non-zero exit = abort with `message`.

---

## CI / Mock Mode

Wizards with actions can run non-interactively:

```bash
# Provide all answers as JSON, skip interactive prompts
grimoire run setup.yaml --mock '{"project-name":"my-app","project-type":"app","confirm":true}'

# Dry run: show steps and actions without executing anything
grimoire run setup.yaml --dry-run

# JSON output: emit answers as JSON to stdout (actions still run)
grimoire run setup.yaml --json
```

In `--mock` mode, `onComplete` is skipped. Actions still run (use `--dry-run` to skip both).

---

## Anti-Patterns

**Referencing non-existent step IDs in `run`:**
```yaml
# WRONG — {{missing-id}} throws an error and aborts all remaining actions
actions:
  - run: mkdir {{missing-id}}
```

**Interpolating password values:**
```yaml
# WRONG — never put password step IDs in action run strings
actions:
  - run: curl -H "Authorization: {{api-key}}" https://api.example.com
```

**Long-running actions without feedback:**
```yaml
# OK but consider splitting into smaller actions with names
actions:
  - name: Build and deploy (this may take a few minutes)
    run: npm run build && npm run deploy
```
