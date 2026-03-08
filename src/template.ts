/**
 * Resolve {{stepId}} placeholders in a template string.
 * Array values are joined with ", ". Unresolved placeholders remain as-is.
 */
export function resolveTemplate(template: string, answers: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const trimmedKey = key.trim();
    if (trimmedKey in answers) {
      const value = answers[trimmedKey];
      if (Array.isArray(value)) return value.join(', ');
      return String(value);
    }
    return _match;
  });
}

/**
 * Resolve {{stepId}} placeholders strictly — throws if any placeholder
 * references a step-id not found in the answers map.
 * Used by actions where missing answers indicate a config error.
 */
export function resolveTemplateStrict(template: string, answers: Record<string, unknown>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_match, key: string) => {
    const trimmedKey = key.trim();
    if (!(trimmedKey in answers)) {
      throw new Error(`Action references unknown step "${trimmedKey}"`);
    }
    const value = answers[trimmedKey];
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
  });
}
