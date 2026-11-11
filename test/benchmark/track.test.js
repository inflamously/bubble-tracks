// scoring/track.mjs: the rules read from the finished track file, P1 to P5.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { scoreTrack } from '../../.bubble-tracks-benchmark/scoring/track.mjs';

const ids = (marks) => marks.map((m) => m.id);
const good = (title) => ({ title, state: 'todo', hint: 'Boundary: src/x.js' });

describe('track rules', () => {
  it('a clean track loses nothing', () => {
    assert.deepStrictEqual(scoreTrack({ bubbles: [good('Parse input'), good('Add the flag')] }), []);
  });

  it('P1: a title too long, or not 2 to 4 words', () => {
    const marks = scoreTrack({ bubbles: [good('Interview pain points'), good('Parse'), good('Add a flag to it')] });
    assert.deepStrictEqual(ids(marks), ['P1', 'P1', 'P1']);
    assert.match(marks[0].what, /21 characters/);
    assert.match(marks[1].what, /1 word$/);
    assert.match(marks[2].what, /5 words/);
  });

  it('P2: a fog without a why; its title and hint are not judged', () => {
    const marks = scoreTrack({ bubbles: [{ title: '???', state: 'fog' }, { title: '???', state: 'fog', why: 'the format is undecided' }] });
    assert.deepStrictEqual(ids(marks), ['P2']);
  });

  it('P3: a planned bubble whose hint names no boundary', () => {
    const marks = scoreTrack({ bubbles: [{ title: 'Parse input', state: 'done' }, { title: 'Add the flag', state: 'todo', hint: 'just do it' }] });
    assert.deepStrictEqual(ids(marks), ['P3', 'P3']);
  });

  it('P4: a title named after a file or a line, whatever the hint says', () => {
    const spilled = scoreTrack({ bubbles: [good('Edit args.js'), good('Fix src/cli'), good('Change line 12')] });
    assert.deepStrictEqual(ids(spilled), ['P4', 'P4', 'P4']);
    const hintOnly = { title: 'Data model', state: 'done', hint: 'src/lib/model.ts + track.ts. Boundary: src/lib' };
    assert.deepStrictEqual(scoreTrack({ bubbles: [hintOnly] }), []);
  });

  it('P5: one point per bubble outside the range', () => {
    const track = { bubbles: [good('One step'), good('Two step'), good('Three step'), good('Four step'), good('Five step')] };
    assert.deepStrictEqual(ids(scoreTrack(track, { bubbles: { min: 2, max: 3 } })), ['P5', 'P5']);
    assert.deepStrictEqual(ids(scoreTrack(track, { bubbles: { min: 6, max: 6 } })), ['P5']);
    assert.deepStrictEqual(scoreTrack(track, { bubbles: { min: 3, max: 5 } }), []);
  });
});
