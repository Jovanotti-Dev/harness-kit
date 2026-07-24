import path from 'node:path';

import {
  isWorkspace,
  refreshStacks,
  detectMembers,
  addMember,
  WORKSPACE_FILE
} from './workspace.mjs';
import { loadProfiles } from './detect.mjs';
import { buildProbeValues, gitUser } from './probe.mjs';
import { hoistMembers } from './hoist.mjs';
import {
  render,
  readTemplate,
  writeOut,
  assertNoPlaceholders,
  buildVerifyBlocks
} from './render.mjs';

// Empty stack rules (an undetectable member, or the generic profile) still need
// a non-blank section so the file reads as intentional rather than broken.
function orTodo(text, label) {
  const t = (text ?? '').trim();
  return t.length ? t : `- TODO: add ${label} rules for this stack.`;
}

function areaConstitutionValues(area, profile, probeValues) {
  const platform = [
    render(profile.constitution?.platform ?? '', probeValues),
    ...(profile.pitfalls ?? []).map((p) => `- ${p}`)
  ]
    .filter(Boolean)
    .join('\n');

  return {
    AREA_NAME: area.area,
    AREA_PATH: area.path,
    TECH_STACK: render(profile.defaults?.techStack ?? profile.name, probeValues),
    ARCHITECTURE_INVARIANTS: orTodo(
      render(profile.constitution?.architecture ?? '', probeValues),
      'architecture'
    ),
    PLATFORM_INVARIANTS: orTodo(platform, 'platform'),
    CODE_PROHIBITIONS: orTodo(
      render(profile.constitution?.code ?? '', probeValues),
      'code'
    )
  };
}

// A short bullet list of the members, for the AGENTS.md "Members" section.
function areaList(members) {
  if (!members.length) return '_No members yet — add rows to WORKSPACE.md._';
  return members
    .map((m) => `- **${m.area}** → \`${m.path}\` (${m.stack})`)
    .join('\n');
}

const ID_PREFIX = 'story-';

// Seed one example feature row per member area (ws-006): the Area column shows
// which member each row touches, and the non-first rows depend on the first to
// demonstrate a cross-area dependency. The user replaces these with real scope.
function seedFeatureRows(members) {
  if (!members.length) {
    return `| ${ID_PREFIX}001 | Describe the first feature | — | 🟡 | — | — | — |`;
  }
  const firstId = `${ID_PREFIX}001`;
  return members
    .map((m, i) => {
      const id = `${ID_PREFIX}${String(i + 1).padStart(3, '0')}`;
      const dependsOn = i === 0 ? '—' : firstId;
      return `| ${id} | Describe the ${m.area} task | ${m.area} | 🟡 | — | ${dependsOn} | — |`;
    })
    .join('\n');
}

// Write the shared root map: AGENTS.md (ws-005) with the constitution-routing
// startup step and members list, the CLAUDE.md pointer, and an Area-tagged
// FEATURES.md (ws-006) seeded with an example cross-area story. Per-area verify
// commands referenced in AGENTS.md are wired up by ws-008.
async function writeRootDocs(root, members, hoistedRows, opts) {
  const results = [];

  const agentsRaw = await readTemplate('AGENTS-root.md.template');
  const agentsOut = render(agentsRaw, {
    PROJECT_NAME: path.basename(root),
    PROJECT_DESCRIPTION: 'TODO: one line describing what this workspace is.',
    WORKSPACE_AREAS: areaList(members),
    VERIFY_PRIMARY: './verify.sh'
  });
  assertNoPlaceholders(agentsOut, 'AGENTS.md');
  results.push(await writeOut(root, 'AGENTS.md', agentsOut, opts));

  const claudeRaw = await readTemplate('CLAUDE.md.template');
  results.push(await writeOut(root, 'CLAUDE.md', claudeRaw, opts));

  // A hoist-migration carries real feature rows up from the member harnesses;
  // otherwise seed one example row per area.
  const rows = hoistedRows.length ? hoistedRows.join('\n') : seedFeatureRows(members);
  const count = hoistedRows.length || members.length || 1;
  const featuresRaw = await readTemplate('FEATURES-root.md.template');
  const featuresOut = render(featuresRaw, {
    EPIC_NAME: hoistedRows.length ? 'Migrated features' : 'First story',
    FEATURE_COUNT: String(count),
    PRD_PATH: '_none yet_',
    ID_PREFIX,
    TODAY: new Date().toISOString().slice(0, 10),
    GIT_USER: gitUser(root) ?? 'unknown',
    FEATURE_ROWS: rows
  });
  assertNoPlaceholders(featuresOut, 'FEATURES.md');
  results.push(await writeOut(root, 'FEATURES.md', featuresOut, opts));

  return results;
}

// Write a breadcrumb CLAUDE.md inside each member dir (ws-007). Without it, an
// agent opened *inside* a member sees no harness and may spawn a competing one;
// the breadcrumb @-includes the root map + that member's constitution and says
// explicitly not to. Existing member CLAUDE.md is left untouched (no clobber).
async function writeBreadcrumbs(root, members, opts) {
  const raw = await readTemplate('member-pointer.md.template');
  const results = [];
  for (const m of members) {
    const rel = path.join(m.path, 'CLAUDE.md');
    if (m.missing) {
      results.push({ path: rel, status: 'skipped', reason: 'path not found' });
      continue;
    }
    const out = render(raw, { AREA_NAME: m.area });
    assertNoPlaceholders(out, rel);
    results.push(await writeOut(root, rel, out, opts));
  }
  return results;
}

// Bash array literal from a list of strings: ("a" "b" "c").
function bashArray(items) {
  return items.map((s) => `"${s}"`).join(' ');
}

// Write verify orchestration (ws-008): a real stack-native verify.sh inside each
// member dir (reusing the single-repo verify generator) plus a root verify.sh
// that dispatches `./verify.sh [area] [mode]` across members and prints one
// aggregate HARNESS_VERIFY line. Only members with an existing dir get a
// verify.sh and a slot in the root orchestrator.
async function writeVerify(root, members, profiles, opts) {
  const results = [];
  const present = members.filter((m) => !m.missing);

  const memberRaw = await readTemplate('verify.sh.template');
  for (const m of present) {
    const profile = profiles.find((p) => p.id === m.stack) ?? profiles.find((p) => p.id === 'generic');
    const { probeValues, scripts } = buildProbeValues(profile, path.resolve(root, m.path));
    const blocks = buildVerifyBlocks(profile, probeValues, scripts);
    const out = render(memberRaw, {
      PROJECT_NAME: m.area,
      BUILD_BLOCK: blocks.build,
      TEST_BLOCK: blocks.test,
      LINT_BLOCK: blocks.lint
    });
    assertNoPlaceholders(out, `${m.path}/verify.sh`);
    results.push(await writeOut(root, path.join(m.path, 'verify.sh'), out, opts));
  }

  const rootRaw = await readTemplate('verify-root.sh.template');
  const rootOut = render(rootRaw, {
    PROJECT_NAME: path.basename(root),
    MEMBER_AREAS: bashArray(present.map((m) => m.area)),
    MEMBER_PATHS: bashArray(present.map((m) => m.path))
  });
  assertNoPlaceholders(rootOut, 'verify.sh');
  // The root orchestrator is 100% derived from WORKSPACE.md — no user content
  // lives in it — so it is always regenerated. This is what makes adding a
  // member later (ws-010) show up in verify without a stale hand-edit; a new
  // member that is missing here would be silently unverified.
  results.push(await writeOut(root, 'verify.sh', rootOut, { ...opts, force: true }));

  // Members we could not generate verify for, reported for visibility.
  for (const m of members.filter((x) => x.missing)) {
    results.push({ path: `${m.path}/verify.sh`, status: 'skipped', reason: 'path not found' });
  }

  return results;
}

// Write the split constitutions (ws-004): one shared root CONSTITUTION.md
// (process / git / decisions) plus one constitutions/<area>.md per member,
// carrying that stack's architecture / platform / code rules. Returns the
// writeOut results so the caller can report them.
async function writeConstitutions(root, members, profiles, opts) {
  const results = [];

  // Root constitution — shared rules only. Branch/prefix defaults come from the
  // first member that declares them, else conventional defaults.
  const withDefaults = members
    .map((m) => profiles.find((p) => p.id === m.stack)?.defaults)
    .find((d) => d?.baseBranch);
  const rootRaw = await readTemplate('constitution-root.md.template');
  const rootOut = render(rootRaw, {
    PROJECT_NAME: path.basename(root),
    BASE_BRANCH: withDefaults?.baseBranch ?? 'main',
    BRANCH_PATTERN: withDefaults?.branchPattern ?? 'feature/<topic>',
    FEATURE_ID_EXAMPLE: withDefaults?.featureIdExample ?? 'feat-001'
  });
  assertNoPlaceholders(rootOut, 'CONSTITUTION.md');
  results.push(await writeOut(root, 'CONSTITUTION.md', rootOut, opts));

  // Per-area constitutions.
  const areaRaw = await readTemplate('constitution-area.md.template');
  for (const m of members) {
    if (m.missing) {
      results.push({ path: `constitutions/${m.area}.md`, status: 'skipped', reason: 'path not found' });
      continue;
    }
    const profile = profiles.find((p) => p.id === m.stack) ?? profiles.find((p) => p.id === 'generic');
    const { probeValues } = buildProbeValues(profile, path.resolve(root, m.path));
    const out = render(areaRaw, areaConstitutionValues(m, profile, probeValues));
    assertNoPlaceholders(out, `constitutions/${m.area}.md`);
    results.push(await writeOut(root, path.join('constitutions', `${m.area}.md`), out, opts));
  }

  return results;
}

// Workspace generation entry point. ws-003 added the mode switch; ws-004 makes
// it write the split constitutions. Shared AGENTS.md, the Area-tagged
// FEATURES.md, member breadcrumbs and the orchestrating verify.sh are later
// features (ws-005..ws-008).
export async function generateWorkspace(root, opts = {}) {
  const { dryRun = false, force = false, addMember: toAdd = null } = opts;

  // Add-a-member-later (ws-010): append the row before anything else, so the
  // rest of generation (detection, per-member files, the verify orchestrator)
  // naturally picks it up. Existing members are untouched (skip-existing).
  if (toAdd && isWorkspace(root) && !dryRun) {
    const { added } = await addMember(root, toAdd.area, toAdd.path);
    console.log(
      added
        ? `  added member: ${toAdd.area} → ${toAdd.path}`
        : `  member ${toAdd.area} already exists — leaving WORKSPACE.md unchanged`
    );
  }

  if (!isWorkspace(root)) {
    console.log(`harness-kit — workspace mode requested but no ${WORKSPACE_FILE} in ${root}\n`);
    console.log(`  Create a ${WORKSPACE_FILE} listing the member repos first (Area · Path · Stack),`);
    console.log('  then re-run. Membership is explicit — harness-kit never guesses which');
    console.log('  sub-directories are members.');
    return { mode: 'workspace', ok: false, members: [], results: [] };
  }

  // In dry-run we detect but do not persist the stack column.
  const members = dryRun ? await detectMembers(root) : await refreshStacks(root);
  const profiles = await loadProfiles();

  console.log(`harness-kit — workspace ${dryRun ? 'dry run' : 'detected'} in ${root}`);
  console.log(`  members: ${members.length}\n`);
  for (const m of members) {
    const note = m.missing ? '  ! path not found' : '';
    console.log(`  ${m.area.padEnd(12)} ${m.path.padEnd(20)} ${m.stack}${note}`);
  }

  // Hoist any harness that lives inside a member dir up to the root first, so
  // its rules/features are preserved before the shared files are generated.
  const hoist = await hoistMembers(root, members, { force, dryRun });
  if (hoist.results.length) {
    console.log(`\n  hoisted ${hoist.results.length} file(s) from in-member harness(es) → archive/legacy/ + root`);
  }

  const results = [
    ...hoist.results,
    ...(await writeRootDocs(root, members, hoist.rows, { force, dryRun })),
    ...(await writeConstitutions(root, members, profiles, { force, dryRun })),
    ...(await writeBreadcrumbs(root, members, { force, dryRun })),
    ...(await writeVerify(root, members, profiles, { force, dryRun }))
  ];

  console.log('');
  for (const r of results) {
    console.log(`  ${r.status.toUpperCase().padEnd(11)} ${r.path}${r.reason ? ` (${r.reason})` : ''}`);
  }

  const missing = members.filter((m) => m.missing);
  if (missing.length) {
    console.log(`\n  ! ${missing.length} member path(s) not found — fix ${WORKSPACE_FILE} or create the dir(s).`);
  }

  console.log('\n  Run ./verify.sh (all members) or ./verify.sh <area> to verify one member.');

  return { mode: 'workspace', ok: missing.length === 0, members, results };
}
