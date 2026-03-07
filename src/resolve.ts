export function resolveEnvDefault(value: string | undefined): string | undefined {
  if (typeof value !== 'string') return value;
  if (!value.startsWith('$')) return value;
  const envKey = value.slice(1);
  return process.env[envKey] ?? value;
}

export function resolveEnvDefaultNumber(value: number | string | undefined): number | undefined {
  if (typeof value === 'number') return value;
  const resolved = resolveEnvDefault(typeof value === 'string' ? value : undefined);
  if (resolved === undefined) return undefined;
  const num = Number(resolved);
  return Number.isNaN(num) ? undefined : num;
}

export function resolveEnvDefaultBoolean(value: boolean | string | undefined): boolean | undefined {
  if (typeof value === 'boolean') return value;
  const resolved = resolveEnvDefault(typeof value === 'string' ? value : undefined);
  if (resolved === undefined) return undefined;
  return resolved === 'true' || resolved === '1';
}
