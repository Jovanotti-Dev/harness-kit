# Hoist-migration — lift an in-member harness up to a workspace root

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
