# Create mode

Scaffold a harness into a repo. Works for empty and existing projects.

## Run it

```bash
node scripts/create.mjs --target /path/to/project [--profile standard] [--dry-run]
```

| Flag | Meaning |
|---|---|
| `--target DIR` | Project to scaffold (default: cwd) |
| `--profile lite\|standard\|full` | File set (default: `standard`) |
| `--stack ID` | Force a profile instead of detecting |
| `--dry-run` | Report what would be written, change nothing |
| `--force` | Overwrite existing files — **ask the user first** |

**Always `--dry-run` first on an existing repo** and show the user the plan before writing.

## What happens

1. **Detect** — profiles are matched by `priority` (lowest first). A profile declaring
   `packageDeps` must match one, which is what stops a React app matching `node-backend`
   just because both have a `package.json`. Falls back to `generic`.
2. **Probe** — runs the profile's read-only commands in the target to discover real values:
   the actual scheme, an installed simulator, the package manager from the lockfile, which
   npm scripts exist. Probes are best-effort — a failure returns `null` and degrades the
   output rather than aborting.
3. **Render** — fills the templates and refuses to write any file that still contains a
   `{{PLACEHOLDER}}`.

`AGENTS.md`'s "Knowledge graphs" section is conditional: `create` detects whether `graphify`
and/or `code-review-graph` are already installed in the target (via `graphify-out/`, `.mcp.json`,
and git hook markers) and writes a section documenting only the tool(s) actually present. If
neither is installed, the section — and its heading — is omitted entirely rather than left as
a dangling reference. See `scripts/lib/knowledge-graphs.mjs`.

## Rules

- **Never invent a check.** If the profile's verify step needs an npm script that doesn't
  exist, the generated `verify.sh` says so instead of emitting a command that always fails.
- **Never overwrite blindly.** Existing files are skipped. `--force` requires explicit user
  consent, per file.
- **Never leave a placeholder.** `assertNoPlaceholders` throws — a silent placeholder ships
  a harness that lies about what it checks.
- **Never auto-commit** the generated files.

## After generating

The output is a skeleton, not a finished harness. Tell the user to fill in:

- `AGENTS.md` — the `TODO` project description and structure
- `CONSTITUTION.md` — real architecture invariants; the profile only supplies stack defaults
- `FEATURES.md` — the first epic, its PRD link, and real features

Then confirm `./verify.sh build` actually passes before the first feature is started.

## Workspace mode (monorepo)

When several repos ship together from one monorepo root (e.g. `ios/`, `backoffice/`, `backend/`),
one harness at the root governs them all. It activates when the target has a `WORKSPACE.md` — the
explicit member registry (`Area · Path · Stack`). Monorepo only: one `.git` at the root.

```bash
# Declare members (Area is a label you choose; Stack is filled in by detection):
cat > WORKSPACE.md <<'EOF'
# Workspace

| Area | Path | Stack |
|------|------|-------|
| ios        | ./ios        | ios-xcode    |
| backoffice | ./backoffice | web-react    |
| backend    | ./backend    | node-backend |
EOF

node scripts/create.mjs --target .            # generate the workspace harness
node scripts/create.mjs --target . --add-member mobile --at ./mobile   # add one later
```

| Flag | Meaning |
|---|---|
| `--workspace` | Force workspace mode even without a `WORKSPACE.md` (prints guidance if absent) |
| `--add-member AREA` | Append a member and generate just its files |
| `--at PATH` | Path for `--add-member` (default `./AREA`) |

What it writes at the root: `AGENTS.md` (shared map, routes to the right constitution),
`CONSTITUTION.md` (shared rules) + `constitutions/<area>.md` per member, an **Area**-tagged
`FEATURES.md`, one `state/<name>.md` per person, and a `verify.sh` orchestrator
(`./verify.sh [area] [mode]`). Inside each member: only its `verify.sh` and a `CLAUDE.md`
breadcrumb pointing up. Membership is read only from `WORKSPACE.md`, never guessed.

- **One feature (row) active at a time per person** — the atomic unit is a `FEATURES.md` row,
  not the story/epic. A cross-area story is one epic with one row per area, `Depends on` may
  cross areas, and it's done when all its rows are ✅.
- **If a member already has its own harness**, it is hoisted up to the root rather than left to
  compete — see [workspace-migrate.md](workspace-migrate.md). Nothing is deleted.
- The root `verify.sh` is regenerated on every run (it's fully derived from `WORKSPACE.md`);
  per-member files and the root `AGENTS.md`/`FEATURES.md` are never overwritten.

## Adding a stack

Add one file to `profiles/`. No code changes. Shape:

```js
export default {
  id, name, priority,
  detect:  { files: [], globs: ['*.ext'], packageDeps: [] },
  probe:   { key: 'shell command', slow: { cmd: '...', timeout: 120_000 } },
  verify:  { build: '  cmd || fail "build"',
             test:  { requiresScript: 'test', block: '  {{pmRun}} test || fail "test"' } },
  pitfalls: ['Real lessons — each should have cost someone a debugging session.'],
  constitution: { architecture: '', platform: '', code: '' },
  defaults: { baseBranch, branchPattern, featureIdExample, techStack, structure }
};
```

Probe values are available to `verify` blocks and `constitution` strings as `{{key}}`.
