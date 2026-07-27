# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Harden the audit against false signals found by reviewing harness-kit
  against its own harness.
- **Active feature:** none — no open epic. Work was corrective, tracked here and in `JOURNAL.md`.
- **Status:** Three audit defects fixed, uncommitted in the working tree.
  1. Rotated epics no longer score as a broken `FEATURES.md` (`shippedEntries`).
  2. CI gate margin restored — 98/100 against `--min-score 90`, rationale recorded in `ci.yml`.
  3. State-staleness compares against the newest **work** commit, so prose-only commits
     no longer flag every state file.
  Plus: `JOURNAL.md` seeded with the four lessons actually earned so far.
- **Last verify:** `./verify.sh test` → 59/59, `SELFTEST: PASS`, `HARNESS_VERIFY: PASS` (2026-07-27).
  Self-audit: **100/100**, no issues.

## Next step

Review and commit the working tree (8 files + 1 new archive session). Nothing is committed —
`CONSTITUTION.md` forbids auto-commit. Suggested split: one commit for the audit fixes with
their tests, one for the journal/constitution entries.

Then, when ready (not blocking):
- Real-world shakedown: `--target` a genuine 3-repo monorepo (ios/backoffice/backend), and a
  hoist against a repo that already had a single-repo harness. Carried over from the
  Workspace-mode session → [archive](../archive/sessions/2026-07-25-workspace-mode.md).

## Parked

- **The audit cannot detect a state file that is fresh but untrue.** This file listed merged
  PRs as pending for two days at 100/100. Freshness and size are checked; content accuracy is
  not, and probably cannot be. Worth a `JOURNAL.md` entry if it recurs.

## In flight elsewhere

- None.

## Blockers

- None.

## Changes (this session)

| File | Change | Why |
|------|--------|-----|
| `scripts/lib/parse.mjs` | New `shippedEntries()` — counts rotated epics, ignores `_None yet._` | Fix 1 |
| `scripts/lib/checks.mjs` | Epic/row checks accept a populated Shipped list | Fix 1 |
| `tests/parse.test.mjs` | +1 test: counts entries, rejects the placeholder, tolerates null | Fix 1 |
| `tests/regression.test.mjs` | Bug 8 + GUARD — shipped passes, genuinely empty still fails | Fix 1 |
| `.github/workflows/ci.yml` | Comment: 90 is a floor, fix the harness not the gate | Fix 2 |
| `scripts/audit.mjs` | `BOOKKEEPING` path exclusions + `isGitRepo` probe | Fix 3 |
| `scripts/lib/checks.mjs` | Staleness reports 3 distinct outcomes, not 2 | Fix 3 |
| `tests/regression.test.mjs` | Bug 9 — e2e; pinned commit dates (`%cI` is 1s-resolution) | Fix 3 |
| `JOURNAL.md` | 4 entries: parser bug, Ubuntu CI, rotation-scored-as-failure, noisy warning | Fix 5 |
| `CONSTITUTION.md` | Decision: an audit check must distinguish done from never-started | Promoted from JOURNAL |
| `archive/sessions/2026-07-25-workspace-mode.md` | New — the ws-001..012 session, rotated out of here | Rotation |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
