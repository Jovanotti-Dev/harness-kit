#!/usr/bin/env node
import path from 'node:path';
import { readIfExists, listStateFiles } from './lib/parse.mjs';
import { runChecks } from './lib/checks.mjs';
import { runProbe } from './lib/probe.mjs';

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (!t.startsWith('--')) { args._.push(t); continue; }
    const key = t.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith('--')) args[key] = true;
    else { args[key] = next; i++; }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  console.log(`Usage: node audit.mjs [--target DIR] [--json] [--min-score N]

Static checks only — no project commands are run.
Exit code is 1 when the score is below --min-score (default 70).`);
  process.exit(0);
}

const target = path.resolve(args.target || args._[0] || process.cwd());
const minScore = Number(args['min-score'] ?? 70);

const files = {
  claude: await readIfExists(path.join(target, 'CLAUDE.md')),
  agents: await readIfExists(path.join(target, 'AGENTS.md')),
  constitution: await readIfExists(path.join(target, 'CONSTITUTION.md')),
  features: await readIfExists(path.join(target, 'FEATURES.md')),
  journal: await readIfExists(path.join(target, 'JOURNAL.md')),
  stateFiles: await listStateFiles(target)
};

const commitIso = runProbe('git log -1 --format=%cI', target, 5000);
const newestCommit = commitIso ? new Date(commitIso) : null;

// Last commit date per state file. Filesystem mtime cannot be trusted for this:
// git checkout rewrites working-tree files and resets it.
const stateCommitDates = {};
for (const s of files.stateFiles) {
  const iso = runProbe(`git log -1 --format=%cI -- "${s.rel}"`, target, 5000);
  if (iso) stateCommitDates[s.rel] = new Date(iso);
}

const categories = runChecks({ files, target, newestCommit, stateCommitDates });

// Warnings count for half. A missing "Started by" shouldn't weigh the same as a
// dependency cycle.
const weigh = (c) => (c.pass ? 1 : c.severity === 'warn' ? 0.5 : 0);
const all = categories.flatMap((c) => c.checks);
const overall = Math.round((all.reduce((sum, c) => sum + weigh(c), 0) / all.length) * 100);

const label =
  overall >= 90 ? 'Excellent' : overall >= 75 ? 'Good' : overall >= 50 ? 'Needs attention' : 'Critical';

if (args.json) {
  console.log(JSON.stringify({ target, overall, label, categories }, null, 2));
} else {
  console.log(`\nharness-kit audit — ${path.basename(target)}`);
  console.log(`${overall}/100  ${label}\n`);

  for (const cat of categories) {
    const passed = cat.checks.filter((c) => c.pass).length;
    const pct = Math.round((passed / cat.checks.length) * 100);
    console.log(`  ${cat.name}  ${passed}/${cat.checks.length}  (${pct}%)`);
    for (const c of cat.checks) {
      if (c.pass) continue;
      const mark = c.severity === 'warn' ? 'WARN' : 'FAIL';
      console.log(`    ${mark}  ${c.label}`);
      console.log(`          ${c.detail}`);
      console.log(`          fix: ${c.fix}`);
    }
    console.log('');
  }

  const failed = all.filter((c) => !c.pass);
  if (!failed.length) {
    console.log('  No issues found.\n');
  } else {
    console.log(`  ${failed.length} issue(s). Weakest area: ${
      categories
        .map((c) => ({ name: c.name, pct: c.checks.filter((x) => x.pass).length / c.checks.length }))
        .sort((a, b) => a.pct - b.pct)[0].name
    }\n`);
  }
}

if (overall < minScore) process.exitCode = 1;
