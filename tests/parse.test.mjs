// The markdown parser is load-bearing: the entire audit reads FEATURES.md
// through it. A silent parse failure would make the audit confidently wrong.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  splitSections,
  parseTables,
  parseFeatures,
  findCycles,
  lineCount,
  hasSection
} from '../skills/harness-kit/scripts/lib/parse.mjs';

test('splitSections keeps heading levels', () => {
  const s = splitSections('# A\nbody a\n\n## B\nbody b\n### C\nbody c');
  assert.equal(s.length, 3);
  assert.equal(s[0].level, 1);
  assert.equal(s[1].heading, 'B');
  assert.equal(s[2].level, 3);
  assert.match(s[1].body, /body b/);
});

test('splitSections and hasSection tolerate empty input', () => {
  assert.deepEqual(splitSections(null), []);
  assert.equal(hasSection(null, 'anything'), false);
  assert.equal(lineCount(null), 0);
});

test('parseTables splits header and rows, skipping the separator', () => {
  const [t] = parseTables('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |');
  assert.deepEqual(t.header, ['A', 'B']);
  assert.equal(t.rows.length, 2, 'the |---| separator must not become a row');
  assert.deepEqual(t.rows[1], ['3', '4']);
});

test('parseTables handles aligned separators', () => {
  const [t] = parseTables('| A | B |\n|:-:|------|\n| x | y |');
  assert.equal(t.rows.length, 1);
});

const FEATURES = `# Features

## Epic · Alpha

**PRD:** docs/a.md · **Prefix:** \`a-\`
**Started:** 2026-01-01 · **Started by:** tester

| ID | Feature | Status | By | Depends on | Evidence |
|----|---------|:------:|----|------------|----------|
| a-001 | First | ✅ | tester | — | [archive](x.md) |
| a-002 | Second | 🔵 | tester | a-001 | ↓ below |
| a-003 | Third | 🟡 | — | a-001, a-002 | — |

### a-002 · Second

| ✓ | Check | By | Proof |
|:-:|-------|----|-------|
| 🟡 | pending | — | Pending |
`;

test('parseFeatures reads epics, metadata and rows', () => {
  const m = parseFeatures(FEATURES);
  assert.equal(m.epics.length, 1);
  assert.equal(m.epics[0].name, 'Alpha');
  assert.equal(m.epics[0].startedBy, 'tester');
  assert.equal(m.epics[0].started, '2026-01-01');
  assert.equal(m.allRows.length, 3);
});

test('parseFeatures reads status symbols and dependencies', () => {
  const m = parseFeatures(FEATURES);
  const byId = Object.fromEntries(m.allRows.map((r) => [r.id, r]));
  assert.equal(byId['a-001'].status, '✅');
  assert.equal(byId['a-002'].status, '🔵');
  assert.deepEqual(byId['a-001'].dependsOn, [], 'an em dash means no dependencies');
  assert.deepEqual(byId['a-003'].dependsOn, ['a-001', 'a-002'], 'comma-separated deps');
  assert.equal(byId['a-001'].by, 'tester');
});

test('parseFeatures collects inline feature detail sections', () => {
  const m = parseFeatures(FEATURES);
  assert.equal(m.details.length, 1);
  assert.equal(m.details[0].id, 'a-002');
  assert.equal(m.details[0].evidenceRows.length, 1);
});

test('parseFeatures survives a malformed file rather than throwing', () => {
  assert.doesNotThrow(() => parseFeatures('# Features\n\nno epics here'));
  const m = parseFeatures('# Features\n\nno epics here');
  assert.deepEqual(m.epics, []);
  assert.deepEqual(m.allRows, []);
});

test('findCycles returns nothing for a valid dependency graph', () => {
  const rows = [
    { id: 'a', dependsOn: [] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['a', 'b'] }
  ];
  assert.deepEqual(findCycles(rows), []);
});

test('findCycles detects a cycle and names the ids', () => {
  const rows = [
    { id: 'a', dependsOn: ['c'] },
    { id: 'b', dependsOn: ['a'] },
    { id: 'c', dependsOn: ['b'] }
  ];
  const cycles = findCycles(rows);
  assert.ok(cycles.length > 0, 'a → c → b → a must be reported');
  assert.ok(cycles[0].includes('a') && cycles[0].includes('b') && cycles[0].includes('c'));
});

test('findCycles detects a feature depending on itself', () => {
  assert.ok(findCycles([{ id: 'a', dependsOn: ['a'] }]).length > 0);
});

test('findCycles ignores dependencies on features that do not exist', () => {
  assert.doesNotThrow(() => findCycles([{ id: 'a', dependsOn: ['ghost'] }]));
  assert.deepEqual(findCycles([{ id: 'a', dependsOn: ['ghost'] }]), []);
});
