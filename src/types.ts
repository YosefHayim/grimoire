// ─── Condition Types ─────────────────────────────────────────────────────────

export type Condition =
  | { field: string; equals: unknown }
  | { field: string; notEquals: unknown }
  | { field: string; includes: unknown }
  | { field: string; notIncludes: unknown }
  | { field: string; greaterThan: number }
  | { field: string; lessThan: number }
  | { field: string; isEmpty: true }
  | { field: string; isNotEmpty: true }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

// ─── Validation Rules ────────────────────────────────────────────────────────

export type ValidationRule =
  | { rule: 'required'; message?: string }
  | { rule: 'minLength'; value: number; message?: string }
  | { rule: 'maxLength'; value: number; message?: string }
  | { rule: 'pattern'; value: string; message?: string }
  | { rule: 'min'; value: number; message?: string }
  | { rule: 'max'; value: number; message?: string };

// ─── Select Option ───────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  hint?: string;
  disabled?: boolean;
}

// ─── Step Configs ────────────────────────────────────────────────────────────

export interface BaseStepConfig {
  id: string;
  type: string;
  message: string;
  next?: string;
  when?: Condition;
  keepValuesOnPrevious?: boolean;
  required?: boolean;
  group?: string;
}

export interface TextStepConfig extends BaseStepConfig {
  type: 'text';
  placeholder?: string;
  default?: string;
  validate?: ValidationRule[];
}

export interface SelectStepConfig extends BaseStepConfig {
  type: 'select';
  options: SelectOption[];
  default?: string;
  routes?: Record<string, string>;
}

export interface MultiSelectStepConfig extends BaseStepConfig {
  type: 'multiselect';
  options: SelectOption[];
  default?: string[];
  min?: number;
  max?: number;
}

export interface ConfirmStepConfig extends BaseStepConfig {
  type: 'confirm';
  default?: boolean;
}

export interface PasswordStepConfig extends BaseStepConfig {
  type: 'password';
  validate?: ValidationRule[];
}

export interface NumberStepConfig extends BaseStepConfig {
  type: 'number';
  default?: number;
  min?: number;
  max?: number;
  step?: number;
}

export interface SearchStepConfig extends BaseStepConfig {
  type: 'search';
  options: SelectOption[];
  default?: string;
  placeholder?: string;
}

export interface EditorStepConfig extends BaseStepConfig {
  type: 'editor';
  default?: string;
  validate?: ValidationRule[];
}

export interface PathStepConfig extends BaseStepConfig {
  type: 'path';
  default?: string;
  placeholder?: string;
  validate?: ValidationRule[];
}

export interface ToggleStepConfig extends BaseStepConfig {
  type: 'toggle';
  default?: boolean;
  active?: string;
  inactive?: string;
}

export type StepConfig =
  | TextStepConfig
  | SelectStepConfig
  | MultiSelectStepConfig
  | ConfirmStepConfig
  | PasswordStepConfig
  | NumberStepConfig
  | SearchStepConfig
  | EditorStepConfig
  | PathStepConfig
  | ToggleStepConfig;

// ─── Theme Config ────────────────────────────────────────────────────────────

export interface ThemeConfig {
  tokens?: {
    primary?: string;
    success?: string;
    error?: string;
    warning?: string;
    info?: string;
    muted?: string;
    accent?: string;
  };
  icons?: {
    step?: string;
    stepDone?: string;
    stepPending?: string;
    pointer?: string;
  };
}

// ─── Pre-Flight Check ────────────────────────────────────────────────────────

export interface PreFlightCheck {
  name: string;
  run: string;
  message: string;
}

// ─── Action Config ───────────────────────────────────────────────────────────

export interface ActionConfig {
  name?: string;
  run: string;
  when?: Condition;
}

// ─── Wizard Config ───────────────────────────────────────────────────────────

export interface WizardConfig {
  meta: { name: string; version?: string; description?: string };
  theme?: ThemeConfig;
  steps: StepConfig[];
  output?: { format: 'json' | 'env' | 'yaml'; path?: string };
  extends?: string;
  checks?: PreFlightCheck[];
  actions?: ActionConfig[];
}

// ─── Runtime State ───────────────────────────────────────────────────────────

export interface WizardState {
  currentStepId: string;
  answers: Record<string, unknown>;
  history: string[];
  status: 'running' | 'done' | 'cancelled';
  errors: Record<string, string>;
}

// ─── Transitions ─────────────────────────────────────────────────────────────

export type WizardTransition =
  | { type: 'NEXT'; value: unknown }
  | { type: 'BACK' }
  | { type: 'JUMP'; stepId: string }
  | { type: 'CANCEL' };

// ─── Resolved Theme ──────────────────────────────────────────────────────────

export interface ResolvedTheme {
  primary: (text: string) => string;
  success: (text: string) => string;
  error: (text: string) => string;
  warning: (text: string) => string;
  info: (text: string) => string;
  muted: (text: string) => string;
  accent: (text: string) => string;
  bold: (text: string) => string;
  icons: Required<NonNullable<ThemeConfig['icons']>>;
}

// ─── Renderer Interface ─────────────────────────────────────────────────────

export interface WizardRenderer {
  renderText(step: TextStepConfig, state: WizardState, theme: ResolvedTheme): Promise<string>;
  renderSelect(step: SelectStepConfig, state: WizardState, theme: ResolvedTheme): Promise<string>;
  renderMultiSelect(step: MultiSelectStepConfig, state: WizardState, theme: ResolvedTheme): Promise<string[]>;
  renderConfirm(step: ConfirmStepConfig, state: WizardState, theme: ResolvedTheme): Promise<boolean>;
  renderPassword(step: PasswordStepConfig, state: WizardState, theme: ResolvedTheme): Promise<string>;
  renderNumber(step: NumberStepConfig, state: WizardState, theme: ResolvedTheme): Promise<number>;
  renderSearch(step: SearchStepConfig, state: WizardState, theme: ResolvedTheme): Promise<string>;
  renderEditor(step: EditorStepConfig, state: WizardState, theme: ResolvedTheme): Promise<string>;
  renderPath(step: PathStepConfig, state: WizardState, theme: ResolvedTheme): Promise<string>;
  renderToggle(step: ToggleStepConfig, state: WizardState, theme: ResolvedTheme): Promise<boolean>;
  renderStepHeader(stepIndex: number, totalVisible: number, message: string, theme: ResolvedTheme): void;
  renderGroupHeader(group: string, theme: ResolvedTheme): void;
  renderSummary(answers: Record<string, unknown>, steps: StepConfig[], theme: ResolvedTheme): void;
  clear(): void;
}
