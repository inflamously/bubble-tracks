// The shapes the scoring modules pass around, and the small helpers they share. No rules live here.

/**
 * @typedef {{ title: string, state: string, hint?: string, why?: string }} Bubble
 * @typedef {{ title?: string, bubbles: Bubble[] }} Track
 *
 * One step of a recording, in order:
 *   { who: 'human', text }              a message from the human
 *   { who: 'agent', text }              a message from the agent
 *   { who: 'agent', bubble: [...] }     the words after `bubble`, without --dir
 *   { who: 'agent', edit }              a file the agent wrote, relative to the repo
 * An agent event may carry `tokens`: the tokens that step used.
 * @typedef {{ who: 'human' | 'agent', text?: string, bubble?: string[], edit?: string, tokens?: number }} Event
 * @typedef {{ events: Event[] }} Recording
 *
 * One scored thing: a point lost or given, or a fail (points 0, an F id).
 * @typedef {{ id: string, points: number, what: string, by: 'script' | 'judge' | 'human' }} Mark
 *
 * The parts of a scenario file the scoring reads (the runner reads the rest).
 * @typedef {{ name?: string, protected?: string[], bubbles?: { min: number, max: number },
 *             repo?: { setup?: string[][] } }} Scenario
 */

/** A point the script takes for a counted rule. @returns {Mark} */
export function lostPoint(id, what) {
  return { id, points: -1, what, by: 'script' };
}

/** A fail the script found: it fails the run and carries no points. @returns {Mark} */
export function failure(id, what) {
  return { id, points: 0, what, by: 'script' };
}

/** A path as the rules compare it: forward slashes, no leading `./`. */
export function normalizePath(file) {
  return file.replace(/\\/g, '/').replace(/^\.\//, '');
}

/** Is this event the agent popping a bubble? Runs are split into bubbles at each one. */
export function isDone(event) {
  return Boolean(event.bubble) && event.bubble[0] === 'done';
}
