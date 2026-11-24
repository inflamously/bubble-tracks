// Who does the bubbles' work: the track's ownership mode (switch or create --ownership), and on a hybrid
// track the bubbles the human picked (own). A hybrid track stays hybrid for good, so its picks are never lost.
// Agent and user swap freely until the first bubble is popped; after that they only move into hybrid.

import { OWNERSHIPS, ownershipOf, resolve, resolveRange, type Addr, type Bubble, type Ownership, type Track } from '../model.js';

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

/** Hybrid is never left, walked or not. A walked track (one bubble done) only moves into hybrid:
 *  agent → hybrid ← user. Nothing forces another change. */
function checkLock(track: Track, mode: Ownership): void {
  const old = ownershipOf(track);
  if (mode === old || mode === 'hybrid') return;
  if (old === 'hybrid') throw new Error(`a hybrid track stays hybrid — own N and own N - move single bubbles; ${NEW_TRACK}`);
  const walked = track.bubbles.some((b) => b.state === 'done');
  if (walked) throw new Error(`ownership is locked at ${old} since the first done — only hybrid is still open; ${NEW_TRACK}`);
}

/** A user track that turns hybrid marks every bubble as the human's, so none silently moves to the agent. */
function carryOwners(track: Track, old: Ownership, mode: Ownership): void {
  if (old === 'user' && mode === 'hybrid') for (const b of track.bubbles) b.owner = 'user';
}

/** Set the track's ownership mode. `agent` is the default, so it clears the field. */
export function setOwnership(track: Track, mode: string): string {
  checkMode(mode);
  checkLock(track, mode);
  const old = ownershipOf(track);
  carryOwners(track, old, mode);
  if (mode === 'agent') delete track.ownership;
  else track.ownership = mode;
  const change = mode === old ? `stays ${mode}` : `${old} → ${mode}`;
  return `ownership ${change} — ${WHO[mode]}`;
}

// own: single bubbles on a hybrid track.

const names = (bubbles: Bubble[]) => bubbles.map((b) => `"${b.title}"`).join(', ');

/** The bubbles at N or N:M (omitted: the active one). A done bubble is refused: its work is over. */
function openBubbles(track: Track, spec: Addr): Bubble[] {
  const [from, to] = spec === undefined ? [resolve(track), resolve(track)] : resolveRange(track, spec);
  const picked = track.bubbles.slice(from, to + 1);
  const finished = picked.filter((b) => b.state === 'done');
  if (finished.length) throw new Error(`${names(finished)} ${finished.length > 1 ? 'are' : 'is'} done — a done bubble keeps its owner`);
  return picked;
}

/** `<bubbles> is/are the <who>'s to do`, plus the mode change when the track just turned hybrid. */
function ownMessage(picked: Bubble[], who: 'human' | 'agent', switched: string): string {
  const msg = `${names(picked)} ${picked.length > 1 ? 'are' : 'is'} the ${who}'s to do`;
  return switched ? `${msg}\n${switched}` : msg;
}

/** Turning a track hybrid can't be undone, so `own` does it only with `force`: the human confirms first. */
function checkTurnsHybrid(mode: Ownership, force: boolean): void {
  if (force) return;
  throw new Error(`this turns the ${mode} track hybrid for good (a hybrid track stays hybrid) — confirm with the human, then re-run with --force`);
}

/** The human takes bubbles. An agent track turns hybrid for it, which needs `force`; on a user track they are the human's already. */
export function own(track: Track, spec: Addr, { force = false }: { force?: boolean } = {}): string {
  const picked = openBubbles(track, spec);
  const mode = ownershipOf(track);
  if (mode === 'user') throw new Error("every bubble on a user track is the human's already — own N - hands one to the agent");
  if (mode === 'agent') checkTurnsHybrid(mode, force);
  const switched = mode === 'agent' ? setOwnership(track, 'hybrid') : '';
  for (const b of picked) b.owner = 'user';
  return ownMessage(picked, 'human', switched);
}

/** The human hands bubbles back to the agent. A user track turns hybrid for it, which needs `force`; on an agent track there is nothing to hand back. */
export function handBack(track: Track, spec: Addr, { force = false }: { force?: boolean } = {}): string {
  const picked = openBubbles(track, spec);
  const mode = ownershipOf(track);
  if (mode === 'agent') throw new Error("every bubble on an agent track is the agent's already — own N takes one for the human");
  if (mode === 'user') checkTurnsHybrid(mode, force);
  const switched = mode === 'user' ? setOwnership(track, 'hybrid') : '';
  for (const b of picked) delete b.owner;
  return ownMessage(picked, 'agent', switched);
}
