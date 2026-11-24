// Which files a pre-tool call is about to edit, and whether one is part of the plan itself.

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { HookInput } from './input.js';

/** Pull target file paths from a pre-tool payload (absolute, resolved against `root`). */
export function extractTargetPaths(input: HookInput, root: string): string[] {
  const ti = (input && input.tool_input) || {};
  const found: string[] = [];
  for (const key of ['file_path', 'path', 'notebook_path']) {
    const val = ti[key];
    if (typeof val === 'string' && val) found.push(val);
  }
  // Codex apply_patch: raw patch text (in `command`, or `input`/`patch` in some versions).
  for (const key of ['command', 'input', 'patch']) {
    const raw = ti[key];
    const val = Array.isArray(raw) ? raw.join('\n') : raw;
    if (typeof val !== 'string') continue;
    const re = /^\*\*\* (?:Add|Update|Delete) File: (.+)$|^\*\*\* Move to: (.+)$/gm;
    let m;
    while ((m = re.exec(val))) found.push((m[1] || m[2]).trim());
  }
  return found.map((p) => path.resolve(root, p));
}

/** True if `file` is inside `<trackRoot>/.bubble-tracks`. */
export function isInsideBubblesDir(file: string, trackFile: string): boolean {
  const bubblesDir = path.dirname(trackFile);
  const rel = path.relative(bubblesDir, file);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

/** True if `file` is a track file: `<bubblesDir>/<name>.json`, or the `current` pointer. Only the CLI writes
 *  those. Anything deeper (`abilities/`) is not one. Names ignore case, as the CLI's track names do. */
export function isTrackFile(file: string, bubblesDir: string): boolean {
  const rel = path.relative(bubblesDir, file).toLowerCase();
  if (rel === 'current') return true;
  return path.dirname(rel) === '.' && rel.endsWith('.json');
}

/** True if `file` exists and no longer parses as JSON. The CLI can't load such a track, so only a hand edit repairs it. */
export function isBrokenJson(file: string): boolean {
  try {
    JSON.parse(fs.readFileSync(file, 'utf8'));
    return false;
  } catch (err) {
    return (err as NodeJS.ErrnoException).code !== 'ENOENT';
  }
}
