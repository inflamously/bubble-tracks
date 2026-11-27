// The rules read from the proposal, the plan the agent shows before the track exists: P22 and P23.
// The proposal is the agent's last message before the first command that makes the track. An agent that
// stores the plan as a draft first shows it right after: then the proposal is its first message from
// there on. A recording that holds no such message can't be checked here, and gets no marks.
/** @import { Event, Mark, Scenario } from './model.mjs' */
import { lostPoint } from './model.mjs';

/** The commands an agent only runs once it is making the track. */
const MAKES_TRACK = new Set(['create', 'init', 'goal']);

/** A label opens its line; the markdown around it (`**Goal:**`, `## Goal`, `- Goal`) is skipped. */
const LINE_START = '^[\\s#>*_-]*';
const label = (words) => new RegExp(`${LINE_START}${words}\\b`, 'im');

/** The parts of a proposal, in the order the skill asks for. */
const PARTS = [
  { name: 'TL;DR', label: label('TL;?DR') },
  { name: 'track', label: label('Track') },
  { name: 'goal', label: label('Goal') },
  { name: 'guards', label: label('Guards?') },
  { name: 'bubbles', label: label('Bubbles?') },
];
const BUBBLES_PART = PARTS[PARTS.length - 1];

const NUMBERED_LINE = /^\s*\d+[.)]\s+\S.*$/gm;
/** A fog has no boundary yet: it shows its reason instead. */
const FOG_LINE = /❓|\bfog\b|\bwhy:/i;
/** `[Boundary: …]` alone on its line; backticks or bold around it are fine. */
const BOUNDARY_LINE = /^[\s`*_]*\[Boundary:[^\]]+\][\s`*_]*$/gm;

/**
 * The agent's last message before the track is made, or its first one after when it said nothing before
 * (the plan was stored as a draft, then shown). Null when no track is made, or nothing was said.
 * @param {Event[]} events
 */
function findProposal(events) {
  let lastMessage = null;
  let trackMade = false;
  for (const event of events) {
    if (event.who !== 'agent') continue;
    if (event.bubble && MAKES_TRACK.has(event.bubble[0])) {
      if (lastMessage !== null) return lastMessage;
      trackMade = true;
    } else if (event.text) {
      if (trackMade) return event.text;
      lastMessage = event.text;
    }
  }
  return null;
}

/** P22: every part is there, and in order. One point, whatever is wrong. */
function partsMark(proposal) {
  const found = PARTS.map((part) => ({ name: part.name, at: proposal.search(part.label) }));
  const missing = found.filter((part) => part.at < 0).map((part) => part.name);
  if (missing.length) return [lostPoint('P22', `the proposal has no ${missing.join(', ')}`)];

  for (let index = 1; index < found.length; index++) {
    const part = found[index];
    const partBefore = found[index - 1];
    if (part.at < partBefore.at) return [lostPoint('P22', `the proposal's ${part.name} comes before its ${partBefore.name}`)];
  }
  return [];
}

/** P23: each planned bubble in the proposal has a boundary line of its own. One point, however many lack it. */
function boundaryMark(proposal) {
  const bubblesStart = proposal.search(BUBBLES_PART.label);
  // without a bubbles label (P22's point) the whole proposal is read: a numbered list in it is the bubbles
  const bubblesPart = bubblesStart < 0 ? proposal : proposal.slice(bubblesStart);
  const plannedBubbles = (bubblesPart.match(NUMBERED_LINE) || []).filter((line) => !FOG_LINE.test(line));
  const boundaryLines = bubblesPart.match(BOUNDARY_LINE) || [];
  const without = plannedBubbles.length - boundaryLines.length;
  if (without <= 0) return [];
  return [lostPoint('P23', `${without} of ${plannedBubbles.length} proposed bubbles show no [Boundary: …] line`)];
}

/** @param {Event[]} events @param {Scenario} scenario @returns {Mark[]} */
export function scorePlan(events, scenario = {}) {
  if (scenario.start === 'plan') return []; // the human brought the plan: the agent owes no proposal
  const proposal = findProposal(events);
  if (proposal === null) return [];
  return [...partsMark(proposal), ...boundaryMark(proposal)];
}
