// One test per bug found in the wild. Each names the bug it pins.
// If one of these fails, a fix that was already shipped has been undone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runProbes, slugifyUser } from '../skills/harness-kit/scripts/lib/probe.mjs';
import { runChecks } from '../skills/harness-kit/scripts/lib/checks.mjs';
import { detectLegacy } from '../skills/harness-kit/scripts/lib/legacy.mjs';
import iosProfile from '../skills/harness-kit/profiles/ios-xcode.mjs';
import {
  detectKnowledgeGraphs,
  buildKnowledgeGraphsSection
} from '../skills/harness-kit/scripts/lib/knowledge-graphs.mjs';

const SCRIPTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'skills',
  'harness-kit',
  'scripts'
);

function featuresFixture(rows, detail = '') {
  return `# Features

## Epic · Test

**PRD:** x · **Prefix:** \`t-\`
**Started:** 2026-01-01 · **Started by:** tester

| ID | Feature | Status | By | Depends on | Evidence |
|----|---------|:------:|----|------------|----------|
${rows}

${detail}
`;
}

// `...over` must not clobber the whole files object — spreading it wholesale
// dropped stateFiles and crashed the checks. Merge files separately.
const baseCtx = (over = {}) => {
  const { files: overFiles, ...rest } = over;
  return {
    files: {
      claude: '@AGENTS.md',
      agents:
        '## Session startup\nread state/ and CONSTITUTION.md, run verify\n' +
        '## Verification\n`x`\n## Definition of done\nx\n## Session handoff\nx',
      constitution: '# c',
      features: featuresFixture('| t-001 | A | ✅ | tester | — | ok |'),
      journal: null,
      stateFiles: [],
      ...overFiles
    },
    target: '/nonexistent',
    newestCommit: null,
    stateCommitDates: {},
    ...rest
  };
};

// ── Bug 1 ─────────────────────────────────────────────────────────────────────
// `xcodebuild -list` took longer than the fixed 20s timeout, so no scheme was
// found and verify.sh would have shipped a placeholder.
test('bug 1: a probe can declare its own timeout', () => {
  const profile = {
    probe: { fast: 'echo quick', slow: { cmd: 'echo slow', timeout: 90_000 } }
  };
  const out = runProbes(profile, process.cwd());
  assert.equal(out.fast, 'quick');
  assert.equal(out.slow, 'slow', 'object-form probes must still run');
});

test('bug 1: the iOS scheme probe still declares a long timeout', () => {
  const spec = iosProfile.probe.schemesJson;
  assert.equal(typeof spec, 'object', 'schemesJson must use the { cmd, timeout } form');
  assert.ok(spec.timeout >= 60_000, `timeout must stay >= 60s, got ${spec.timeout}`);
});

// ── Bug 2 ─────────────────────────────────────────────────────────────────────
// git config user.name "Jovanes Jovanotti" produced "state/Jovanes Jovanotti.md".
test('bug 2: usernames are slugified for filenames', () => {
  assert.equal(slugifyUser('Jovanes Jovanotti'), 'jovanes-jovanotti');
  assert.equal(slugifyUser('ALFIN'), 'alfin');
  assert.equal(slugifyUser('a.b@c'), 'a-b-c');
  assert.equal(slugifyUser(''), 'unknown', 'empty name must not produce an empty filename');
  assert.equal(slugifyUser(null), 'unknown');
  assert.ok(!slugifyUser('Jovanes Jovanotti').includes(' '), 'no spaces in a filename');
});

// ── Bug 3 ─────────────────────────────────────────────────────────────────────
// The staleness check used filesystem mtime, which `git checkout` resets — so
// switching branches silently made a stale state file look fresh.
test('bug 3: staleness is judged on commit dates, not mtime', () => {
  const stateFiles = [{ name: 's.md', rel: 'state/s.md', content: '# s' }];
  const newestCommit = new Date('2026-01-02T00:00:00Z');

  const stale = runChecks(
    baseCtx({
      files: { stateFiles },
      newestCommit,
      stateCommitDates: { 'state/s.md': new Date('2026-01-01T00:00:00Z') }
    })
  );
  const staleCheck = stale
    .find((c) => c.id === 'drift')
    .checks.find((c) => /fresher than the newest/i.test(c.label));
  assert.equal(staleCheck.pass, false, 'a state file behind HEAD must be flagged');

  const fresh = runChecks(
    baseCtx({
      files: { stateFiles },
      newestCommit,
      stateCommitDates: { 'state/s.md': new Date('2026-01-03T00:00:00Z') }
    })
  );
  const freshCheck = fresh
    .find((c) => c.id === 'drift')
    .checks.find((c) => /fresher than the newest/i.test(c.label));
  assert.equal(freshCheck.pass, true, 'a state file at or after HEAD must pass');
});

// ── Bug 4 ─────────────────────────────────────────────────────────────────────
// A rotation half-failed: archive files were written but FEATURES.md kept the
// inline detail. The audit must refuse to go green on that state.
test('bug 4: a closed feature left inline is flagged as unrotated', () => {
  const withDetail = featuresFixture(
    '| t-001 | A | ✅ | tester | — | ok |',
    '### t-001 · A\n\n- **Status:** ✅ done\n'
  );
  const cats = runChecks(baseCtx({ files: { features: withDetail } }));
  const check = cats
    .find((c) => c.id === 'features')
    .checks.find((c) => /rotated to archive/i.test(c.label));
  assert.equal(check.pass, false, 'inline detail on a ✅ feature must fail');
  assert.match(check.detail, /t-001/);

  const rotated = runChecks(baseCtx());
  const ok = rotated
    .find((c) => c.id === 'features')
    .checks.find((c) => /rotated to archive/i.test(c.label));
  assert.equal(ok.pass, true, 'no inline detail on ✅ features must pass');
});

// ── Bug 5 ─────────────────────────────────────────────────────────────────────
// create crashed outright when a toolchain was absent: probes returned null,
// placeholders survived rendering, and assertNoPlaceholders aborted the run.
test('bug 5: generating works when the toolchain is not installed', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hk-bug5-'));
  try {
    // A Flutter project on a machine with no Flutter installed.
    await writeFile(path.join(dir, 'pubspec.yaml'), 'name: fixture\n');
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });

    const out = execFileSync(
      'node',
      [path.join(SCRIPTS, 'create.mjs'), '--target', dir, '--profile', 'standard'],
      { encoding: 'utf8' }
    );
    assert.match(out, /flutter/i, 'should detect the flutter profile');
    assert.match(out, /WRITTEN\s+AGENTS\.md/, 'should write files rather than crash');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ── Bug 6 ─────────────────────────────────────────────────────────────────────
// create generated alongside an existing CLAUDE.md, leaving two competing
// harnesses — the agent followed the old one and never read the new files.
test('bug 6a: an existing CLAUDE.md without the pointer is a conflict', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hk-bug6-'));
  try {
    await writeFile(path.join(dir, 'CLAUDE.md'), '# Old harness\n\nRead progress.md.\n');
    await writeFile(path.join(dir, 'progress.md'), '# history\n');

    const legacy = await detectLegacy(dir);
    assert.ok(legacy.hasLegacy, 'must report the repo as already harnessed');
    assert.ok(legacy.claudeConflict, 'a CLAUDE.md without @AGENTS.md is a conflict');
    assert.ok(
      legacy.found.some((f) => f.file === 'progress.md'),
      'known legacy files must be listed'
    );

    // A pointer-only CLAUDE.md is not a conflict.
    await writeFile(path.join(dir, 'CLAUDE.md'), '@AGENTS.md\n');
    const clean = await detectLegacy(dir);
    assert.equal(clean.claudeConflict, null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('bug 6b: create refuses to write into an already-harnessed repo', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hk-bug6b-'));
  try {
    await writeFile(path.join(dir, 'CLAUDE.md'), '# Old harness\n');
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });

    let code = 0;
    let out = '';
    try {
      out = execFileSync('node', [path.join(SCRIPTS, 'create.mjs'), '--target', dir], {
        encoding: 'utf8'
      });
    } catch (e) {
      code = e.status;
      out = e.stdout ?? '';
    }
    assert.equal(code, 2, 'must exit 2 rather than writing');
    assert.match(out, /refusing to write/i);
    assert.match(out, /migrate/i, 'must point at the migration path');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('bug 6c: the CLAUDE.md wiring check is critical, not ordinary', () => {
  const cats = runChecks(baseCtx({ files: { claude: '# old harness, no pointer' } }));
  const check = cats
    .find((c) => c.id === 'files')
    .checks.find((c) => /points to AGENTS\.md/i.test(c.label));
  assert.equal(check.pass, false);
  assert.equal(
    check.severity,
    'critical',
    'an unreachable harness must not average away against passing checks'
  );
});

test('bug 6d: the iOS deployment target probe searches nested projects', () => {
  const cmd = iosProfile.probe.deploymentTarget;
  assert.match(cmd, /find/, 'must search recursively, not glob the repo root');
  assert.match(cmd, /maxdepth/, 'must bound the search depth');
  assert.ok(
    !/^grep -m1 -o 'IPHONEOS_DEPLOYMENT_TARGET.*\*\.xcodeproj/.test(cmd),
    'must not go back to the root-only glob'
  );
});

// ── Bug 7 ─────────────────────────────────────────────────────────────────────
// AGENTS.md carried a hand-copied "Knowledge graphs" section on one project
// and not another, and the wording drifted between the two copies. Detection
// must be driven by what's actually installed in the target repo, and the
// section must vanish entirely — no dangling heading — when neither tool is.
test('bug 7a: neither graph tool installed produces an empty section', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hk-bug7a-'));
  try {
    const detected = detectKnowledgeGraphs(dir);
    assert.equal(detected.graphify, false);
    assert.equal(detected.codeReviewGraph, false);
    assert.equal(buildKnowledgeGraphsSection(detected, dir, 'standard'), '');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('bug 7b: both graph tools installed are both detected and both documented', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hk-bug7b-'));
  try {
    await mkdir(path.join(dir, 'graphify-out'), { recursive: true });
    await mkdir(path.join(dir, '.git', 'hooks'), { recursive: true });
    await writeFile(
      path.join(dir, '.mcp.json'),
      JSON.stringify({ mcpServers: { 'code-review-graph': { command: 'uvx' } } })
    );
    await writeFile(path.join(dir, '.git', 'hooks', 'pre-commit'), '# Installed by code-review-graph\n');

    const detected = detectKnowledgeGraphs(dir);
    assert.equal(detected.graphify, true);
    assert.equal(detected.codeReviewGraph, true);

    const section = buildKnowledgeGraphsSection(detected, dir, 'standard');
    assert.match(section, /## Knowledge graphs/);
    assert.match(section, /code-review-graph \(MCP tools\)/);
    assert.match(section, /\*\*graphify\*\*/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('bug 7c: create.mjs writes the section into AGENTS.md only when a tool is detected', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hk-bug7c-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });
    await mkdir(path.join(dir, '.code-review-graph'), { recursive: true });

    execFileSync('node', [path.join(SCRIPTS, 'create.mjs'), '--target', dir, '--profile', 'standard'], {
      encoding: 'utf8'
    });

    const agents = await readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    assert.match(agents, /## Knowledge graphs/);
    assert.match(agents, /code-review-graph/);
    assert.doesNotMatch(agents, /\{\{KNOWLEDGE_GRAPHS_SECTION\}\}/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// A project that shipped every epic and rotated it to archive/ has no open epic
// and no rows — the harness working exactly as designed. Scoring that as two
// failures punished correct rotation, and cost this repo the headroom over its
// own CI --min-score gate.
test('bug 8: a fully-shipped FEATURES.md is not scored as a broken one', () => {
  const shippedOnly = `# Features

| Epic | Progress | Active / open |
|------|:--------:|---------------|
| _No open epics — all shipped (see below)._ | | |

---

## Shipped

Completed epics, rotated to \`archive/epics/\`. One line each.

- **harness-kit v1** (\`hk-001..014\`, closed 2026-07-24) — the v1 generator.
- **Workspace mode** (\`ws-001..012\`, closed 2026-07-25) — monorepo roots.
`;
  const features = runChecks(baseCtx({ files: { features: shippedOnly } }))
    .find((c) => c.id === 'features');

  const epic = features.checks.find((c) => /at least one epic/i.test(c.label));
  const rows = features.checks.find((c) => /at least one feature row/i.test(c.label));
  assert.equal(epic.pass, true, 'rotated epics must satisfy the epic check');
  assert.equal(rows.pass, true, 'rotated rows must satisfy the row check');
  assert.match(epic.detail, /2 shipped/);
});

test('bug 8 GUARD: a FEATURES.md with nothing shipped and nothing open still fails', () => {
  // The freshly generated file says "_None yet._" under Shipped — prose, not a
  // bullet. Without that distinction the check would pass for an empty harness.
  const empty = '# Features\n\n## Shipped\n\nCompleted epics.\n\n_None yet._\n';
  const features = runChecks(baseCtx({ files: { features: empty } }))
    .find((c) => c.id === 'features');

  assert.equal(features.checks.find((c) => /at least one epic/i.test(c.label)).pass, false);
  assert.equal(features.checks.find((c) => /at least one feature row/i.test(c.label)).pass, false);
});

// ── Bug 9 ─────────────────────────────────────────────────────────────────────
// The staleness check compared state against the newest commit of ANY kind, so
// a README typo fix, a CI tweak or a version bump marked every state file
// stale. A warning that fires on work that never touched the code is noise, and
// noise is how a real signal gets ignored.
test('bug 9: a prose-only commit does not mark state files stale', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hk-bug9-'));
  const git = (...a) => execFileSync('git', a, { cwd: dir, encoding: 'utf8' });
  // Commit dates are pinned: `git log --format=%cI` has one-second resolution,
  // so three commits in the same tick would compare equal and the assertions
  // would pass or fail on machine speed.
  const commit = (msg, date) => {
    git('add', '-A');
    execFileSync('git', ['commit', '-q', '-m', msg], {
      cwd: dir,
      encoding: 'utf8',
      env: { ...process.env, GIT_AUTHOR_DATE: date, GIT_COMMITTER_DATE: date }
    });
  };
  const staleCheck = () => {
    const out = execFileSync(
      'node',
      [path.join(SCRIPTS, 'audit.mjs'), '--target', dir, '--json'],
      { encoding: 'utf8' }
    );
    return JSON.parse(out)
      .categories.find((c) => c.id === 'drift')
      .checks.find((c) => /fresher than the newest/i.test(c.label));
  };

  try {
    git('init', '-q');
    git('config', 'user.name', 'Test User');
    git('config', 'user.email', 'test@example.com');

    execFileSync('node', [path.join(SCRIPTS, 'create.mjs'), '--target', dir, '--profile', 'standard'], {
      encoding: 'utf8'
    });
    await writeFile(path.join(dir, 'src.js'), 'export const a = 1;\n');
    commit('feat-001: work plus its state update', '2026-01-01T10:00:00');
    assert.equal(staleCheck().pass, true, 'state committed alongside the work is fresh');

    // Prose only — no code touched, so nothing could have gone unrecorded.
    await writeFile(path.join(dir, 'README.md'), '# readme\n\ntypo fixed\n');
    commit('docs: fix a typo', '2026-01-02T10:00:00');
    assert.equal(staleCheck().pass, true, 'a README-only commit must not flag state');

    // Real work with no state update — the signal this check exists for.
    await writeFile(path.join(dir, 'src.js'), 'export const a = 2;\n');
    commit('feat-002: work with no state update', '2026-01-03T10:00:00');
    const stale = staleCheck();
    assert.equal(stale.pass, false, 'unrecorded code work must still be flagged');
    assert.match(stale.detail, /Stale:/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// ── Bug 10 ────────────────────────────────────────────────────────────────────
// The git rules only described work that has a feature ID, so corrective work
// outside an epic had no legal branch name or commit prefix — the PR that fixed
// three audit defects could not follow the rules it shipped under. Every
// generated harness inherited the same gap.
test('bug 10: a generated CONSTITUTION.md gives maintenance work a lane', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hk-bug10-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });

    execFileSync('node', [path.join(SCRIPTS, 'create.mjs'), '--target', dir, '--profile', 'standard'], {
      encoding: 'utf8'
    });

    const c = await readFile(path.join(dir, 'CONSTITUTION.md'), 'utf8');
    assert.match(c, /chore\//, 'must name the maintenance branch lane');
    assert.match(c, /`chore:`/, 'must name the maintenance commit prefix');
    assert.match(
      c,
      /not an escape from tracking/i,
      'the lane must be bounded, or it becomes a way to ship untracked features'
    );
    // The feature-ID rule must survive, conditioned rather than deleted.
    assert.match(c, /prefixed with the feature ID/);
    assert.match(c, /git log --grep/);
    assert.doesNotMatch(c, /\{\{[A-Z_]+\}\}/, 'no placeholder may survive the edit');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('bug 10: a generated workspace root CONSTITUTION.md carries the same lane', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'hk-bug10ws-'));
  try {
    execFileSync('git', ['init', '-q'], { cwd: dir });
    execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });
    await mkdir(path.join(dir, 'api'), { recursive: true });
    await writeFile(path.join(dir, 'api', 'go.mod'), 'module fixture\n');
    await writeFile(
      path.join(dir, 'WORKSPACE.md'),
      '# Workspace\n\n| Area | Path | Stack |\n|------|------|-------|\n| api | ./api | — |\n'
    );

    execFileSync('node', [path.join(SCRIPTS, 'create.mjs'), '--target', dir, '--profile', 'standard'], {
      encoding: 'utf8'
    });

    const c = await readFile(path.join(dir, 'CONSTITUTION.md'), 'utf8');
    assert.match(c, /chore\//);
    assert.match(c, /`chore:`/);
    assert.match(c, /not an escape from tracking/i);
    assert.doesNotMatch(c, /\{\{[A-Z_]+\}\}/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
