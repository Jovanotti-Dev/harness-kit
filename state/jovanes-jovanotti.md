# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Implement `wsp-007` — root `verify.sh` stops clobbering user edits.
- **Active feature:** `wsp-007` — ✅ **done**, closed and rotated.
- **Status:** `wsp-007` implemented on `feature/wsp-007-verify-no-clobber`. The root
  `verify.sh` write was hardcoded `force: true` — deliberate, to make `--add-member` (`ws-010`)
  regenerate the orchestrator, but it clobbered hand-edits on every plain re-run too. Captured
  whether `--add-member` actually changed membership this run (`memberAdded`) and force only on
  that or explicit `--force`. Confirmed `ws-010`'s two existing tests still pass unaffected.
- **Last verify:** `./verify.sh test` → 76/76 (was 74), `HARNESS_VERIFY: PASS` (2026-07-27).
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

Epic **Workspace parity & repo shapes** (`wsp-001..009`) is `7/9` — `wsp-001` through `wsp-007`
shipped and merged (#11-#16, and this one).

`wsp-007` closed. 2 new tests, confirmed non-decorative (stashed the source: the plain-re-run
test failed, the `--force` test passed either way since that path was never broken).

Next: `wsp-008` (workspace verify aggregate names the failing area(s)) — no dependency, ready to
start. Last row before `wsp-009` (interactive adopt), which is the largest remaining piece.

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
| `scripts/lib/workspace-generate.mjs` | Capture `memberAdded`; force the root `verify.sh` only on that or explicit `--force` | wsp-007 |
| `tests/workspace.test.mjs` | +2 tests: hand-edit survives a plain re-run, `--force` still overrides | wsp-007 |
| `FEATURES.md` | `wsp-007` → ✅, progress 7/9, evidence link | Close the row |
| `archive/features/wsp-007.md` | New — full detail, evidence table | Rotation on close |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
