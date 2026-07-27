# Journal

> Append-only. Bugs found/fixed, gotchas, dead ends. Newest at the bottom.
> You append here and grep it — you never read it whole, so its size is free.
> Author comes from `git config user.name` on the machine that ran the session.
> If a lesson becomes a binding rule, promote it to `CONSTITUTION.md` and link back here.

---

<!-- ### YYYY-MM-DD · <author> · <one-line lesson>
     <what happened, and what it means for future work>
     → Promoted to a rule: see CONSTITUTION.md "<rule>"   (only if it generalized) -->

### 2026-07-24 · Jovanes Jovanotti · A table separator row was silently parsed as data
`parseTables` treated `|:-:|------|` as a data row, because the separator test only
recognised `|---|`. Every aligned column in `FEATURES.md` therefore produced one phantom
feature with a garbage ID. Nothing threw — the audit just reported confidently wrong
numbers, which is the worst failure mode a checker has. Found only once `tests/` existed
(hk-012); nine features had shipped on top of it.
Lesson: the parser is load-bearing for the entire audit, and a parser that degrades
quietly needs tests before it needs features.

### 2026-07-24 · Jovanes Jovanotti · CI runs Ubuntu on purpose, not by default
Development happens exclusively on macOS, so CI is the only thing that ever exercises the
Linux path. Probes, `find(1)` flags and shell behaviour differ enough between the two that
a generated `verify.sh` can be silently wrong on the platform most users are on. The
matrix is Node 20/22/24 for the same reason: zero runtime dependencies means the only
compatibility surface is the runtime itself.
Lesson: run CI on the platform you *don't* develop on — the one you use is already tested
every day.

### 2026-07-27 · Jovanes Jovanotti · The audit scored correct rotation as a failure
Both epics shipped and were rotated to `archive/epics/`, leaving `FEATURES.md` with no
open epic and no rows. The audit hard-failed "At least one epic" and "At least one feature
row" — 92/100, two points above the CI gate, for doing exactly what the harness instructs.
A checker that cannot tell "finished and rotated" from "never started" punishes the
behaviour it exists to encourage. The `## Shipped` list is what distinguishes them; a
freshly generated file carries the prose `_None yet._` rather than bullets, so counting
real list items separates the two cases without a new field.
→ Promoted to a rule: see CONSTITUTION.md "2026-07-27 · An audit check must distinguish
  done from never-started".

### 2026-07-27 · Jovanes Jovanotti · A warning that fires on unrelated work trains itself away
The state-staleness check compared each state file against the newest commit of *any*
kind, so a README typo fix, a CI tweak or a version bump marked every state file stale.
The check was right in principle — filesystem mtime is useless here, since `git checkout`
rewrites it — but wrong in its comparison set. Fixed by excluding prose and bookkeeping
paths (`docs/`, `.github/`, `README.md`, `LICENSE`, `CHANGELOG.md`, `JOURNAL.md`, `state/`)
from the "newest work commit" probe.
Lesson: a warning nobody can act on is worse than no warning, because it teaches the
reader to skip the whole category. Tune the comparison set, don't drop the check.

### 2026-07-27 · Jovanes Jovanotti · A written procedure is untested until someone runs it
`references/polyrepo-convert.md` was written from analysis and read as authoritative. Running
it for real on a three-project workspace found its **verification gate was wrong**:
`git log --oneline -- <area> | wc -l` returns 1, not the member's commit count, because imported
commits record paths relative to the member's own root. Anyone following the doc would have
concluded a successful conversion had failed — and possibly rolled it back. It also omitted that
`subtree add` rebuilds the working tree from history, so uncommitted and ignored files (`.env`,
signing config) silently do not return, and that a working-tree *deletion* which was never
committed comes back alive.
Lesson: a procedure doc is a hypothesis. Ship it, but treat its checks as unverified until the
first real run — and fix the doc from that run, not from re-reading it.
