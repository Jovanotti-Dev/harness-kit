# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Ship harness-kit v1 — generator, audit, and the repo governing itself.
- **Active feature:** none — `hk-011` closed.
- **Status:** ✅ 11/11 done. Migration path added after trialling on a real repo.
- **Last verify:** `SELFTEST: PASS` — repo audit 100/100 at v0.3.0.

## Next step

Migrate a real project for real. The trial only proved `create` now refuses correctly; the
migration procedure itself (moving progress.md content into CONSTITUTION/JOURNAL/archive) has
not been executed end to end on a live repo. That also answers `hk-006`'s open question.

## Parked

- `hk-006` — 🟠 rotation rule works, but "does it hold without a script?" needs several real
  sessions before it can be judged. Deferred, not skipped.

## In flight elsewhere

- None.

## Blockers

- None.

## Changes (this session)

| File | Change | Why |
|------|--------|-----|
| `profiles/ios-xcode.mjs` | Nested .xcodeproj probe | Deployment target read "unknown" on a real repo |
| `scripts/lib/legacy.mjs` | New — existing-harness detection | hk-011 |
| `scripts/lib/checks.mjs`, `audit.mjs` | Critical severity caps score | 97/100 for an unreachable harness |
| `references/migrate.md` | New — migration procedure | Never delete; move content |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
