# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Close the convention gap the audit-hardening work exposed — the git rules
  described only work that has a feature ID.
- **Active feature:** none — maintenance, which the amended rules now cover explicitly.
- **Status:** Amendment landed in `CONSTITUTION.md` and propagated to both generator templates,
  uncommitted in the working tree. Maintenance work gets a `<type>/<topic>` branch and a
  `fix:`/`docs:`/`chore:` prefix, bounded: past one session, or any change others depend on,
  it gets a feature row. Dated decision records why a feature row for every chore was rejected.
- **Shipped earlier today:** the three audit fixes + journal + rotation → PR #6, merged
  (`2f1dea1`), CI green on Node 20/22/24.
- **Last verify:** `./verify.sh test` → 61/61, `SELFTEST: PASS`, `HARNESS_VERIFY: PASS` (2026-07-27).
  Self-audit: **100/100**, no issues.

## Next step

Commit the working tree on `chore/maintenance-lane` — the first branch to follow the rule it
adds. Nothing is committed; `CONSTITUTION.md` forbids auto-commit.

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
| `CONSTITUTION.md` | Git section: maintenance branch lane + type-prefix commits, bounded | Convention gap |
| `CONSTITUTION.md` | Dated decision — why not a feature row per chore | Settled an arguable choice |
| `templates/CONSTITUTION.md.template` | Same amendment, placeholder form | Repo had drifted from its own generator |
| `templates/constitution-root.md.template` | Same, terser workspace phrasing | Workspace roots inherit it too |
| `tests/regression.test.mjs` | Bug 10 ×2 — generated single-repo + workspace constitutions carry the lane | Verified failing before the fix |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
