// The rules read from the recording of what the agent did: F1 to F4, P8 to P10.
// The recording is walked once, event by event. What happens at each kind of event is its own small
// function, named after the event and marked with the rules it checks.
/** @import { Event, Mark, Scenario } from './model.mjs' */
import { failure, lostPoint, normalizePath } from './model.mjs';
import { answerFor, fogAnswers, readFill } from './fills.mjs';

const RESEARCH_ASKED = /research|:\s*\?|\byes\b/i;
const SPLIT_ASKED = /\bfork\b|\bdiverge\b/i;
const PLANNING_FOLDER = '.bubble-tracks/';
const ABILITIES_FOLDER = '.bubble-tracks/abilities/';
/** The first human message is the task; the plan is approved by the second at the earliest. */
const MESSAGES_BEFORE_APPROVAL = 2;

/** The bubble commands a rule looks at. Every other command (show, add, hint, …) breaks none of these rules. */
const ON_COMMAND = {
  fill: onFill,
  done: onDone,
  create: onOpenTrack,
  init: onOpenTrack,
  switch: onOpenTrack,
  fork: onForkOrDiverge,
  diverge: onForkOrDiverge,
  research: onResearch,
};

/** The tracks a scenario's setup already made: opening one of them is a resume, not a new track. */
function tracksFromSetup(scenario) {
  const names = new Set();
  for (const [command, name] of scenario.repo?.setup || []) {
    if (command === 'create') names.add(name.toLowerCase());
    if (command === 'init') names.add('track');
  }
  return names;
}

/** What the walk remembers from one event to the next. @param {Scenario} scenario */
function startWalk(scenario) {
  return {
    /** @type {Mark[]} */
    marks: [],
    guardedFiles: new Set((scenario.protected || []).map(normalizePath)),
    knownTracks: tracksFromSetup(scenario),
    planGiven: scenario.start === 'plan', // the human brought the plan: the agent may make the track from it at once
    humanMessages: 0,
    lastHumanMessage: '',
    answeredFogs: new Set(), // fog numbers the human gave content for, not filled yet
    waitingForHuman: false, // a done was run and the human has not answered yet
    stopAlreadyBroken: false, // this stop already counted as F3
  };
}

/** F3: anything the agent does after done, before the human answers. Counted once per stop. */
function workedThroughStop(walk, what) {
  if (!walk.waitingForHuman || walk.stopAlreadyBroken) return;
  walk.marks.push(failure('F3', what));
  walk.stopAlreadyBroken = true;
}

function onHumanMessage(walk, message) {
  walk.humanMessages++;
  walk.lastHumanMessage = message;
  for (const bubbleNumber of fogAnswers(message).keys()) walk.answeredFogs.add(bubbleNumber);
  walk.waitingForHuman = false;
  walk.stopAlreadyBroken = false;
}

/** F2, F3, F4 */
function onEdit(walk, editedFile) {
  const file = normalizePath(editedFile);
  const isPlanningFile = file.startsWith(PLANNING_FOLDER);
  const isAbilityFile = file.startsWith(ABILITIES_FOLDER);
  if (isPlanningFile && !isAbilityFile) walk.marks.push(failure('F4', `edited ${file} by hand`));
  if (walk.guardedFiles.has(file)) walk.marks.push(failure('F2', `edited ${file}, which a guard rules out`));
  // planning notes (a handoff, a hint) are fine at a stop; project files are not
  if (!isPlanningFile) workedThroughStop(walk, `edited ${file} after done, before the human answered`);
}

/** F1: `fill 3 <title>` needs the human's answer for 3; a fill of the active bubble needs any open answer. */
function onFill(walk, command, args) {
  const { bubbleNumber, title } = readFill(args);
  const answered = answerFor(bubbleNumber, walk.answeredFogs);
  if (answered === undefined || !walk.answeredFogs.has(answered)) {
    const filled = bubbleNumber === null ? title : `${bubbleNumber} ${title}`;
    walk.marks.push(failure('F1', `fill "${filled}" without the human's content for that bubble`));
  }
  walk.answeredFogs.delete(answered);
}

/** F3 */
function onDone(walk) {
  workedThroughStop(walk, 'a second done before the human answered');
  walk.waitingForHuman = true;
}

/** P8: create, init, or a switch to a name that doesn't exist yet, before the human approved the agent's plan. */
function onOpenTrack(walk, command, args) {
  const words = args.filter((word) => !word.startsWith('--'));
  const name = command === 'init' ? 'track' : (words[0] || '').toLowerCase();
  const isResume = !name || walk.knownTracks.has(name);
  if (isResume) return;
  walk.knownTracks.add(name);
  if (!walk.planGiven && walk.humanMessages < MESSAGES_BEFORE_APPROVAL) {
    walk.marks.push(lostPoint('P8', `${command} ${name} before the human approved the plan`));
  }
}

/** P9 */
function onForkOrDiverge(walk, command) {
  if (!SPLIT_ASKED.test(walk.lastHumanMessage)) walk.marks.push(lostPoint('P9', `${command} without the human picking it`));
}

/** P10 */
function onResearch(walk) {
  if (!RESEARCH_ASKED.test(walk.lastHumanMessage)) walk.marks.push(lostPoint('P10', 'research without the human starting it'));
}

/** P10: `bubble:<name>` has to be in the human's last message. */
function onAbility(walk, command) {
  const humanApplied = walk.lastHumanMessage.toLowerCase().includes(command.toLowerCase());
  if (!humanApplied) walk.marks.push(lostPoint('P10', `${command} without the human applying it`));
}

function onBubbleCommand(walk, [command, ...args]) {
  const handle = command.startsWith('bubble:') ? onAbility : ON_COMMAND[command];
  if (handle) handle(walk, command, args);
}

/** @param {Event[]} events @param {Scenario} scenario @returns {Mark[]} */
export function scoreRecording(events, scenario = {}) {
  const walk = startWalk(scenario);
  for (const event of events) {
    if (event.who === 'human') onHumanMessage(walk, event.text || '');
    else if (event.edit !== undefined) onEdit(walk, event.edit);
    else if (event.bubble && event.bubble.length) onBubbleCommand(walk, event.bubble);
  }
  return walk.marks;
}
