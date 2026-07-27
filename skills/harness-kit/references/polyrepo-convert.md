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

```bash
git log --oneline -- <area> | wc -l
```

This must show roughly the member's original commit count. **Only once every member checks out**
may the `/tmp/*.bak` copies and the old `.git` directories go.

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
- **CI needs path filters**, or a backend commit triggers every project's pipeline. Member
  repos usually carry their own workflows; these move to the root and need `paths:` guards.
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
