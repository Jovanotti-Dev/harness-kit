# Harness Generator — Build Plan

> A general-purpose reliability harness generator for AI coding agents.
> Works across frontend / backend / mobile. Built for **big, long-running projects**.
> Placeholder skill name: `forge` (rename before shipping).

---

## 1. Why this exists

Coding agents are capable but unreliable across sessions: they forget context, drift
out of scope, claim "done" before verification, and start each session inconsistently.
A harness is the scaffolding that fixes that. This tool *generates and audits* that
scaffolding for any repo.

Two reference points studied:

- **harness-creator** (WalkingLabs course skill) — 5 files, hardcoded stack detection,
  no mobile, `progress.md` grows unbounded.
- **Alfin's edts-harness** (`edtsmobile/edts-harness`) — elegant 3-file design
  (CLAUDE.md / AGENTS.md / TASKS.md), strong audit script, but single unbounded
  TASKS.md, no mobile, and it's a *manual* skill (agent fills placeholders) — no real
  generator or environment probing.

The state-of-the-art spec-driven frameworks (Spec Kit, OpenSpec, BMAD) are **too heavy
for feature work** (benchmarks: 12 min OpenSpec vs 90 min Spec Kit vs 5.5 hrs BMAD for
the same task). But two of their mechanics are worth stealing — see §3.

**This design = the lightweight session loop + OpenSpec's archive + Spec Kit's
constitution + a real generator with mobile stack profiles. That intersection does not
exist yet.**

---

## 2. Core principle

A **harness is repo-portable**: it must work for a teammate or CI agent who clones the
repo with nothing special installed, and degrade gracefully. Personal-machine tooling
(RTK, Headroom, Caveman) stays out. Repo-scoped tooling (graphify) is detected and
wired in conditionally.

---

## 3. The two stolen mechanics (the big-project upgrades)

**A. Archive mechanism (from OpenSpec).** Completed work is moved *out of the hot path*
into a cold `archive/`. The agent greps it on demand but never loads it wholesale. This
is the fix for the unbounded-state problem that both reference harnesses have
(one real project's progress log hit 426 lines; Alfin's TASKS.md grows forever). **Active context
stays small and hot; finished work goes cold.**

**B. Constitution (from Spec Kit).** A small, permanent file of project-level invariants
and past decisions (e.g. a project's hard-won API defaulting rule, "never weaken ATS"). Never
archived, always in context. Survives every reset and compaction.

Plus one principle (from awesome-harness-engineering): **shrink the tool/action space by
phase.** The harness tells the agent which actions are in scope for setup vs. implement
vs. verify. Cheap to state in markdown, real reliability payoff.

---

## 4. Generated harness — file design

Three profiles so "how many files" is a per-project choice, not dogma.

### `--profile lite` (small/solo/short) — ~ Alfin's design, credited
- `CLAUDE.md` / `AGENTS.md` — router + rules + inline verification
- `state/<name>.md` — objective, active work, blockers, next step (with a fenced
  `Status | Task | Evidence` block, script-parseable)
- `verify.sh` — kept even here; "run the checks" as prose is skippable

### `--profile standard` (default, most projects)

| File | Role |
|---|---|
| `AGENTS.md` / `CLAUDE.md` | **Router only** — startup order, project overview, verification, definition of done, handoff. < ~80 lines. Does **not** restate rules; it points to `CONSTITUTION.md`, which wins on any conflict. **Pointer convention:** `CLAUDE.md` contains only `@AGENTS.md` so Claude Code and other agents share one source of truth. |
| `CONSTITUTION.md` | **Owns every rule** — invariants (architecture, platform), prohibitions (code, process), git — plus dated decisions. Binding, never archived, always in context. Rules live here and nowhere else, so they can't drift. *(Spec Kit)* |
| `FEATURES.md` | **Scope backbone.** A pretty, previewable Markdown file with a *strict, parseable* table: `ID \| Feature \| Status \| Depends on`, plus per-feature `Done when` + an evidence sub-table (Alfin's `Status \| Task \| Evidence`). The `Depends on` column carries the dependency graph. Readable in Obsidian **and** machine-parseable (regex, like Alfin's audit parses his tables). No JSON — the whole harness is now markdown-previewable. Optional `feature_list.json` export only if piping into external tooling. |
| `state/<name>.md` | The **only** state file read at session start. Hard-capped (~100 lines): current objective, active feature, blockers, next step, last verify result. |
| `archive/` | Completed features + old session logs. Grepped, never loaded whole. *(OpenSpec)* |
| `verify.sh` | Multi-mode: `setup\|build\|test\|lint\|all`. Prints machine-parseable final line `HARNESS_VERIFY: PASS/FAIL`. |

### `--profile full` (+journal, +checker, multi-team)
- `JOURNAL.md` — append-only narrative log (bugs found/fixed, gotchas). Appended, never
  read whole; feeds `archive/` on rotation.
- `evaluator-rubric.md` — the **maker-checker** yardstick. A separate checker pass (or
  subagent) grades finished feature *work* against it — acceptance criteria met, tests
  present, no scope creep — distinct from `audit.mjs`, which only grades *harness* health.
  Turns "looks done" into "graded done." Highest-value add for big projects.

### Multi-person attribution — "who actually did this?"
The harness is shared via git and worked on from several machines (each person's own agent —
Claude, Codex, whatever). Reading the harness must answer *who did which part*, at a glance,
without running git commands.

- **`By` column** on the `FEATURES.md` summary table (who did it / who's on it now) **and on
  every evidence row** — the per-row granularity is what captures split work, e.g. a feature
  where one person wrote the code and another ran the on-device manager check.
- **`JOURNAL.md` entries are author-stamped**: `### 2026-07-08 · <author> · <lesson>`.
- **Epic headers carry `Started` + `Started by`** — whoever initialized the epic knows the PRD
  context and scope intent, so teammates know who to ask.
- **Names come from `git config user.name`** on the machine running the session — never from
  the agent (which doesn't know, and would guess). Tool-agnostic by construction.
- **Git corroborates:** commits are feature-ID-prefixed (`feat-042: …`), so
  `git log --grep="feat-042"` proves what the markdown claims. Markdown = at a glance,
  git = ground truth; the audit can flag disagreement.
- **Concurrency — one state file per person:** `state/<git config user.name>.md`. Git only
  conflicts when two branches change the *same lines of the same file*, so giving each person
  their own file makes **merge, rebase and cherry-pick all conflict-free by construction** —
  no merge strategy, no `.gitattributes`, no per-developer setup that can be forgotten.
  (Earlier drafts used a shared `state/<name>.md` with `merge=ours`; rejected because it needs
  per-dev git config, silently degrades if missed, and rebase inverts ours/theirs.)
- **Cross-person visibility lives in `FEATURES.md`**, which merges normally and carries every
  in-flight feature with its `By` owner. A state file answers only "what am *I* doing now";
  it keeps a short **In flight elsewhere** note pointing at teammates' work.
- **Rejected: multiple active features in one state file.** It would duplicate `FEATURES.md`
  and break the single-active-feature rule that makes the agent unambiguous at startup. A
  person's own multiple in-flight work is already handled by one **Now** + a **Parked** list.

### Change log — "what did you change in response to my prompt?"
Every feature/session entry carries a **`Changes` table**: `File | Change | Why`, appended
by the agent *after each edit* and timestamped (WIB), so it reads as a per-prompt record.
It lives in the active entry in `state/<name>.md` and rotates into `archive/` when the feature
closes. (This is an earlier harness's "Files Modified This Session", promoted to a
first-class, always-present element.)

**Git is the ground truth, not the table.** A hand-maintained file-list drifts. So:
- `verify.sh` surfaces `git diff --stat` and `git status` so the real change set is always
  one command away.
- `audit.mjs` flags drift: files in `git diff` that are missing from the Changes table (and
  vice-versa). The log is thus *checkable*, not just the agent's self-report.
- For repos without git, the table stands alone but the audit downgrades that check to a
  warning.

### Feature vs. session — the key separation (answers "why not Alfin's merged file")
- **feature = scope**, lives in `FEATURES.md` (strict Markdown table), persists across
  sessions, carries the dependency graph in its `Depends on` column.
- **Epic grouping:** `FEATURES.md` holds *multiple epics* — one epic = one PRD = one ID
  prefix (`auth-`, `pay-`). One feature is active at a time (`state/<name>.md`), but the backlog may
  span epics, so a **parked** feature (e.g. a parked feature blocked on a test account) never stalls
  unrelated work. `state/<name>.md` gains a short **Parked** section naming why each item waits.
- **`FEATURES.md` layout:** an epic roll-up table at the top (the dashboard), then per-epic
  `##` sections each containing its feature table **followed immediately by its own open-feature
  detail** as `###` — detail stays with its epic, and the `##`/`###` nesting drives the Obsidian
  outline. **Term settled: "Epic"** — matches Jira vocabulary 1:1, so the harness lines up with
  the team's tracker. (Avoid "Task": it means the *smallest* unit in Agile, so it inverts the
  hierarchy. Avoid "Project"/"Module": both already mean something else here.)
- **Epic rotation:** when every feature in an epic is ✅, the whole epic section moves to
  `archive/epics/<name>.md` and leaves a one-line entry under a **Shipped** heading. Prevents
  `FEATURES.md` accumulating years of completed epics.
- **session/task = work**, lives in `state/<name>.md` (active) → `archive/` (done).
- Evidence uses Alfin's `Status | Task | Evidence` table (🟡/🔴/✅) — borrowed as the
  readable format *inside* a feature's evidence, not as a replacement for the JSON.

---

## 5. The skill's own structure

```
~/.claude/skills/forge/
├── SKILL.md          # router: modes = create / loop / audit. < ~120 lines.
├── templates/        # AGENTS.md, CONSTITUTION.md, STATE.md, FEATURES.md, verify.sh, JOURNAL.md, evaluator-rubric.md
├── profiles/         # one file per stack — DATA, not code
│   ├── web-react.yaml
│   ├── node-backend.yaml
│   ├── python-backend.yaml
│   ├── ios-xcode.yaml
│   ├── android-gradle.yaml
│   ├── flutter.yaml
│   ├── react-native.yaml
│   └── generic.yaml
├── scripts/
│   ├── create.mjs    # detect stack → PROBE env → detect integrations → render files
│   ├── audit.mjs     # subsystem scores + drift checks (fork Alfin's, extend)
│   └── rotate.mjs    # move completed features/sessions from STATE → archive/
└── references/       # loaded on demand: mobile-verification.md, context-budget.md, archive-policy.md, multi-agent.md
```

### Stack profile format (data-driven — adding a stack = one file, no code change)
```yaml
# profiles/ios-xcode.yaml
detect:
  any: ["*.xcworkspace", "*.xcodeproj", "Package.swift + Sources/"]
probe:                       # cheap read-only cmds run at generation time
  workspace: "ls *.xcworkspace"
  schemes: "xcodebuild -list -json"
  simulators: "xcrun simctl list devices available"
verify:
  build: 'xcodebuild -workspace {workspace} -scheme {scheme} -destination "{dest}" build | tee /tmp/b.log && grep -q "BUILD SUCCEEDED" /tmp/b.log'
  test:  'xcodebuild ... -testPlan {plan} test | tee /tmp/t.log && grep -q "TEST SUCCEEDED" /tmp/t.log'
pitfalls:                    # injected into AGENTS.md — real production lessons
  - "Pipe xcodebuild through tee + grep 'BUILD SUCCEEDED'; tail alone masks failures under set -e."
  - "Check IPHONEOS_DEPLOYMENT_TARGET before using newer SwiftUI APIs (e.g. @FocusState is iOS 15+)."
  - "Never open .xcodeproj directly when a .xcworkspace exists."
```

**The probe step is the core differentiator** — Alfin's setup is manual template-filling;
this runs the environment (list schemes, detect installed simulators, read package.json
scripts) so `verify.sh` works on the *first* run. (an early init.sh shipped with a stale
"iPhone 15" simulator that didn't exist — probing prevents exactly that.)

### Integrations detection
Alongside stack detection, probe for repo-scoped tools and wire them in conditionally:
- **graphify**: if `graphify-out/` exists → add "codebase questions → `graphify query`
  first" to AGENTS.md and `graphify update .` to the post-edit checklist, guarded so the
  harness still works without it.
- Personal-machine tools (RTK / Headroom / Caveman) are **out** — they belong in
  `~/.claude`. Ponytail's "ship minimal code" becomes one line in AGENTS.md, not a dep.

---

## 6. Audit (fork Alfin's `audit-harness.mjs`, extend)

His script is the strongest of the three studied — keep its structure (static checks, no
project commands run, single-file HTML report) and its existing drift checks (AGENTS.md
line cap, TASKS freshness, stale IN PROGRESS, leftover placeholders, referenced docs
exist). **Add** big-project checks:
- STATE.md over its line cap (overflow should have been rotated to archive/)
- feature marked `done` with empty `evidence`
- dependency cycle in `FEATURES.md` (parse the `Depends on` column)
- feature `done` while a dependency is still open
- `FEATURES.md` table format drift (bad status symbol, missing column)
- `verify.sh` references a command/script that no longer resolves
- CONSTITUTION.md exists and is non-empty
- STATE.md date older than newest git commit (drift)
- **Changes table drift**: files in `git diff --stat` missing from the active entry's
  Changes table, or vice-versa (warning-only if the repo isn't git)

Run on explicit request only (mirror Alfin's rule: never auto-run audit).

---

## 7. Build order

1. **Templates by hand (½ day)** — write all 6, instantiate on a real project, diff against the
   real battle-tested harness to validate the design before any code.
2. **`create.mjs` + 3 profiles (1–2 days)** — ios-xcode, web-react, node-backend.
   detect → probe → render. Test on 3 real repos.
3. **`rotate.mjs` + archive policy (½ day)** — the OpenSpec-style hot/cold split.
4. **`audit.mjs` (1 day)** — fork Alfin's, add the §6 checks.
5. **SKILL.md + references (½ day)** — keep SKILL.md a router (follows its own
   context-budget advice).
6. **Prove it (ongoing)** — generate onto a fresh project, run 2–3 real agent sessions,
   note where the agent ignored or fought the harness. That feedback loop is the real
   benchmark; the structural score only measures shape.

Deliberately skipped in v1: hooks/automation (auto-print STATE.md on SessionStart,
loops). Most fragile layer; add once the file design is proven.

---

## 8. Differentiators vs. the references (the pitch)

1. **STATE + archive split** survives long projects where Alfin's single TASKS.md and
   harness-creator's progress.md bloat.
2. **Real generator with stack profiles + environment probing**, where Alfin's is manual
   fill-in and harness-creator's detection is hardcoded in JS.
3. **Mobile / multi-stack with baked-in gotchas** — nothing in the studied field
   generates a working iOS/Android/Flutter harness.
4. **Constitution + dependency-aware scope** — persistent invariants and a real feature
   DAG, neither of which the reference harnesses have.

---

## Sources
- awesome-harness-engineering — github.com/ai-boost/awesome-harness-engineering
- SDD deep dive (Spec Kit / OpenSpec / BMAD) — arceapps.com/blog/sdd-frameworks-analysis-spec-kit-openspec-bmad
- Alfin's harness — github.com/edtsmobile/edts-harness
- WalkingLabs course — github.com/walkinglabs/learn-harness-engineering
