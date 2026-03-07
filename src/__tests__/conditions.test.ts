import { describe, it, expect } from 'vitest';
import { evaluateCondition, isStepVisible, getValueByPath } from '../conditions';
import type { Condition, TextStepConfig } from '../types';

describe('evaluateCondition', () => {
  describe('equals', () => {
    it('returns true when value matches', () => {
      const condition: Condition = { field: 'lang', equals: 'ts' };
      expect(evaluateCondition(condition, { lang: 'ts' })).toBe(true);
    });

    it('returns false when value does not match', () => {
      const condition: Condition = { field: 'lang', equals: 'ts' };
      expect(evaluateCondition(condition, { lang: 'js' })).toBe(false);
    });
  });

  describe('notEquals', () => {
    it('returns true when value differs', () => {
      const condition: Condition = { field: 'lang', notEquals: 'ts' };
      expect(evaluateCondition(condition, { lang: 'js' })).toBe(true);
    });

    it('returns false when value matches', () => {
      const condition: Condition = { field: 'lang', notEquals: 'ts' };
      expect(evaluateCondition(condition, { lang: 'ts' })).toBe(false);
    });
  });

  describe('includes', () => {
    it('returns true when array includes value', () => {
      const condition: Condition = { field: 'tags', includes: 'a' };
      expect(evaluateCondition(condition, { tags: ['a', 'b'] })).toBe(true);
    });

    it('returns true when string includes substring', () => {
      const condition: Condition = { field: 'name', includes: 'oo' };
      expect(evaluateCondition(condition, { name: 'foobar' })).toBe(true);
    });

    it('returns false when value not found', () => {
      const condition: Condition = { field: 'tags', includes: 'z' };
      expect(evaluateCondition(condition, { tags: ['a', 'b'] })).toBe(false);
    });
  });

  describe('notIncludes', () => {
    it('returns true when array does not include value', () => {
      const condition: Condition = { field: 'tags', notIncludes: 'z' };
      expect(evaluateCondition(condition, { tags: ['a', 'b'] })).toBe(true);
    });

    it('returns false when array includes value', () => {
      const condition: Condition = { field: 'tags', notIncludes: 'a' };
      expect(evaluateCondition(condition, { tags: ['a', 'b'] })).toBe(false);
    });
  });

  describe('greaterThan', () => {
    it('returns true when value is greater', () => {
      const condition: Condition = { field: 'age', greaterThan: 18 };
      expect(evaluateCondition(condition, { age: 21 })).toBe(true);
    });

    it('returns false when value is equal', () => {
      const condition: Condition = { field: 'age', greaterThan: 18 };
      expect(evaluateCondition(condition, { age: 18 })).toBe(false);
    });

    it('returns false when value is less', () => {
      const condition: Condition = { field: 'age', greaterThan: 18 };
      expect(evaluateCondition(condition, { age: 10 })).toBe(false);
    });
  });

  describe('lessThan', () => {
    it('returns true when value is less', () => {
      const condition: Condition = { field: 'age', lessThan: 18 };
      expect(evaluateCondition(condition, { age: 10 })).toBe(true);
    });

    it('returns false when value is equal', () => {
      const condition: Condition = { field: 'age', lessThan: 18 };
      expect(evaluateCondition(condition, { age: 18 })).toBe(false);
    });

    it('returns false when value is greater', () => {
      const condition: Condition = { field: 'age', lessThan: 18 };
      expect(evaluateCondition(condition, { age: 21 })).toBe(false);
    });
  });

  describe('isEmpty', () => {
    it('returns true for undefined', () => {
      const condition: Condition = { field: 'x', isEmpty: true };
      expect(evaluateCondition(condition, {})).toBe(true);
    });

    it('returns true for null', () => {
      const condition: Condition = { field: 'x', isEmpty: true };
      expect(evaluateCondition(condition, { x: null })).toBe(true);
    });

    it('returns true for empty string', () => {
      const condition: Condition = { field: 'x', isEmpty: true };
      expect(evaluateCondition(condition, { x: '' })).toBe(true);
    });

    it('returns true for empty array', () => {
      const condition: Condition = { field: 'x', isEmpty: true };
      expect(evaluateCondition(condition, { x: [] })).toBe(true);
    });

    it('returns false for non-empty value', () => {
      const condition: Condition = { field: 'x', isEmpty: true };
      expect(evaluateCondition(condition, { x: 'hello' })).toBe(false);
    });
  });

  describe('isNotEmpty', () => {
    it('returns false for undefined', () => {
      const condition: Condition = { field: 'x', isNotEmpty: true };
      expect(evaluateCondition(condition, {})).toBe(false);
    });

    it('returns false for null', () => {
      const condition: Condition = { field: 'x', isNotEmpty: true };
      expect(evaluateCondition(condition, { x: null })).toBe(false);
    });

    it('returns true for non-empty string', () => {
      const condition: Condition = { field: 'x', isNotEmpty: true };
      expect(evaluateCondition(condition, { x: 'hello' })).toBe(true);
    });

    it('returns true for non-empty array', () => {
      const condition: Condition = { field: 'x', isNotEmpty: true };
      expect(evaluateCondition(condition, { x: [1] })).toBe(true);
    });
  });

  describe('all', () => {
    it('returns true when all conditions are true', () => {
      const condition: Condition = {
        all: [
          { field: 'a', equals: 1 },
          { field: 'b', equals: 2 },
        ],
      };
      expect(evaluateCondition(condition, { a: 1, b: 2 })).toBe(true);
    });

    it('returns false when one condition is false', () => {
      const condition: Condition = {
        all: [
          { field: 'a', equals: 1 },
          { field: 'b', equals: 999 },
        ],
      };
      expect(evaluateCondition(condition, { a: 1, b: 2 })).toBe(false);
    });

    it('returns true for empty array', () => {
      const condition: Condition = { all: [] };
      expect(evaluateCondition(condition, {})).toBe(true);
    });
  });

  describe('any', () => {
    it('returns true when one condition is true', () => {
      const condition: Condition = {
        any: [
          { field: 'a', equals: 999 },
          { field: 'b', equals: 2 },
        ],
      };
      expect(evaluateCondition(condition, { a: 1, b: 2 })).toBe(true);
    });

    it('returns false when none are true', () => {
      const condition: Condition = {
        any: [
          { field: 'a', equals: 999 },
          { field: 'b', equals: 888 },
        ],
      };
      expect(evaluateCondition(condition, { a: 1, b: 2 })).toBe(false);
    });

    it('returns false for empty array', () => {
      const condition: Condition = { any: [] };
      expect(evaluateCondition(condition, {})).toBe(false);
    });
  });

  describe('not', () => {
    it('negates a true condition', () => {
      const condition: Condition = { not: { field: 'a', equals: 1 } };
      expect(evaluateCondition(condition, { a: 1 })).toBe(false);
    });

    it('negates a false condition', () => {
      const condition: Condition = { not: { field: 'a', equals: 999 } };
      expect(evaluateCondition(condition, { a: 1 })).toBe(true);
    });
  });
});

describe('isStepVisible', () => {
  const baseStep: TextStepConfig = {
    id: 's1',
    type: 'text',
    message: 'Enter name',
  };

  it('returns true when step has no when condition', () => {
    expect(isStepVisible(baseStep, {})).toBe(true);
  });

  it('returns true when condition matches', () => {
    const step: TextStepConfig = {
      ...baseStep,
      when: { field: 'lang', equals: 'ts' },
    };
    expect(isStepVisible(step, { lang: 'ts' })).toBe(true);
  });

  it('returns false when condition does not match', () => {
    const step: TextStepConfig = {
      ...baseStep,
      when: { field: 'lang', equals: 'ts' },
    };
    expect(isStepVisible(step, { lang: 'js' })).toBe(false);
  });
});

describe('getValueByPath', () => {
  it('returns value for simple key', () => {
    expect(getValueByPath({ name: 'Alice' }, 'name')).toBe('Alice');
  });

  it('returns value for nested key with dot notation', () => {
    expect(getValueByPath({ user: { age: 30 } }, 'user.age')).toBe(30);
  });

  it('returns undefined for missing key', () => {
    expect(getValueByPath({ name: 'Alice' }, 'missing')).toBeUndefined();
  });

  it('returns undefined for deep missing key', () => {
    expect(getValueByPath({ a: { b: 1 } }, 'a.c')).toBeUndefined();
  });
});
