// The rules read from the finished track file: P1 to P5.
// One small function per rule. Each returns what is wrong in words, or null when nothing is.
/** @import { Bubble, Mark, Scenario, Track } from './model.mjs' */
import { lostPoint } from './model.mjs';

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
function boundaryProblem(bubble) {
  return /Boundary:/.test(bubble.hint || '') ? null : 'names no boundary';
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
  /** @type {Mark[]} */
  const marks = [];

  track.bubbles.forEach((bubble, index) => {
    const name = `bubble ${index + 1} "${bubble.title}"`;
    // a fog has no title or hint of its own yet: only its why is checked
    const checks = bubble.state === 'fog' ? [['P2', whyProblem]] : [['P1', titleProblem], ['P3', boundaryProblem], ['P4', spillProblem]];
    for (const [id, findProblem] of checks) {
      const problem = findProblem(bubble);
      if (problem) marks.push(lostPoint(id, `${name} ${problem}`));
    }
  });

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
