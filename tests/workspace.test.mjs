// Workspace mode (ws-001): WORKSPACE.md is the single source of truth for
// membership. These tests pin the parse + round-trip contract that every later
// workspace feature (detection, verify orchestration, migration) builds on.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile, readFile, mkdir, readdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'skills',
  'harness-kit',
  'scripts'
);

function runCreate(dir, extra = []) {
  return execFileSync(
    'node',
    [path.join(SCRIPTS, 'create.mjs'), '--target', dir, ...extra],
    { encoding: 'utf8' }
  );
}

import {
  isWorkspace,
  readMembers,
  writeMembers,
  resolveArea,
  renderMembers,
  detectMembers,
  refreshStacks
} from '../skills/harness-kit/scripts/lib/workspace.mjs';
import { parseFeatures } from '../skills/harness-kit/scripts/lib/parse.mjs';

const THREE = `# Workspace

| Area | Path | Stack |
|------|------|-------|
| ios | ./ios | ios-xcode |
| backoffice | ./backoffice | web-react |
| backend | ./backend | node-backend |
`;

async function tmp() {
  return mkdtemp(path.join(tmpdir(), 'hk-ws-'));
}

test('isWorkspace is true only when WORKSPACE.md exists', async () => {
  const dir = await tmp();
  try {
    assert.equal(isWorkspace(dir), false);
    await writeFile(path.join(dir, 'WORKSPACE.md'), THREE, 'utf8');
    assert.equal(isWorkspace(dir), true);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('readMembers parses a 3-member table', async () => {
  const dir = await tmp();
  try {
    await writeFile(path.join(dir, 'WORKSPACE.md'), THREE, 'utf8');
    const members = await readMembers(dir);
    assert.deepEqual(members, [
      { area: 'ios', path: './ios', stack: 'ios-xcode' },
      { area: 'backoffice', path: './backoffice', stack: 'web-react' },
      { area: 'backend', path: './backend', stack: 'node-backend' }
    ]);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('readMembers returns [] when there is no WORKSPACE.md', async () => {
  const dir = await tmp();
  try {
    assert.deepEqual(await readMembers(dir), []);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('writeMembers then readMembers round-trips 3 members', async () => {
  const dir = await tmp();
  try {
    const input = [
      { area: 'ios', path: './ios', stack: 'ios-xcode' },
      { area: 'backoffice', path: './backoffice', stack: 'web-react' },
      { area: 'backend', path: './backend', stack: 'node-backend' }
    ];
    await writeMembers(dir, input);
    assert.equal(isWorkspace(dir), true);
    assert.deepEqual(await readMembers(dir), input);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('writeMembers preserves prose above the table and rewrites the body', async () => {
  const dir = await tmp();
  try {
    await writeFile(path.join(dir, 'WORKSPACE.md'), THREE, 'utf8');
    // Add a member; prose header must survive.
    const next = [
      ...(await readMembers(dir)),
      { area: 'worker', path: './worker', stack: 'node-backend' }
    ];
    await writeMembers(dir, next);
    const md = await readFile(path.join(dir, 'WORKSPACE.md'), 'utf8');
    assert.match(md, /^# Workspace/);
    assert.deepEqual(await readMembers(dir), next);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('readMembers skips a duplicate Area (first wins)', async () => {
  const dir = await tmp();
  try {
    const dupe = `# Workspace

| Area | Path | Stack |
|------|------|-------|
| api | ./api-a | node-backend |
| api | ./api-b | node-backend |
`;
    await writeFile(path.join(dir, 'WORKSPACE.md'), dupe, 'utf8');
    const members = await readMembers(dir);
    assert.equal(members.length, 1);
    assert.equal(members[0].path, './api-a');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('resolveArea returns absPath for a known area, null for unknown', async () => {
  const dir = await tmp();
  try {
    await writeFile(path.join(dir, 'WORKSPACE.md'), THREE, 'utf8');
    const backend = await resolveArea(dir, 'backend');
    assert.equal(backend.stack, 'node-backend');
    assert.equal(backend.absPath, path.resolve(dir, './backend'));
    assert.equal(await resolveArea(dir, 'nope'), null);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- ws-002: per-member stack detection -----------------------------------

async function pkg(dir, deps) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: path.basename(dir), dependencies: deps }),
    'utf8'
  );
}

test('detectMembers runs detectStack per member dir', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'backend'), { express: '^4' });
    await pkg(path.join(dir, 'backoffice'), { react: '^18' });
    // Registry ships wrong/placeholder stacks; detection must correct them.
    await writeMembers(dir, [
      { area: 'backend', path: './backend', stack: 'unknown' },
      { area: 'backoffice', path: './backoffice', stack: 'unknown' }
    ]);
    const detected = await detectMembers(dir);
    assert.equal(detected.find((m) => m.area === 'backend').stack, 'node-backend');
    assert.equal(detected.find((m) => m.area === 'backoffice').stack, 'web-react');
    assert.ok(detected.every((m) => m.missing === false));
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('refreshStacks persists detected stacks back into WORKSPACE.md', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'backend'), { fastify: '^4' });
    await writeMembers(dir, [{ area: 'backend', path: './backend', stack: 'tbd' }]);
    await refreshStacks(dir);
    const members = await readMembers(dir);
    assert.equal(members[0].stack, 'node-backend');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('detectMembers flags a missing member dir instead of guessing', async () => {
  const dir = await tmp();
  try {
    await writeMembers(dir, [{ area: 'ghost', path: './ghost', stack: 'web-react' }]);
    const detected = await detectMembers(dir);
    assert.equal(detected[0].missing, true);
    assert.equal(detected[0].stack, 'web-react'); // preserved, not overwritten
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('detectMembers falls back to generic for an undetectable dir', async () => {
  const dir = await tmp();
  try {
    await mkdir(path.join(dir, 'docs'), { recursive: true });
    await writeMembers(dir, [{ area: 'docs', path: './docs', stack: '' }]);
    const detected = await detectMembers(dir);
    assert.equal(detected[0].stack, 'generic');
    assert.equal(detected[0].missing, false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- ws-003: create.mjs mode switch + single-repo regression guard ---------

function initGit(dir) {
  execFileSync('git', ['init', '-q'], { cwd: dir });
  execFileSync('git', ['config', 'user.name', 'Test User'], { cwd: dir });
}

test('ws-003: a WORKSPACE.md sends create into workspace mode', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'backend'), { express: '^4' });
    await pkg(path.join(dir, 'backoffice'), { react: '^18' });
    await writeMembers(dir, [
      { area: 'backend', path: './backend', stack: 'tbd' },
      { area: 'backoffice', path: './backoffice', stack: 'tbd' }
    ]);
    const out = runCreate(dir);
    assert.match(out, /workspace detected/i);
    assert.match(out, /node-backend/);
    assert.match(out, /web-react/);
    // And it persisted the detected stacks.
    const members = await readMembers(dir);
    assert.equal(members.find((m) => m.area === 'backend').stack, 'node-backend');
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-004: writes a root CONSTITUTION.md (shared rules only) + per-area files', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'backend'), { express: '^4' });
    await pkg(path.join(dir, 'backoffice'), { react: '^18' });
    await writeMembers(dir, [
      { area: 'backend', path: './backend', stack: 'tbd' },
      { area: 'backoffice', path: './backoffice', stack: 'tbd' }
    ]);
    runCreate(dir);

    // Root constitution exists and holds shared rules, not stack invariants.
    const root = await readFile(path.join(dir, 'CONSTITUTION.md'), 'utf8');
    assert.match(root, /workspace/i);
    assert.match(root, /Prohibitions — process/);
    assert.match(root, /Never auto-commit/);
    assert.doesNotMatch(root, /Invariants — architecture/); // that's per-area now

    // Per-area constitutions exist and carry that stack's rules.
    const be = await readFile(path.join(dir, 'constitutions', 'backend.md'), 'utf8');
    assert.match(be, /Constitution — backend/);
    assert.match(be, /Invariants — architecture/);
    assert.match(be, /Route → service → repository/); // node-backend architecture
    assert.doesNotMatch(be, /\{\{[A-Za-z0-9_]+\}\}/); // no unresolved tokens

    const bo = await readFile(path.join(dir, 'constitutions', 'backoffice.md'), 'utf8');
    assert.match(bo, /data fetching out of presentational/); // web-react architecture
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-004: a member with an undetectable stack still gets a placeholder-free file', async () => {
  const dir = await tmp();
  try {
    await mkdir(path.join(dir, 'docs'), { recursive: true });
    await writeMembers(dir, [{ area: 'docs', path: './docs', stack: 'tbd' }]);
    runCreate(dir);
    const c = await readFile(path.join(dir, 'constitutions', 'docs.md'), 'utf8');
    assert.doesNotMatch(c, /\{\{[A-Za-z0-9_]+\}\}/); // placeholder-free
    assert.match(c, /Invariants — architecture/); // section present, filled by the generic profile
    assert.doesNotMatch(c, /^\s*##[^\n]*\n\s*\n\s*##/m); // no blank section back-to-back
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-005: writes a root AGENTS.md that routes to the right constitution', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'backend'), { express: '^4' });
    await pkg(path.join(dir, 'backoffice'), { react: '^18' });
    await writeMembers(dir, [
      { area: 'backend', path: './backend', stack: 'tbd' },
      { area: 'backoffice', path: './backoffice', stack: 'tbd' }
    ]);
    runCreate(dir);

    const agents = await readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    // The routing line: read root CONSTITUTION.md + the area's constitution.
    assert.match(agents, /constitutions\/<area>\.md/);
    assert.match(agents, /Session startup/);
    // Members listed so the map shows areas → paths → stacks.
    assert.match(agents, /\*\*backend\*\*.*node-backend/);
    assert.match(agents, /\*\*backoffice\*\*.*web-react/);
    // No unresolved tokens, and hot-file budget respected (≤80 lines).
    assert.doesNotMatch(agents, /\{\{[A-Za-z0-9_]+\}\}/);
    assert.ok(agents.split('\n').length <= 80, 'AGENTS.md must stay ≤80 lines');

    // CLAUDE.md pointer written so an agent loading it is sent to AGENTS.md.
    const claude = await readFile(path.join(dir, 'CLAUDE.md'), 'utf8');
    assert.match(claude, /@AGENTS\.md/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-006: FEATURES.md has an Area column with a cross-area dependency, and parses', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'backend'), { express: '^4' });
    await pkg(path.join(dir, 'backoffice'), { react: '^18' });
    await pkg(path.join(dir, 'mobile'), {}); // undetectable → generic, still a row
    initGit(dir); // so GIT_USER resolves rather than staying 'unknown'
    await writeMembers(dir, [
      { area: 'backend', path: './backend', stack: 'tbd' },
      { area: 'backoffice', path: './backoffice', stack: 'tbd' },
      { area: 'mobile', path: './mobile', stack: 'tbd' }
    ]);
    runCreate(dir);

    const md = await readFile(path.join(dir, 'FEATURES.md'), 'utf8');
    assert.match(md, /\| Area \|/); // the new column exists
    assert.doesNotMatch(md, /\{\{[A-Za-z0-9_]+\}\}/);

    // It must still parse through the project's own FEATURES parser.
    const { allRows } = parseFeatures(md);
    assert.equal(allRows.length, 3, 'one seeded row per member');
    const first = allRows[0];
    const second = allRows[1];
    assert.deepEqual(first.dependsOn, []); // backend row: no dep
    assert.deepEqual(second.dependsOn, [first.id]); // cross-area dep on the first row
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-007: each member dir gets a CLAUDE.md breadcrumb pointing up', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'backend'), { express: '^4' });
    await pkg(path.join(dir, 'backoffice'), { react: '^18' });
    await writeMembers(dir, [
      { area: 'backend', path: './backend', stack: 'tbd' },
      { area: 'backoffice', path: './backoffice', stack: 'tbd' }
    ]);
    runCreate(dir);

    const be = await readFile(path.join(dir, 'backend', 'CLAUDE.md'), 'utf8');
    // @-includes the root map + this member's own constitution.
    assert.match(be, /@\.\.\/AGENTS\.md/);
    assert.match(be, /@\.\.\/constitutions\/backend\.md/);
    // Explicit "don't spawn a competing harness" guidance.
    assert.match(be, /Do NOT create a separate harness/i);
    assert.doesNotMatch(be, /\{\{[A-Za-z0-9_]+\}\}/);

    const bo = await readFile(path.join(dir, 'backoffice', 'CLAUDE.md'), 'utf8');
    assert.match(bo, /@\.\.\/constitutions\/backoffice\.md/);

    // The breadcrumb is the ONLY harness file inside the member (no nested AGENTS/CONSTITUTION).
    assert.equal(existsSync(path.join(dir, 'backend', 'AGENTS.md')), false);
    assert.equal(existsSync(path.join(dir, 'backend', 'CONSTITUTION.md')), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-007: an existing member CLAUDE.md is not clobbered', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'backend'), { express: '^4' });
    await writeFile(path.join(dir, 'backend', 'CLAUDE.md'), '# pre-existing\n', 'utf8');
    await writeMembers(dir, [{ area: 'backend', path: './backend', stack: 'tbd' }]);
    runCreate(dir);
    const be = await readFile(path.join(dir, 'backend', 'CLAUDE.md'), 'utf8');
    assert.match(be, /pre-existing/);
    assert.doesNotMatch(be, /@\.\.\/AGENTS\.md/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- ws-008: verify orchestration ------------------------------------------

async function pkgScripts(dir, scripts, deps = {}) {
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: path.basename(dir), scripts, dependencies: deps }),
    'utf8'
  );
}

function runVerify(dir, args = []) {
  try {
    const stdout = execFileSync(path.join(dir, 'verify.sh'), args, { cwd: dir, encoding: 'utf8' });
    return { code: 0, stdout };
  } catch (e) {
    return { code: e.status, stdout: e.stdout?.toString() ?? '' };
  }
}

test('ws-008: generates per-member verify.sh + a root orchestrator that aggregates PASS', async () => {
  const dir = await tmp();
  try {
    const ok = 'node -e "process.exit(0)"';
    await pkgScripts(path.join(dir, 'api'), { build: ok, test: ok }, { express: '^4' });
    await pkgScripts(path.join(dir, 'web'), { build: ok }, { react: '^18' });
    await writeMembers(dir, [
      { area: 'api', path: './api', stack: 'tbd' },
      { area: 'web', path: './web', stack: 'tbd' }
    ]);
    runCreate(dir);

    // Per-member verify.sh exist and are executable.
    for (const a of ['api', 'web']) {
      const p = path.join(dir, a, 'verify.sh');
      assert.ok(existsSync(p), `${a}/verify.sh should exist`);
    }

    const all = runVerify(dir, ['build']);
    assert.equal(all.code, 0);
    assert.match(all.stdout, /HARNESS_VERIFY: PASS \(workspace build\)/);
    // Each member ran.
    assert.match(all.stdout, /── api ──/);
    assert.match(all.stdout, /── web ──/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-008: ./verify.sh <area> runs only that member', async () => {
  const dir = await tmp();
  try {
    const ok = 'node -e "process.exit(0)"';
    await pkgScripts(path.join(dir, 'api'), { build: ok }, { express: '^4' });
    await pkgScripts(path.join(dir, 'web'), { build: ok }, { react: '^18' });
    await writeMembers(dir, [
      { area: 'api', path: './api', stack: 'tbd' },
      { area: 'web', path: './web', stack: 'tbd' }
    ]);
    runCreate(dir);

    const one = runVerify(dir, ['api', 'build']);
    assert.equal(one.code, 0);
    assert.match(one.stdout, /HARNESS_VERIFY: PASS \(workspace build :api\)/);
    assert.doesNotMatch(one.stdout, /── web ──/); // web was not touched

    const bad = runVerify(dir, ['nope']);
    assert.equal(bad.code, 2);
    assert.match(bad.stdout, /Unknown area: nope/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-008: a failing member makes the workspace aggregate FAIL (non-zero exit)', async () => {
  const dir = await tmp();
  try {
    await pkgScripts(path.join(dir, 'api'), { build: 'node -e "process.exit(0)"' }, { express: '^4' });
    await pkgScripts(path.join(dir, 'web'), { build: 'node -e "process.exit(1)"' }, { react: '^18' });
    await writeMembers(dir, [
      { area: 'api', path: './api', stack: 'tbd' },
      { area: 'web', path: './web', stack: 'tbd' }
    ]);
    runCreate(dir);

    const res = runVerify(dir, ['build']);
    assert.notEqual(res.code, 0, 'aggregate must exit non-zero when a member fails');
    assert.match(res.stdout, /HARNESS_VERIFY: FAIL \(workspace build\)/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- ws-009: hoist-migration -----------------------------------------------

test('ws-009: an in-member harness is hoisted up; member stops competing; nothing deleted', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'api'), { express: '^4' });
    await pkg(path.join(dir, 'web'), { react: '^18' });
    initGit(dir);
    // Give ./api its own single-repo harness first.
    runCreate(path.join(dir, 'api'));
    assert.ok(existsSync(path.join(dir, 'api', 'AGENTS.md')), 'precondition: api has a harness');

    // Now declare the workspace and generate — this should hoist api's harness.
    await writeMembers(dir, [
      { area: 'api', path: './api', stack: 'tbd' },
      { area: 'web', path: './web', stack: 'tbd' }
    ]);
    runCreate(dir);

    // api's rules were promoted to constitutions/api.md...
    assert.ok(existsSync(path.join(dir, 'constitutions', 'api.md')));
    // ...and the member no longer carries a competing map/rules.
    assert.equal(existsSync(path.join(dir, 'api', 'AGENTS.md')), false);
    assert.equal(existsSync(path.join(dir, 'api', 'CONSTITUTION.md')), false);
    // api's CLAUDE.md is now the breadcrumb, not the old pointer-to-self.
    const claude = await readFile(path.join(dir, 'api', 'CLAUDE.md'), 'utf8');
    assert.match(claude, /@\.\.\/AGENTS\.md/);
    assert.match(claude, /Do NOT create a separate harness/i);

    // Nothing deleted: the originals live under archive/legacy/api/.
    for (const f of ['AGENTS.md', 'CONSTITUTION.md', 'FEATURES.md', 'CLAUDE.md']) {
      assert.ok(existsSync(path.join(dir, 'archive', 'legacy', 'api', f)), `${f} archived`);
    }

    // The migrated feature row is in the root FEATURES.md, tagged with its Area.
    const features = await readFile(path.join(dir, 'FEATURES.md'), 'utf8');
    assert.match(features, /Migrated features/);
    const { allRows } = parseFeatures(features);
    assert.ok(allRows.length >= 1);

    // web (no prior harness) was generated fresh, not hoisted.
    assert.ok(existsSync(path.join(dir, 'constitutions', 'web.md')));
    assert.equal(existsSync(path.join(dir, 'archive', 'legacy', 'web')), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-009: with no in-member harness, generation is the normal seeded workspace', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'api'), { express: '^4' });
    await writeMembers(dir, [{ area: 'api', path: './api', stack: 'tbd' }]);
    runCreate(dir);
    // No hoist happened: no archive/legacy, and the seeded example epic is used.
    assert.equal(existsSync(path.join(dir, 'archive', 'legacy')), false);
    const features = await readFile(path.join(dir, 'FEATURES.md'), 'utf8');
    assert.match(features, /First story/);
    assert.doesNotMatch(features, /Migrated features/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- ws-010: add-a-member-later --------------------------------------------

test('ws-010: adding a member generates its files, updates verify, leaves others untouched', async () => {
  const dir = await tmp();
  try {
    const ok = 'node -e "process.exit(0)"';
    await pkgScripts(path.join(dir, 'api'), { build: ok }, { express: '^4' });
    await writeMembers(dir, [{ area: 'api', path: './api', stack: 'tbd' }]);
    runCreate(dir);

    // Snapshot an existing member's generated file — it must not change.
    const apiConstBefore = await readFile(path.join(dir, 'constitutions', 'api.md'), 'utf8');
    const rootVerifyBefore = await readFile(path.join(dir, 'verify.sh'), 'utf8');
    assert.match(rootVerifyBefore, /AREAS=\("api"\)/);

    // Add a second member later.
    await pkgScripts(path.join(dir, 'web'), { build: ok }, { react: '^18' });
    runCreate(dir, ['--add-member', 'web', '--at', './web']);

    // WORKSPACE.md now has both.
    const members = await readMembers(dir);
    assert.deepEqual(members.map((m) => m.area), ['api', 'web']);
    // New member's files exist.
    assert.ok(existsSync(path.join(dir, 'constitutions', 'web.md')));
    assert.ok(existsSync(path.join(dir, 'web', 'verify.sh')));
    assert.ok(existsSync(path.join(dir, 'web', 'CLAUDE.md')));
    // Existing member untouched.
    assert.equal(await readFile(path.join(dir, 'constitutions', 'api.md'), 'utf8'), apiConstBefore);
    // Root verify.sh regenerated to include the new member.
    const rootVerifyAfter = await readFile(path.join(dir, 'verify.sh'), 'utf8');
    assert.match(rootVerifyAfter, /AREAS=\("api" "web"\)/);

    // And both members actually verify.
    const res = runVerify(dir, ['build']);
    assert.equal(res.code, 0);
    assert.match(res.stdout, /HARNESS_VERIFY: PASS \(workspace build\)/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-010: re-adding an existing area is a no-op', async () => {
  const dir = await tmp();
  try {
    await pkg(path.join(dir, 'api'), { express: '^4' });
    await writeMembers(dir, [{ area: 'api', path: './api', stack: 'tbd' }]);
    runCreate(dir);
    const out = runCreate(dir, ['--add-member', 'api', '--at', './somewhere-else']);
    assert.match(out, /already exists/i);
    const members = await readMembers(dir);
    assert.equal(members.length, 1);
    assert.equal(members[0].path, './api'); // original path kept
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-003: --workspace without a WORKSPACE.md refuses with guidance', async () => {
  const dir = await tmp();
  try {
    let code = 0;
    let out = '';
    try {
      out = runCreate(dir, ['--workspace']);
    } catch (e) {
      code = e.status;
      out = e.stdout?.toString() ?? '';
    }
    assert.equal(code, 2, 'should exit non-zero');
    assert.match(out, /no WORKSPACE\.md/i);
    assert.match(out, /never guesses/i);
    assert.equal(existsSync(path.join(dir, 'WORKSPACE.md')), false);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-003 REGRESSION GUARD: no WORKSPACE.md → single-repo path unchanged', async () => {
  const dir = await tmp();
  try {
    // A plain single-repo project, exactly as before workspace mode existed.
    await pkg(dir, { express: '^4' });
    initGit(dir);
    const out = runCreate(dir, ['--profile', 'standard']);

    // Single-repo generation still happens, untouched...
    assert.match(out, /WRITTEN\s+AGENTS\.md/);
    assert.match(out, /node-backend/);
    assert.ok(existsSync(path.join(dir, 'AGENTS.md')));
    assert.ok(existsSync(path.join(dir, 'CONSTITUTION.md')));
    assert.ok(existsSync(path.join(dir, 'verify.sh')));

    // ...and the workspace branch left no trace: no WORKSPACE.md, no workspace output.
    assert.equal(existsSync(path.join(dir, 'WORKSPACE.md')), false);
    assert.doesNotMatch(out, /workspace detected/i);

    // AGENTS.md content is placeholder-free, as the existing suite guarantees.
    const agents = await readFile(path.join(dir, 'AGENTS.md'), 'utf8');
    assert.doesNotMatch(agents, /\{\{[A-Za-z0-9_]+\}\}/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

// --- ws-012: holistic regression guards ------------------------------------

// Recursively collect files under a dir, skipping the member-supplied fixtures
// so we only scan harness-generated output.
async function walk(dir, base = dir, acc = []) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(p, base, acc);
    else acc.push(path.relative(base, p));
  }
  return acc;
}

test('ws-012 GUARD: a full workspace generates the complete file set, placeholder-free', async () => {
  const dir = await tmp();
  try {
    const ok = 'node -e "process.exit(0)"';
    await pkgScripts(path.join(dir, 'api'), { build: ok }, { express: '^4' });
    await pkgScripts(path.join(dir, 'web'), { build: ok }, { react: '^18' });
    await writeMembers(dir, [
      { area: 'api', path: './api', stack: 'tbd' },
      { area: 'web', path: './web', stack: 'tbd' }
    ]);
    runCreate(dir);

    // Every expected root + per-member file exists.
    const expected = [
      'WORKSPACE.md', 'AGENTS.md', 'CLAUDE.md', 'CONSTITUTION.md', 'FEATURES.md', 'verify.sh',
      'constitutions/api.md', 'constitutions/web.md',
      'api/CLAUDE.md', 'api/verify.sh', 'web/CLAUDE.md', 'web/verify.sh'
    ];
    for (const f of expected) assert.ok(existsSync(path.join(dir, f)), `missing ${f}`);

    // No generated .md/.sh anywhere contains an unresolved placeholder.
    for (const rel of await walk(dir)) {
      if (rel.includes('node_modules') || rel.endsWith('package.json')) continue;
      if (rel.endsWith('.md') || rel.endsWith('.sh')) {
        const body = await readFile(path.join(dir, rel), 'utf8');
        assert.doesNotMatch(body, /\{\{[A-Za-z0-9_]+\}\}/, `placeholder left in ${rel}`);
      }
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('ws-012 GUARD: single-repo generation produces no workspace artifacts', async () => {
  const dir = await tmp();
  try {
    await pkg(dir, { express: '^4' });
    initGit(dir);
    runCreate(dir, ['--profile', 'standard']);

    // The standard single-repo set is present...
    for (const f of ['AGENTS.md', 'CLAUDE.md', 'CONSTITUTION.md', 'FEATURES.md', 'verify.sh']) {
      assert.ok(existsSync(path.join(dir, f)), `missing ${f}`);
    }
    // ...and none of the workspace-only artifacts leaked in.
    assert.equal(existsSync(path.join(dir, 'WORKSPACE.md')), false);
    assert.equal(existsSync(path.join(dir, 'constitutions')), false);
    // The single-repo verify.sh is the stack template, not the workspace orchestrator.
    const verify = await readFile(path.join(dir, 'verify.sh'), 'utf8');
    assert.doesNotMatch(verify, /workspace verify orchestrator/i);
    assert.doesNotMatch(verify, /AREAS=\(/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test('renderMembers ignores the template placeholder when read back', async () => {
  const dir = await tmp();
  try {
    // The raw template ships a {{MEMBER_ROWS}} placeholder, not a real row.
    const withPlaceholder = `# Workspace

| Area | Path | Stack |
|------|------|-------|
{{MEMBER_ROWS}}
`;
    await writeFile(path.join(dir, 'WORKSPACE.md'), withPlaceholder, 'utf8');
    // Placeholder line has no '|' so it is not a table row; members are empty.
    assert.deepEqual(await readMembers(dir), []);
    // Sanity: renderMembers produces pipe-delimited rows.
    assert.equal(
      renderMembers([{ area: 'ios', path: './ios', stack: 'ios-xcode' }]),
      '| ios | ./ios | ios-xcode |'
    );
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
