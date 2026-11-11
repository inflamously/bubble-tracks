// One run's score: the script's marks from the track file and the recording, plus the judge's and the
// human's, added up. This is the only module that knows all the others.
/** @import { Mark, Recording, Scenario, Track } from './model.mjs' */
import { RULES } from './rules.mjs';
import { scoreTrack } from './track.mjs';
import { scoreRecording } from './recording.mjs';
import { fills } from './fills.mjs';
import { bubbleSizes, tokenReport } from './sizes.mjs';

/** The rules nobody looked at in this run. @param {boolean} hasRecording @param {Mark[]} judgements */
function uncheckedRules(hasRecording, judgements) {
  const judged = new Set(judgements.map((mark) => mark.id));
  return Object.keys(RULES).filter((id) => {
    if (judged.has(id)) return false;
    const checkedBy = RULES[id].by;
    if (checkedBy === 'track') return false; // the script always has the track file
    if (checkedBy === 'recording') return !hasRecording;
    return true; // a judge's or the human's rule, and no line for it
  });
}

function sum(numbers) {
  return numbers.reduce((total, number) => total + number, 0);
}

/**
 * `recording` and `judgements` may be left out: then only the track file is scored, and `unchecked`
 * lists the rules nobody looked at.
 * @param {{ scenario?: Scenario, track: Track, recording?: Recording, judgements?: Mark[] }} run
 */
export function scoreRun({ scenario = {}, track, recording, judgements = [] }) {
  const events = recording ? recording.events : null;
  const fromTrack = scoreTrack(track, scenario);
  const fromRecording = events ? scoreRecording(events, scenario) : [];
  const marks = [...fromTrack, ...fromRecording, ...judgements];

  const points = sum(marks.map((mark) => mark.points));
  const bubbles = track.bubbles.length;
  const pointsPerBubble = bubbles ? Math.round((points / bubbles) * 100) / 100 : null;

  return {
    scenario: scenario.name || null,
    failed: marks.some((mark) => mark.id.startsWith('F')),
    points,
    bubbles,
    pointsPerBubble,
    marks,
    tokens: events ? tokenReport(events) : null,
    sizes: events ? bubbleSizes(events) : null,
    fills: events ? fills(events) : [],
    unchecked: uncheckedRules(Boolean(events), judgements),
  };
}
