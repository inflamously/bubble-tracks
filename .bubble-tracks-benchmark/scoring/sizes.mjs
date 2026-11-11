// What a run cost and where: tokens and work per bubble, split at each done. Reported, never scored;
// the two flags only pick the bubbles a human should look at.
/** @import { Event } from './model.mjs' */
import { isDone, normalizePath } from './model.mjs';

/** A bubble is flagged when it took more than this many times the median of the run's other bubbles, or less than that fraction of it. */
const FLAG_FACTOR = 3;
/** Fewer bubbles than this and there is no "the others" to compare one against. */
const FLAG_MIN_BUBBLES = 3;

function median(numbers) {
  const sorted = [...numbers].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const hasOneMiddle = sorted.length % 2 === 1;
  return hasOneMiddle ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** The bubbles (counted from 1) that stand out: `standsOut(own size, median of the other bubbles)`. */
function bubblesThatStandOut(sizes, standsOut) {
  if (sizes.length < FLAG_MIN_BUBBLES) return [];
  const flagged = [];
  sizes.forEach((ownSize, index) => {
    const otherSizes = sizes.filter((_, other) => other !== index);
    if (standsOut(ownSize, median(otherSizes))) flagged.push(index + 1);
  });
  return flagged;
}

const tookFarMore = (ownSize, others) => others > 0 && ownSize > FLAG_FACTOR * others;
const tookFarLess = (ownSize, others) => ownSize * FLAG_FACTOR < others;

/**
 * The run's tokens, split at each done. A bubble that took far more than the others is flagged for the
 * human (H6). Null when the recording holds no token counts.
 * @param {Event[]} events
 */
export function tokenReport(events) {
  const hasTokens = events.some((event) => typeof event.tokens === 'number');
  if (!hasTokens) return null;

  const perBubble = [];
  let total = 0;
  let sinceLastDone = 0;
  for (const event of events) {
    const tokens = typeof event.tokens === 'number' ? event.tokens : 0;
    total += tokens;
    sinceLastDone += tokens;
    if (isDone(event)) {
      perBubble.push(sinceLastDone);
      sinceLastDone = 0;
    }
  }
  return { total, perBubble, afterLastDone: sinceLastDone, flagged: bubblesThatStandOut(perBubble, tookFarMore) };
}

/**
 * How much work each walked bubble took, split at each done: the file edits, the agent's steps (the
 * transcript's size, which works for any domain) and the tokens when the recording has them. A bubble
 * that took far less than the others is flagged as small: it may be spill, a bubble cut too fine.
 * @param {Event[]} events
 */
export function bubbleSizes(events) {
  const hasTokens = events.some((event) => typeof event.tokens === 'number');
  const perBubble = [];
  let current = { edits: 0, steps: 0, tokens: 0 };
  for (const event of events) {
    if (event.who !== 'agent') continue;
    current.steps++;
    if (typeof event.tokens === 'number') current.tokens += event.tokens;
    // planning files are the track's own bookkeeping, not work on the task
    const isProjectEdit = event.edit !== undefined && !normalizePath(event.edit).startsWith('.bubble-tracks/');
    if (isProjectEdit) current.edits++;
    if (isDone(event)) {
      perBubble.push(hasTokens ? current : { edits: current.edits, steps: current.steps });
      current = { edits: 0, steps: 0, tokens: 0 };
    }
  }
  // tokens are the better measure of size; steps stand in when the recording has no token counts
  const sizes = perBubble.map((bubble) => (hasTokens ? bubble.tokens : bubble.steps));
  return { perBubble, small: bubblesThatStandOut(sizes, tookFarLess) };
}
