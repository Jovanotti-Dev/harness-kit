# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Ship harness-kit v1 — generator, audit, and the repo governing itself.
- **Active feature:** none — `hk-009` closed. All v1 features done.
- **Status:** ✅ 10/10 features complete. Only parked `hk-006` remains, by design.
- **Last verify:** `SELFTEST: PASS` — repo audit 100/100 at v0.3.0.

## Next step

v0.3.0 is tagged. Next session: run `harness-kit create` on a real project other than this
one. That is the only way to answer `hk-006`'s open question — does the rotation rule hold
without a script? — and it is where the next round of bugs will come from.

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
| `state/jovanes-jovanotti.md` | Session close for v0.3.0 | Release tagged; next step recorded |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
