# Session — 2026-07-27 · Audit hardening, maintenance lane, README modes

- **Author:** Jovanes Jovanotti
- **Closed:** 2026-07-27
- **Feature rows:** none — maintenance, under the lane this session added
- **Verify at close:** `./verify.sh test` → 61/61, `SELFTEST: PASS`, `HARNESS_VERIFY: PASS`
- **Self-audit:** 92 → **100/100**
- **Shipped as:** PR #6 (`2f1dea1`), PR #7 (`93fc4f3`), PR #8 (`88e83e5`) — all CI green on
  Node 20/22/24

## Origin

Started as a request to review harness-kit and describe what it does. The review found five
issues; fixing them exposed two more.

## Outcome

| PR | What |
|----|------|
| #6 | Three audit defects fixed, `JOURNAL.md` seeded, workspace session rotated |
| #7 | Maintenance lane in the git rules, propagated to both generator templates |
| #8 | `workspace` + `migrate` modes documented, failure-mode table added to README |

Tests 55 → 61. Every new test confirmed failing before it was confirmed passing.

## Changes

| File | Change | Why |
|------|--------|-----|
| `scripts/lib/parse.mjs` | New `shippedEntries()` — counts rotated epics, ignores `_None yet._` | Finding 1 |
| `scripts/lib/checks.mjs` | Epic/row checks accept a populated Shipped list | Finding 1 |
| `tests/parse.test.mjs` | +1 test: counts entries, rejects the placeholder, tolerates null | Finding 1 |
| `tests/regression.test.mjs` | Bug 8 + GUARD — shipped passes, genuinely empty still fails | Finding 1 |
| `.github/workflows/ci.yml` | Comment: 90 is a floor, fix the harness not the gate | Finding 2 |
| `scripts/audit.mjs` | `BOOKKEEPING` path exclusions + `isGitRepo` probe | Finding 3 |
| `scripts/lib/checks.mjs` | Staleness reports 3 distinct outcomes, not 2 | Finding 3 |
| `tests/regression.test.mjs` | Bug 9 — e2e; pinned commit dates (`%cI` is 1s-resolution) | Finding 3 |
| `archive/sessions/2026-07-25-workspace-mode.md` | New — the ws-001..012 session rotated out | Finding 4 |
| `state/jovanes-jovanotti.md` | 95 → 63 lines, stale claims removed | Finding 4 |
| `JOURNAL.md` | 4 entries: parser bug, Ubuntu CI, rotation-as-failure, noisy warning | Finding 5 |
| `CONSTITUTION.md` | Decision: an audit check must distinguish done from never-started | Promoted from JOURNAL |
| `CONSTITUTION.md` | Git section: maintenance branch lane + type-prefix commits, bounded | Convention gap |
| `CONSTITUTION.md` | Decision: why not a feature row per chore | Settled an arguable choice |
| `templates/CONSTITUTION.md.template` | Same amendment, placeholder form | Repo had drifted from its own generator |
| `templates/constitution-root.md.template` | Same, terser workspace phrasing | Workspace roots inherit it too |
| `tests/regression.test.mjs` | Bug 10 ×2 — generated constitutions carry the lane | Convention gap |
| `README.md` | `workspace` + `migrate` modes, failure-mode table, Status corrected | Undocumented shipped epic |

## What went wrong

- **The audit punished its own correct output.** A project that shipped every epic and rotated
  it scored two hard failures, because the checks were written before anything had been
  rotated. 92/100, two points above the CI gate, for following instructions.
- **A warning fired on unrelated work.** State staleness compared against the newest commit of
  any kind, so a README typo fix marked every state file stale.
- **The git rules had no lane for the work that fixed them.** PR #6 used `chore/` and `fix:`,
  neither of which existed in `CONSTITUTION.md`.
- **A whole shipped epic was undocumented.** Workspace mode (`ws-001..012`, 30 tests) was
  absent from the README's mode table; a reader with a monorepo would have concluded it was
  unsupported.
- **A test flaked on first run.** Bug 9's three commits landed inside one second, and `%cI`
  has one-second resolution, so they compared equal. Fixed by pinning `GIT_COMMITTER_DATE` —
  the flake was in the test, not the fix.

## The pattern

Four of these were the project being correct for the case its author was in and silently wrong
for the case they weren't: checks written inside an epic, rules written inside an epic, docs
written before workspace mode existed. Each surfaced only by using the tool from outside the
context it was written in. See `JOURNAL.md` 2026-07-27.

## Follow-ups left open at close

- **Real-world shakedown:** `--target` a genuine 3-repo monorepo (ios/backoffice/backend), and
  a hoist against a repo that already carried a single-repo harness. Carried since the
  Workspace-mode session → [archive](2026-07-25-workspace-mode.md). No test covers it: every
  workspace test builds its fixture from scratch, so none exercises a repo with real history.
- **The audit cannot detect a state file that is fresh but untrue.** Recurred twice this
  session at 100/100.
