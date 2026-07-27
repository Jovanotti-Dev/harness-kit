# Features

> Scope backbone, grouped by epic (one epic = one PRD = one ID prefix).
> Status: 🟡 not started · 🔵 in progress · ✅ done · 🔴 blocked · 🟠 needs verification
> **One feature is active at a time per person** (see `state/<name>.md`) — the backlog may span epics.
> `By` = who actually did the work, from `git config user.name` on the machine that ran it.
> Completed feature detail → `archive/features/`. Completed *epics* → `archive/epics/`, listed under Shipped.

| Epic | Progress | Active / open |
|------|:--------:|---------------|
| [Workspace parity & repo shapes](#epic--workspace-parity--repo-shapes) | 7/9 | `wsp-008` ready |

---

## Epic · Workspace parity & repo shapes

**PRD:** [docs/workspace.md](docs/workspace.md) §10 · **Prefix:** `wsp-`
**Started:** 2026-07-27 · **Started by:** Jovanes Jovanotti

Closes the gap between what workspace mode promises and what it writes, and defines what
harness-kit does when it meets a repo shape it cannot govern. Every row below came from the
first real-world shakedown, run against a genuine three-project workspace — none was caught by
the existing suite, because every workspace test builds its fixture from scratch and asserts on
the file set rather than on the audit passing.

| ID | Feature | Status | By | Depends on | Evidence |
|----|---------|:------:|----|------------|----------|
| `wsp-001` | Workspace generates `state/` + `archive/` at the root | ✅ | Jovanes Jovanotti | — | [archive](archive/features/wsp-001.md) |
| `wsp-002` | Workspace honours `--profile` tiers (`JOURNAL.md`, `evaluator-rubric.md` on `full`) | ✅ | Jovanes Jovanotti | `wsp-001` | [archive](archive/features/wsp-002.md) |
| `wsp-003` | `create` refuses at a workspace root carrying a foreign harness | ✅ | Jovanes Jovanotti | — | [archive](archive/features/wsp-003.md) |
| `wsp-004` | Workspace-level migrate: fold a foreign root harness in, nothing deleted | ✅ | Jovanes Jovanotti | `wsp-003` | [archive](archive/features/wsp-004.md) |
| `wsp-005` | Polyrepo detected → refuse + print conversion plan; `.git` never touched | ✅ | Jovanes Jovanotti | — | [archive](archive/features/wsp-005.md) |
| `wsp-006` | Evidence-link check accepts URLs instead of failing them as dead paths | ✅ | Jovanes Jovanotti | — | [archive](archive/features/wsp-006.md) |
| `wsp-007` | Root `verify.sh` stops clobbering user edits on re-run | ✅ | Jovanes Jovanotti | — | [archive](archive/features/wsp-007.md) |
| `wsp-008` | Workspace verify aggregate names the failing area(s) | 🟡 | — | — | — |
| `wsp-009` | Interactive adopt: pick members, import each **with history**, stop before the destructive step | 🟡 | — | `wsp-005` | — |

`wsp-003` is the refusal (stop the damage); `wsp-004` is the repair (move the content). They
ship in that order for the same reason `create`/`migrate` do in a single repo — refusing is
safe on its own, migrating is not safe without it.

`wsp-005` and `wsp-009` are the same split one level up. `wsp-005` refuses a polyrepo found by
surprise; `wsp-009` serves the user who *asked* to build a monorepo and named the projects.
Different intent, so different answer — but the safety line is identical, and it falls in an
unusual place worth stating precisely:

> `git subtree add` **reads** the member's `.git` and writes only to the root. It is additive,
> so a tool may run it. Deleting the member's `.git` afterwards is destructive and irreversible,
> so a tool may not.

`wsp-009` therefore does the import and the verification, prints what to delete, and stops.
`--no-history` may exist as an opt-in for throwaway history, must name how many commits it is
dropping, and is never the default: the first real conversion took roughly three commands per
member, so skipping history saves minutes and costs everything.

**Done when** a generated workspace scores 100 on its own audit — the guard that would have
caught `wsp-001`, and the reason the existing placeholder-free assertion did not — and the
mode matrix below is complete for both single-repo and workspace shapes.

**Mode matrix** (the target state; ✅ = shipped today)

| Situation | Single repo | Workspace root |
|---|---|---|
| No harness | `create` ✅ | `create` ✅ |
| Foreign harness present | `migrate` ✅ | `wsp-003` refuse → `wsp-004` migrate |
| A member already has a harness | n/a | hoist ✅ |
| Members each have their own `.git` | n/a | `wsp-005` refuse + plan |
| User *asks* to build one from several repos | n/a | `wsp-009` adopt, with history |

**Decisions** — recorded in `CONSTITUTION.md` (2026-07-27): workspace/single-repo parity;
polyrepo refused with a plan and `.git` never touched; the foreign-harness guard binds at a
workspace root.

**Blockers** — none.

---

## Shipped

Completed epics, rotated to `archive/epics/`. One line each.

- **harness-kit v1** (`hk-001..014`, closed 2026-07-24) — the v1 generator, audit, rotation,
  profiles, CI, and self-governance. → [archive](archive/epics/harness-kit-v1.md)
- **Workspace mode** (`ws-001..012`, closed 2026-07-25) — one harness at a monorepo root governs
  several member repos; single-repo path unchanged. → [archive](archive/epics/workspace-mode.md)
