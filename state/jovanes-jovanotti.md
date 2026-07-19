# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Ship harness-kit v1 — generator, audit, and the repo governing itself.
- **Active feature:** none — every feature closed.
- **Status:** ✅ 12/12 done, nothing parked. hk-006 closed by a real migration.
- **Last verify:** `SELFTEST: PASS` — repo audit 100/100 at v0.3.0.

## Next step

Tag v0.4.0 (migrate mode + critical severity + hk-006 closed). After that the useful work is
other people's repos, not this one — a second migrator would be much stronger evidence for the
rotation rule than one careful pass by its author.

## Parked

- None.

## In flight elsewhere

- None.

## Blockers

- None.

## Changes (this session)

| File | Change | Why |
|------|--------|-----|
| `FEATURES.md`, `archive/features/hk-006.md` | hk-006 closed + rotated | Real migration answered its open check |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
