# Epic · Workspace parity & repo shapes

- **Status:** ✅ done · closed 2026-07-28 · **Prefix:** `wsp-` · **By:** Jovanes Jovanotti
- **PRD:** [`docs/workspace.md`](../../docs/workspace.md) §10
- **Shipped in:** PRs #10–#19 (`wsp-001..009`)
- **Result:** a generated workspace scores 100 on its own audit; the mode matrix is complete
  for every situation across single-repo and workspace shapes; polyrepo is detected and either
  refused-with-a-plan or adopted-with-history, and a `.git` is never deleted or rewritten by
  any path, under any flag.

**Started:** 2026-07-27 · **Started by:** Jovanes Jovanotti

> Closes the gap between what workspace mode promises and what it writes, and defines what
> harness-kit does when it meets a repo shape it cannot govern. Every row came from the first
> real-world shakedown, run against a genuine three-project workspace — none was caught by the
> existing suite, because every workspace test built its fixture from scratch and asserted on
> the file set rather than on the audit passing.

| ID | Feature | Status | By | Depends on | Evidence |
|----|---------|:------:|----|------------|----------|
| `wsp-001` | Workspace generates `state/` + `archive/` at the root | ✅ | Jovanes Jovanotti | — | [archive](../features/wsp-001.md) |
| `wsp-002` | Workspace honours `--profile` tiers (`JOURNAL.md`, `evaluator-rubric.md` on `full`) | ✅ | Jovanes Jovanotti | `wsp-001` | [archive](../features/wsp-002.md) |
| `wsp-003` | `create` refuses at a workspace root carrying a foreign harness | ✅ | Jovanes Jovanotti | — | [archive](../features/wsp-003.md) |
| `wsp-004` | Workspace-level migrate: fold a foreign root harness in, nothing deleted | ✅ | Jovanes Jovanotti | `wsp-003` | [archive](../features/wsp-004.md) |
| `wsp-005` | Polyrepo detected → refuse + print conversion plan; `.git` never touched | ✅ | Jovanes Jovanotti | — | [archive](../features/wsp-005.md) |
| `wsp-006` | Evidence-link check accepts URLs instead of failing them as dead paths | ✅ | Jovanes Jovanotti | — | [archive](../features/wsp-006.md) |
| `wsp-007` | Root `verify.sh` stops clobbering user edits on re-run | ✅ | Jovanes Jovanotti | — | [archive](../features/wsp-007.md) |
| `wsp-008` | Workspace verify aggregate names the failing area(s) | ✅ | Jovanes Jovanotti | — | [archive](../features/wsp-008.md) |
| `wsp-009` | Interactive adopt: pick members, import each **with history**, stop before the destructive step | ✅ | Jovanes Jovanotti | `wsp-005` | [archive](../features/wsp-009.md) |

`wsp-003` is the refusal (stop the damage); `wsp-004` is the repair (move the content). They
shipped in that order for the same reason `create`/`migrate` do in a single repo — refusing is
safe on its own, migrating is not safe without it.

`wsp-005` and `wsp-009` are the same split one level up. `wsp-005` refuses a polyrepo found by
surprise; `wsp-009` serves the user who *asked* to build a monorepo and named the projects.
Different intent, so different answer — but the safety line is identical, and it fell in an
unusual place worth having stated precisely up front:

> `git subtree add` **reads** the member's `.git` and writes only to the root. It is additive,
> so a tool may run it. Deleting the member's `.git` afterwards is destructive and irreversible,
> so a tool may not.

`wsp-009` does the import and the verification, prints what to delete, and stops. `--no-history`
exists as an opt-in for throwaway history, names how many commits it drops, and is never the
default: the first real conversion took roughly three commands per member, so skipping history
saves minutes and costs everything.

**Done when** a generated workspace scores 100 on its own audit — the guard that would have
caught `wsp-001`, and the reason the existing placeholder-free assertion did not — and the mode
matrix below is complete for both single-repo and workspace shapes. Both held at close.

**Mode matrix** (final state — every cell shipped)

| Situation | Single repo | Workspace root |
|---|---|---|
| No harness | `create` ✅ | `create` ✅ |
| Foreign harness present | `migrate` ✅ | `wsp-003` refuse → `wsp-004` migrate ✅ |
| A member already has a harness | n/a | hoist ✅ |
| Members each have their own `.git` | n/a | `wsp-005` refuse + plan ✅ |
| User *asks* to build one from several repos | n/a | `wsp-009` adopt, with history ✅ |

**Decisions** — recorded in `CONSTITUTION.md` (2026-07-27):

- workspace/single-repo parity — a workspace generates what a single repo generates;
- polyrepo refused with a plan and `.git` never touched;
- the destructive-vs-additive boundary, amended after the first real conversion — `git subtree
  add` reads and writes only to the root (additive, a tool may run it); deleting a member's
  `.git` is destructive (a tool never may, under any flag);
- the foreign-harness guard binds at a workspace root;
- `git subtree add`'s merge commit is a narrow, named exception to "never auto-commit" — scoped
  to that one commit, only under `--adopt`, always announced before it runs.

## What went wrong, twice, both found only by running it

- **The shakedown itself** found six defects (`wsp-001`, `wsp-003`, `wsp-005`\*, `wsp-006`,
  `wsp-007`, `wsp-008`) by running workspace mode against a genuine three-project workspace
  instead of a synthetic fixture — none were caught by the existing suite, because every
  workspace test built its fixture from scratch and asserted on the file set rather than on the
  audit passing. (\*`wsp-005`'s policy came from the shakedown; the row was scoped out to its
  own feature after `wsp-004` closed.)
- **`wsp-009`'s implementation** found two more the same way: `.adopt-staging/` not existing on
  the first adoption (`fs.rename` doesn't create parent directories), and `git subtree add`
  requiring a clean working tree — which `refreshStacks` (persisting detected stacks to
  `WORKSPACE.md`) was dirtying moments before subtree needed it, on a real machine, not a
  contrived one. Neither showed up in isolated unit tests; both surfaced only from driving
  `create.mjs` as a real subprocess end to end.
- **`references/polyrepo-convert.md` had a wrong verification gate** (`git log -- <area> | wc
  -l` returns 1 on a perfect import, not the member's commit count) — also only found by
  actually converting a real repo (Twyne) rather than trusting the doc as written.

The pattern across the whole epic: the project was correct for the case its author was in and
silently wrong for the case they weren't — checks written before anything had been rotated,
rules written from inside an epic, docs written before anyone had run the procedure. Every one
surfaced by using the tool from outside the context it was written in.
