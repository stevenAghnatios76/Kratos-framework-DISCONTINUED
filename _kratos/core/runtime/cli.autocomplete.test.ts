import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGhostSuggestionSequence, findWorkflowEntry, getReplCompletions, listWorkflowEntries } from './cli.js';

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

test('workflow catalog includes brownfield and CLI shortcuts expose it', () => {
  const workflows = listWorkflowEntries();
  const brownfield = findWorkflowEntry('brownfield');
  const matches = getReplCompletions('brown');

  assert.ok(workflows.some(entry => entry.name === 'brownfield'));
  assert.ok(brownfield);
  assert.equal(brownfield?.workflowName, 'brownfield');
  assert.ok(matches.includes('brownfield'));
});

test('workflow subcommands are suggested in autocomplete', () => {
  const matches = getReplCompletions('workflow li');

  assert.ok(matches.includes('workflow list'));
});

test('ghost suggestion sequence clears old preview before repainting', () => {
  const sequence = buildGhostSuggestionSequence('wo');

  assert.ok(sequence);
  assert.match(sequence ?? '', /\[0K/);
  assert.match(sequence ?? '', /rkflow list/);
});
