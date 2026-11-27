// The rules read from the recording about the verify step, the check of the plan right after the human
// approved it: P26 and P27. A recording without an `approve` or a `verify` gets no marks here.
/** @import { Event, Mark } from './model.mjs' */
import { isDone, lostPoint } from './model.mjs';

/** The commands that change the plan. After a verify, each one needs the human's word first. */
const CHANGES_PLAN = new Set(['add', 'insert', 'remove', 'move', 'rename', 'title', 'hint', 'goal', 'guard', 'fill', 'fog', 'own']);

function isCommand(event, command) {
  return Boolean(event.bubble) && event.bubble[0] === command;
}

/** `guard show` only lists the guards. */
function changesPlan(event) {
  if (!event.bubble || !CHANGES_PLAN.has(event.bubble[0])) return false;
  return !(event.bubble[0] === 'guard' && event.bubble[1] === 'show');
}

/** P26: after `approve`, a `verify` comes before the first `done`. */
function verifyMark(events) {
  const approveAt = events.findIndex((event) => isCommand(event, 'approve'));
  if (approveAt < 0) return [];
  for (const event of events.slice(approveAt + 1)) {
    if (isCommand(event, 'verify')) return [];
    if (isDone(event)) break;
  }
  return [lostPoint('P26', 'approve without a verify before the first done')];
}

/** P27: a change to the plan after `verify`, before the human answered. One point per verify. */
function appliedMarks(events) {
  const marks = [];
  let gapsWaitForHuman = false;
  for (const event of events) {
    if (event.who === 'human') gapsWaitForHuman = false;
    else if (isCommand(event, 'verify')) gapsWaitForHuman = true;
    else if (gapsWaitForHuman && changesPlan(event)) {
      marks.push(lostPoint('P27', `${event.bubble[0]} after verify, before the human approved the change`));
      gapsWaitForHuman = false;
    }
  }
  return marks;
}

/** @param {Event[]} events @returns {Mark[]} */
export function scoreVerify(events) {
  return [...verifyMark(events), ...appliedMarks(events)];
}
