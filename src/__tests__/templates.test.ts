import { describe, it, expect, afterEach } from 'vitest';
import {
  saveTemplate,
  loadTemplate,
  listTemplates,
  deleteTemplate,
} from '../templates';

const WIZARD_NAME = `__test-wizard-${process.pid}__`;
const TEMPLATE_NAME = 'my-preset';

afterEach(() => {
  deleteTemplate(WIZARD_NAME, TEMPLATE_NAME);
  deleteTemplate(WIZARD_NAME, 'second-preset');
  deleteTemplate(WIZARD_NAME, 'empty');
});

describe('saveTemplate', () => {
  it('saves answers to disk and loadTemplate retrieves them', () => {
    const answers = { name: 'my-app', lang: 'typescript' };
    saveTemplate(WIZARD_NAME, TEMPLATE_NAME, answers);

    const loaded = loadTemplate(WIZARD_NAME, TEMPLATE_NAME);
    expect(loaded).toEqual(answers);
  });

  it('overwrites an existing template', () => {
    saveTemplate(WIZARD_NAME, TEMPLATE_NAME, { name: 'old' });
    saveTemplate(WIZARD_NAME, TEMPLATE_NAME, { name: 'new' });

    const loaded = loadTemplate(WIZARD_NAME, TEMPLATE_NAME);
    expect(loaded).toEqual({ name: 'new' });
  });

  it('excludes specified keys when excludeKeys is provided', () => {
    const answers = { name: 'app', password: 'secret123', lang: 'ts' };
    saveTemplate(WIZARD_NAME, TEMPLATE_NAME, answers, ['password']);

    const loaded = loadTemplate(WIZARD_NAME, TEMPLATE_NAME);
    expect(loaded).toEqual({ name: 'app', lang: 'ts' });
    expect(loaded).not.toHaveProperty('password');
  });

  it('saves all keys when excludeKeys is empty', () => {
    const answers = { a: 1, b: 2 };
    saveTemplate(WIZARD_NAME, TEMPLATE_NAME, answers, []);

    const loaded = loadTemplate(WIZARD_NAME, TEMPLATE_NAME);
    expect(loaded).toEqual(answers);
  });

  it('saves all keys including sensitive-looking ones without filtering', () => {
    const answers = { name: 'app', secret: 'hunter2', password: 's3cret', port: 8080 };
    saveTemplate(WIZARD_NAME, TEMPLATE_NAME, answers);

    const loaded = loadTemplate(WIZARD_NAME, TEMPLATE_NAME);
    expect(loaded).toEqual(answers);
    expect(loaded).toHaveProperty('password', 's3cret');
    expect(loaded).toHaveProperty('secret', 'hunter2');
  });
});

describe('loadTemplate', () => {
  it('returns undefined for non-existent template', () => {
    const loaded = loadTemplate(WIZARD_NAME, 'does-not-exist');
    expect(loaded).toBeUndefined();
  });

  it('returns undefined for non-existent wizard', () => {
    const loaded = loadTemplate('__no-such-wizard__', TEMPLATE_NAME);
    expect(loaded).toBeUndefined();
  });
});

describe('listTemplates', () => {
  it('returns empty array when no templates exist', () => {
    const list = listTemplates('__no-templates-wizard__');
    expect(list).toEqual([]);
  });

  it('returns template names for a wizard', () => {
    saveTemplate(WIZARD_NAME, TEMPLATE_NAME, { a: 1 });
    saveTemplate(WIZARD_NAME, 'second-preset', { b: 2 });

    const list = listTemplates(WIZARD_NAME);
    expect(list).toContain('my-preset');
    expect(list).toContain('second-preset');
    expect(list).toHaveLength(2);
  });
});

describe('deleteTemplate', () => {
  it('removes a template', () => {
    saveTemplate(WIZARD_NAME, TEMPLATE_NAME, { x: 1 });
    expect(loadTemplate(WIZARD_NAME, TEMPLATE_NAME)).toBeDefined();

    deleteTemplate(WIZARD_NAME, TEMPLATE_NAME);
    expect(loadTemplate(WIZARD_NAME, TEMPLATE_NAME)).toBeUndefined();
  });

  it('does not throw when deleting non-existent template', () => {
    expect(() => deleteTemplate(WIZARD_NAME, 'nope')).not.toThrow();
  });
});
