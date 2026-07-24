import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { parseTables } from './parse.mjs';
import { loadProfiles, detectStack } from './detect.mjs';

// A workspace is a monorepo root whose members are declared in WORKSPACE.md.
// The file's presence is what flips harness-kit into workspace mode — no
// WORKSPACE.md means the single-repo path runs unchanged (decision D3/D4).
export const WORKSPACE_FILE = 'WORKSPACE.md';

export function workspacePath(root) {
  return path.join(root, WORKSPACE_FILE);
}

export function isWorkspace(root) {
  return existsSync(workspacePath(root));
}

// Column order in the member table. Kept here so read and write agree.
const COLUMNS = ['Area', 'Path', 'Stack'];

function columnIndex(header, name) {
  return header.findIndex((h) => new RegExp(`^${name}$`, 'i').test(h.trim()));
}

// Read the member table into [{ area, path, stack }]. Membership is *only* ever
// read from this table — never inferred by scanning the directory (D4) — so an
// unlisted repo (node_modules/, archive/, the repos you chose to leave out) is
// invisible to verify and migrate for free.
export async function readMembers(root) {
  const file = workspacePath(root);
  if (!existsSync(file)) return [];
  const md = await readFile(file, 'utf8');

  // The first table whose header names an Area column is the registry.
  const table = parseTables(md).find((t) => columnIndex(t.header, 'Area') >= 0);
  if (!table) return [];

  const ai = columnIndex(table.header, 'Area');
  const pi = columnIndex(table.header, 'Path');
  const si = columnIndex(table.header, 'Stack');

  const members = [];
  const seen = new Set();
  for (const cells of table.rows) {
    const area = (cells[ai] ?? '').replace(/`/g, '').trim();
    if (!area) continue; // skip the template placeholder / blank rows
    // Area is the unique key (D3). A duplicate is a user error; first wins and
    // we drop the rest rather than silently governing a repo twice.
    if (seen.has(area)) continue;
    seen.add(area);
    members.push({
      area,
      path: (cells[pi] ?? '').replace(/`/g, '').trim(),
      stack: (cells[si] ?? '').replace(/`/g, '').trim()
    });
  }
  return members;
}

function memberRow({ area, path: p, stack }) {
  return `| ${area} | ${p} | ${stack} |`;
}

export function renderMembers(members) {
  return members.map(memberRow).join('\n');
}

// Write the registry, preserving everything above the table (the header prose)
// and replacing the table body with the given members. If the file does not
// exist yet, a minimal registry is created.
export async function writeMembers(root, members) {
  const file = workspacePath(root);
  const rows = renderMembers(members);
  const table = `| ${COLUMNS.join(' | ')} |\n|${COLUMNS.map(() => '------').join('|')}|\n${rows}\n`;

  if (!existsSync(file)) {
    await writeFile(file, `# Workspace\n\n${table}`, 'utf8');
    return;
  }

  const md = await readFile(file, 'utf8');
  const lines = md.split(/\r?\n/);
  // Find the header row of the existing member table, then replace from there
  // through the contiguous table block. Prose before it is untouched.
  const headerIdx = lines.findIndex(
    (l) => l.trim().startsWith('|') && /\bArea\b/i.test(l)
  );
  if (headerIdx === -1) {
    await writeFile(file, `${md.replace(/\s*$/, '')}\n\n${table}`, 'utf8');
    return;
  }
  let end = headerIdx;
  while (end < lines.length && lines[end].trim().startsWith('|')) end++;
  const rebuilt = [...lines.slice(0, headerIdx), table.replace(/\n$/, ''), ...lines.slice(end)];
  await writeFile(file, rebuilt.join('\n'), 'utf8');
}

// Detect each member's stack by running the *existing* single-repo detector
// (detectStack) against its directory — no new detection logic (D: reuse).
// Returns the members with a fresh `stack`, and a `missing` flag for any path
// that does not exist so the caller can warn instead of writing a bogus stack.
export async function detectMembers(root, profiles) {
  const loaded = profiles ?? (await loadProfiles());
  const members = await readMembers(root);
  return Promise.all(
    members.map(async (m) => {
      const absPath = path.resolve(root, m.path);
      if (!existsSync(absPath)) {
        // Keep whatever was there; flag it. Membership is user-declared, so a
        // missing dir is a mistake to surface, not a reason to guess or drop.
        return { ...m, stack: m.stack || 'not detected', missing: true };
      }
      const profile = await detectStack(absPath, loaded);
      return { ...m, stack: profile?.id ?? 'generic', missing: false };
    })
  );
}

// Detect every member's stack and persist it back into WORKSPACE.md. Returns
// the detected members (with `missing` flags) so the caller can report.
export async function refreshStacks(root, profiles) {
  const detected = await detectMembers(root, profiles);
  // writeMembers only cares about area/path/stack; the `missing` flag is
  // transient reporting state and is not persisted.
  await writeMembers(
    root,
    detected.map(({ area, path: p, stack }) => ({ area, path: p, stack }))
  );
  return detected;
}

// Append a member to WORKSPACE.md (ws-010). No-op if the area already exists —
// Area is the unique key, so re-adding is a mistake to report, not a duplicate
// to write. Stack is left blank for detection to fill on the next generate.
export async function addMember(root, area, memberPath) {
  const members = await readMembers(root);
  if (members.some((m) => m.area === area)) return { added: false, members };
  const next = [...members, { area, path: memberPath, stack: '' }];
  await writeMembers(root, next);
  return { added: true, members: next };
}

// Resolve an Area label to its absolute path and detected stack. Returns null
// for an unknown area so callers can report it rather than acting on a guess.
export async function resolveArea(root, area) {
  const members = await readMembers(root);
  const m = members.find((x) => x.area === area);
  if (!m) return null;
  return { ...m, absPath: path.resolve(root, m.path) };
}
