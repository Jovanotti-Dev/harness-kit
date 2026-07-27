# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Real-world shakedown of workspace mode — **done, 4 defects found.**
- **Active feature:** none yet — the findings need an epic (past one session by definition).
- **Status:** Ran against a copy of the real Twyne workspace (ios + backoffice + backend, real
  git history, member `.git` each) and a synthetic clean workspace. No real repo was modified.
- **Last verify:** `./verify.sh test` → 61/61, `HARNESS_VERIFY: PASS` (2026-07-27).
  Self-audit: **100/100**. `main` clean at `1aa2988`.

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

Epic **Workspace parity & repo shapes** (`wsp-001..008`) is open in `FEATURES.md`; the model
and the polyrepo policy are written up in `docs/workspace.md` §10 and bound in
`CONSTITUTION.md`. Nothing is coded yet.

Decision settled: **monorepo** for multi-project folders; `references/polyrepo-convert.md` is
the written plan, `git subtree` the default route (preserves SHAs, so push-back to member
remotes stays a fast-forward).

Start with `wsp-001` (workspace writes `state/` + `archive/`) — it is the one that ships broken
to every workspace user, and its Done-when guard (a generated workspace must score 100 on its
own audit) is what would have caught the whole class. `wsp-005` now has its procedure written;
only the detect-and-print code is missing.

Twyne itself is **not** converted — that is the user's call to make and run.

Scratch reproductions are in this session's scratchpad (`shakedown/polyrepo`, `/clean`,
`/hoist`); they are disposable, and every one is a copy — no real project was touched.

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
| `state/jovanes-jovanotti.md` | Recorded the shakedown result and its findings | Shakedown |
| `docs/workspace.md` | §10 — four repo shapes, parity rule, polyrepo policy, migration matrix | Model was undefined |
| `CONSTITUTION.md` | 3 dated decisions: parity, polyrepo refusal + never touch `.git`, foreign-harness guard | Make it binding |
| `FEATURES.md` | New epic `wsp-001..008` + mode matrix | Findings need tracked rows |
| `references/polyrepo-convert.md` | New — the conversion plan `wsp-004` prints | Policy needed a procedure |
| `SKILL.md` | Workspace row links the new reference; polyrepo/`.git` invariant added | Make the rule reachable |
| `docs/workspace.md` | §10.4 points at the reference; §10.5 adds workspace-level migrate | One home for the procedure |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
