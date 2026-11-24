// Fog gate — pre-tool hook shared by Claude Code (PreToolUse), Codex CLI (PreToolUse/apply_patch)
// and Gemini CLI (BeforeTool). Blocks file edits while the active bubble is fog, or is the human's to do,
// and hand edits to the track files at any time: only the CLI writes those.
// Exit 2 + stderr = block (all three agents). Fails open on any internal error. Never writes stdout.

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as lib from '../lib/index.js';
import { readStdinJson, resolveRoot, extractTargetPaths, isInsideBubblesDir, isTrackFile, isBrokenJson } from '../lib/hooks/index.js';

/** The CLI, next to this hook: what a refused hand edit is pointed to. */
const CLI = fileURLToPath(new URL('./bubble.js', import.meta.url));

async function main(): Promise<number> {
  const input = await readStdinJson();
  const root = resolveRoot(input);
  const bubblesDir = lib.findBubblesDir(root);
  if (!bubblesDir) return 0;
  const targets = extractTargetPaths(input, root);

  // Track file gate: a track changes only through the CLI, whatever its state, open or closed.
  // A track file that no longer parses is let through: the CLI can't load it, so a hand edit is the repair.
  const byHand = targets.filter((f) => isTrackFile(f, bubblesDir) && !isBrokenJson(f));
  if (byHand.length) {
    const names = byHand.map((f) => `"${path.basename(f)}"`).join(', ');
    process.stderr.write(
      `${names} ${byHand.length > 1 ? 'are track files' : 'is a track file'} — don't edit ${byHand.length > 1 ? 'them' : 'it'} by hand. ` +
        `Change the track through the CLI: node "${CLI}" <command> (try: help)\n`
    );
    return 2;
  }

  const found = lib.findTrack(root);
  // a closed track is an archive: it gates nothing else
  if (!found || !found.track || found.track.closed) return 0;

  // The rest of the plan folder (abilities/) is always open, also at fog.
  if (targets.length && targets.every((f) => isInsideBubblesDir(f, found.file))) return 0;

  const active = lib.activeBubble(found.track);
  if (!active) return 0;

  if (active.state === 'fog') {
    process.stderr.write(
      `Active bubble "${active.title}" is unplanned — plan it with the user first (bubble fill). ` +
        `Do not plan fog yourself: ask the human to classify it (${lib.TYPES.join(', ')}) and give the content.\n`
    );
    return 2;
  }
  // Ownership gate: the human does this bubble's work, so the agent's edits wait until they hand it back.
  if (lib.ownedByHuman(found.track, active)) {
    process.stderr.write(
      `Active bubble "${active.title}" is the human's to do — don't do its work yourself. ` +
        `Hint at the steps, and check the work once they say it's done. Only the human hands it to you: bubble own -\n`
    );
    return 2;
  }
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch(() => process.exit(0));
