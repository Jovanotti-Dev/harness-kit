# Features

> Scope backbone, grouped by epic (one epic = one PRD = one ID prefix).
> Status: 🟡 not started · 🔵 in progress · ✅ done · 🔴 blocked · 🟠 needs verification
> **One feature is active at a time per person** (see `state/<name>.md`) — the backlog may span epics.
> `By` = who actually did the work, from `git config user.name` on the machine that ran it.
> Completed feature detail → `archive/features/`. Completed *epics* → `archive/epics/`, listed under Shipped.

| Epic | Progress | Active / open |
|------|:--------:|---------------|
| harness-kit v1 | 15/15 ✅ | — all closed |
| Workspace mode | 12/12 ✅ | — all closed |

---

## Epic · harness-kit v1

**PRD:** `docs/plan.md` · **Prefix:** `hk-`
**Started:** 2026-07-19 · **Started by:** Jovanes Jovanotti

| ID | Feature | Status | By | Depends on | Evidence |
|----|---------|:------:|----|------------|----------|
| hk-001 | Templates for the generated harness | ✅ | Jovanes Jovanotti | — | 8 templates, commit 7d4779c |
| hk-002 | Stack profiles as data | ✅ | Jovanes Jovanotti | — | 5 profiles, commits 91638f8 + e27c177 |
| hk-003 | Generator: detect, probe, render | ✅ | Jovanes Jovanotti | hk-001, hk-002 | commit d9e943f; probed a real iOS repo correctly |
| hk-004 | Audit with drift detection | ✅ | Jovanes Jovanotti | hk-003 | commit 46b17b4; caught 7/7 planted defects |
| hk-005 | Dogfood: harness-kit governs itself | ✅ | Jovanes Jovanotti | hk-004 | [archive](archive/features/hk-005.md) |
| hk-006 | Rotation: move closed work to archive | ✅ | Jovanes Jovanotti | hk-005 | [archive](archive/features/hk-006.md) |
| hk-007 | Loop-mode reference doc | ✅ | Jovanes Jovanotti | hk-005 | [archive](archive/features/hk-007.md) |
| hk-008 | More profiles: python, go, flutter, android | ✅ | Jovanes Jovanotti | hk-002 | [archive](archive/features/hk-008.md) |
| hk-009 | HTML audit report | ✅ | Jovanes Jovanotti | hk-004 | [archive](archive/features/hk-009.md) |
| hk-010 | Fix flaky staleness check | ✅ | Jovanes Jovanotti | hk-004 | [archive](archive/features/hk-010.md) |
| hk-011 | Handle repos that already have a harness | ✅ | Jovanes Jovanotti | hk-003, hk-004 | [archive](archive/features/hk-011.md) |
| hk-012 | Regression tests, one per known bug | ✅ | Jovanes Jovanotti | hk-011 | [archive](archive/features/hk-012.md) |
| hk-013 | CI on every push | ✅ | Jovanes Jovanotti | hk-012 | [archive](archive/features/hk-013.md) |
| hk-014 | Conditional "Knowledge graphs" section — detect graphify / code-review-graph, omit when neither is installed | ✅ | Jovanes Jovanotti | hk-003 | `scripts/lib/knowledge-graphs.mjs`; `tests/regression.test.mjs` bug 7a/7b/7c; `SELFTEST: PASS` |
---

## Epic · Workspace mode

**PRD:** `docs/workspace.md` (to be written) · **Prefix:** `ws-`
**Started:** 2026-07-24 · **Started by:** Jovanes Jovanotti

> One harness at a monorepo root governs several member repos (e.g. `ios/`, `backoffice/`,
> `backend/`). Shared `AGENTS.md`, shared root `CONSTITUTION.md` + per-repo
> `constitutions/<area>.md`, one Area-tagged `FEATURES.md`, root `state/<name>.md`, and a
> `verify.sh` that orchestrates each member's own verify. Monorepo only (one `.git` at root).
> **Additive:** the single-repo path is unchanged — workspace mode activates only when a
> `WORKSPACE.md` is present. Membership is explicit in `WORKSPACE.md`, never auto-guessed;
> `Area` is a user-chosen unique label, not the detected stack.

| ID | Feature | Area | Status | By | Depends on | Evidence |
|----|---------|------|:------:|----|------------|----------|
| ws-001 | `WORKSPACE.md` template + `lib/workspace.mjs` (detect mode, read/write member table, resolve Area→path→stack) | tool | ✅ | Jovanes Jovanotti | — | `tests/workspace.test.mjs` 8/8; `./verify.sh test` PASS |
| ws-002 | Per-member stack detection — loop existing `detectStack()` over member dirs, store result in `WORKSPACE.md` | tool | ✅ | Jovanes Jovanotti | ws-001 | `detectMembers`/`refreshStacks`; `tests/workspace.test.mjs` 12/12; `verify.sh test` PASS |
| ws-003 | `create.mjs` mode switch — branch to workspace generation when `WORKSPACE.md`/`--workspace`; single-repo path byte-for-byte unchanged | tool | ✅ | Jovanes Jovanotti | ws-001, ws-002 | early-exit branch in `create.mjs`; `lib/workspace-generate.mjs`; regression guard + full suite green (`tests/workspace.test.mjs` 15/15) |
| ws-004 | Split constitution — root `CONSTITUTION.md` (git/process/decisions) + new `constitution-area.md.template` → `constitutions/<area>.md` | docs | ✅ | Jovanes Jovanotti | ws-003 | `constitution-root/area` templates; `writeConstitutions` in `workspace-generate.mjs`; `buildProbeValues` extracted+shared; `tests/workspace.test.mjs` 17/17 |
| ws-005 | `AGENTS.md.template` routing — startup reads root `CONSTITUTION.md` + `constitutions/<area>.md`; add Workspace-layout pointer; stay ≤80 lines | docs | ✅ | Jovanes Jovanotti | ws-004 | `AGENTS-root.md.template` (57 lines) + `writeRootDocs`; routes to `constitutions/<area>.md`; CLAUDE.md pointer; `tests/workspace.test.mjs` 18/18 |
| ws-006 | `FEATURES.md.template` — add `Area` column; `Depends on` may cross Areas | docs | ✅ | Jovanes Jovanotti | ws-003 | `FEATURES-root.md.template` + seeded one row/area w/ cross-area dep; parses via `parseFeatures`; `tests/workspace.test.mjs` 19/19 |
| ws-007 | Member breadcrumb — `member-pointer.md.template` → `<area>/CLAUDE.md` pointing up to root harness | tool | ✅ | Jovanes Jovanotti | ws-003 | `member-pointer.md.template` (@-includes root map + area constitution) + `writeBreadcrumbs`; no-clobber; `tests/workspace.test.mjs` 21/21 |
| ws-008 | verify orchestration — per-member `<area>/verify.sh` (existing generator) + `verify-root.sh.template` (`./verify.sh [area] [mode]`, aggregate line) | tool | ✅ | Jovanes Jovanotti | ws-003 | `verify-root.sh.template` + `writeVerify`; live PASS/FAIL/single-member/unknown-area runs; `tests/workspace.test.mjs` 24/24 |
| ws-009 | Hoist-migration — extend `legacy.mjs` to spot a member-dir harness; `references/workspace-migrate.md`; promote to root, generate missing members, old files → `archive/legacy/` | tool | ✅ | Jovanes Jovanotti | ws-003, ws-008 | `lib/hoist.mjs` (`detectMemberHarnesses`/`hoistMembers`); wired into `generateWorkspace`; `references/workspace-migrate.md`; live hoist verified; `tests/workspace.test.mjs` 26/26 |
| ws-010 | Add-a-member-later flow — append `WORKSPACE.md` row + generate that member's files without touching existing members | tool | ✅ | Jovanes Jovanotti | ws-009 | `addMember` + `--add-member/--at`; root verify.sh force-regenerated (derived); existing members byte-untouched; `tests/workspace.test.mjs` 28/28 |
| ws-011 | Docs — `SKILL.md` Workspace mode + anti-competing-harness invariant; `references/create.md`; `references/rotation.md` note | docs | ✅ | Jovanes Jovanotti | ws-003 | `SKILL.md` Modes row + invariant; `references/create.md` Workspace section; `references/rotation.md` note; `verify.sh test` PASS |
| ws-012 | Regression tests — workspace detect, per-member generation, orchestrator verify, hoist-migration, and single-repo-unchanged guard | tool | ✅ | Jovanes Jovanotti | ws-003, ws-008, ws-009 | 30 workspace tests (incl. 2 holistic guards: full-manifest placeholder-free + no-workspace-artifacts); already in CI via `tests/*.test.mjs`; `verify.sh test` PASS |

### ws-001 · WORKSPACE.md template + lib/workspace.mjs

- **Status:** ✅ done · **Depends on:** —
- **Done when:** `WORKSPACE.md.template` exists; `scripts/lib/workspace.mjs` detects workspace
  mode, parses/writes the member table (Area · Path · Stack), and resolves Area→path→stack.

| ✓ | Check | By | Proof |
|:-:|-------|----|-------|
| ✅ | `./verify.sh test` green with new lib | Jovanes Jovanotti | `HARNESS_VERIFY: PASS (test)`, `SELFTEST: PASS` |
| ✅ | Unit test: parse + round-trip a 3-member WORKSPACE.md | Jovanes Jovanotti | `tests/workspace.test.mjs` — 8/8 pass |

**Decisions**
- 2026-07-24 · Monorepo only for v1 (one `.git` at root) — matches existing git-identity/hook assumptions. Polyrepo deferred.
- 2026-07-24 · The atomic active unit is the **feature row (task)**, not the epic (story). "One feature at a time per person" operates on rows, so a cross-Area story is worked one row at a time; the story is done when all its rows are ✅.
- 2026-07-24 · `Area` is a user-chosen unique label; detected stack is stored beside it. Membership is explicit in `WORKSPACE.md`, never auto-scanned.

**Blockers** — none.

---

## Shipped

Completed epics, rotated to `archive/epics/`. One line each.

_None yet._
