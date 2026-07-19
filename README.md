# harness-kit

Generates and audits a reliability harness for AI coding agents — in any repo, on any stack
(frontend, backend, mobile).

The model is capable; the harness is what makes it *reliable*. `harness-kit` scaffolds the
files an agent needs to start consistently, stay in scope, prove its work before claiming
done, and resume cleanly after a context reset — then audits them as they drift.

Agent-agnostic by design: it generates `AGENTS.md` (with `CLAUDE.md` as a pointer), and all
attribution comes from `git config`, so it works the same under Claude Code, Codex, or Cursor.

## Install

```bash
npx skills add <username>/harness-kit
```

## Use

| Mode | When | What happens |
|---|---|---|
| **create** | New or existing repo with no harness | Detects the stack, probes the environment, writes the harness files |
| **loop** | Any working session in a harnessed repo | Session start → work → verify → handoff |
| **audit** | On request only | Scores harness health, reports drift |

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

Phases 1–2 done. `create` detects the stack, probes the environment and writes the harness;
`audit` scores it across four categories and catches drift — dependency cycles, done features
with no evidence, dead evidence links, duplicated rules, oversized state files.
Profiles: iOS/Xcode, React web, Node backend, generic fallback.
See [docs/plan.md](docs/plan.md).

## License

MIT
