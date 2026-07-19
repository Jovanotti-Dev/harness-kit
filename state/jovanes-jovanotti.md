# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Ship harness-kit v1 — generator, audit, and the repo governing itself.
- **Active feature:** `hk-006` — rotation: move closed work to archive.
- **Status:** 🔵 in progress — hk-010 closed first (flaky check found while dogfooding).
- **Last verify:** `SELFTEST: PASS` — repo audit 98 (staleness check now correctly firing).

## Next step

Implement `hk-006` rotation rule-first: document the procedure in the AGENTS.md template and
add an audit check that catches un-rotated closed work. Write `rotate.mjs` only if the rule
proves unreliable in practice.

## Parked

- None.

## In flight elsewhere

- None.

## Blockers

- None.

## Changes (this session)

| File | Change | Why |
|------|--------|-----|
| _(none yet)_ | — | — |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
