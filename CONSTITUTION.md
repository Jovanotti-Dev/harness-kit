# Constitution — harness-kit

> **Binding.** This file owns every rule in the project. `AGENTS.md` describes *how to work*;
> this file defines *what is always true*. On any conflict, this file wins.
> Never archived, always in context. Changing a rule is a deliberate amendment — date it.

## Invariants — architecture

- Keep the CLI entry thin: parse arguments, call a library function, print the result.
- Logic lives in `lib/` and stays testable without spawning a process.

## Invariants — platform

- Node v24.15.0, package manager `npm`.
- A CLI that exits 0 is not a CLI that worked. Assert on the output, not just the exit code.
- Keep runtime dependencies at zero where possible — every dependency is a thing users must install to run your tool.
- Scripts invoked by other tools must print a machine-parseable result line, not just human prose.

## Prohibitions — code

- No `console.log` for control flow — return values, print once at the edge.
- Fail loudly on bad input; never silently continue with a default that hides the problem.

## Prohibitions — process

- **Never auto-commit.** Update files, report what changed, let the user decide.
- Never mark a feature ✅ without evidence recorded in `FEATURES.md`.
- One feature active at a time per person (see your `state/<name>.md`). Out-of-scope ideas
  become new `FEATURES.md` rows, not drive-by edits.

## Git

- Base branch for PRs: `main`. One unit of work per branch.
  - Feature work: `phase-N/<topic>`, one phase per branch.
  - Maintenance that belongs to no feature row: `<type>/<topic>` — `fix/`, `docs/`, `chore/`.
- **Commit messages are prefixed with the feature ID** when the work belongs to a feature row:
  `feat-042: <summary>`. This lets `git log --grep="<id>"` corroborate the `By` column in
  `FEATURES.md` — markdown gives attribution at a glance, git proves it.
- **Maintenance commits use a type prefix instead:** `fix:`, `docs:`, `chore:`. There is no
  `By` column to corroborate, so traceability comes from the PR and — when the lesson
  generalises — a `JOURNAL.md` entry. This is for work too small to track, not an escape from
  tracking: if it grows past one session, or changes behaviour someone else depends on, stop
  and give it a feature row.
- **State is one file per person:** `state/<git config user.name>.md`. You write only your own
  file; nobody else ever touches it. Because git only conflicts when two branches change the
  *same lines of the same file*, this makes **merge, rebase and cherry-pick conflict-free by
  construction** — no merge strategy, no `.gitattributes`, no per-developer setup to forget.
- **Cross-person visibility lives in `FEATURES.md`, not in state files.** `FEATURES.md` merges
  normally and shows every in-flight feature with its `By` owner. Your state file answers only
  "what am *I* doing right now." Keep a short **In flight elsewhere** note when a teammate
  picks up work you care about.
- Attribution (`By` columns, journal authors) comes from `git config user.name` on the machine
  running the session — never from the agent, so it works identically for any tool.

---

## Decisions

_Dated entries. Add one whenever an arguable choice gets settled — include the reasoning, so
it can be reopened later without redoing the analysis. Amend by adding a new dated entry that
supersedes the old one; never silently edit history._

<!-- ### YYYY-MM-DD · <short title>
     <the rule, then why it was chosen over the alternative> -->

### 2026-07-19 · Profiles are data, never code
Adding a stack means adding one file to `profiles/`. No script may grow a `switch` on stack
id. This is what keeps the tool general instead of accreting special cases.

### 2026-07-19 · Zero runtime dependencies
Profiles are `.mjs` rather than YAML specifically to avoid shipping a parser. Every
dependency is something a user must install before the tool runs.

### 2026-07-19 · The tool verifies itself by doing its job
`verify.sh` runs `npm test`, which generates a harness into a throwaway repo and audits it.
A green suite that does not exercise generate-then-audit would prove nothing.

### 2026-07-24 · Workspace mode is monorepo-only for v1
One `.git` at the root. Attribution (`git config user.name`) and knowledge-graph hook
detection both assume a single git root; polyrepo (a `.git` per member) is deferred rather
than designed around. Chosen from the Workspace-mode epic (`archive/epics/workspace-mode.md`).

### 2026-07-24 · The atomic active unit is the feature row, not the epic
"One feature active at a time per person" operates on `FEATURES.md` rows. A cross-area story is
one epic with one row per area; it is worked one row at a time and done when all its rows are ✅.
This is why each platform is its own row (own Area, `By`, evidence) rather than a checklist
inside one mega-feature — it preserves per-platform status and reuses the epic→feature hierarchy.

### 2026-07-27 · A workspace generates what a single repo generates
At the same `--profile` tier, a workspace root produces the same file set as a single repo —
including `state/<name>.md` and `archive/` at the root, and `JOURNAL.md` + `evaluator-rubric.md`
on `full` — plus the workspace-only files (`WORKSPACE.md`, `constitutions/<area>.md`, member
breadcrumbs, member `verify.sh`, root orchestrator). **Anything the generated `AGENTS.md` or
`CONSTITUTION.md` tells an agent to read, generation must have written.** A startup step
pointing at a file that was never created is a broken harness whatever else it scores. Found by
the 2026-07-27 shakedown: workspace mode wrote no `state/` while its own `AGENTS.md` step 2
told the agent to read one. See `docs/workspace.md` §10.2.

### 2026-07-27 · Polyrepo is refused with a plan, and `.git` is never touched
A workspace root whose members each carry their own `.git` is detected, **refused, and given a
written conversion plan** — never generated into silently and never converted automatically.
The intended end state is a monorepo. The refusal is not pedantry: with member histories
invisible to the root, the git-backed checks (drift, `git log --grep` attribution, hook
detection) do not fail, they *silently pass*, so the audit reports health for a harness whose
evidence checks are inert. A silent pass is worse than an error.
**No mode, flag, or request may delete or rewrite a `.git` directory.** It is the only artefact
that cannot be rebuilt from the working tree.

The line is *destructive versus additive*, not *git versus not-git* (amended 2026-07-27 after
the first real conversion). `git subtree add` **reads** a member's `.git` and writes only to the
root; it destroys nothing and is reversible by resetting the root. A tool may run that. Deleting
the member's `.git`, force-pushing, or rewriting history is irreversible, and a tool may not —
whatever flag is passed.

So: when harness-kit *discovers* a polyrepo it refuses and prints the plan (nothing was asked
of it). When the user *asks* it to adopt named projects, it may import them with history, verify
the import, then print what to delete and stop. Both paths end at the same boundary.
See `docs/workspace.md` §10.3–10.4 and `references/polyrepo-convert.md`.

### 2026-07-27 · The refuse-alongside-a-foreign-harness guard applies at a workspace root
`create` refuses to write beside an existing foreign harness in a single repo; the same guard
binds at a workspace root, with the same force. Reaching a workspace through `WORKSPACE.md`
does not make older instructions disappear — it makes them worse, because one stale file now
governs several projects. Found by the same shakedown: workspace generation wrote a full
harness beside a `CLAUDE.md` reading "always read progress.md first, never run tests".

### 2026-07-27 · Maintenance work has a lane, and it is narrow
The git rules covered only work with a feature ID, so corrective work outside an epic had no
legal branch name or commit prefix — PR #6 fixed three audit defects and could not follow the
rules it shipped under. Two options: force every fix through a feature row (accurate, but
`FEATURES.md` fills with one-line chores and stops being a scope backbone), or give maintenance
a `<type>/` lane. Chose the lane, bounded: past one session, or any change someone else depends
on, it gets a row. The bound is what stops the lane becoming a way to do untracked feature work.

### 2026-07-27 · An audit check must distinguish done from never-started
A check may not fail a project for having completed and rotated its work. Every check whose
subject can legitimately be empty must first ask *why* it is empty — a closed epic rotated to
`archive/` and an epic that was never written both leave `FEATURES.md` with no rows, and only
one of them is a defect. Scoring them the same punishes the exact behaviour the harness
teaches. Promoted from `JOURNAL.md` (2026-07-27).

### 2026-07-24 · Workspace membership is explicit, never guessed
`WORKSPACE.md` is the sole source of truth for what is a member. `Area` is a user-chosen unique
label (two members can share a stack), and the detected stack is stored beside it. Nothing is
inferred by scanning the directory — so `node_modules/`, `archive/`, and repos left out of the
table are invisible to verify and migrate for free.
