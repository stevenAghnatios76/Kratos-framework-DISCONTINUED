// ui.ts — Centralized terminal formatting for the Kratos CLI
// chalk v5 and ora v9 are ESM-only; lazy-load via dynamic import()

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _chalk: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _ora: any = null;

async function getChalk(): Promise<any> {
  if (!_chalk) _chalk = (await import('chalk')).default;
  return _chalk;
}

async function getOra(): Promise<any> {
  if (!_ora) _ora = (await import('ora')).default;
  return _ora;
}

// ── Eager-load on first use ─────────────────────────────────

let _ready = false;

export async function init(): Promise<void> {
  if (_ready) return;
  await getChalk();
  await getOra();
  _ready = true;
}

// After init(), chalk is guaranteed available
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function c(): any {
  return _chalk!;
}

/** Returns the chalk instance directly (for callers that do their own formatting). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function chalkInstance(): any {
  return _chalk!;
}

// ── Theme accessors (call after init) ───────────────────────

export function theme() {
  const k = c();
  return {
    primary:  k.white,
    dim:      k.dim.gray,
    accent:   k.cyan,
    label:    k.dim.white,
    pass:     k.green,
    fail:     k.red,
    warn:     k.yellow,
    muted:    k.dim,
    heading:  k.bold.white,
    command:  k.cyan.bold,
  };
}

export function icons() {
  const k = c();
  return {
    pass:     k.green('✓'),
    fail:     k.red('✗'),
    active:   k.cyan('●'),
    inactive: k.dim('○'),
    arrow:    k.dim('▸'),
    bullet:   k.dim('·'),
    info:     k.cyan('ℹ'),
    warn:     k.yellow('⚠'),
  };
}

export type MessageKind = 'info' | 'success' | 'warn' | 'error';

export interface SpinnerPreset {
  spinner: string;
  color: 'cyan' | 'yellow' | 'green' | 'magenta' | 'blue';
}

function terminalWidth(fallback: number = 80): number {
  return Math.max(36, Math.min(process.stdout.columns || fallback, 100));
}

function wrapText(text: string, width: number): string[] {
  const safeWidth = Math.max(12, width);
  const paragraphs = text.split('\n');
  const lines: string[] = [];

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push('');
      continue;
    }

    const words = paragraph.split(/\s+/);
    let current = '';

    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (stripAnsi(candidate).length <= safeWidth) {
        current = candidate;
      } else {
        if (current) lines.push(current);
        current = word;
      }
    }

    if (current) lines.push(current);
  }

  return lines.length > 0 ? lines : [''];
}

function truncateCell(value: string, width: number): string {
  const safeWidth = Math.max(4, width);
  const plain = stripAnsi(value);
  if (plain.length <= safeWidth) return value.padEnd(safeWidth);
  return `${plain.slice(0, Math.max(0, safeWidth - 1))}…`;
}

export function formatCallout(kind: MessageKind, title: string, message: string, width: number = terminalWidth() - 6): string[] {
  const iconMap: Record<MessageKind, string> = {
    info: 'ℹ',
    success: '✓',
    warn: '⚠',
    error: '✗',
  };

  const lines = [`${iconMap[kind]} ${title}`];
  for (const line of wrapText(message, width)) {
    lines.push(line);
  }
  return lines;
}

function renderMessage(kind: MessageKind, message: string): void {
  const t = theme();
  const ic = icons();
  const styles = {
    info: { icon: ic.info, color: t.dim },
    success: { icon: ic.pass, color: t.pass },
    warn: { icon: ic.warn, color: t.warn },
    error: { icon: ic.fail, color: t.fail },
  } as const;

  const style = styles[kind];
  const lines = wrapText(message, terminalWidth() - 8);
  lines.forEach((line, index) => {
    const prefix = index === 0 ? `${style.icon} ` : '  ';
    const painter = index === 0 ? style.color : t.dim;
    const sink = kind === 'error' ? console.error : console.log;
    sink(`  ${prefix}${painter(line)}`);
  });
}

export function getSpinnerPreset(text: string): SpinnerPreset {
  const lower = text.toLowerCase();

  if (/(scan|scanning|index|refresh)/.test(lower)) {
    return { spinner: 'earth', color: 'cyan' };
  }
  if (/(launch|starting|dashboard|server)/.test(lower)) {
    return { spinner: 'moon', color: 'magenta' };
  }
  if (/(build|compile|distill|migrate)/.test(lower)) {
    return { spinner: 'dots12', color: 'blue' };
  }
  if (/(test|validate|check|review)/.test(lower)) {
    return { spinner: 'bouncingBar', color: 'yellow' };
  }

  return { spinner: 'dots', color: 'cyan' };
}

export function callout(kind: MessageKind, title: string, message: string): void {
  const t = theme();
  const styles = {
    info: t.accent,
    success: t.pass,
    warn: t.warn,
    error: t.fail,
  } as const;

  const lines = formatCallout(kind, title, message, terminalWidth() - 8);
  console.log('');
  lines.forEach((line, index) => {
    const painter = index === 0 ? styles[kind] : t.dim;
    console.log(`  ${painter(line)}`);
  });
}

// ── Heading ─────────────────────────────────────────────────

export function heading(text: string): void {
  const t = theme();
  const width = Math.min(process.stdout.columns || 60, 60);
  const inner = ` ${text} `;
  const fill = Math.max(0, width - inner.length - 4);
  console.log('');
  console.log(`  ${t.dim('╭─')}${t.heading(inner)}${t.dim('─'.repeat(fill) + '╮')}`);
}

// ── Subheading ──────────────────────────────────────────────

export function subheading(text: string): void {
  console.log('');
  console.log(`  ${theme().accent(text)}`);
}

// ── Key-Value pair ──────────────────────────────────────────

export function keyValue(label: string, value: string | number, indent: number = 4): void {
  const t = theme();
  const pad = Math.max(0, 20 - label.length);
  const prefix = ' '.repeat(indent);
  console.log(`${prefix}${t.label(label)}${' '.repeat(pad)}${t.primary(String(value))}`);
}

// ── Status row (pass/fail) ──────────────────────────────────

export function statusRow(passed: boolean, name: string, detail?: string): void {
  const t = theme();
  const ic = icons();
  const icon = passed ? ic.pass : ic.fail;
  const suffix = detail ? ` ${t.dim('—')} ${t.dim(detail)}` : '';
  console.log(`  ${icon} ${t.primary(name)}${suffix}`);
}

// ── Result row (search results, patterns) ───────────────────

export function resultRow(label: string, content: string, score?: number): void {
  const t = theme();
  const scorePart = score !== undefined ? `${t.dim('[')}${t.accent(score.toFixed(2))}${t.dim(']')} ` : '';
  console.log(`  ${scorePart}${t.primary(label)}`);
  if (content) {
    console.log(`       ${t.dim(content.split('\n')[0].substring(0, 120))}`);
  }
}

// ── Panel (boxed output) ────────────────────────────────────

export function panel(title: string, lines: string[]): void {
  const t = theme();
  const maxWidth = Math.min(process.stdout.columns || 60, 60);
  const contentWidth = maxWidth - 6;
  const titleInner = ` ${title} `;
  const topFill = Math.max(0, contentWidth - titleInner.length);

  console.log('');
  console.log(`  ${t.dim('╭─')}${t.heading(titleInner)}${t.dim('─'.repeat(topFill) + '─╮')}`);

  for (const line of lines) {
    const stripped = stripAnsi(line);
    const pad = Math.max(0, contentWidth - stripped.length);
    console.log(`  ${t.dim('│')}  ${line}${' '.repeat(pad)}  ${t.dim('│')}`);
  }

  console.log(`  ${t.dim('╰' + '─'.repeat(contentWidth + 4) + '╯')}`);
  console.log('');
}

// ── Simple table (no borders) ───────────────────────────────

export function table(headers: string[], rows: string[][]): void {
  const t = theme();
  const availableWidth = Math.max(50, terminalWidth() - 4);
  const minWidths = headers.map((header, index) => Math.max(index === 1 ? 20 : 10, header.length + 2));
  const colWidths = headers.map((header, index) => {
    const maxData = rows.reduce((max, row) => Math.max(max, stripAnsi(row[index] || '').length), 0);
    return Math.max(minWidths[index], Math.min(maxData + 2, index === 1 ? 44 : 24));
  });

  const separatorWidth = headers.length - 1;
  let totalWidth = colWidths.reduce((sum, width) => sum + width, 0) + separatorWidth;

  while (totalWidth > availableWidth) {
    let widestIndex = -1;
    let widestWidth = -1;
    for (let i = 0; i < colWidths.length; i += 1) {
      if (colWidths[i] > minWidths[i] && colWidths[i] > widestWidth) {
        widestWidth = colWidths[i];
        widestIndex = i;
      }
    }
    if (widestIndex === -1) break;
    colWidths[widestIndex] -= 1;
    totalWidth -= 1;
  }

  const formatRow = (row: string[]): string => row
    .map((cell, index) => truncateCell(cell || '', colWidths[index]).padEnd(colWidths[index]))
    .join(' ');

  console.log(`    ${t.dim(formatRow(headers))}`);
  console.log(`    ${t.dim('─'.repeat(Math.min(totalWidth, availableWidth)))}`);

  for (const row of rows) {
    console.log(`    ${t.primary(formatRow(row))}`);
  }
}

// ── Messages ────────────────────────────────────────────────

export function error(message: string): void {
  renderMessage('error', message);
}

export function warn(message: string): void {
  renderMessage('warn', message);
}

export function success(message: string): void {
  renderMessage('success', message);
}

export function info(message: string): void {
  renderMessage('info', message);
}

// ── Divider ─────────────────────────────────────────────────

export function divider(): void {
  const width = Math.min(process.stdout.columns || 40, 40);
  console.log(`  ${theme().dim('─'.repeat(width))}`);
}

// ── Spinner ─────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function spinner(text: string): any {
  const oraFn = _ora!;
  const t = theme();
  const preset = getSpinnerPreset(text);
  const s = oraFn({
    text: t.dim(text),
    color: preset.color,
    spinner: preset.spinner,
    indent: 2,
  }).start();
  return s;
}

// ── Command help (slash-command style) ──────────────────────

export function commandHelp(name: string, desc: string): void {
  const t = theme();
  const padded = name.padEnd(24);
  console.log(`  ${t.command(padded)} ${t.dim(desc)}`);
}

// ── Raw pass-through (for formatReport) ─────────────────────

export function raw(text: string): void {
  for (const line of text.split('\n')) {
    console.log(`  ${line}`);
  }
}

// ── Internal helpers ────────────────────────────────────────

function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}
