// Fog answers and fills: which fogs the human gave content for, and each fill next to the answer it
// was made from. recording.mjs uses the first for F1, the report lists the second for the judge (P18).
/** @import { Event } from './model.mjs' */

/** A human line that gives fog N its content: `3: store them in a file`, not a type (`3:uk`) or `3:?`. */
const FOG_CONTENT = /(?:^|\s)(\d+)\s*:\s*(?!(?:kk|ku|uk|uu|known-known|known-unknown|unknown-known|unknown-unknown|\?)(?:\s|$))(\S[^\n]*)/gi;

/** The fogs a human message gives content for: bubble number (as text) to their words. */
export function fogAnswers(message) {
  const answers = new Map();
  for (const [, bubbleNumber, words] of message.matchAll(FOG_CONTENT)) answers.set(bubbleNumber, words.trim());
  return answers;
}

/** The words after `fill`: the bubble number (null = the active bubble) and the title. */
export function readFill(args) {
  const words = args.filter((word) => !word.startsWith('--'));
  const startsWithNumber = /^\d+$/.test(words[0] || '');
  const bubbleNumber = startsWithNumber ? words.shift() : null;
  return { bubbleNumber, title: words.join(' ') };
}

/**
 * Which answered fog a fill uses up: the one it names, or, for a fill of the active bubble (which a
 * recording can't number), the oldest answer still open. Undefined when there is none.
 * @param {string | null} bubbleNumber @param {Iterable<string>} openAnswers
 */
export function answerFor(bubbleNumber, openAnswers) {
  return bubbleNumber === null ? [...openAnswers][0] : bubbleNumber;
}

/**
 * Every fill next to the human's answer it was made from. The script checks that the answer was for
 * that bubble (F1), not that the fill says the same: that is the judge's count (P18).
 * @param {Event[]} events
 */
export function fills(events) {
  const openAnswers = new Map();
  const list = [];
  for (const event of events) {
    if (event.who === 'human') {
      for (const [bubbleNumber, words] of fogAnswers(event.text || '')) openAnswers.set(bubbleNumber, words);
      continue;
    }
    if (!event.bubble || event.bubble[0] !== 'fill') continue;
    const { bubbleNumber, title } = readFill(event.bubble.slice(1));
    const answered = answerFor(bubbleNumber, openAnswers.keys());
    list.push({
      bubble: bubbleNumber === null ? null : Number(bubbleNumber),
      title,
      answer: openAnswers.get(answered) ?? null,
    });
    openAnswers.delete(answered);
  }
  return list;
}
