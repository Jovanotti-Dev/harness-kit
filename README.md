# harness-kit

Generates and audits a reliability harness for AI coding agents — in any repo, on any stack
(frontend, backend, mobile).

The model is capable; the harness is what makes it *reliable*. `harness-kit` scaffolds the
files an agent needs to start consistently, stay in scope, prove its work before claiming
done, and resume cleanly after a context reset — then audits them as they drift.

Agent-agnostic by design: it generates `AGENTS.md` (with `CLAUDE.md` as a pointer), and all
attribution comes from `git config`, so it works the same under Claude Code, Codex, or Cursor.

## What it fixes

Each file exists because an unharnessed agent fails in a specific, repeatable way.

| Failure mode | The file that fixes it |
|---|---|
| Starts each session differently | `AGENTS.md` — one fixed startup order |
| Forgets what was already decided | `CONSTITUTION.md` — binding rules + dated decisions, always in context |
| Drifts out of scope mid-task | `FEATURES.md` — one active feature per person, dependency graph |
| Amnesia after a context reset | `state/<name>.md` — one file per person, resumable on its own |
| Claims done without proof | `verify.sh` — the gate, plus no ✅ without recorded evidence |
| Hot files grow until nothing fits | `archive/` — closed work rotates out, leaving a link |

## Install

```bash
npx skills add Jovanotti-Dev/harness-kit
```

(Replace `Jovanotti-Dev` with your own GitHub username/org if you've forked this repo.)

## Use

| Mode | When | What happens |
|---|---|---|
| **create** | New or existing repo with no harness | Detects the stack, probes the environment, writes the harness files |
| **workspace** | A monorepo root governing several member repos | One harness at the root covers every member; each gets a `verify.sh` and a breadcrumb pointing up |
| **migrate** | Repo already has a harness, in any flavour | Moves content to the file that now owns it; nothing is deleted |
| **loop** | Any working session in a harnessed repo | Session start → work → verify → handoff |
| **audit** | On request only | Scores harness health, reports drift, optional `--html` report |

`create` refuses to write alongside an existing harness — two competing instruction files means
the agent follows the old one and never sees the new harness. It prints a migration plan instead.

## What it generates

| File | Job |
|---|---|
| `CLAUDE.md` | One-line pointer to `AGENTS.md` — one source of truth |
| `AGENTS.md` | The router: startup order, verification, definition of done |
| `CONSTITUTION.md` | Owns every rule + dated decisions. Always in context, never archived |
| `FEATURES.md` | Scope backbone — epics, status, dependency graph, `By` owner, evidence |
| `state/<name>.md` | One file per person: what *I'm* doing now. Never merge-conflicts |
| `archive/` | Finished features & sessions — grepped, never loaded whole |
| `JOURNAL.md` | Author-stamped lessons, promoted to rules when they generalize |
| `evaluator-rubric.md` | Maker-checker yardstick for work quality |
| `verify.sh` | The gate — prints `HARNESS_VERIFY: PASS/FAIL` |

Three profiles: `lite` (small projects), `standard` (default), `full` (adds journal + rubric).

## Why one file per person

Git only conflicts when two branches change the *same lines of the same file*. Giving each
person their own `state/<git config user.name>.md` makes merge, rebase, and cherry-pick
conflict-free by construction — no merge strategy, no `.gitattributes`, nothing to forget.
Team-wide visibility lives in `FEATURES.md`, which merges normally.

## Status

v1 scope complete. `create` detects the stack, probes the environment and writes the harness;
`audit` scores it across four categories, catches drift, and can render a self-contained HTML
report. Nine stack profiles: iOS/Xcode, React web, Node backend, Node tool, Python, Go,
Flutter, Android/Gradle, and a generic fallback.

**Workspace mode** ships too: a `WORKSPACE.md` at a monorepo root generates one harness
governing every member — shared `AGENTS.md` and `CONSTITUTION.md`, per-area rules, an
`Area`-tagged `FEATURES.md`, per-member `verify.sh` plus a root orchestrator (`./verify.sh
[area]`). It hoists an existing in-member harness up rather than competing with it, and members
can be added later with `--add-member`. Monorepo only — one `.git` at the root; polyrepo is
deliberately deferred. See [docs/workspace.md](docs/workspace.md).

**harness-kit governs itself.** This repo carries its own generated harness, and `npm test`
generates a harness into a throwaway repo and audits it — the project's verification is the
tool doing its actual job. Both epics are shipped and rotated; see [FEATURES.md](FEATURES.md)
and [docs/plan.md](docs/plan.md).

## License

MIT
