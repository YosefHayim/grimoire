import { z } from 'zod';
import type {
  ActionConfig,
  Condition,
  PreFlightCheck,
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
  disabled: z.union([z.boolean(), z.string()]).optional(),
});

const separatorOptionSchema = z.object({
  separator: z.string(),
});

const selectChoiceSchema = z.union([selectOptionSchema, separatorOptionSchema]);

const baseStepFields = {
  id: z.string(),
  message: z.string(),
  description: z.string().optional(),
  next: z.string().optional(),
  when: conditionSchema.optional(),
  keepValuesOnPrevious: z.boolean().optional(),
  required: z.boolean().optional(),
  group: z.string().optional(),
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
  options: z.array(selectChoiceSchema).min(1).optional(),
  optionsFrom: z.string().optional(),
  default: z.string().optional(),
  routes: z.record(z.string(), z.string()).optional(),
  pageSize: z.number().int().positive().optional(),
  loop: z.boolean().optional(),
});

const multiSelectStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('multiselect'),
  options: z.array(selectChoiceSchema).min(1).optional(),
  optionsFrom: z.string().optional(),
  default: z.array(z.string()).optional(),
  min: z.number().int().nonnegative().optional(),
  max: z.number().int().positive().optional(),
  pageSize: z.number().int().positive().optional(),
  loop: z.boolean().optional(),
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

const searchStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('search'),
  options: z.array(selectChoiceSchema).min(1).optional(),
  optionsFrom: z.string().optional(),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  pageSize: z.number().int().positive().optional(),
  loop: z.boolean().optional(),
});

const editorStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('editor'),
  default: z.string().optional(),
  validate: z.array(validationRuleSchema).optional(),
});

const pathStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('path'),
  default: z.string().optional(),
  placeholder: z.string().optional(),
  validate: z.array(validationRuleSchema).optional(),
});

const toggleStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('toggle'),
  default: z.boolean().optional(),
  active: z.string().optional(),
  inactive: z.string().optional(),
});

const messageStepSchema = z.object({
  ...baseStepFields,
  type: z.literal('message'),
});

const stepConfigSchema = z.discriminatedUnion('type', [
  textStepSchema,
  selectStepSchema,
  multiSelectStepSchema,
  confirmStepSchema,
  passwordStepSchema,
  numberStepSchema,
  searchStepSchema,
  editorStepSchema,
  pathStepSchema,
  toggleStepSchema,
  messageStepSchema,
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

const preFlightCheckSchema: z.ZodType<PreFlightCheck> = z.object({
  name: z.string(),
  run: z.string(),
  message: z.string(),
});

const actionConfigSchema: z.ZodType<ActionConfig> = z.object({
  name: z.string().optional(),
  run: z.string(),
  when: conditionSchema.optional(),
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
  extends: z.string().optional(),
  checks: z.array(preFlightCheckSchema).optional(),
  actions: z.array(actionConfigSchema).optional(),
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

    if (step.type === 'select' && step.routes && step.options) {
      const optionValues = new Set<string>();
      for (const o of step.options) {
        if ('value' in o) {
          optionValues.add(o.value);
        }
      }
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

    if (step.type === 'select' || step.type === 'multiselect' || step.type === 'search') {
      const hasOptions = step.options !== undefined;
      const hasOptionsFrom = step.optionsFrom !== undefined;
      if (hasOptions && hasOptionsFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Step "${step.id}" has both "options" and "optionsFrom" — only one is allowed`,
          path: ['steps', i],
        });
      }
      if (!hasOptions && !hasOptionsFrom) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Step "${step.id}" must have either "options" or "optionsFrom"`,
          path: ['steps', i],
        });
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

  if (config.actions) {
    config.actions.forEach((action, i) => {
      if (action.when) {
        collectConditionFieldIssues(action.when, stepIds, ctx, ['actions', i, 'when']);
      }
    });
  }
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
  actionConfigSchema,
  conditionSchema,
  validationRuleSchema,
  selectOptionSchema,
  separatorOptionSchema,
  selectChoiceSchema,
  messageStepSchema,
  stepConfigSchema,
  themeConfigSchema,
  preFlightCheckSchema,
  wizardConfigSchema,
};

export function parseWizardConfig(raw: unknown): WizardConfig {
  // The zod schema allows options to be optional (when optionsFrom is used).
  // After resolution in loadWizardConfig, options is always populated.
  const result = wizardConfigSchema.parse(raw) as WizardConfig;
  return result;
}
