import { cosmiconfig } from 'cosmiconfig';
import { parse as parseYAML } from 'yaml';
import { parseWizardConfig } from './schema';
import type { WizardConfig, StepConfig } from './types';

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

export async function loadWizardConfig(filePath: string): Promise<WizardConfig> {
  const explorer = cosmiconfig('grimoire');
  const result = await explorer.load(filePath);

  if (!result || result.isEmpty) {
    throw new Error(`No configuration found at: ${filePath}`);
  }

  const config = parseWizardConfig(result.config);
  detectCycles(config);
  return config;
}

export function parseWizardYAML(yamlString: string): WizardConfig {
  const raw: unknown = parseYAML(yamlString);
  const config = parseWizardConfig(raw);
  detectCycles(config);
  return config;
}
