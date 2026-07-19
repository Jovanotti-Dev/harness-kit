// One test per bug found in the wild. Each names the bug it pins.
// If one of these fails, a fix that was already shipped has been undone.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runProbes, slugifyUser } from '../skills/harness-kit/scripts/lib/probe.mjs';
import { runChecks } from '../skills/harness-kit/scripts/lib/checks.mjs';
import { detectLegacy } from '../skills/harness-kit/scripts/lib/legacy.mjs';
import iosProfile from '../skills/harness-kit/profiles/ios-xcode.mjs';

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
    .checks.find((c) => /fresher than the newest commit/i.test(c.label));
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
    .checks.find((c) => /fresher than the newest commit/i.test(c.label));
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
