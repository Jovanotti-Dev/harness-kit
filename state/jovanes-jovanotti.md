# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Ship harness-kit v1 — generator, audit, and the repo governing itself.
- **Active feature:** none — `hk-009` closed. All v1 features done.
- **Status:** ✅ 10/10 features complete. Only parked `hk-006` remains, by design.
- **Last verify:** `SELFTEST: PASS` — repo audit clean after updating this file.

## Next step

v1 scope is complete. Next session: either tag v0.3.0 and announce, or run harness-kit on a
real project other than this one — that is the only way to judge `hk-006`'s open question
(does the rotation rule hold without a script?).

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
| `templates/audit-report.html` | New — report template | hk-009 |
| `scripts/lib/report.mjs` | New — HTML renderer with escaping | hk-009 |
| `scripts/audit.mjs` | Added --html flag | hk-009 |
| `FEATURES.md` | hk-009 ✅ + rotated | Rotation rule applied |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
