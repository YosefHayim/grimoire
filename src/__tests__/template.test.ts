import { describe, it, expect } from 'vitest';
import { resolveTemplate, resolveTemplateStrict } from '../template';

describe('resolveTemplate', () => {
  it('resolves single placeholder', () => {
    expect(resolveTemplate('Hello {{name}}!', { name: 'World' })).toBe('Hello World!');
  });

  it('resolves multiple placeholders', () => {
    expect(resolveTemplate('{{a}} and {{b}}', { a: '1', b: '2' })).toBe('1 and 2');
  });

  it('joins array values with comma', () => {
    expect(resolveTemplate('Tools: {{tools}}', { tools: ['eslint', 'prettier'] })).toBe('Tools: eslint, prettier');
  });

  it('leaves unresolved placeholders as-is', () => {
    expect(resolveTemplate('Hello {{unknown}}!', {})).toBe('Hello {{unknown}}!');
  });

  it('handles empty string', () => {
    expect(resolveTemplate('', { name: 'test' })).toBe('');
  });

  it('handles no placeholders', () => {
    expect(resolveTemplate('No placeholders here', { name: 'test' })).toBe('No placeholders here');
  });

  it('trims whitespace in placeholder keys', () => {
    expect(resolveTemplate('{{ name }}', { name: 'World' })).toBe('World');
  });

  it('converts numbers to string', () => {
    expect(resolveTemplate('Port: {{port}}', { port: 3000 })).toBe('Port: 3000');
  });

  it('converts booleans to string', () => {
    expect(resolveTemplate('Enabled: {{flag}}', { flag: true })).toBe('Enabled: true');
  });

  it('resolves in option-like context', () => {
    expect(resolveTemplate('{{env}} Server', { env: 'Production' })).toBe('Production Server');
  });

  it('handles nested braces gracefully', () => {
    expect(resolveTemplate('{{a}}', { a: '{{b}}' })).toBe('{{b}}');
  });
});

describe('resolveTemplateStrict', () => {
  it('resolves known step-ids', () => {
    expect(resolveTemplateStrict('echo {{name}}', { name: 'hello' })).toBe('echo hello');
  });

  it('resolves arrays as comma-separated', () => {
    expect(resolveTemplateStrict('{{tools}}', { tools: ['a', 'b'] })).toBe('a, b');
  });

  it('throws on unknown step-id', () => {
    expect(() => resolveTemplateStrict('echo {{missing}}', {})).toThrow(
      'Action references unknown step "missing"',
    );
  });

  it('throws on skipped step (undefined value)', () => {
    expect(() => resolveTemplateStrict('echo {{skipped}}', {})).toThrow(
      'Action references unknown step "skipped"',
    );
  });

  it('handles multiple placeholders with one missing', () => {
    expect(() => resolveTemplateStrict('{{a}} {{b}}', { a: 'ok' })).toThrow(
      'Action references unknown step "b"',
    );
  });

  it('handles boolean and number values', () => {
    expect(resolveTemplateStrict('--port={{port}} --verbose={{v}}', { port: 3000, v: true })).toBe(
      '--port=3000 --verbose=true',
    );
  });
});
