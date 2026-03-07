import { describe, it, expect } from 'vitest';
import { resolveTemplate } from '../template';

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
});
