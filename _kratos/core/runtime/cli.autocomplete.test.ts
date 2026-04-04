import test from 'node:test';
import assert from 'node:assert/strict';

import { getReplCompletions } from './cli.js';

test('autocomplete includes agent persona names for agent run and info commands', () => {
  const runMatches = getReplCompletions('agent run de');
  const infoMatches = getReplCompletions('agent info kr');

  assert.ok(runMatches.includes('agent run Derek'));
  assert.ok(infoMatches.includes('agent info Kratos'));
});

test('autocomplete can find agent commands by persona name search', () => {
  const matches = getReplCompletions('jordan');

  assert.ok(matches.some(match => match.includes('Jordan')));
});
