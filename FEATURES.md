# Features

> Scope backbone, grouped by epic (one epic = one PRD = one ID prefix).
> Status: 🟡 not started · 🔵 in progress · ✅ done · 🔴 blocked · 🟠 needs verification
> **One feature is active at a time per person** (see `state/<name>.md`) — the backlog may span epics.
> `By` = who actually did the work, from `git config user.name` on the machine that ran it.
> Completed feature detail → `archive/features/`. Completed *epics* → `archive/epics/`, listed under Shipped.

| Epic | Progress | Active / open |
|------|:--------:|---------------|
| harness-kit v1 | 10/10 ✅ | `hk-006` 🟠 parked |

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
| hk-006 | Rotation: move closed work to archive | 🟠 | Jovanes Jovanotti | hk-005 | ↓ below |
| hk-007 | Loop-mode reference doc | ✅ | Jovanes Jovanotti | hk-005 | [archive](archive/features/hk-007.md) |
| hk-008 | More profiles: python, go, flutter, android | ✅ | Jovanes Jovanotti | hk-002 | [archive](archive/features/hk-008.md) |
| hk-009 | HTML audit report | ✅ | Jovanes Jovanotti | hk-004 | [archive](archive/features/hk-009.md) |
| hk-010 | Fix flaky staleness check | ✅ | Jovanes Jovanotti | hk-004 | [archive](archive/features/hk-010.md) |

### hk-006 · Rotation: move closed work to archive  *(parked)*

- **Status:** 🟠 needs verification · **Depends on:** hk-005
- **Done when:** the rotation procedure is documented, the audit catches skipped rotation,
  and this repo's own closed features are rotated.

| ✓ | Check | By | Proof |
|:-:|-------|----|-------|
| ✅ | Procedure documented | Jovanes Jovanotti | `references/rotation.md` — feature, session and epic rotation |
| ✅ | Audit catches skipped rotation | Jovanes Jovanotti | New check flagged hk-005 and hk-010 the moment it was added |
| ✅ | This repo's closed features rotated | Jovanes Jovanotti | `archive/features/hk-005.md`, `hk-010.md`; FEATURES.md shrank by 18 lines |
| 🟡 | Rule proves reliable without a script | — | Deferred — revisit after several real sessions |

**Decisions** — rotation stays a written rule, not `rotate.mjs`. It is a cut-and-paste plus a
link; a script would be another moving part to maintain. The audit enforces that it happened,
which is the part that actually needs to be mechanical. Automate only if agents skip it in
practice.

**Blockers** — none. Rubric verdict **CONDITIONAL**: every `must` passes, one `should`
(does the rule hold without a script?) cannot be judged in a single session. Explicitly
deferred, not skipped.

---

## Shipped

Completed epics, rotated to `archive/epics/`. One line each.

_None yet._
