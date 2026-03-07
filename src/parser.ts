import { cosmiconfig } from 'cosmiconfig';
import { dirname, resolve, isAbsolute } from 'node:path';
import { parse as parseYAML } from 'yaml';
import { parseWizardConfig } from './schema';
import type { WizardConfig, StepConfig, ThemeConfig } from './types';

const DONE_SENTINEL = '__done__';

function buildStepGraph(steps: StepConfig[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const edges: string[] = [];

    if (step.next && step.next !== DONE_SENTINEL) {
      edges.push(step.next);
    }

    if (step.type === 'select' && step.routes) {
      for (const target of Object.values(step.routes)) {
        if (target !== DONE_SENTINEL) {
          edges.push(target);
        }
      }
    }

    if (!step.next && !(step.type === 'select' && step.routes)) {
      const nextStep = steps[i + 1];
      if (nextStep) {
        edges.push(nextStep.id);
      }
    }

    graph.set(step.id, edges);
  }

  return graph;
}

function detectCycles(config: WizardConfig): void {
  const graph = buildStepGraph(config.steps);

  const UNVISITED = 0;
  const IN_STACK = 1;
  const DONE = 2;

  const nodeState = new Map<string, number>();
  for (const id of graph.keys()) {
    nodeState.set(id, UNVISITED);
  }

  function dfs(nodeId: string, path: string[]): void {
    nodeState.set(nodeId, IN_STACK);
    const currentPath = [...path, nodeId];

    for (const neighbor of graph.get(nodeId) ?? []) {
      const state = nodeState.get(neighbor);

      if (state === IN_STACK) {
        const cycleStart = currentPath.indexOf(neighbor);
        const cycle = [...currentPath.slice(cycleStart), neighbor];
        throw new Error(`Cycle detected in wizard steps: ${cycle.join(' \u2192 ')}`);
      }

      if (state === UNVISITED) {
        dfs(neighbor, currentPath);
      }
    }

    nodeState.set(nodeId, DONE);
  }

  for (const id of graph.keys()) {
    if (nodeState.get(id) === UNVISITED) {
      dfs(id, []);
    }
  }
}

function deepMergeTheme(
  parent: ThemeConfig | undefined,
  child: ThemeConfig | undefined,
): ThemeConfig | undefined {
  if (!parent && !child) return undefined;
  if (!parent) return child;
  if (!child) return parent;
  return {
    tokens: { ...parent.tokens, ...child.tokens },
    icons: { ...parent.icons, ...child.icons },
  };
}

function mergeConfigs(parent: WizardConfig, child: WizardConfig): WizardConfig {
  return {
    meta: { ...parent.meta, ...child.meta },
    theme: deepMergeTheme(parent.theme, child.theme),
    steps: child.steps,
    output: child.output ?? parent.output,
    checks: [
      ...(parent.checks ?? []),
      ...(child.checks ?? []),
    ],
    actions: child.actions ?? parent.actions,
  };
}

async function loadWithInheritance(
  filePath: string,
  seen: Set<string>,
): Promise<WizardConfig> {
  const resolvedPath = resolve(filePath);

  if (seen.has(resolvedPath)) {
    throw new Error(`Circular extends detected: "${resolvedPath}" was already loaded`);
  }
  seen.add(resolvedPath);

  const explorer = cosmiconfig('grimoire');
  const result = await explorer.load(resolvedPath);

  if (!result || result.isEmpty) {
    throw new Error(`No configuration found at: ${resolvedPath}`);
  }

  const raw = result.config as Record<string, unknown>;
  const extendsPath = typeof raw['extends'] === 'string' ? raw['extends'] : undefined;

  const config = parseWizardConfig(raw);

  if (!extendsPath) {
    return config;
  }

  const parentPath = isAbsolute(extendsPath)
    ? extendsPath
    : resolve(dirname(resolvedPath), extendsPath);

  const parentConfig = await loadWithInheritance(parentPath, seen);
  return mergeConfigs(parentConfig, config);
}

export async function loadWizardConfig(filePath: string): Promise<WizardConfig> {
  const config = await loadWithInheritance(filePath, new Set<string>());
  detectCycles(config);
  return config;
}

export function parseWizardYAML(yamlString: string): WizardConfig {
  const raw: unknown = parseYAML(yamlString);

  if (
    raw !== null &&
    typeof raw === 'object' &&
    !Array.isArray(raw) &&
    'extends' in raw &&
    typeof raw.extends === 'string'
  ) {
    throw new Error(
      '"extends" is not supported in parseWizardYAML — use loadWizardConfig with a file path',
    );
  }

  const config = parseWizardConfig(raw);
  detectCycles(config);
  return config;
}
