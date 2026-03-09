function isUnicodeSupported(): boolean {
  if (process.platform === 'win32') {
    return Boolean(process.env['WT_SESSION']) || process.env['TERM_PROGRAM'] === 'vscode';
  }
  return process.env['TERM'] !== 'linux';
}

const unicode = isUnicodeSupported();
const u = (unicodeChar: string, fallback: string): string => unicode ? unicodeChar : fallback;

export const S_BAR_START   = u('┌', 'T');
export const S_BAR         = u('│', '|');
export const S_BAR_END     = u('└', '—');
export const S_STEP_ACTIVE = u('◆', '*');
export const S_STEP_SUBMIT = u('◇', 'o');
export const S_STEP_CANCEL = u('■', 'x');
export const S_STEP_ERROR  = u('▲', 'x');
export const S_CORNER_TR   = u('╮', '+');
export const S_CORNER_BR   = u('╯', '+');
export const S_BAR_H       = u('─', '-');
