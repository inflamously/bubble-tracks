// The rules read from the finished track file: F5, P1 to P5 and P20.
// One small function per rule. Each returns what is wrong in words, or null when nothing is.
/** @import { Bubble, Mark, Scenario, Track } from './model.mjs' */
import { failure, lostPoint } from './model.mjs';

const TITLE_MAX_CHARACTERS = 20;
const TITLE_MIN_WORDS = 2;
const TITLE_MAX_WORDS = 4;
/** A title that names a file: a path, or a name with a source extension. */
const NAMES_A_FILE = /[\w-]+\/[\w.-]+|\b[\w-]+\.(?:c|cpp|cs|css|go|html|java|js|json|jsx|md|mjs|py|rb|rs|sh|toml|ts|tsx|txt|yaml|yml)\b/i;
/** A title that names a line: "line 12" or ":12". */
const NAMES_A_LINE = /\bline \d+\b|:\d+\b/i;

/** P1: a title is a short name, 2 to 4 words and at most 20 characters. @param {Bubble} bubble */
function titleProblem(bubble) {
  const wordCount = bubble.title.trim().split(/\s+/).length;
  if (bubble.title.length > TITLE_MAX_CHARACTERS) return `is ${bubble.title.length} characters`;
  if (wordCount < TITLE_MIN_WORDS || wordCount > TITLE_MAX_WORDS) return `is ${wordCount} word${wordCount === 1 ? '' : 's'}`;
  return null;
}

/** P2: a fog says why it is unclear. @param {Bubble} fog */
function whyProblem(fog) {
  return fog.why ? null : 'has no why';
}

/** P3: a planned bubble's hint names its boundary. @param {Bubble} bubble */
function hasBoundary(bubble) {
  return /Boundary:/.test(bubble.hint || '');
}

/**
 * P3, by share: 1 point when any planned bubble names no boundary, a second when more than half of them
 * don't. One omission then costs a small track and a big one the same.
 * @param {Bubble[]} bubbles
 */
function boundaryMarks(bubbles) {
  const planned = bubbles.map((bubble, index) => ({ bubble, number: index + 1 })).filter(({ bubble }) => bubble.state !== 'fog');
  const without = planned.filter(({ bubble }) => !hasBoundary(bubble)).map(({ number }) => number);
  if (without.length === 0) return [];
  const marks = [lostPoint('P3', `${without.length} of ${planned.length} planned bubbles name no boundary: ${without.join(', ')}`)];
  if (without.length * 2 > planned.length) marks.push(lostPoint('P3', 'more than half the planned bubbles name no boundary'));
  return marks;
}

/**
 * F5, P20: what a track holds besides its bubbles. The goal is what the bubbles are the path to, so a
 * track without one fails. Guards are allowed to be missing, but that is risky: 1 point.
 * @param {Track} track
 */
function validityMarks(track) {
  const marks = [];
  if (!track.goal) marks.push(failure('F5', 'the track has no goal'));
  if (!(track.guards || []).length) marks.push(lostPoint('P20', 'the track has no guards'));
  return marks;
}

/** P4: spill, a bubble cut so fine it is named after a file or a line. Only the title counts: a hint may name files. @param {Bubble} bubble */
function spillProblem(bubble) {
  if (NAMES_A_FILE.test(bubble.title)) return 'is named after a file';
  if (NAMES_A_LINE.test(bubble.title)) return 'is named after a line';
  return null;
}

/** P5: how many bubbles the track has too many or too few for the scenario's range. */
function bubblesOutsideRange(count, range) {
  if (count < range.min) return range.min - count;
  if (count > range.max) return count - range.max;
  return 0;
}

/** @param {Track} track @param {Scenario} scenario @returns {Mark[]} */
export function scoreTrack(track, scenario = {}) {
  // no bubbles: no track was made, so there is nothing to hold a goal
  /** @type {Mark[]} */
  const marks = track.bubbles.length > 0 ? validityMarks(track) : [];

  track.bubbles.forEach((bubble, index) => {
    const name = `bubble ${index + 1} "${bubble.title}"`;
    // a fog has no title or hint of its own yet: only its why is checked
    const checks = bubble.state === 'fog' ? [['P2', whyProblem]] : [['P1', titleProblem], ['P4', spillProblem]];
    for (const [id, findProblem] of checks) {
      const problem = findProblem(bubble);
      if (problem) marks.push(lostPoint(id, `${name} ${problem}`));
    }
  });
  marks.push(...boundaryMarks(track.bubbles));

  if (scenario.bubbles) {
    const { min, max } = scenario.bubbles;
    const count = track.bubbles.length;
    const allowed = min === max ? `${min}` : `${min} to ${max}`;
    // one point per bubble too many or too few
    for (let i = 0; i < bubblesOutsideRange(count, scenario.bubbles); i++) {
      marks.push(lostPoint('P5', `${count} bubbles, the scenario allows ${allowed}`));
    }
  }
  return marks;
}
