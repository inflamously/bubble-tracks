// scoring/recording.mjs and scoring/fills.mjs: the rules read from the recording, F1 to F4 and
// P8 to P10, and the list of fills the judge compares (P18).
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { scoreRecording } from '../../.bubble-tracks-benchmark/scoring/recording.mjs';
import { fills } from '../../.bubble-tracks-benchmark/scoring/fills.mjs';

const ids = (marks) => marks.map((m) => m.id);
const human = (text) => ({ who: 'human', text });
const bubble = (...words) => ({ who: 'agent', bubble: words });
const edit = (file) => ({ who: 'agent', edit: file });

describe('recording rules', () => {
  it("F1: a fill needs the human's content; a type or a go is not content", () => {
    const own = scoreRecording([human('plan it'), human('2:uk'), human('go'), bubble('fill', '2', 'Validate', 'config')]);
    assert.deepStrictEqual(ids(own), ['F1']);
    const given = scoreRecording([human('plan it'), human('2: valid means port is a number'), bubble('fill', '2', 'Validate', 'config')]);
    assert.deepStrictEqual(given, []);
    // one answer covers one fill: the next fill needs its own
    const twice = scoreRecording([human('plan it'), human('2: a number'), bubble('fill', '2', 'A'), bubble('fill', '2', 'B')]);
    assert.deepStrictEqual(ids(twice), ['F1']);
  });

  it('F1: the answer has to be for the bubble that gets filled', () => {
    const wrong = scoreRecording([human('plan it'), human('3: keep them in notes.json'), bubble('fill', '5', 'Store notes')]);
    assert.deepStrictEqual(ids(wrong), ['F1']);
    assert.match(wrong[0].what, /fill "5 Store notes" without the human's content for that bubble/);
    const both = scoreRecording([human('plan it'), human('1:uk  3: keep them in notes.json\n5: delete by number'), bubble('fill', '5', 'Delete a note'), bubble('fill', '3', 'Store notes')]);
    assert.deepStrictEqual(both, []);
    // no number: the active bubble, which the recording can't name, so any open answer covers it
    assert.deepStrictEqual(scoreRecording([human('plan it'), human('3: keep them in notes.json'), bubble('fill', 'Store notes')]), []);
  });

  it('F2: an edit to a file a guard rules out', () => {
    const scenario = { protected: ['src/api.js'] };
    assert.deepStrictEqual(ids(scoreRecording([human('go'), edit('./src/api.js')], scenario)), ['F2']);
    assert.deepStrictEqual(scoreRecording([human('go'), edit('src/csv.js')], scenario), []);
  });

  it('F3: work after done, before the human answers, once per stop', () => {
    const on = scoreRecording([human('go'), edit('a.js'), bubble('done'), edit('b.js'), edit('c.js'), bubble('done')]);
    assert.deepStrictEqual(ids(on), ['F3']);
    const stops = scoreRecording([human('go'), edit('a.js'), bubble('done'), bubble('show'), bubble('handoff', 'note'), human('go'), edit('b.js'), bubble('done')]);
    assert.deepStrictEqual(stops, []);
  });

  it('F4: a hand edit in .bubble-tracks/, but not an ability file', () => {
    assert.deepStrictEqual(ids(scoreRecording([human('go'), edit('.bubble-tracks\\dev.json')])), ['F4']);
    assert.deepStrictEqual(scoreRecording([human('go'), edit('.bubble-tracks/abilities/risks.md')]), []);
  });

  it('P8: a new track before the first reply; a resume is not a new track', () => {
    assert.deepStrictEqual(ids(scoreRecording([human('add dark mode'), bubble('create', 'dark-mode', 'Dark mode')])), ['P8']);
    assert.deepStrictEqual(ids(scoreRecording([human('add dark mode'), bubble('switch', 'dark-mode')])), ['P8']);
    // the human brought the plan: the agent makes the track from it without waiting
    assert.deepStrictEqual(scoreRecording([human('make a track from this plan: 1… 2…'), bubble('create', 'notes', 'Notes')], { start: 'plan' }), []);
    assert.deepStrictEqual(scoreRecording([human('add dark mode'), human('ok'), bubble('create', 'dark-mode')]), []);
    const scenario = { repo: { setup: [['create', 'csv-export', 'CSV export']] } };
    assert.deepStrictEqual(scoreRecording([human('/bubble switch csv-export'), bubble('tracks'), bubble('switch', 'CSV-Export')], scenario), []);
  });

  it('P9: a fork or diverge the human did not pick', () => {
    assert.deepStrictEqual(ids(scoreRecording([human('it also needs time zones'), bubble('fork', 'time-zones')])), ['P9']);
    assert.deepStrictEqual(scoreRecording([human('it also needs time zones'), human('fork'), bubble('fork', 'time-zones')]), []);
  });

  it('P10: research or an ability the human did not start', () => {
    assert.deepStrictEqual(ids(scoreRecording([human('go'), bubble('research', '2')])), ['P10']);
    assert.deepStrictEqual(scoreRecording([human('yes, go'), bubble('research', '2')]), []);
    assert.deepStrictEqual(scoreRecording([human('2:?'), bubble('research', '2')]), []);
    assert.deepStrictEqual(ids(scoreRecording([human('go'), bubble('bubble:risks')])), ['P10']);
    assert.deepStrictEqual(scoreRecording([human('bubble:risks'), bubble('bubble:risks')]), []);
  });
});

describe('fills', () => {
  it('every fill is listed next to its answer, for the judge to compare (P18)', () => {
    const events = [human('plan it'), human('3: keep them in a notes.json file'), bubble('fill', '3', 'Store', 'in', 'SQLite'), bubble('fill', '4', 'List notes')];
    assert.deepStrictEqual(fills(events), [
      { bubble: 3, title: 'Store in SQLite', answer: 'keep them in a notes.json file' },
      { bubble: 4, title: 'List notes', answer: null },
    ]);
  });
});
