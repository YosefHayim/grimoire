import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveEnvDefault,
  resolveEnvDefaultNumber,
  resolveEnvDefaultBoolean,
} from '../resolve';

describe('resolveEnvDefault', () => {
  const SAVED_ENV: Record<string, string | undefined> = {};

  beforeEach(() => {
    SAVED_ENV['GRIMOIRE_TEST_VAR'] = process.env['GRIMOIRE_TEST_VAR'];
    SAVED_ENV['GRIMOIRE_MISSING'] = process.env['GRIMOIRE_MISSING'];
    process.env['GRIMOIRE_TEST_VAR'] = 'hello';
    delete process.env['GRIMOIRE_MISSING'];
  });

  afterEach(() => {
    if (SAVED_ENV['GRIMOIRE_TEST_VAR'] !== undefined) {
      process.env['GRIMOIRE_TEST_VAR'] = SAVED_ENV['GRIMOIRE_TEST_VAR'];
    } else {
      delete process.env['GRIMOIRE_TEST_VAR'];
    }
    if (SAVED_ENV['GRIMOIRE_MISSING'] !== undefined) {
      process.env['GRIMOIRE_MISSING'] = SAVED_ENV['GRIMOIRE_MISSING'];
    } else {
      delete process.env['GRIMOIRE_MISSING'];
    }
  });

  it('returns non-$ value as-is', () => {
    expect(resolveEnvDefault('plain')).toBe('plain');
  });

  it('returns undefined for undefined input', () => {
    expect(resolveEnvDefault(undefined)).toBeUndefined();
  });

  it('resolves $EXISTING_VAR to env value', () => {
    expect(resolveEnvDefault('$GRIMOIRE_TEST_VAR')).toBe('hello');
  });

  it('returns original "$MISSING_VAR" when env var is not set', () => {
    expect(resolveEnvDefault('$GRIMOIRE_MISSING')).toBe('$GRIMOIRE_MISSING');
  });
});

describe('resolveEnvDefaultNumber', () => {
  const SAVED_PORT = process.env['GRIMOIRE_TEST_PORT'];

  afterEach(() => {
    if (SAVED_PORT !== undefined) {
      process.env['GRIMOIRE_TEST_PORT'] = SAVED_PORT;
    } else {
      delete process.env['GRIMOIRE_TEST_PORT'];
    }
  });

  it('returns number as-is', () => {
    expect(resolveEnvDefaultNumber(42)).toBe(42);
  });

  it('resolves "$PORT" with PORT=3000 to 3000', () => {
    process.env['GRIMOIRE_TEST_PORT'] = '3000';
    expect(resolveEnvDefaultNumber('$GRIMOIRE_TEST_PORT')).toBe(3000);
  });

  it('returns undefined when env var is not a number', () => {
    process.env['GRIMOIRE_TEST_PORT'] = 'abc';
    expect(resolveEnvDefaultNumber('$GRIMOIRE_TEST_PORT')).toBeUndefined();
  });

  it('returns undefined for undefined input', () => {
    expect(resolveEnvDefaultNumber(undefined)).toBeUndefined();
  });
});

describe('resolveEnvDefaultBoolean', () => {
  const SAVED_FLAG = process.env['GRIMOIRE_TEST_FLAG'];

  afterEach(() => {
    if (SAVED_FLAG !== undefined) {
      process.env['GRIMOIRE_TEST_FLAG'] = SAVED_FLAG;
    } else {
      delete process.env['GRIMOIRE_TEST_FLAG'];
    }
  });

  it('returns boolean as-is', () => {
    expect(resolveEnvDefaultBoolean(true)).toBe(true);
    expect(resolveEnvDefaultBoolean(false)).toBe(false);
  });

  it('resolves "$FLAG" with FLAG=true to true', () => {
    process.env['GRIMOIRE_TEST_FLAG'] = 'true';
    expect(resolveEnvDefaultBoolean('$GRIMOIRE_TEST_FLAG')).toBe(true);
  });

  it('resolves "$FLAG" with FLAG=1 to true', () => {
    process.env['GRIMOIRE_TEST_FLAG'] = '1';
    expect(resolveEnvDefaultBoolean('$GRIMOIRE_TEST_FLAG')).toBe(true);
  });

  it('resolves "$FLAG" with FLAG=false to false', () => {
    process.env['GRIMOIRE_TEST_FLAG'] = 'false';
    expect(resolveEnvDefaultBoolean('$GRIMOIRE_TEST_FLAG')).toBe(false);
  });

  it('returns undefined for undefined input', () => {
    expect(resolveEnvDefaultBoolean(undefined)).toBeUndefined();
  });
});
