import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

import { formatCallout, getSpinnerPreset } from './ui.js';

test('spinner presets adapt to scanning and launch actions', () => {
  assert.equal(getSpinnerPreset('Scanning codebase...').spinner, 'earth');
  assert.equal(getSpinnerPreset('Launching dashboard...').spinner, 'moon');
  assert.equal(getSpinnerPreset('Building context caches...').spinner, 'dots12');
});

test('callout formatting keeps title and wraps message content', () => {
  const lines = formatCallout(
    'info',
    'Next Steps',
    'Brownfield onboarding now scans the repo, summarizes the workflow, and points the user to the right Copilot command.',
    52,
  );

  assert.ok(lines[0]?.includes('Next Steps'));
  assert.ok(lines.some((line: string) => line.includes('Brownfield onboarding now scans')));
  assert.ok(lines.every((line: string) => line.length <= 52));
});

test('splash flag renders KRATOS branding', () => {
  const cliPath = join(__dirname, 'cli.js');
  const output = execFileSync(process.execPath, [cliPath, '--splash'], { encoding: 'utf-8' });

  assert.match(output, /KRATOS/);
  assert.match(output, /Workflow router/);
});
