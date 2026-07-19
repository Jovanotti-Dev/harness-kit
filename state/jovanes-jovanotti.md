# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Ship harness-kit v1 — generator, audit, and the repo governing itself.
- **Active feature:** none — `hk-008` closed and rotated.
- **Status:** ✅ 9/10 features complete. Only hk-009 (HTML report) left, plus parked hk-006.
- **Last verify:** `SELFTEST: PASS` — repo audit clean after updating this file.

## Next step

Start `hk-009` — HTML audit report. Render the existing audit JSON into a single self-contained
file; no new checks, presentation only.

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
| `profiles/{python,go,flutter,android-gradle}.mjs` | New — 4 stack profiles | hk-008 |
| `scripts/create.mjs` | Failed probes default to "not detected" | Generation crashed without the toolchain installed |
| `FEATURES.md` | hk-008 ✅ + rotated | Rotation rule applied |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
