# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Ship harness-kit v1 — generator, audit, and the repo governing itself.
- **Active feature:** none — every feature closed.
- **Status:** ✅ 15/15 done. hk-014 (conditional Knowledge graphs section) just landed.
- **Last verify:** `npm test` → 25/25 passing, `SELFTEST: PASS` (2026-07-24).

## Next step

Watch the first CI run — it is the first time any of this has executed on Linux, so a failure
there is a real finding, not noise. After that the useful work is other people's repos: a
second person migrating one is far stronger evidence than another pass by the author.

## Parked

- None.

## In flight elsewhere

- None.

## Blockers

- None.

## Changes (this session)

| File | Change | Why |
|------|--------|-----|
| `tests/` | New — 22 unit + regression tests | hk-012 |
| `scripts/lib/parse.mjs` | Fixed `|:-:|` separator parsed as data | Found by the new parser tests |
| `.github/workflows/ci.yml` | New — CI on Node 20/22/24, Ubuntu | hk-013 |
| `scripts/lib/knowledge-graphs.mjs` | New — detects graphify/code-review-graph, builds conditional section | hk-014 |
| `scripts/create.mjs` | Wired `KNOWLEDGE_GRAPHS_SECTION` value | hk-014 |
| `templates/AGENTS.md.template` | Added `{{KNOWLEDGE_GRAPHS_SECTION}}` placeholder | hk-014 |
| `tests/regression.test.mjs` | Bug 7a/7b/7c — detection + section + create.mjs integration | hk-014 |
| `references/create.md`, `FEATURES.md` | Documented behavior, closed hk-014 | hk-014 |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
