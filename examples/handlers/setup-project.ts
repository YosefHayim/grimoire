import type { OnCompleteHandler } from '../../src/types';

const handler: OnCompleteHandler = async ({ answers, config }) => {
  console.log(`\n  Setting up project: ${String(answers['project-name'])}`);
  console.log(`  Wizard: ${config.meta.name}`);
  console.log(`  Total answers: ${Object.keys(answers).length}\n`);
};

export default handler;
