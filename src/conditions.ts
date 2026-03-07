import type { Condition, StepConfig } from './types.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function getValueByPath(obj: Record<string, unknown>, path: string): unknown {
  const segments = path.split('.');
  let current: unknown = obj;

  for (const segment of segments) {
    if (!isRecord(current)) {
      return undefined;
    }
    current = current[segment];
  }

  return current;
}

export function evaluateCondition(
  condition: Condition,
  answers: Record<string, unknown>,
): boolean {
  if ('all' in condition) {
    return condition.all.every((c) => evaluateCondition(c, answers));
  }
  if ('any' in condition) {
    return condition.any.some((c) => evaluateCondition(c, answers));
  }
  if ('not' in condition) {
    return !evaluateCondition(condition.not, answers);
  }

  const value = getValueByPath(answers, condition.field);

  if ('isEmpty' in condition) {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string') return value.length === 0;
    if (Array.isArray(value)) return value.length === 0;
    return false;
  }
  if ('isNotEmpty' in condition) {
    if (value === undefined || value === null) return false;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return true;
  }

  if (value === undefined || value === null) {
    return false;
  }

  if ('equals' in condition) {
    return value === condition.equals;
  }
  if ('notEquals' in condition) {
    return value !== condition.notEquals;
  }
  if ('includes' in condition) {
    if (Array.isArray(value)) {
      return value.includes(condition.includes);
    }
    if (typeof value === 'string' && typeof condition.includes === 'string') {
      return value.includes(condition.includes);
    }
    return false;
  }
  if ('notIncludes' in condition) {
    if (Array.isArray(value)) {
      return !value.includes(condition.notIncludes);
    }
    if (typeof value === 'string' && typeof condition.notIncludes === 'string') {
      return !value.includes(condition.notIncludes);
    }
    return false;
  }
  if ('greaterThan' in condition) {
    return typeof value === 'number' && value > condition.greaterThan;
  }
  if ('lessThan' in condition) {
    return typeof value === 'number' && value < condition.lessThan;
  }

  return false;
}

export function isStepVisible(
  step: StepConfig,
  answers: Record<string, unknown>,
): boolean {
  if (!step.when) {
    return true;
  }
  return evaluateCondition(step.when, answers);
}
