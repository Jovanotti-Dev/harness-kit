# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Implement `wsp-005` — polyrepo detected → refuse + print conversion plan.
- **Active feature:** `wsp-005` — ✅ **done**, closed and rotated.
- **Status:** `wsp-005` implemented on `feature/wsp-005-polyrepo-refuse`. New
  `detectMemberGitRoots` (detection only, never touches `.git`) wired into `generateWorkspace`
  right before any writer runs. Found and fixed a real bug while building it: the `wsp-001`
  hoist test's fixture accidentally created a polyrepo (`initGit(memberDir)`), which this row
  now correctly refuses — fixed to match `ws-009`'s pattern (git at the root only).
- **Last verify:** `./verify.sh test` → 72/72 (was 70), `HARNESS_VERIFY: PASS` (2026-07-27).
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

Epic **Workspace parity & repo shapes** (`wsp-001..009`) is `5/9` — `wsp-001` through `wsp-005`
shipped and merged (#11, #12, #13, #14, and this one).

`wsp-005` closed. No `--migrate`-style escape here, deliberately — converting polyrepo is git
surgery (subtree, retiring remotes), not content classification, and stays the user's call.
2 new tests, confirmed non-decorative (stashed both source files: the refusal test failed, the
real-monorepo regression guard still passed).

Next: `wsp-006` (evidence-link check accepts URLs) — no dependency, ready to start. Unlike the
last three rows this is a plain bug fix in `checks.mjs`, no workspace-mode interaction.

Twyne remains converted and pushed (unrelated prior work): 4 repos → 1, 230 commits, CI green.

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
| `scripts/lib/workspace.mjs` | New `detectMemberGitRoots` — detection only, never touches `.git` | wsp-005 |
| `scripts/lib/workspace-generate.mjs` | Wired the refusal in before any writer runs | wsp-005 |
| `tests/workspace.test.mjs` | +2 tests: refuses + names member/remote/plan, real-monorepo regression guard; fixed `wsp-001`'s test fixture (accidental polyrepo) | wsp-005 |
| `FEATURES.md` | `wsp-005` → ✅, progress 5/9, evidence link | Close the row |
| `archive/features/wsp-005.md` | New — full detail, evidence table, the fixture bug found along the way | Rotation on close |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
