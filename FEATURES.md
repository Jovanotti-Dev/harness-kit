# Features

> Scope backbone, grouped by epic (one epic = one PRD = one ID prefix).
> Status: 🟡 not started · 🔵 in progress · ✅ done · 🔴 blocked · 🟠 needs verification
> **One feature is active at a time per person** (see `state/<name>.md`) — the backlog may span epics.
> `By` = who actually did the work, from `git config user.name` on the machine that ran it.
> Completed feature detail → `archive/features/`. Completed *epics* → `archive/epics/`, listed under Shipped.

| Epic | Progress | Active / open |
|------|:--------:|---------------|
| _No open epics — all shipped (see below)._ | | |

---

## Shipped

Completed epics, rotated to `archive/epics/`. One line each.

- **harness-kit v1** (`hk-001..014`, closed 2026-07-24) — the v1 generator, audit, rotation,
  profiles, CI, and self-governance. → [archive](archive/epics/harness-kit-v1.md)
- **Workspace mode** (`ws-001..012`, closed 2026-07-25) — one harness at a monorepo root governs
  several member repos; single-repo path unchanged. → [archive](archive/epics/workspace-mode.md)
- **Workspace parity & repo shapes** (`wsp-001..009`, closed 2026-07-28) — a generated workspace
  scores 100 on its own audit; polyrepo is refused-with-a-plan or adopted-with-history;
  `.git` is never deleted or rewritten by any path. → [archive](archive/epics/workspace-parity-repo-shapes.md)
