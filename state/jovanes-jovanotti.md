# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Implement `wsp-001` — workspace generates `state/` + `archive/` at the root.
- **Active feature:** `wsp-001` — ✅ **done**, closed and rotated.
- **Status:** `wsp-001` implemented on `feature/wsp-001-workspace-state`. Two functions added to
  `workspace-generate.mjs` (`writeState`, `writeArchive`), wired alongside the existing root-doc
  writers. Hoist path checked separately — it already archives a member's old `state/`, so the
  new writer runs after without duplicating it.
- **Last verify:** `./verify.sh test` → 64/64 (was 61), `HARNESS_VERIFY: PASS` (2026-07-27).
  Self-audit: **100/100**.

### Shakedown findings

| # | Defect | Severity |
|---|--------|:--------:|
| 1 | Workspace generation never writes `state/` or `archive/`, though the root `AGENTS.md` startup step 2 and `CONSTITUTION.md` both mandate the state file. Every workspace harness ships at 97/100 with the agent's startup pointing at a file that does not exist. | **high** |
| 2 | Evidence-link check treats a `https://` URL as a filesystem path, so a merged-PR link — the strongest evidence available — scores as a dead link. `checks.mjs:144` | med |
| 3 | Root `verify.sh` is force-rewritten on every `create`, silently discarding user edits. Violates the "never overwrite blindly" invariant in `SKILL.md`. | med |
| 4 | The aggregate `HARNESS_VERIFY: FAIL (workspace build)` line never names the failing area; you must scroll back through member output to find it. | low |
| 5 | `create` at a workspace root writes a full harness **beside a foreign harness**, leaving `CLAUDE.md` pointing at the old one. Single-repo mode refuses here; workspace mode does not. | **high** |
| 6 | Workspace mode ignores `--profile` entirely — `full` yields no `JOURNAL.md` or `evaluator-rubric.md`. | med |

**Why no test caught #1:** the ws-012 guard asserts the generated file set is placeholder-free,
not that the result passes its own audit. A workspace generation that scores 100 would have.

### What worked

Hoist is clean on a real repo with real history — 6 files archived to `archive/legacy/api/`,
nothing deleted, member stopped competing, breadcrumb correct, git history untouched. Stack
re-detection correct on all three real repos (go / web-react / ios-xcode). Regeneration is
idempotent. The root orchestrator propagates a real member failure with a non-zero exit. Real
Go and real Xcode builds both pass through the generated `verify.sh`. Polyrepo (a `.git` per
member) broke nothing observed on these paths, despite being the deferred configuration.

## Next step

Epic **Workspace parity & repo shapes** (`wsp-001..009`) is open in `FEATURES.md`; the model
and the polyrepo policy are written up in `docs/workspace.md` §10 and bound in
`CONSTITUTION.md`. Nothing is coded yet.

`wsp-001` closed. Repro from the shakedown confirmed fixed: 97/100 → 100/100. 3 new tests, all
verified failing before the fix (stashed the source: 3/3 new failed, 30/30 others still passed).

Next: `wsp-002` (workspace honours `--profile` tiers) depends on `wsp-001`, now unblocked.

Twyne is converted and pushed (unrelated prior work): 4 repos → 1, 230 commits, CI green.

Scratch copies and the Twyne backup are deleted; the history has three homes (monorepo local,
`twyne-workspace` remote, and the three original repos, which are left live and unarchived at
the user's choice).

## Parked

- **The audit cannot detect a state file that is fresh but untrue.** Recurred twice on
  2026-07-27, both times at 100/100 — the file claimed work was uncommitted after it had
  merged. Freshness and size are checkable; content accuracy is not. The `JOURNAL.md` entry
  the earlier note called for is now due if it happens a third time, but the honest fix is
  rotation discipline at session end, not another check.

## In flight elsewhere

- None.

## Blockers

- None.

## Changes (this session)

| File | Change | Why |
|------|--------|-----|
| `scripts/lib/workspace-generate.mjs` | Added `writeState` + `writeArchive`, wired into `generateWorkspace` | wsp-001 |
| `tests/workspace.test.mjs` | +3 tests: state written, Done-when audit 100, hoist path unaffected | wsp-001 |
| `FEATURES.md` | `wsp-001` → ✅, progress 1/9, evidence link | Close the row |
| `archive/features/wsp-001.md` | New — full detail, evidence table | Rotation on close |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
