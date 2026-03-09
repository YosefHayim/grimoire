export interface SpinnerConfig {
  frames: string[];
  interval: number;
}

export const spinners = {
  dots:               { interval: 80,  frames: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] },
  dots2:              { interval: 80,  frames: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'] },
  line:               { interval: 130, frames: ['-', '\\', '|', '/'] },
  arc:                { interval: 100, frames: ['◜', '◠', '◝', '◞', '◡', '◟'] },
  circle:             { interval: 80,  frames: ['◒', '◐', '◓', '◑'] },
  circleHalves:       { interval: 50,  frames: ['◐', '◓', '◑', '◒'] },
  triangle:           { interval: 50,  frames: ['◢', '◣', '◤', '◥'] },
  pipe:               { interval: 100, frames: ['┤', '┘', '┴', '└', '├', '┌', '┬', '┐'] },
  arrow:              { interval: 100, frames: ['←', '↖', '↑', '↗', '→', '↘', '↓', '↙'] },
  arrow3:             { interval: 120, frames: ['▹▹▹▹▹', '▸▹▹▹▹', '▹▸▹▹▹', '▹▹▸▹▹', '▹▹▹▸▹', '▹▹▹▹▸'] },
  bouncingBar:        { interval: 80,  frames: ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[====]', '[ ===]', '[  ==]', '[   =]', '[    ]', '[   =]', '[  ==]', '[ ===]', '[====]', '[=== ]', '[==  ]', '[=   ]'] },
  bouncingBall:       { interval: 80,  frames: ['( ●    )', '(  ●   )', '(   ●  )', '(    ● )', '(     ●)', '(    ● )', '(   ●  )', '(  ●   )', '( ●    )', '(●     )'] },
  simpleDots:         { interval: 400, frames: ['.  ', '.. ', '...', '   '] },
  aesthetic:          { interval: 80,  frames: ['▰▱▱▱▱▱▱', '▰▰▱▱▱▱▱', '▰▰▰▱▱▱▱', '▰▰▰▰▱▱▱', '▰▰▰▰▰▱▱', '▰▰▰▰▰▰▱', '▰▰▰▰▰▰▰', '▰▱▱▱▱▱▱'] },
  star:               { interval: 70,  frames: ['✶', '✸', '✹', '✺', '✹', '✷'] },
} as const satisfies Record<string, SpinnerConfig>;

export type SpinnerName = keyof typeof spinners;

export const DEFAULT_SPINNER: SpinnerName = 'circle';

export function resolveSpinner(
  config?: string | { frames: string[]; interval?: number },
): SpinnerConfig {
  if (!config) {
    return spinners[DEFAULT_SPINNER];
  }
  if (typeof config === 'string') {
    if (config in spinners) {
      return spinners[config as SpinnerName];
    }
    throw new Error(`Unknown spinner preset: "${config}". Available: ${Object.keys(spinners).join(', ')}`);
  }
  return {
    frames: config.frames,
    interval: config.interval ?? 80,
  };
}
