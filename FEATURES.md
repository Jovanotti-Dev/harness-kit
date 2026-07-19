# Features

> Scope backbone, grouped by epic (one epic = one PRD = one ID prefix).
> Status: 🟡 not started · 🔵 in progress · ✅ done · 🔴 blocked · 🟠 needs verification
> **One feature is active at a time per person** (see `state/<name>.md`) — the backlog may span epics.
> `By` = who actually did the work, from `git config user.name` on the machine that ran it.
> Completed feature detail → `archive/features/`. Completed *epics* → `archive/epics/`, listed under Shipped.

| Epic | Progress | Active / open |
|------|:--------:|---------------|
| harness-kit v1 | 5/9 ✅ | `hk-006` 🟡 next |

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
| hk-005 | Dogfood: harness-kit governs itself | ✅ | Jovanes Jovanotti | hk-004 | ↓ below |
| hk-006 | Rotation: move closed work to archive | 🟡 | — | hk-005 | — |
| hk-007 | Loop-mode reference doc | 🟡 | — | hk-005 | — |
| hk-008 | More profiles: python, go, flutter, android | 🟡 | — | hk-002 | — |
| hk-009 | HTML audit report | 🟡 | — | hk-004 | — |

### hk-005 · Dogfood: harness-kit governs itself  *(done)*

- **Status:** ✅ done · **Depends on:** hk-004
- **Done when:** the repo carries its own generated harness, `npm test` passes end to end,
  and `npm run audit` scores the repo without failures.

| ✓ | Check | By | Proof |
|:-:|-------|----|-------|
| ✅ | node-tool profile added | Jovanes Jovanotti | Repo detected as `node-tool`, not `generic` |
| ✅ | Self test passes | Jovanes Jovanotti | `npm test` → SELFTEST: PASS, generated harness scores 100 |
| ✅ | Harness generated into the repo | Jovanes Jovanotti | This file, AGENTS.md, CONSTITUTION.md, state/ |
| ✅ | Audit of this repo is clean | Jovanes Jovanotti | `npm run audit` → 100/100, 30/30 checks pass |

**Decisions** — the repo's own `verify.sh` runs `npm test`, which generates a harness and
audits it. The tool's verification is therefore the tool doing its actual job, not a proxy.

**Blockers** — none.

---

## Shipped

Completed epics, rotated to `archive/epics/`. One line each.

_None yet._
