# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Implement `wsp-009` — interactive adopt. **Epic complete: 9/9.**
- **Active feature:** none — no open epic in `FEATURES.md`.
- **Status:** `wsp-009` implemented on `feature/wsp-009-interactive-adopt`. New `--adopt` /
  `--no-history` flags run `git subtree add` per polyrepo member (`wsp-005`'s exact
  candidates), staging originals at `.adopt-staging/<area>/` — never deleted. Stops at the
  first failure. New lib `scripts/lib/adopt.mjs`, new `runGit` (non-swallowing, unlike
  `runProbe`) in `probe.mjs`.
  Two real bugs found only by running the actual CLI end-to-end, neither caught by unit tests:
  `.adopt-staging/` didn't exist on first use (`fs.rename` needs the parent dir made first),
  and `git subtree add` needs a clean working tree — `refreshStacks` was dirtying a tracked
  `WORKSPACE.md` moments before subtree ran. Fixed by reordering `generateWorkspace`: detect
  members read-only, adopt, *then* persist stacks.
  `git subtree add`'s merge commit is the one place this tool commits on the user's behalf —
  scoped narrowly in a new `CONSTITUTION.md` decision (only that commit, only under `--adopt`,
  announced before it runs — a test asserts the announcement is actually printed).
  This was the epic's last row. Rotated per `references/rotation.md`: the epic section moved to
  `archive/epics/workspace-parity-repo-shapes.md`, a Shipped line added, the roll-up row
  removed. `docs/workspace.md` §10.4 and `polyrepo-convert.md` updated to describe `--adopt`
  and the clean-tree precondition.
- **Last verify:** `./verify.sh test` → 83/83 (was 78), `HARNESS_VERIFY: PASS` (2026-07-28).
  Self-audit: **100/100**.

## Next step

Nothing queued. The workspace epic (`wsp-001..009`) is closed; the shakedown that started it is
fully resolved. Pick the next piece of work from a fresh look at the repo, or start a new epic
if one comes up.

Two loose threads, neither blocking, both already noted in `polyrepo-convert.md`:
- `--adopt` automates Route B only. Routes A/C, `.gitignore` edits, and the CI migration
  (moving member workflows to the root with `paths:` filters) stay manual regardless of route.
- A root repo that already has a member staged as a gitlink (e.g. from an earlier `git add -A`)
  will fail `--adopt` with git's own "working tree has modifications" error rather than a
  harness-kit-authored explanation naming the cause. Safe and recoverable as-is (staging
  preserves the original, the error is loud not silent) — just not maximally friendly. Worth a
  sharper error message if it turns out to bite someone for real, per the project's own rule
  about not fixing things that haven't actually broken yet.

Twyne remains converted and pushed (unrelated prior work): 4 repos → 1, 230 commits, CI green.

## Parked

- **The audit cannot detect a state file that is fresh but untrue.** Recurred twice on
  2026-07-27, both times at 100/100 — the file claimed work was uncommitted after it had
  merged. Freshness and size are checkable; content accuracy is not. Rotation discipline at
  session end is the honest fix, not another check.

## In flight elsewhere

- None.

## Blockers

- None.

## Changes (this session)

| File | Change | Why |
|------|--------|-----|
| `scripts/lib/adopt.mjs` | New — `detectAdoptable`, `adoptMembers`; stages originals, runs subtree/copy, aborts on first failure | wsp-009 |
| `scripts/lib/probe.mjs` | New `runGit` — non-swallowing git runner for mutating commands, unlike `runProbe` | wsp-009 |
| `scripts/lib/workspace-generate.mjs` | Wired `--adopt`/`--no-history`; reordered detect→adopt→persist-stacks to keep the tree clean for subtree; refusal message now names `--adopt` | wsp-009 |
| `scripts/create.mjs` | `--adopt`/`--no-history` flags; help text | wsp-009 |
| `tests/workspace.test.mjs` | +5 tests: with-history import, `--no-history`, abort-on-failure, refusal mentions `--adopt`, no-op regression guard | wsp-009 |
| `CONSTITUTION.md` | New decision — the subtree merge commit is a narrow, named exception to "never auto-commit" | wsp-009 |
| `docs/workspace.md` | §10.4 rewritten: discovery refuses, request may adopt; clean-tree precondition documented | wsp-009 |
| `references/polyrepo-convert.md` | New `--adopt` section; opening reframed (two paths, not one) | wsp-009 |
| `FEATURES.md` | `wsp-009` → ✅; epic rotated out, Shipped line added | Close the row + epic |
| `archive/features/wsp-009.md` | New — full detail, both real bugs, evidence table | Rotation on close |
| `archive/epics/workspace-parity-repo-shapes.md` | New — full epic detail, final mode matrix, decisions, what-went-wrong | Epic rotation |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
