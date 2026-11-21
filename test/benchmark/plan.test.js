// scoring/plan.mjs: the rules read from the proposal, P22 and P23, and the plan-shape scenario's two
// saved recordings: the same task planned well and planned badly.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { scorePlan } from '../../.bubble-tracks-benchmark/scoring/plan.mjs';
import { scoreRun } from '../../.bubble-tracks-benchmark/scoring/run.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const readJson = (...parts) => JSON.parse(fs.readFileSync(path.join(HERE, ...parts), 'utf8'));

const ids = (marks) => marks.map((m) => m.id);
const human = (text) => ({ who: 'human', text });
const agent = (text) => ({ who: 'agent', text });
const bubble = (...words) => ({ who: 'agent', bubble: words });
const planned = (events) => scorePlan([human('I want X'), ...events, bubble('create', 'x')]);

const SHAPED = '**TL;DR:** We do X.\n\n**Track:** `x` "X"\n\n**Goal:** X is done.\n\n**Guards:**\n1. Keep Y.\n\n**Bubbles:**\n1. First step: do A.\n   [Boundary: the A page]\n2. ❓ why: undecided who does B\n';

describe('plan rules', () => {
  it('a proposal in the shape loses nothing; markdown around a label is fine', () => {
    assert.deepStrictEqual(planned([agent(SHAPED)]), []);
    assert.deepStrictEqual(planned([agent(SHAPED.replace(/\*\*(\w[\w;]*):\*\*/g, '## $1\n'))]), []);
  });

  it('P22: a part is missing, or the parts are out of order: one point either way', () => {
    const noTldr = planned([agent(SHAPED.replace('**TL;DR:** We do X.\n\n', ''))]);
    assert.deepStrictEqual(ids(noTldr), ['P22']);
    assert.match(noTldr[0].what, /the proposal has no TL;DR/);
    const goalFirst = planned([agent('**Goal:** X is done.\n\n' + SHAPED.replace('**Goal:** X is done.\n\n', ''))]);
    assert.deepStrictEqual(ids(goalFirst), ['P22']);
    assert.match(goalFirst[0].what, /the proposal's goal comes before its track/);
  });

  it('P23: a planned bubble without its own boundary line; a fog needs none', () => {
    const inline = planned([agent(SHAPED.replace('do A.\n   [Boundary: the A page]', 'do A. Boundary: the A page'))]);
    assert.deepStrictEqual(ids(inline), ['P23']);
    assert.match(inline[0].what, /1 of 1 proposed bubbles show no \[Boundary: …\] line/);
  });

  it('reads the last message before the track is made, and nothing when it has no proposal to read', () => {
    assert.deepStrictEqual(planned([agent('first try, no shape'), human('add a guard'), agent(SHAPED)]), []);
    assert.deepStrictEqual(ids(planned([agent(SHAPED), human('ok'), agent('Creating it now.')])), ['P22']);
    assert.deepStrictEqual(scorePlan([human('I want X'), bubble('create', 'x')]), []); // no messages recorded
    assert.deepStrictEqual(scorePlan([human('I want X'), agent('no shape')]), []); // no track made
    assert.deepStrictEqual(scorePlan([human('here is my plan'), agent('no shape'), bubble('create', 'x')], { start: 'plan' }), []);
  });
});

describe('plan-shape: a good plan against a bad one', () => {
  const scenario = readJson('..', '..', '.bubble-tracks-benchmark', 'scenarios', 'plan-shape.json');
  const hint = 'Boundary: the plan';
  const track = {
    goal: 'The chess club holds its open day in June, in the yard or in the hall',
    guards: ["The club's weekly training stays as it is", 'We spend no more than 200 euros'],
    bubbles: [
      { title: 'Pick the date', state: 'todo', hint },
      { title: 'Yard setup', state: 'todo', hint },
      { title: 'Hall setup', state: 'todo', hint },
      { title: '???', state: 'fog', why: 'Undecided who invites the visitors, and how' },
    ],
  };
  const score = (name) => scoreRun({ scenario, track, recording: readJson('fixtures', `plan-shape-${name}.json`) });

  it('the good plan keeps every point the script can take', () => {
    const good = score('good');
    assert.deepStrictEqual(good.marks, []);
    assert.strictEqual(good.points, 0);
  });

  it('the bad plan loses three: track after a change (P8), no shape (P22), no boundary lines (P23)', () => {
    const bad = score('bad');
    assert.deepStrictEqual(ids(bad.marks), ['P8', 'P22', 'P23']);
    assert.strictEqual(bad.points, -3);
    assert.strictEqual(bad.failed, false);
  });

  it('the same bad recording passes P8 in a scenario where the first reply approves', () => {
    const { approval, ...firstReplyApproves } = scenario;
    assert.strictEqual(approval, 2);
    const marks = scoreRun({ scenario: firstReplyApproves, track, recording: readJson('fixtures', 'plan-shape-bad.json') }).marks;
    assert.ok(!ids(marks).includes('P8'));
  });
});
