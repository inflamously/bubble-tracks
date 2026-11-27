// scoring/verify.mjs: the rules read from the recording about the verify step, P26 and P27.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { scoreVerify } from '../../.bubble-tracks-benchmark/scoring/verify.mjs';
import { scoreRun } from '../../.bubble-tracks-benchmark/scoring/run.mjs';

const ids = (marks) => marks.map((m) => m.id);
const human = (text) => ({ who: 'human', text });
const bubble = (...words) => ({ who: 'agent', bubble: words });

const PLANNED = [human('plan the handbook'), bubble('create', 'handbook', '--draft'), bubble('add', 'Write', 'page'), human('ok'), bubble('approve')];

describe('verify rules', () => {
  it('P26: approve needs a verify before the first done', () => {
    assert.deepStrictEqual(scoreVerify([...PLANNED, bubble('verify')]), []);
    assert.deepStrictEqual(ids(scoreVerify(PLANNED)), ['P26']);
    assert.deepStrictEqual(ids(scoreVerify([...PLANNED, human('go'), bubble('done'), bubble('verify')])), ['P26']);
    // a later turn is still in time, as long as no bubble was popped
    assert.deepStrictEqual(scoreVerify([...PLANNED, human('go'), bubble('verify')]), []);
  });

  it('P26: a recording without an approve owes no verify', () => {
    assert.deepStrictEqual(scoreVerify([human('plan it'), human('ok'), bubble('create', 'notes'), bubble('done')]), []);
  });

  it('P27: a plan change after verify needs the human first, and costs one point per verify', () => {
    const applied = scoreVerify([...PLANNED, bubble('verify'), bubble('hint', '1', 'Rules', 'only'), bubble('insert', 'at', '2', 'Gear', 'list')]);
    assert.deepStrictEqual(ids(applied), ['P27']);
    assert.match(applied[0].what, /hint after verify, before the human approved the change/);
    assert.deepStrictEqual(scoreVerify([...PLANNED, bubble('verify'), human('apply the first'), bubble('hint', '1', 'Rules', 'only')]), []);
  });

  it('P27: reading the track after verify changes nothing', () => {
    assert.deepStrictEqual(scoreVerify([...PLANNED, bubble('verify'), bubble('show'), bubble('guard', 'show')]), []);
  });

  it('a run adds the verify marks to its score', () => {
    const track = { goal: 'A handbook', guards: ['one page'], bubbles: [{ title: 'Write page', state: 'todo', hint: 'x [Boundary: handbook.md]' }] };
    const score = scoreRun({ scenario: { start: 'plan' }, track, recording: { events: PLANNED } });
    assert.deepStrictEqual(ids(score.marks), ['P26']);
    assert.ok(score.unchecked.includes('P28'));
  });
});
