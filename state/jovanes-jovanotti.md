# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Ship harness-kit v1 — generator, audit, and the repo governing itself.
- **Active feature:** none — `hk-007` closed, `hk-006` parked 🟠.
- **Status:** ✅ hk-007 done and rotated. 8/10 features complete.
- **Last verify:** `SELFTEST: PASS` — repo audit clean after updating this file.

## Next step

Start `hk-008` — add python, go, flutter and android profiles. Each needs real probe commands
and pitfalls that cost someone a debugging session; do not invent generic advice.

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
| `references/loop.md` | New — session loop reference | hk-007: agents need the reasoning, not just the steps |
| `SKILL.md` | Loop mode now links loop.md | Was pointing at AGENTS.md as a stopgap |
| `FEATURES.md` | hk-007 ✅ + rotated; hk-006 → 🟠 | Rubric verdict CONDITIONAL on hk-006 |
| `archive/features/hk-007.md` | New — rotated detail | Rotation rule applied |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
