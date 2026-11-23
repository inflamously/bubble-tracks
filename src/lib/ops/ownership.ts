// Who does the bubbles' work on a track (its ownership mode), set with switch or create --ownership.
// Free to change until the first bubble is popped; after that it only moves into hybrid.

import { OWNERSHIPS, ownershipOf, type Ownership, type Track } from '../model.js';

const WHO: Record<Ownership, string> = {
  agent: "the agent does every bubble's work",
  hybrid: 'the human does the bubbles they pick, the agent does the rest',
  user: "the human does every bubble's work; the agent hints and checks it",
};

const NEW_TRACK = 'a different mode is a new track: diverge <name>';

/** The track's ownership in one line: `ownership: hybrid — who does what`. */
export function describeOwnership(track: Track): string {
  const mode = ownershipOf(track);
  return `ownership: ${mode} — ${WHO[mode]}`;
}

function checkMode(mode: string): asserts mode is Ownership {
  if (!(OWNERSHIPS as readonly string[]).includes(mode)) throw new Error(`unknown ownership "${mode}" (use: ${OWNERSHIPS.join(', ')})`);
}

/** A walked track (one bubble done) only moves into hybrid: agent → hybrid ← user. Nothing forces another change. */
function checkLock(track: Track, mode: Ownership): void {
  const old = ownershipOf(track);
  const walked = track.bubbles.some((b) => b.state === 'done');
  if (!walked || mode === old || mode === 'hybrid') return;
  if (old === 'hybrid') throw new Error(`ownership is locked at hybrid since the first done; ${NEW_TRACK}`);
  throw new Error(`ownership is locked at ${old} since the first done — only hybrid is still open; ${NEW_TRACK}`);
}

/** Set the track's ownership mode. `agent` is the default, so it clears the field. */
export function setOwnership(track: Track, mode: string): string {
  checkMode(mode);
  checkLock(track, mode);
  const old = ownershipOf(track);
  if (mode === 'agent') delete track.ownership;
  else track.ownership = mode;
  const change = mode === old ? `stays ${mode}` : `${old} → ${mode}`;
  return `ownership ${change} — ${WHO[mode]}`;
}
