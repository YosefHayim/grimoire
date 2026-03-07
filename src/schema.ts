import { z } from 'zod';
import type {
  Condition,
  ValidationRule,
  WizardConfig,
} from './types';

const conditionSchema: z.ZodType<Condition> = z.lazy(() => {
  const fieldEquals = z.object({ field: z.string(), equals: z.unknown() }).strict();
  const fieldNotEquals = z.object({ field: z.string(), notEquals: z.unknown() }).strict();
  const fieldIncludes = z.object({ field: z.string(), includes: z.unknown() }).strict();
  const fieldNotIncludes = z.object({ field: z.string(), notIncludes: z.unknown() }).strict();
  const fieldGreaterThan = z.object({ field: z.string(), greaterThan: z.number() }).strict();
  const fieldLessThan = z.object({ field: z.string(), lessThan: z.number() }).strict();
  const fieldIsEmpty = z.object({ field: z.string(), isEmpty: z.literal(true) }).strict();
  const fieldIsNotEmpty = z.object({ field: z.string(), isNotEmpty: z.literal(true) }).strict();
  const allCondition = z.object({ all: z.array(conditionSchema) }).strict();
  const anyCondition = z.object({ any: z.array(conditionSchema) }).strict();
  const notCondition = z.object({ not: conditionSchema }).strict();

  return z.union([
    fieldEquals,
    fieldNotEquals,
    fieldIncludes,
    fieldNotIncludes,
    fieldGreaterThan,
    fieldLessThan,
    fieldIsEmpty,
    fieldIsNotEmpty,
    allCondition,
    anyCondition,
    notCondition,
  ]) as z.ZodType<Condition>;
});

const validationRuleSchema: z.ZodType<ValidationRule> = z.discriminatedUnion('rule', [
  z.object({ rule: z.literal('required'), message: z.string().optional() }),
  z.object({ rule: z.literal('minLength'), value: z.number(), message: z.string().optional() }),
  z.object({ rule: z.literal('maxLength'), value: z.number(), message: z.string().optional() }),
  z.object({ rule: z.literal('pattern'), value: z.string(), message: z.string().optional() }),
  z.object({ rule: z.literal('min'), value: z.number(), message: z.string().optional() }),
  z.object({ rule: z.literal('max'), value: z.number(), message: z.string().optional() }),
]);

const selectOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  hint: z.string().optional(),
  disabled: z.boolean().optional(),
});

const baseStepFields = {
  id: z.string(),
  message: z.string(),
  next: z.string().optional(),
  when: conditionSchema.optional(),
  keepValuesOnPrevious: z.boolean().optional(),
  required: z.boolean().optional(),
} as const;

const textStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('text'),
  placeholder: z.string().optional(),
  default: z.string().optional(),
  validate: z.array(validationRuleSchema).optional(),
});

const selectStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('select'),
  options: z.array(selectOptionSchema).min(1),
  default: z.string().optional(),
  routes: z.record(z.string(), z.string()).optional(),
});

const multiSelectStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('multiselect'),
  options: z.array(selectOptionSchema).min(1),
  default: z.array(z.string()).optional(),
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().positive().optional(),
});

const confirmStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('confirm'),
  default: z.boolean().optional(),
});

const passwordStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('password'),
  validate: z.array(validationRuleSchema).optional(),
});

const numberStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('number'),
  default: z.number().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().positive().optional(),
});

const stepConfigSchema = z.discriminatedUnion('type', [
  textStepSchema,
  selectStepSchema,
  multiSelectStepSchema,
  confirmStepSchema,
  passwordStepSchema,
  numberStepSchema,
]);

const hexColorSchema = z.string().regex(
  /^#[0-9a-fA-F]{6}$/,
  'Must be a 6-digit hex color (e.g., #FF0000)',
);

const themeConfigSchema = z.object({
  tokens: z.object({
    primary: hexColorSchema.optional(),
    success: hexColorSchema.optional(),
    error: hexColorSchema.optional(),
    warning: hexColorSchema.optional(),
    info: hexColorSchema.optional(),
    muted: hexColorSchema.optional(),
    accent: hexColorSchema.optional(),
  }).optional(),
  icons: z.object({
    step: z.string().optional(),
    stepDone: z.string().optional(),
    stepPending: z.string().optional(),
    pointer: z.string().optional(),
  }).optional(),
});

const wizardConfigSchema = z.object({
  meta: z.object({
    name: z.string(),
    version: z.string().optional(),
    description: z.string().optional(),
  }),
  theme: themeConfigSchema.optional(),
  steps: z.array(stepConfigSchema).min(1),
  output: z.object({
    format: z.enum(['json', 'env', 'yaml']),
    path: z.string().optional(),
  }).optional(),
}).superRefine((config, ctx) => {
  const stepIds = new Set<string>();

  for (const step of config.steps) {
    if (stepIds.has(step.id)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate step ID: "${step.id}"`,
        path: ['steps'],
      });
    }
    stepIds.add(step.id);
  }

  config.steps.forEach((step, i) => {
    if (step.next && step.next !== '__done__' && !stepIds.has(step.next)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Step "${step.id}" references unknown next step: "${step.next}"`,
        path: ['steps', i, 'next'],
      });
    }

    if (step.type === 'select' && step.routes) {
      for (const [key, target] of Object.entries(step.routes)) {
        if (target !== '__done__' && !stepIds.has(target)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Step "${step.id}" route "${key}" references unknown step: "${target}"`,
            path: ['steps', i, 'routes', key],
          });
        }
      }
    }

    if (step.when) {
      collectConditionFieldIssues(step.when, stepIds, ctx, ['steps', i, 'when']);
    }

    if (step.type === 'select' && step.routes) {
      const optionValues = new Set(step.options.map(o => o.value));
      for (const routeKey of Object.keys(step.routes)) {
        if (!optionValues.has(routeKey)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Step "${step.id}" route key "${routeKey}" does not match any option value`,
            path: ['steps', i, 'routes', routeKey],
          });
        }
      }
    }

    if ((step.type === 'number' || step.type === 'multiselect') &&
        step.min !== undefined && step.max !== undefined && step.min > step.max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Step "${step.id}" has min (${String(step.min)}) greater than max (${String(step.max)})`,
        path: ['steps', i],
      });
    }
  });
});

function collectConditionFieldIssues(
  condition: Condition,
  validIds: Set<string>,
  ctx: z.RefinementCtx,
  path: (string | number)[],
): void {
  if ('field' in condition) {
    const fieldRoot = condition.field.split('.')[0];
    if (fieldRoot && !validIds.has(fieldRoot)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Condition references unknown step ID: "${fieldRoot}"`,
        path,
      });
    }
    return;
  }
  if ('all' in condition) {
    condition.all.forEach((child, i) => {
      collectConditionFieldIssues(child, validIds, ctx, [...path, 'all', i]);
    });
    return;
  }
  if ('any' in condition) {
    condition.any.forEach((child, i) => {
      collectConditionFieldIssues(child, validIds, ctx, [...path, 'any', i]);
    });
    return;
  }
  if ('not' in condition) {
    collectConditionFieldIssues(condition.not, validIds, ctx, [...path, 'not']);
  }
}

export {
  conditionSchema,
  validationRuleSchema,
  selectOptionSchema,
  stepConfigSchema,
  themeConfigSchema,
  wizardConfigSchema,
};

export function parseWizardConfig(raw: unknown): WizardConfig {
  const result: WizardConfig = wizardConfigSchema.parse(raw);
  return result;
}
