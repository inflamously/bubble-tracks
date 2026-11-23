// Who does the bubbles' work on a track (its ownership mode), set with switch or create --ownership.

import { OWNERSHIPS, ownershipOf, type Ownership, type Track } from '../model.js';

const WHO: Record<Ownership, string> = {
  agent: "the agent does every bubble's work",
  hybrid: 'the human does the bubbles they pick, the agent does the rest',
  user: "the human does every bubble's work; the agent hints and checks it",
};

/** The track's ownership in one line: `ownership: hybrid — who does what`. */
export function describeOwnership(track: Track): string {
  const mode = ownershipOf(track);
  return `ownership: ${mode} — ${WHO[mode]}`;
}

/** Set the track's ownership mode. `agent` is the default, so it clears the field. */
export function setOwnership(track: Track, mode: string): string {
  if (!(OWNERSHIPS as readonly string[]).includes(mode)) throw new Error(`unknown ownership "${mode}" (use: ${OWNERSHIPS.join(', ')})`);
  const old = ownershipOf(track);
  if (mode === 'agent') delete track.ownership;
  else track.ownership = mode as Exclude<Ownership, 'agent'>;
  return `ownership ${old === mode ? `stays ${mode}` : `${old} → ${mode}`} — ${WHO[mode as Ownership]}`;
}
