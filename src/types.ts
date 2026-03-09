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
  disabled?: boolean | string;
}

export interface SeparatorOption {
  separator: string;
}

export type SelectChoice = SelectOption | SeparatorOption;

// ─── Step Configs ────────────────────────────────────────────────────────────

export interface BaseStepConfig {
  id: string;
  type: string;
  message: string;
  description?: string;
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
  options: SelectChoice[];
  optionsFrom?: string;
  default?: string;
  routes?: Record<string, string>;
  pageSize?: number;
  loop?: boolean;
}

export interface MultiSelectStepConfig extends BaseStepConfig {
  type: 'multiselect';
  options: SelectChoice[];
  optionsFrom?: string;
  default?: string[];
  min?: number;
  max?: number;
  pageSize?: number;
  loop?: boolean;
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
  options: SelectChoice[];
  optionsFrom?: string;
  default?: string;
  placeholder?: string;
  pageSize?: number;
  loop?: boolean;
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

export interface MessageStepConfig extends BaseStepConfig {
  type: 'message';
}

export interface NoteStepConfig extends BaseStepConfig {
  type: 'note';
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
  | ToggleStepConfig
  | MessageStepConfig
  | NoteStepConfig;

// ─── Theme Config ────────────────────────────────────────────────────────────

export interface ThemeConfig {
  preset?: string;
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
  spinner?: string | { frames: string[]; interval?: number };
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

// ─── OnComplete Handler ─────────────────────────────────────────────────────

export type OnCompleteHandler = (context: {
  answers: Record<string, unknown>;
  config: WizardConfig;
}) => Promise<void> | void;

// ─── Wizard Config ───────────────────────────────────────────────────────────

export interface WizardConfig {
  meta: { name: string; version?: string; description?: string; review?: boolean };
  theme?: ThemeConfig;
  steps: StepConfig[];
  output?: { format: 'json' | 'env' | 'yaml'; path?: string };
  extends?: string;
  checks?: PreFlightCheck[];
  actions?: ActionConfig[];
  onComplete?: string;
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

// ─── Events ──────────────────────────────────────────────────────────────────

export type WizardEvent =
  | { type: 'session:start'; wizard: string; description?: string; totalSteps: number }
  | { type: 'session:end'; answers: Record<string, unknown>; cancelled: boolean }
  | { type: 'group:start'; group: string }
  | { type: 'step:start'; stepId: string; stepIndex: number; totalVisible: number; step: StepConfig }
  | { type: 'step:complete'; stepId: string; value: unknown; step: StepConfig }
  | { type: 'step:error'; stepId: string; error: string }
  | { type: 'step:back'; stepId: string }
  | { type: 'spinner:start'; message: string }
  | { type: 'spinner:stop'; message?: string }
  | { type: 'note'; title: string; body: string }
  | { type: 'checks:start'; checks: PreFlightCheck[] }
  | { type: 'check:pass'; name: string }
  | { type: 'check:fail'; name: string; message: string }
  | { type: 'actions:start' }
  | { type: 'action:pass'; name: string }
  | { type: 'action:fail'; name: string }
  | { type: 'oncomplete:start' }
  | { type: 'oncomplete:pass' }
  | { type: 'oncomplete:fail'; error: string };

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
  spinner: { frames: string[]; interval: number };
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
  renderMessage(step: MessageStepConfig, state: WizardState, theme: ResolvedTheme): void;
  renderStepHeader(stepIndex: number, totalVisible: number, message: string, theme: ResolvedTheme, description?: string): void;
  renderGroupHeader(group: string, theme: ResolvedTheme): void;
  renderSummary(answers: Record<string, unknown>, steps: StepConfig[], theme: ResolvedTheme): void;
  clear(): void;
  onEvent?(event: WizardEvent, theme: ResolvedTheme): void;
}
