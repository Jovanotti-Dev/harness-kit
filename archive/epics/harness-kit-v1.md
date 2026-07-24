# Epic · harness-kit v1

- **Status:** ✅ done · closed 2026-07-24 · **Prefix:** `hk-` · **By:** Jovanes Jovanotti
- **PRD:** [`docs/plan.md`](../../docs/plan.md)
- **Result:** the v1 harness generator, audit, rotation, profiles, CI, and self-governance —
  15/15 features. Per-feature detail lives in `archive/features/hk-*.md`.

**Started:** 2026-07-19 · **Started by:** Jovanes Jovanotti

| ID | Feature | Status | By | Depends on | Evidence |
|----|---------|:------:|----|------------|----------|
| hk-001 | Templates for the generated harness | ✅ | Jovanes Jovanotti | — | 8 templates, commit 7d4779c |
| hk-002 | Stack profiles as data | ✅ | Jovanes Jovanotti | — | 5 profiles, commits 91638f8 + e27c177 |
| hk-003 | Generator: detect, probe, render | ✅ | Jovanes Jovanotti | hk-001, hk-002 | commit d9e943f; probed a real iOS repo correctly |
| hk-004 | Audit with drift detection | ✅ | Jovanes Jovanotti | hk-003 | commit 46b17b4; caught 7/7 planted defects |
| hk-005 | Dogfood: harness-kit governs itself | ✅ | Jovanes Jovanotti | hk-004 | [archive](../features/hk-005.md) |
| hk-006 | Rotation: move closed work to archive | ✅ | Jovanes Jovanotti | hk-005 | [archive](../features/hk-006.md) |
| hk-007 | Loop-mode reference doc | ✅ | Jovanes Jovanotti | hk-005 | [archive](../features/hk-007.md) |
| hk-008 | More profiles: python, go, flutter, android | ✅ | Jovanes Jovanotti | hk-002 | [archive](../features/hk-008.md) |
| hk-009 | HTML audit report | ✅ | Jovanes Jovanotti | hk-004 | [archive](../features/hk-009.md) |
| hk-010 | Fix flaky staleness check | ✅ | Jovanes Jovanotti | hk-004 | [archive](../features/hk-010.md) |
| hk-011 | Handle repos that already have a harness | ✅ | Jovanes Jovanotti | hk-003, hk-004 | [archive](../features/hk-011.md) |
| hk-012 | Regression tests, one per known bug | ✅ | Jovanes Jovanotti | hk-011 | [archive](../features/hk-012.md) |
| hk-013 | CI on every push | ✅ | Jovanes Jovanotti | hk-012 | [archive](../features/hk-013.md) |
| hk-014 | Conditional "Knowledge graphs" section — detect graphify / code-review-graph, omit when neither is installed | ✅ | Jovanes Jovanotti | hk-003 | `scripts/lib/knowledge-graphs.mjs`; `tests/regression.test.mjs` bug 7a/7b/7c; `SELFTEST: PASS` |
