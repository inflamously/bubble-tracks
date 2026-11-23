// Fog gate — pre-tool hook shared by Claude Code (PreToolUse), Codex CLI (PreToolUse/apply_patch)
// and Gemini CLI (BeforeTool). Blocks file edits while the active bubble is fog, or is the human's to do.
// Exit 2 + stderr = block (all three agents). Fails open on any internal error. Never writes stdout.

import * as lib from '../lib/index.js';
import { readStdinJson, resolveRoot, extractTargetPaths, isInsideBubblesDir } from '../lib/hooks/index.js';

async function main(): Promise<number> {
  const input = await readStdinJson();
  const root = resolveRoot(input);
  const found = lib.findTrack(root);
  
  // a closed track is an archive: it gates nothing
  if (!found || !found.track || found.track.closed) return 0;

  // Editing the plan itself is always allowed — that's how fog gets filled.
  const targets = extractTargetPaths(input, root);
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
