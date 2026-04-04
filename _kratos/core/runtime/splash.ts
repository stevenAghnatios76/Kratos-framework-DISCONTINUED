const VERSION = '2.2.0';

const HELMET = [
  '        ▄▄▄▄▄▄▄▄▄        ',
  '      ▄█████████████▄      ',
  '     ██▀▀▀▀▀▀▀▀▀▀▀██     ',
  '    ██   ▄███████▄   ██    ',
  '    █  ▐███████████▌  █    ',
  '    █   ▀▀▀▀▀▀▀▀▀▀   █    ',
  '    ██  ═══════════  ██    ',
  '     █▌  ▐       ▌  ▐█     ',
  '      █▄▄▄▄▄▄▄▄▄▄▄▄▄█      ',
];

function shouldAnimate(): boolean {
  return Boolean(process.stdout.isTTY) && !process.env.CI;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function showSplash(): Promise<void> {
  const chalk = (await import('chalk')).default;
  const accent = chalk.cyan;
  const accentSoft = chalk.cyanBright;
  const dim = chalk.dim.gray;
  const bold = chalk.bold.white;
  const animate = shouldAnimate();

  console.log('');
  for (const [index, line] of HELMET.entries()) {
    const paint = index % 2 === 0 ? accent : accentSoft;
    console.log(`  ${paint(line)}`);
    if (animate) await sleep(18);
  }
  console.log('');
  console.log(`  ${bold('KRATOS')} ${dim(`v${VERSION}`)}`);
  console.log(`  ${dim('Generative Agile Intelligence Architecture')}`);
  console.log(`  ${dim('15 agents · 64 workflows · 8 skills')}`);

  const bootLines = [
    `${dim('Workflow router')} ${accent('online')}`,
    `${dim('Context engine')} ${accent('ready')}`,
    `${dim('Delivery status')} ${accent('mission capable')}`,
  ];

  for (const line of bootLines) {
    console.log(`  ${line}`);
    if (animate) await sleep(24);
  }
  console.log('');
}
