# State — Jovanes Jovanotti

> Your personal working state. One file per person (`state/<git config user.name>.md`),
> so merge / rebase / cherry-pick never conflict — nobody else ever writes here.
> Keep it small — cap ~100 lines. Finished work rotates to `archive/`.
> Team-wide view of who's doing what lives in `FEATURES.md`, not here.

## Now

- **Objective:** Add **Workspace mode** — one root harness governing several member repos (monorepo).
- **Active feature:** none — **Workspace epic COMPLETE, 12/12 ✅.**
- **Status:** ws-011 (docs) + ws-012 (regression guards) landed. A monorepo root now generates a
  full harness (WORKSPACE.md, shared AGENTS/CONSTITUTION, per-area constitutions, Area-tagged
  FEATURES, per-member verify + breadcrumbs, root orchestrator), hoists an existing in-member
  harness, and adds members later — single-repo path byte-for-byte unchanged. 30 workspace tests.
- **Last verify:** `./verify.sh test` → `SELFTEST: PASS`, `HARNESS_VERIFY: PASS` (2026-07-25).

## Next step

Epic done. Remaining housekeeping when ready (not blocking):
- Rotate the closed `ws-*` epic per `references/rotation.md` (move detail to `archive/epics/`,
  add a Shipped line) — optional now, required before the hot files bloat.
- Commit the branch (nothing committed yet, per never-auto-commit). Suggested: a `ws-` prefixed
  commit / PR for the whole Workspace-mode epic.
- Real-world shakedown: run `--target` a genuine 3-repo monorepo (ios/backoffice/backend) and a
  hoist on a repo that already had a single-repo harness.

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
| `FEATURES.md` | Added `WS` epic (ws-001..012) + Area column + dated decisions | Workspace mode design |
| `docs/workspace.md` | New — Workspace mode PRD (D1–D6, layout, build order, DoD) | ws-001 reference |
| `templates/WORKSPACE.md.template` | New — member registry (Area·Path·Stack) | ws-001 |
| `scripts/lib/workspace.mjs` | New — isWorkspace/readMembers/writeMembers/resolveArea | ws-001 |
| `tests/workspace.test.mjs` | New — 8 tests: detect, parse, round-trip, dupe, resolve | ws-001 |
| `scripts/lib/workspace.mjs` | Added `detectMembers`/`refreshStacks` (reuse `detectStack`) | ws-002 |
| `tests/workspace.test.mjs` | +4 tests: per-member detect, persist, missing, generic fallback | ws-002 |
| `scripts/create.mjs` | Early-exit workspace branch (`isWorkspace`/`--workspace`) + help text | ws-003 |
| `scripts/lib/workspace-generate.mjs` | New — `generateWorkspace`: refresh stacks + report plan | ws-003 |
| `tests/workspace.test.mjs` | +3 tests: mode switch, --workspace guard, single-repo regression guard | ws-003 |
| `scripts/lib/probe.mjs` | Extracted `buildProbeValues` (shared probe→values assembly) | ws-004 |
| `scripts/create.mjs` | Use shared `buildProbeValues` (output unchanged) | ws-004 |
| `templates/constitution-root.md.template` | New — shared workspace rules (process/git/decisions) | ws-004 |
| `templates/constitution-area.md.template` | New — per-member stack rules | ws-004 |
| `scripts/lib/workspace-generate.mjs` | Added `writeConstitutions` (root + per-area) | ws-004 |
| `tests/workspace.test.mjs` | +2 tests: constitution split, generic-member placeholder-free | ws-004 |
| `templates/AGENTS-root.md.template` | New — shared workspace map w/ constitution routing (≤80 lines) | ws-005 |
| `scripts/lib/workspace-generate.mjs` | Added `writeRootDocs` (AGENTS.md + CLAUDE.md pointer) | ws-005 |
| `tests/workspace.test.mjs` | +1 test: AGENTS routing/members/line-budget/CLAUDE pointer | ws-005 |
| `templates/FEATURES-root.md.template` | New — Area column + cross-area Depends on note | ws-006 |
| `scripts/lib/workspace-generate.mjs` | `writeRootDocs` writes FEATURES.md, seeds one row/area | ws-006 |
| `tests/workspace.test.mjs` | +1 test: Area column, cross-area dep, parses via parseFeatures | ws-006 |
| `templates/member-pointer.md.template` | New — member CLAUDE.md breadcrumb (@-includes root) | ws-007 |
| `scripts/lib/workspace-generate.mjs` | Added `writeBreadcrumbs` (per-member CLAUDE.md) | ws-007 |
| `tests/workspace.test.mjs` | +2 tests: breadcrumb content/isolation, no-clobber | ws-007 |
| `templates/verify-root.sh.template` | New — root orchestrator `./verify.sh [area] [mode]` | ws-008 |
| `scripts/lib/workspace-generate.mjs` | Added `writeVerify` (per-member verify.sh + root) | ws-008 |
| `tests/workspace.test.mjs` | +3 tests: aggregate PASS, single-member, FAIL propagation | ws-008 |
| `scripts/lib/hoist.mjs` | New — `detectMemberHarnesses`/`hoistMembers` (promote+archive) | ws-009 |
| `scripts/lib/workspace-generate.mjs` | Wired hoist into `generateWorkspace`; hoisted rows → FEATURES | ws-009 |
| `references/workspace-migrate.md` | New — hoist procedure + invariants | ws-009 |
| `tests/workspace.test.mjs` | +2 tests: hoist promote/archive/no-compete, no-hoist normal path | ws-009 |
| `scripts/lib/workspace.mjs` | Added `addMember` (append row, no-op if area exists) | ws-010 |
| `scripts/create.mjs` | `--add-member <area> --at <path>` → generateWorkspace | ws-010 |
| `scripts/lib/workspace-generate.mjs` | Handle addMember; force-regenerate root verify.sh | ws-010 |
| `tests/workspace.test.mjs` | +2 tests: add member updates verify + untouched others, re-add no-op | ws-010 |
| `SKILL.md` | Workspace Modes row + anti-competing-harness invariant | ws-011 |
| `references/create.md` | Workspace-mode section (`--workspace`/`--add-member`, layout) | ws-011 |
| `references/rotation.md` | Note: one root archive/, hoist files under archive/legacy/ | ws-011 |
| `tests/workspace.test.mjs` | +2 holistic guards: full-manifest placeholder-free, no workspace artifacts single-repo | ws-012 |

_Ground truth: run `git diff --stat` to confirm this table matches reality._
