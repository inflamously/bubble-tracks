// The logic of the hero's track card: the agent walks the track one bubble per step, until it stands on fog and
// waits for the human. Pure functions over model.mts, no DOM and no React.
// It imitates the CLI for the pitch; the real CLI runs in the demo.
import { FOG, FOG_PLANNED, MARKS, START, TITLES } from './model.mjs';
import type { Bubble, BubbleKind, TrackState, TrackView } from './model.mjs';

// Where the walk stands.

/** The agent stands on fog the human has not planned: it may not go on. */
function stopped(state: TrackState): boolean {
  return state.pos === FOG && !state.planned;
}

function finished(state: TrackState): boolean {
  return state.pos >= TITLES.length;
}

function kindAt(state: TrackState, i: number): BubbleKind {
  if (i === FOG && !state.planned) return 'fog';
  if (i < state.pos) return 'done';
  return i === state.pos ? 'active' : 'todo';
}

// The moves.

/** The agent finishes the active bubble. On unplanned fog, and at Finish, nothing moves. */
export function step(state: TrackState): TrackState {
  return stopped(state) || finished(state) ? state : { ...state, pos: state.pos + 1 };
}

/** The human plans the fog. It only counts while the agent stands on it. */
export function plan(state: TrackState): TrackState {
  return stopped(state) ? { ...state, planned: true } : state;
}

// What the card shows.

function bubblesOf(state: TrackState): Bubble[] {
  return TITLES.map((title, i) => {
    const kind = kindAt(state, i);
    return { label: i === FOG && state.planned ? FOG_PLANNED : title, kind, mark: MARKS[kind] };
  });
}

/** The state as the card shows it: the track line, the bubbles, what the agent says, and the visitor's next move. */
export function describe(state: TrackState): TrackView {
  const bubbles = bubblesOf(state);
  const line = `S ${bubbles.map((bubble) => bubble.mark).join(' ')} F`;
  if (stopped(state)) {
    return { line, bubbles, stopped: true, next: 'plan', message: 'Stopped at fog. The agent cannot edit files here until you plan this bubble.' };
  }
  if (finished(state)) {
    return { line, bubbles, stopped: false, next: null, message: 'Finish reached. Every step on this track was one you saw first.' };
  }
  return { line, bubbles, stopped: false, next: 'step', message: `The agent is working on: ${bubbles[state.pos].label}.` };
}
