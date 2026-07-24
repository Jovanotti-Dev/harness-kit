import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';

import { parseFeatures, STATUS } from './parse.mjs';
import { writeOut } from './render.mjs';

// A member "has a harness" when it carries the two files that define one — an
// AGENTS.md (the map) or a CONSTITUTION.md (the rules). That is the case the
// blanket legacy-refusal in create.mjs would otherwise trip on; here it becomes
// something to promote up to the workspace root rather than refuse.
export function memberHasHarness(root, member) {
  const dir = path.join(root, member.path);
  return existsSync(path.join(dir, 'AGENTS.md')) || existsSync(path.join(dir, 'CONSTITUTION.md'));
}

export function detectMemberHarnesses(root, members) {
  return members.filter((m) => !m.missing && memberHasHarness(root, m));
}

function symbolFor(status) {
  // parseFeatures stores the emoji key; fall back to "not started".
  return Object.keys(STATUS).includes(status) ? status : '🟡';
}

// Re-emit a parsed feature row with the Area column inserted, for the root
// FEATURES.md. Dependencies and evidence are preserved verbatim.
export function featureRowLine(row, area) {
  const deps = row.dependsOn?.length ? row.dependsOn.join(', ') : '—';
  const by = row.by && row.by !== '—' ? row.by : '—';
  const evidence = row.evidence && row.evidence !== '—' ? row.evidence : '—';
  return `| ${row.id} | ${row.name} | ${area} | ${symbolFor(row.status)} | ${by} | ${deps} | ${evidence} |`;
}

// Move a file into archive/legacy/<area>/ — a true move (content preserved in
// the archive, original location cleared) so the member stops looking like it
// still owns a competing harness. Honors the never-delete invariant.
async function archiveMove(root, area, name, absSrc, { dryRun }) {
  const rel = path.join('archive', 'legacy', area, name);
  if (dryRun) return { path: rel, status: 'would-write', reason: 'archive' };
  const dest = path.join(root, rel);
  await mkdir(path.dirname(dest), { recursive: true });
  await rename(absSrc, dest);
  return { path: rel, status: 'archived', reason: `from ${area}/${name}` };
}

// Promote each in-member harness up to the workspace root:
//   member CONSTITUTION.md  -> constitutions/<area>.md   (its rules become the area's)
//   member FEATURES.md rows -> returned, Area-tagged, for the root FEATURES.md
//   member AGENTS.md        -> archive/legacy/<area>/     (root gets a fresh shared map)
//   member CLAUDE.md        -> archive/legacy/<area>/, replaced by the breadcrumb
//   member verify.sh        -> left in place (it already lives at <area>/verify.sh)
// Nothing is deleted; everything moved lands under archive/legacy/. Returns the
// collected Area-tagged rows and the list of file operations.
export async function hoistMembers(root, members, opts = {}) {
  const { dryRun = false } = opts;
  const rows = [];
  const results = [];

  for (const m of detectMemberHarnesses(root, members)) {
    const dir = path.join(root, m.path);

    // Rules → constitutions/<area>.md, original archived.
    const constitution = path.join(dir, 'CONSTITUTION.md');
    if (existsSync(constitution)) {
      const body = await readFile(constitution, 'utf8');
      results.push(await writeOut(root, path.join('constitutions', `${m.area}.md`), body, opts));
      results.push(await archiveMove(root, m.area, 'CONSTITUTION.md', constitution, { dryRun }));
    }

    // Feature rows → collected for the root FEATURES.md, original archived.
    const features = path.join(dir, 'FEATURES.md');
    if (existsSync(features)) {
      const { allRows } = parseFeatures(await readFile(features, 'utf8'));
      for (const r of allRows) rows.push(featureRowLine(r, m.area));
      results.push(await archiveMove(root, m.area, 'FEATURES.md', features, { dryRun }));
    }

    // The map → archived; the workspace root will generate the shared one.
    const agents = path.join(dir, 'AGENTS.md');
    if (existsSync(agents)) {
      results.push(await archiveMove(root, m.area, 'AGENTS.md', agents, { dryRun }));
    }

    // Any state files the member kept → archived (state lives at the root now).
    const stateDir = path.join(dir, 'state');
    if (existsSync(stateDir)) {
      results.push(await archiveMove(root, m.area, 'state', stateDir, { dryRun }));
    }

    // The member CLAUDE.md is archived and replaced with the workspace
    // breadcrumb — done here (forced) because breadcrumb generation otherwise
    // skips an existing file.
    const claude = path.join(dir, 'CLAUDE.md');
    if (existsSync(claude)) {
      results.push(await archiveMove(root, m.area, 'CLAUDE.md', claude, { dryRun }));
    }
  }

  return { rows, results };
}
