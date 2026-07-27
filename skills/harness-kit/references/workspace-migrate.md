# Workspace migration — two distinct cases

Two different situations both count as "workspace migration," and they are not interchangeable:

| Case | Where the old harness is | Section |
|---|---|---|
| **Hoist** | inside a *member* directory | [below](#hoist-migration--lift-an-in-member-harness-up-to-a-workspace-root) |
| **Root migrate** (`wsp-004`) | already at the *workspace root* | [Root migrate](#root-migrate--a-foreign-harness-already-at-the-workspace-root) |

Hoist is fully automatic — `create` detects and promotes it with no flag. Root migrate requires
`--migrate`, the same as single-repo, because a foreign harness at the root is the case `create`
otherwise refuses (`wsp-003`).

## Hoist-migration — lift an in-member harness up to a workspace root

When a folder holds several repos and **one of them already has a harness**, you don't want to
refuse (the normal legacy behavior) or generate a competing one. You want to *hoist* that
harness up to the container root and fold the other repos in. This is workspace migration.

## When it triggers

Automatically, inside workspace mode. If the target has a `WORKSPACE.md` and any listed member
directory contains an `AGENTS.md` or `CONSTITUTION.md`, `create` treats that member as an
existing harness to promote rather than a conflict to refuse.

```bash
# 1. Declare the members (the folder is a monorepo root, one .git).
#    Area is a label you choose; Stack is filled in by detection.
cat > WORKSPACE.md <<'EOF'
# Workspace

| Area | Path | Stack |
|------|------|-------|
| api  | ./api  | node-backend |
| web  | ./web  | web-react |
EOF

# 2. Generate. The member harness in ./api is hoisted; ./web is generated fresh.
node skills/harness-kit/scripts/create.mjs --target .
```

## What moves where

| From (inside the member) | To | Why |
|---|---|---|
| `CONSTITUTION.md` | `constitutions/<area>.md` | its rules become that area's stack rules |
| `FEATURES.md` rows | root `FEATURES.md`, tagged with `Area` | one backlog for the workspace |
| `AGENTS.md` | `archive/legacy/<area>/` | the root gets a fresh shared map |
| `CLAUDE.md` | `archive/legacy/<area>/`, replaced by a breadcrumb | points up to the root harness |
| `state/` | `archive/legacy/<area>/` | state lives once, at the root |
| `verify.sh` | left in place at `<area>/verify.sh` | the root `verify.sh` orchestrates it |

## Invariants

- **Nothing is deleted.** Everything moved lands under `archive/legacy/<area>/`; the rules also
  live on at `constitutions/<area>.md` and the features at the root `FEATURES.md`.
- **The member stops competing.** After the hoist the member dir holds only its code, its
  `verify.sh`, and a `CLAUDE.md` breadcrumb — no `AGENTS.md`/`CONSTITUTION.md` for an agent to
  follow instead of the root.
- **No clobber of what's already at the root.** If a `constitutions/<area>.md` already exists it
  is kept; the hoist never overwrites the shared files.
- **Members without a harness are generated normally** — the hoist only touches those that have
  one.

## After migrating

Review the root `FEATURES.md` (migrated rows are grouped under a "Migrated features" epic — split
them into real epics as needed), fill in the workspace description in `AGENTS.md`, and run
`./verify.sh` to confirm every member is green.

---

## Root migrate — a foreign harness already at the workspace root

When the workspace root *itself* already carries a different harness — a hand-written
`CLAUDE.md`, an old tool's `feature_list.json`, a `progress.md` — `create` refuses (`wsp-003`)
for the same reason single-repo `create` does: generating alongside it leaves two competing
instruction files, and an agent loading `CLAUDE.md` follows the old one.

**This is not hoist.** Hoist promotes a harness found *inside a member*; here the foreign
harness is already at the root governing (or trying to govern) every member.

**The script detects; you migrate — same principle as single-repo** (`references/migrate.md`).
Classifying prose into rule vs. lesson vs. history takes judgement no script has. `--migrate`
only unblocks generation; it does not move anything for you.

### When it triggers

Pass `--migrate` to a `create` run that `wsp-003` would otherwise refuse:

```bash
node skills/harness-kit/scripts/create.mjs --target . --migrate
```

This mirrors single-repo `--migrate` exactly:

- the refusal is bypassed and the workspace skeleton is generated (`WORKSPACE.md`'s members,
  root `AGENTS.md`/`CONSTITUTION.md`/`FEATURES.md`, per-area constitutions, breadcrumbs, verify);
- files that already exist — most commonly `CLAUDE.md` — are **left untouched**, not overwritten;
- the legacy report (which old files were found) is still printed, so you know what to migrate;
- if `CLAUDE.md` doesn't point at `AGENTS.md`, the same warning single-repo prints appears:
  the harness is unreachable and `audit` will report CRITICAL until you fix it.

### Mapping

Same destinations as single-repo migrate (`references/migrate.md`), with one difference: rules
that are genuinely **shared across every member** go in the root `CONSTITUTION.md`; anything
specific to one stack belongs in that area's `constitutions/<area>.md` instead.

| Old | Content | New home |
|---|---|---|
| `CLAUDE.md` (full instructions) | Rules and prohibitions | root `CONSTITUTION.md`, or `constitutions/<area>.md` if area-specific |
| | Startup order, verification, done criteria | root `AGENTS.md` |
| | *the file itself* | Replaced by the single line `@AGENTS.md` |
| `feature_list.json` / `TASKS.md` | Feature list, status, dependencies | root `FEATURES.md` rows, tagged with `Area` |
| `progress.md` / `claude-progress.md` | Decisions that govern future work | root `CONSTITUTION.md`, dated |
| | Lessons and gotchas | `JOURNAL.md`, author-stamped |
| | Session history | `archive/sessions/<date>-<topic>.md` |
| `session-handoff.md` | Current objective, next step, blockers | `state/<name>.md` (root, one per person) |

### Procedure

1. **Branch first.**
2. **Read every old file at the root in full.**
3. **Generate the skeleton:** `create --migrate` (above). Existing files are skipped, not
   overwritten.
4. **Move content, one file at a time**, using the mapping above.
5. **Rewrite `CLAUDE.md` last**, once `AGENTS.md` carries the startup order. Replace it with
   `@AGENTS.md`.
6. **Move the old root files to `archive/legacy/root/`.** Do not delete them.
7. **Audit.** `audit --target .` must report no CRITICAL failures.

### What "done" looks like

Same as single-repo migrate: `audit` reports zero critical failures, every decision and lesson
from the old files exists somewhere in the new ones, `archive/legacy/root/` holds the originals
untouched, and `./verify.sh` runs and prints `HARNESS_VERIFY: PASS`.
