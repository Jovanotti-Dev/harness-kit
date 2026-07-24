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

- Base branch for PRs: `main`. Work happens on `phase-N/<topic>` branches, one phase per branch.
- **Commit messages are prefixed with the feature ID:** `feat-042: <summary>`.
  This lets `git log --grep="<id>"` corroborate the `By` column in `FEATURES.md` — markdown
  gives attribution at a glance, git proves it.
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

### 2026-07-24 · Workspace membership is explicit, never guessed
`WORKSPACE.md` is the sole source of truth for what is a member. `Area` is a user-chosen unique
label (two members can share a stack), and the detected stack is stored beside it. Nothing is
inferred by scanning the directory — so `node_modules/`, `archive/`, and repos left out of the
table are invisible to verify and migrate for free.
