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
