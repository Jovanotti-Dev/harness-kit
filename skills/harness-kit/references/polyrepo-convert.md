# Polyrepo → monorepo — converting a folder of independent repos

When a folder holds several projects and **each one has its own `.git`**, harness-kit cannot
govern it. This is the written procedure it prints instead of generating.

**This is a plan, not a script.** harness-kit never runs it. Converting rewrites where a
project's history lives and retires a remote other people may be pushing to — the user must
read it, decide, and run the commands themselves.

## Why refuse rather than continue

The harness assumes one git identity and one history at the root. When each member carries its
own `.git`, the root's history contains no member work, so the git-backed checks do not fail —
they **silently pass**:

- drift/staleness compares against a root history where member work never appears;
- `git log --grep="<id>"` cannot corroborate the `By` column for work committed in a member;
- knowledge-graph hook detection reads the root `.git/hooks` only.

The audit then reports a healthy score for a harness whose evidence checks are inert. A silent
pass is worse than an error, which is why this is a refusal and not best-effort.

## First: is a monorepo actually right?

Ask one question about the members:

> **Do they release independently, and does anything outside this product consume them?**

- **Yes** → they are genuinely separate products or shared libraries. Keep them apart. A
  workspace harness is the wrong tool; give each its own single-repo harness.
- **No** → they ship together and change together. Monorepo.

Submodules are not a third answer. A submodule stores a *pointer* to a commit, so the parent
still cannot make one atomic commit across two projects, and the root history still shows only
pointer bumps — the same silent-pass defect as polyrepo, with extra day-to-day cost (detached
HEAD, forgotten pointer updates, `clone --recursive`). They earn their keep only for an
independently released library, which is the "Yes" branch above.

## The three conversion routes

| Route | History | Members stay usable | Use when |
|---|:--:|:--:|---|
| **A. Fresh start** — delete member `.git`, commit files at root | ❌ lost | ❌ archive them | History is messy and a clean slate is wanted |
| **B. Subtree import** — `git subtree add` | ✅ kept, SHAs preserved | ✅ `git subtree push` syncs them | **Default.** Members remain as mirrors |
| **C. filter-repo import** — rewrite paths, then merge | ✅ kept, paths correct throughout | ❌ SHAs change, push-back no longer fast-forwards | Members are being archived and clean history matters most |

**B is the default.** It preserves the original commit objects, which is what keeps
`git subtree push` a fast-forward for the member remotes. C produces tidier history but rewrites
SHAs, permanently breaking the ancestry the push-back relies on.

## Route B, step by step

Throughout, `<area>`, `<url>` and `<branch>` come from `WORKSPACE.md` and each member's remote.

### 1. Safety first

- **Push every member's unpushed work.** Anything unpushed exists on one machine only.
  Check each: `git -C <member> log --oneline @{u}..HEAD`
- **Copy the whole folder** somewhere outside the working tree.
- **Note each member's branch.** They are often different (`dev`, `development`,
  `feature/...`); a monorepo has one branch structure, so decide which branch of each becomes
  the trunk, and whether the others are imported too.

### 2. Stop ignoring the members

The root `.gitignore` almost certainly excludes them. Remove those entries — the root must
track member files after conversion.

### 3. Import each member with its history

The target directory must not already exist as a tracked path, so move the working copy aside
first, then import:

```bash
mv <area> /tmp/<area>.bak
git subtree add --prefix=<area> <url> <branch>
```

Repeat per member. Each `subtree add` creates a merge commit joining that project's history
into the root repo under its own prefix.

### 4. Verify before deleting anything

**Do not use `git log -- <area>` as the check.** It reports `1` — the merge commit — even on a
perfectly good import, because the imported commits record paths relative to the member's own
root (`Sources/App.swift`, not `<area>/Sources/App.swift`). `--full-history` does not help and
`--follow` returns nothing. Trusting it would fail a conversion that actually worked.

Check the three things that do hold:

```bash
git rev-list --count HEAD                      # ≈ root + every member's commits + one merge each
git log --oneline | grep "<a known old commit message>"
git blame -L1,3 <area>/<some tracked file>     # original author, date and SHA must survive
```

`git blame` is the real proof: it traverses the merge, so it still names who wrote each line and
when. That is also the operation you rely on day to day.

**Only once every member checks out** may the moved-aside copies and the old `.git` directories
go.

### 4b. Restore what git could not

`subtree add` rebuilds the working tree **from history**, so anything that was never committed
does not come back:

- **ignored files that matter** — `.env`, `.env.local`, signing config, `.claude/settings.local.json`;
- **uncommitted working-tree state** — including *deletions*. A file deleted in the working tree
  but never committed comes back alive. If a member harness was hoisted away, its `AGENTS.md`
  reappears and starts competing again.

Inventory before, restore after:

```bash
git -C <area> status --porcelain --ignored | grep -E '^(\?\?|!!)'
```

Copy the survivors back from the backup, then confirm nothing secret is now tracked:

```bash
git check-ignore -q <area>/.env && echo ignored || echo "EXPOSED — fix .gitignore before committing"
```

Commit any harness files that were legitimately untracked (member `CLAUDE.md` breadcrumbs,
`verify.sh`) and remove anything the import resurrected.

### 5. Decide what the old remotes become

- **Mirrors** — keep them current with
  `git subtree push --prefix=<area> <url> <branch>`.
  Protect their branches so humans cannot push; only the sync writes.
- **Archives** — GitHub's *Archive* makes a repo read-only and is reversible. Prefer this to
  deletion.

Either is fine. What is not fine is leaving them writable and unattended: two writable copies
of the same code diverge, and a repo that looks alive but is not gets someone's fix silently
lost.

### 6. Re-run harness-kit

With one `.git` at the root, workspace mode now applies. `create` generates the root harness and
the git-backed checks become real.

## Costs to state plainly before anyone starts

- **One remote.** No pushing just the iOS app any more.
- **CI stops running the moment you convert, silently.** GitHub Actions reads
  `.github/workflows/` **only at the repository root**; a workflow left at
  `<area>/.github/workflows/` is ignored with no error and no warning. Every member workflow
  must be moved to the root, renamed (they are all called `ci.yml` and will collide), and given:
  - `paths:` filters, or one project's commit runs every project's pipeline — include the
    workflow's own file so edits to it are still exercised;
  - `defaults.run.working-directory`, since checkout now lands at the workspace root;
  - `cache-dependency-path` on Node/Go setup steps — caching keys off the lockfile, which is no
    longer at the root, so without it the cache silently never hits;
  - fully-qualified `upload-artifact` paths, which resolve from the workspace root rather than
    from `working-directory`.

  Branch triggers also need collapsing: members often used different branch names
  (`dev`, `development`, `main`), and a monorepo has one branch structure.
- **No per-repo access control.** Access to the monorepo is access to every project.
- **Clone size** is the sum of all histories, for everyone, always.
- **Conversion is irreversible for the member's independent remote.** After it, that repo is a
  mirror or an archive, not a place work originates.

## The rule that keeps it safe

**Never delete or rewrite a `.git` directory on the user's behalf** — not with `--force`, not
on request. It is the only artefact in a repo that cannot be rebuilt from the working tree, and
a member may hold commits that exist nowhere else. harness-kit prints this plan; the user runs
it.

See `CONSTITUTION.md` (2026-07-27, "Polyrepo is refused with a plan, and `.git` is never
touched") and `docs/workspace.md` §10.
