# Session — 2026-07-25 · Workspace mode (ws-001..012) + hk-012..014

- **Author:** Jovanes Jovanotti
- **Closed:** 2026-07-25
- **Epic:** Workspace mode → [archive](../epics/workspace-mode.md)
- **Also closed:** `hk-012` (regression tests), `hk-013` (CI), `hk-014` (knowledge-graph detection)
- **Verify at close:** `./verify.sh test` → `SELFTEST: PASS`, `HARNESS_VERIFY: PASS`
- **Shipped as:** PR #2 (`d28f38e`), CI green on Node 20/22/24

## Outcome

A monorepo root now generates a full harness — `WORKSPACE.md`, shared `AGENTS.md` /
`CONSTITUTION.md`, per-area constitutions, Area-tagged `FEATURES.md`, per-member `verify.sh`
plus breadcrumbs, and a root orchestrator — hoists an existing in-member harness, and adds
members later. The single-repo path is byte-for-byte unchanged, guarded by regression tests.
30 workspace tests.

## Changes

| File | Change | Why |
|------|--------|-----|
| `tests/` | New — 22 unit + regression tests | hk-012 |
| `scripts/lib/parse.mjs` | Fixed `\|:-:\|` separator parsed as data | Found by the new parser tests |
| `.github/workflows/ci.yml` | New — CI on Node 20/22/24, Ubuntu | hk-013 |
| `scripts/lib/knowledge-graphs.mjs` | New — detects graphify/code-review-graph, builds conditional section | hk-014 |
| `scripts/create.mjs` | Wired `KNOWLEDGE_GRAPHS_SECTION` value | hk-014 |
| `templates/AGENTS.md.template` | Added the KNOWLEDGE_GRAPHS_SECTION placeholder | hk-014 |
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

## What went wrong

- **A table separator was parsed as a data row.** `parseTables` only recognised `|---|`, so
  every aligned `|:-:|` column produced a phantom feature with a garbage ID. Silent — the
  audit reported confidently wrong numbers. Found only once `tests/` existed, nine features
  in. See `JOURNAL.md` 2026-07-24.
- **Spreading `...over` wholesale clobbered the `files` object** in the test helper, dropping
  `stateFiles` and crashing the checks. Fixed by merging `files` separately; the fix is
  pinned by a comment in `tests/regression.test.mjs`.

## Follow-ups left open at close

- Real-world shakedown: `--target` a genuine 3-repo monorepo (ios/backoffice/backend), and a
  hoist against a repo that already carried a single-repo harness. **Still open.**
- Rotate the `harness-kit v1` epic. **Done** — `ba38f3f`.
- Merge PR #2. **Done** — `59e8847`.
