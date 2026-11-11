// A score as the lines a human reads. Only formats: every number comes from run.mjs.
// One function per part of the report, in the order they are printed.
/** @typedef {ReturnType<typeof import('./run.mjs').scoreRun>} Score */

const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;
const signed = (points) => (points > 0 ? `+${points}` : `${points}`);

/** `shout-flag: FAILED, -3 points (4 bubbles, -0.75 per bubble)` @param {Score} score */
function headline(score) {
  const name = score.scenario ? `${score.scenario}: ` : '';
  const failed = score.failed ? 'FAILED, ' : '';
  const perBubble = score.pointsPerBubble === null ? '' : `, ${score.pointsPerBubble} per bubble`;
  return `${name}${failed}${signed(score.points)} points (${plural(score.bubbles, 'bubble')}${perBubble})`;
}

/** One line per mark: what it cost, the rule, what happened, and who said so when it wasn't the script. @param {Score} score */
function markLines(score) {
  return score.marks.map((mark) => {
    const cost = mark.id.startsWith('F') ? 'fail' : signed(mark.points);
    const saidBy = mark.by === 'script' ? '' : `  (${mark.by})`;
    return `  ${cost.padStart(4)}  ${mark.id.padEnd(3)}  ${mark.what}${saidBy}`;
  });
}

/** @param {Score} score */
function tokenLines(score) {
  if (!score.tokens) return [];
  const { total, perBubble, afterLastDone, flagged } = score.tokens;
  const tail = afterLastDone ? `; ${afterLastDone} after the last done` : '';
  return [
    `tokens: ${total} in all; per bubble ${perBubble.join(', ') || 'none'}${tail}`,
    ...flagged.map((bubble) => `  flagged: bubble ${bubble} took far more than the others (H6: whose roundabout was it?)`),
  ];
}

/** @param {Score} score */
function sizeLines(score) {
  if (!score.sizes || !score.sizes.perBubble.length) return [];
  const each = score.sizes.perBubble.map((size, index) => `${index + 1}: ${plural(size.edits, 'edit')}, ${plural(size.steps, 'step')}`);
  return [
    `size per bubble: ${each.join('; ')}`,
    ...score.sizes.small.map((bubble) => `  small: bubble ${bubble} took far less than the others (spill: was it cut too fine?)`),
  ];
}

/** Each fill next to the answer it was made from, for the judge to compare. @param {Score} score */
function fillLines(score) {
  return score.fills.map((fill) => {
    const which = fill.bubble === null ? '' : ` ${fill.bubble}`;
    const answer = fill.answer === null ? 'no answer from the human' : `the human said "${fill.answer}"`;
    return `fill${which} "${fill.title}": ${answer} (P18: does the fill say that?)`;
  });
}

/** @param {Score} score */
function uncheckedLines(score) {
  return score.unchecked.length ? [`not checked: ${score.unchecked.join(' ')}`] : [];
}

/** @param {Score} score */
export function report(score) {
  return [headline(score), ...markLines(score), ...tokenLines(score), ...sizeLines(score), ...fillLines(score), ...uncheckedLines(score)].join('\n');
}
