# Workspace Mode — PRD

> One harness at a **monorepo root** governs several member repos (e.g. `ios/`,
> `backoffice/`, `backend/`). Shared map, split rules, one Area-tagged backlog, one
> orchestrating verify. Tracked as the `WS` epic in [FEATURES.md](../FEATURES.md).
>
> **Additive by construction:** the single-repo path is untouched. Workspace mode
> activates only when a `WORKSPACE.md` exists at the root.

---

## 1. Why this exists

A single product is often built from several codebases that ship together — a mobile app,
a back-office frontend, and a backend API. Today harness-kit governs **one** repo: it
detects one stack, writes one `verify.sh`, one `CONSTITUTION.md`. Running it three times
gives three disconnected harnesses, and the one thing you most want — **a single story
whose tasks fan out across all three, with dependencies between them** — is impossible to
express across three separate `FEATURES.md` files.

Workspace mode puts **one harness at the container root** and treats the sub-projects as
*members*. You get one place to read how to work, one backlog where a "Checkout redesign"
story owns a backend task, a frontend task, and a mobile task (and the mobile task can
depend on the backend one), and one verify entry point — while each member keeps a
stack-native verify of its own.

## 2. Scope

**In scope (v1)**
- Monorepo only: exactly one `.git`, at the root. All member dirs share that git identity.
- A root harness governing N members declared in `WORKSPACE.md`.
- Shared root `AGENTS.md` + shared root `CONSTITUTION.md` + per-member
  `constitutions/<area>.md`.
- One Area-tagged `FEATURES.md`; one root `state/<name>.md` per person.
- Root `verify.sh` that orchestrates each member's own `verify.sh`.
- Hoist-migration: promote an existing harness that lives *inside* a member dir up to root.
- Add-a-member-later without disturbing existing members.

**Out of scope (v1, deferred)**
- **Polyrepo** (each member its own `.git`, no root `.git`) — breaks the single git-identity
  and single hook-dir assumptions the harness relies on. Revisit later.
- Workspace-wide `audit` / `graphify update` orchestration — ship create + hoist + verify first.
- Per-member `state/` files — deliberately rejected (see §4).

## 3. Core principle

**The single-repo behavior is the default and must never regress.** Everything in this
epic is gated on the presence of `WORKSPACE.md`. No `WORKSPACE.md` → harness-kit behaves
exactly as it does today, byte-for-byte. `ws-012`'s regression suite must prove this.

## 4. Design decisions (settled with the user, 2026-07-24)

**D1 — Monorepo only for v1.** One `.git` at the root. The harness reads
`git config user.name` for attribution and `.git/hooks` for knowledge-graph detection;
both assume a single git root. Polyrepo is deferred, not designed around.

**D2 — The atomic active unit is the feature row (task), not the epic (story).**
"One feature active at a time per person" operates on **rows**. A cross-Area story is
worked one row at a time; the story is done when all its rows are ✅. This is why each
platform is its own row (with its own Area, `By`, and evidence) rather than a checklist
inside one mega-feature — it preserves per-platform status and independent attribution,
and it reuses the *existing* epic → feature → check hierarchy unchanged.

**D3 — `Area` is a user-chosen unique label; the detected stack is stored beside it.**
Two members can share a stack (two Node services), so Area cannot be the stack name.
Area is a short label the user picks (`api`, `worker`, `ios`); `WORKSPACE.md` records
`Area · Path · Stack`.

**D4 — Membership is explicit, never auto-guessed.** `WORKSPACE.md` is the single source
of truth for what is a member. Init may *suggest* members by scanning, but the tooling
acts only on the table — so `node_modules/`, `archive/`, `state/`, `.git/`, and the 2 of
5 repos you chose to leave out are all ignored for free.

**D5 — One root `state/<name>.md` per person, not split per member.** A person works one
feature at a time regardless of which member it touches; the active row's Area tells you
which repo. Splitting state per member would let one person hold three active features at
once, breaking D2.

**D6 — A breadcrumb pointer in each member dir.** An agent opened *inside* `ios/` would
otherwise see no `AGENTS.md` and either assume there's no harness or spawn a competing
one. Each member gets a tiny `<area>/CLAUDE.md` pointing up to `../AGENTS.md` and
`../constitutions/<area>.md`.

## 5. Generated layout

```
my-app/                     ← monorepo root; the harness lives here
  .git/                       ← the one git repo (D1)
  WORKSPACE.md                 ← member registry: Area · Path · Stack (source of truth, D4)
  AGENTS.md                     ← one shared map; startup routes to the right constitution
  CONSTITUTION.md                ← shared rules: git, process, dated decisions
  constitutions/
    ios.md                        ← iOS stack rules only
    backoffice.md                  ← frontend stack rules only
    backend.md                      ← backend stack rules only
  FEATURES.md                        ← one backlog, Area-tagged, cross-Area Depends on
  state/
    jovanes-jovanotti.md               ← one per person, NOT per member (D5)
  verify.sh                             ← root orchestrator: ./verify.sh [area] [mode]
  archive/
  ios/         + ios/CLAUDE.md (breadcrumb, D6) + ios/verify.sh
  backoffice/  + backoffice/CLAUDE.md            + backoffice/verify.sh
  backend/     + backend/CLAUDE.md               + backend/verify.sh
```

Only two things ever live inside a member dir: its stack-native `verify.sh` and its
`CLAUDE.md` breadcrumb. Everything else is at the root.

## 6. Component behavior

### 6.1 `WORKSPACE.md` (ws-001)
Markdown table, one row per member:

```markdown
# Workspace

| Area       | Path         | Stack        |
|------------|--------------|--------------|
| ios        | ./ios        | ios-xcode    |
| backoffice | ./backoffice | web-react    |
| backend    | ./backend    | node-backend |
```

`scripts/lib/workspace.mjs` provides: `isWorkspace(root)` (does `WORKSPACE.md` exist?),
`readMembers(root)` (parse the table), `writeMembers(root, members)` (round-trip), and
`resolveArea(root, area)` (→ path + stack).

### 6.2 Detection (ws-002)
Loop the **existing** `detectStack()` over each declared member path; store the result in
the `Stack` column. No change to detection logic — just applied per member dir.

### 6.3 `create.mjs` mode switch (ws-003)
On start: if `WORKSPACE.md` present (or `--workspace`), enter workspace generation;
otherwise the current single-repo path runs unchanged. Workspace generation writes the
root files once and iterates members for their constitution, breadcrumb, and verify.

### 6.4 Split constitution (ws-004, ws-005)
Root `CONSTITUTION.md` keeps git/process/decisions; a new `constitution-area.md.template`
produces each `constitutions/<area>.md` with that stack's invariants and pitfalls.
`AGENTS.md` startup gains one routing line: *read root `CONSTITUTION.md` + the
`constitutions/<area>.md` for the repo you're touching.* AGENTS.md stays ≤80 lines.

### 6.5 `FEATURES.md` Area column (ws-006)
Feature table gains an `Area` column; `Depends on` may reference rows in other Areas.
A cross-Area story is one epic with one row per platform (D2).

### 6.6 verify orchestration (ws-008)
Each member gets a real stack-native `verify.sh` (existing generator output). A new
`verify-root.sh.template` produces the root orchestrator:

```
./verify.sh                 # every member, in WORKSPACE.md order
./verify.sh backend test    # one member, one mode — fast
```

The root script `cd`s into each member, runs its `verify.sh`, reads its
`HARNESS_VERIFY: PASS|FAIL` line, and emits one aggregate `HARNESS_VERIFY:` line.
Evidence in `FEATURES.md` names the Area that produced the PASS
(`./verify.sh backend → PASS`).

### 6.7 Hoist-migration (ws-009)
Extend `legacy.mjs` to recognize a harness living *inside a member dir* as a distinct
case (today `create` blanket-refuses any existing harness). The hoist promotes it:
member `AGENTS.md` → root map, `CONSTITUTION.md` → `constitutions/<area>.md`, `FEATURES.md`
rows → root `FEATURES.md` tagged with the Area, `verify.sh` → `<area>/verify.sh`. Missing
members are generated. Old files land in `archive/legacy/` — **nothing is deleted**,
honoring the existing invariant. Documented in `references/workspace-migrate.md`.

### 6.8 Add-a-member-later (ws-010)
The same machinery, narrowed: append a `WORKSPACE.md` row, generate that one member's
constitution + breadcrumb + verify, and leave every existing member untouched.

## 7. Invariants added

- **Never generate a member harness alongside a workspace root.** The multi-repo version
  of the existing anti-competing-harness rule: if a root `WORKSPACE.md` exists, `create`
  inside a member dir refuses and points to add-a-member-later.
- **Single-repo output is unchanged when no `WORKSPACE.md` is present.** Enforced by a
  regression guard (`ws-012`).
- **Membership is only ever read from `WORKSPACE.md`.** No implicit directory scanning at
  verify/migrate time.

## 8. Build order

Follows the `Depends on` chain in [FEATURES.md](../FEATURES.md):

```
ws-001 ─▶ ws-002 ─▶ ws-003 ──┬─▶ ws-004 ─▶ ws-005
 (spine: WORKSPACE.md,        │   (constitution split + AGENTS routing)
  detection, mode switch)     ├─▶ ws-006  (Area column)
                              ├─▶ ws-007  (breadcrumbs)
                              ├─▶ ws-008  (verify orchestration)
                              │      └─▶ ws-009 ─▶ ws-010  (hoist, then add-member)
                              └─▶ ws-011  (docs)
                                     ws-012 depends on ws-003 + ws-008 + ws-009 (regression)
```

**ws-003 is the gate** — nothing user-visible works until the mode switch lands. Land the
spine first, prove single-repo is unchanged, then fan out.

## 9. Definition of done (epic)

All twelve rows ✅ with recorded evidence; `./verify.sh test` green; the regression suite
proves single-repo output is byte-for-byte unchanged; a real 3-member monorepo generates,
verifies (`./verify.sh` aggregate PASS), and hoist-migrates a pre-existing member harness
without data loss.
