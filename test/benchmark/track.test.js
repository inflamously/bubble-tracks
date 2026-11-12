// scoring/track.mjs: the rules read from the finished track file, F5, P1 to P5 and P20.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { scoreTrack } from '../../.bubble-tracks-benchmark/scoring/track.mjs';

const ids = (marks) => marks.map((m) => m.id);
const good = (title) => ({ title, state: 'todo', hint: 'Boundary: src/x.js' });
/** A valid track: a goal, a guard, and these bubbles. */
const trackOf = (...bubbles) => ({ goal: 'The tool reads its config', guards: ['Keep the CLI as it is'], bubbles });

describe('track rules', () => {
  it('a clean track loses nothing', () => {
    assert.deepStrictEqual(scoreTrack(trackOf(good('Parse input'), good('Add the flag'))), []);
  });

  it('P1: a title too long, or not 2 to 4 words', () => {
    const marks = scoreTrack(trackOf(good('Interview pain points'), good('Parse'), good('Add a flag to it')));
    assert.deepStrictEqual(ids(marks), ['P1', 'P1', 'P1']);
    assert.match(marks[0].what, /21 characters/);
    assert.match(marks[1].what, /1 word$/);
    assert.match(marks[2].what, /5 words/);
  });

  it('P2: a fog without a why; its title and hint are not judged', () => {
    const marks = scoreTrack(trackOf({ title: '???', state: 'fog' }, { title: '???', state: 'fog', why: 'the format is undecided' }));
    assert.deepStrictEqual(ids(marks), ['P2']);
  });

  it('P3: by share, 1 point for any bubble without a boundary and a second past half; fog is not counted', () => {
    const bare = (title) => ({ title, state: 'todo', hint: 'just do it' });
    const fog = { title: '???', state: 'fog', why: 'the format is undecided' };
    const some = scoreTrack(trackOf(good('Parse input'), bare('Add the flag'), fog));
    assert.deepStrictEqual(ids(some), ['P3']);
    assert.match(some[0].what, /^1 of 2 planned bubbles name no boundary: 2$/);
    const most = scoreTrack(trackOf(bare('Parse input'), { title: 'Add the flag', state: 'done' }, good('Print it'), fog));
    assert.deepStrictEqual(ids(most), ['P3', 'P3']);
    assert.match(most[0].what, /^2 of 3 planned bubbles name no boundary: 1, 2$/);
  });

  it('F5, P20: a track without a goal fails; without guards it loses a point; no bubbles, no track', () => {
    const bubbles = [good('Parse input'), good('Add the flag')];
    const marks = scoreTrack({ bubbles });
    assert.deepStrictEqual(ids(marks), ['F5', 'P20']);
    assert.strictEqual(marks[0].points, 0);
    assert.deepStrictEqual(ids(scoreTrack({ goal: 'Read the config', guards: [], bubbles })), ['P20']);
    assert.deepStrictEqual(scoreTrack({ bubbles: [] }), []);
  });

  it('P4: a title named after a file or a line, whatever the hint says', () => {
    const spilled = scoreTrack(trackOf(good('Edit args.js'), good('Fix src/cli'), good('Change line 12')));
    assert.deepStrictEqual(ids(spilled), ['P4', 'P4', 'P4']);
    const hintOnly = { title: 'Data model', state: 'done', hint: 'src/lib/model.ts + track.ts. Boundary: src/lib' };
    assert.deepStrictEqual(scoreTrack(trackOf(hintOnly)), []);
  });

  it('P5: one point per bubble outside the range', () => {
    const track = trackOf(good('One step'), good('Two step'), good('Three step'), good('Four step'), good('Five step'));
    assert.deepStrictEqual(ids(scoreTrack(track, { bubbles: { min: 2, max: 3 } })), ['P5', 'P5']);
    assert.deepStrictEqual(ids(scoreTrack(track, { bubbles: { min: 6, max: 6 } })), ['P5']);
    assert.deepStrictEqual(scoreTrack(track, { bubbles: { min: 3, max: 5 } }), []);
  });
});
