import { rename, cp, mkdir } from 'node:fs/promises';
import path from 'node:path';

import { detectMemberGitRoots } from './workspace.mjs';
import { runProbe, runGit } from './probe.mjs';

// wsp-009: the sanctioned way through the wsp-005 refusal, for a user who
// *asked* to build a monorepo rather than one who stumbled onto a polyrepo.
// The safety line is destructive vs. additive (CONSTITUTION.md, 2026-07-27):
//
//   `git subtree add` reads the member's .git and writes only to the root —
//   additive, so a tool may run it. Deleting the member's .git afterwards is
//   destructive and irreversible, so a tool may not.
//
// Every candidate's original directory (with its .git intact) is MOVED to
// `.adopt-staging/<area>/` — never deleted. Moving is reversible (mv it
// back); only the user, having reviewed the result, removes it for good.
export const STAGING_DIR = '.adopt-staging';

// Candidates are exactly wsp-005's polyrepo members — reused rather than
// redetected, so "what would be refused" and "what --adopt operates on" can
// never drift apart.
export async function detectAdoptable(root, members) {
  return detectMemberGitRoots(root, members);
}

function stagedPath(root, area) {
  return path.join(root, STAGING_DIR, area);
}

// One candidate, one attempt. Throws on the first git failure — the caller
// stops the whole run there rather than adopting some members and silently
// skipping others, which would leave WORKSPACE.md half-converted.
async function adoptOne(root, candidate, { noHistory, dryRun }) {
  const { area, path: relPath } = candidate;
  const abs = path.resolve(root, relPath);
  const staged = stagedPath(root, area);
  const prefix = relPath.replace(/^\.\//, '');

  const branch = runProbe('git branch --show-current', abs, 5000) ?? 'main';
  const commitCount = runProbe('git rev-list --count HEAD', abs, 5000) ?? 'unknown';

  if (dryRun) {
    return { area, path: relPath, branch, commitCount, historyKept: !noHistory, dryRun: true };
  }

  // Move first — abs is now empty, staged holds the original .git intact.
  // If anything below throws, the recovery is one command: move it back.
  // rename() does not create parent directories — .adopt-staging/ itself
  // won't exist yet on the first adoption of the run.
  await mkdir(path.dirname(staged), { recursive: true });
  await rename(abs, staged);

  if (noHistory) {
    // The user's explicit choice to drop history. Copy everything except
    // .git — no subtree, no commit, just files, exactly as asked.
    await cp(staged, abs, {
      recursive: true,
      filter: (src) => path.basename(src) !== '.git'
    });
  } else {
    // The one place harness-kit creates a commit on the user's behalf. It is
    // intrinsic to how `git subtree add` works — there is no way to merge a
    // tree's history into another repo without a merge commit recording it.
    // Scoped narrowly: only this operation, only under --adopt, only when
    // the user explicitly named a project to bring in with history. See the
    // CONSTITUTION.md amendment (2026-07-27) carving this out from
    // "never auto-commit", which otherwise governs harness files, not this.
    runGit(
      ['subtree', 'add', '--prefix', prefix, staged, branch, '-m', `Adopt ${area} into the monorepo (wsp-009)`],
      root,
      120_000
    );
  }

  return { area, path: relPath, branch, commitCount, historyKept: !noHistory, staged };
}

// Adopts every candidate in order, stopping at the first failure. Returns
// { ok, results, failed } — results holds every attempt up to and including
// a failure, so the caller can report exactly how far it got.
export async function adoptMembers(root, candidates, opts = {}) {
  const { noHistory = false, dryRun = false } = opts;
  const results = [];
  for (const candidate of candidates) {
    try {
      results.push(await adoptOne(root, candidate, { noHistory, dryRun }));
    } catch (err) {
      results.push({
        area: candidate.area,
        path: candidate.path,
        error: err.message ?? String(err),
        staged: stagedPath(root, candidate.area)
      });
      return { ok: false, results };
    }
  }
  return { ok: true, results };
}
