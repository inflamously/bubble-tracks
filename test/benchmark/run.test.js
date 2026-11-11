// scoring/run.mjs, scoring/report.mjs and score.mjs: a whole run added up, printed, and from the
// command line. The three saved baseline tracks are the fixed inputs.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'node:url';
import { parseJudgements } from '../../.bubble-tracks-benchmark/scoring/judgements.mjs';
import { report } from '../../.bubble-tracks-benchmark/scoring/report.mjs';
import { scoreRun } from '../../.bubble-tracks-benchmark/scoring/run.mjs';

const BENCH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.bubble-tracks-benchmark');
const SCORE = path.join(BENCH, 'score.mjs');

const ids = (marks) => marks.map((m) => m.id);
const good = (title) => ({ title, state: 'todo', hint: 'Boundary: src/x.js' });
const human = (text) => ({ who: 'human', text });
const bubble = (...words) => ({ who: 'agent', bubble: words });
const edit = (file) => ({ who: 'agent', edit: file });

describe('a whole run', () => {
  const scenario = { name: 'demo', protected: ['package.json'], bubbles: { min: 2, max: 3 } };
  const track = { bubbles: [good('Read the parser'), good('Add the flag')] };

  it('adds the script, the judge and the human up, and a fail fails it', () => {
    const recording = { events: [human('add a flag'), human('ok'), bubble('create', 'shout'), human('go'), edit('package.json'), bubble('done')] };
    const score = scoreRun({ scenario, track, recording, judgements: parseJudgements('-1 P6: edited past the boundary\n+1 H2: good split\n+1 H3: clear questions') });
    assert.strictEqual(score.failed, true);
    assert.strictEqual(score.points, 1);
    assert.strictEqual(score.pointsPerBubble, 0.5);
    assert.deepStrictEqual(ids(score.marks), ['F2', 'P6', 'H2', 'H3']);
    assert.ok(!score.unchecked.includes('P6') && !score.unchecked.includes('F1'));
    assert.ok(score.unchecked.includes('P7') && score.unchecked.includes('H1'));
    assert.match(report(score), /^demo: FAILED, \+1 points \(2 bubbles, 0\.5 per bubble\)\n {2}fail {2}F2 {3}edited package\.json, which a guard rules out\n/);
  });

  it('with only a track file, says which rules nobody checked', () => {
    const score = scoreRun({ track });
    assert.strictEqual(score.points, 0);
    assert.strictEqual(score.tokens, null);
    assert.deepStrictEqual(score.unchecked.slice(0, 5), ['F1', 'F2', 'F3', 'F4', 'P6']);
  });
});

describe('the report', () => {
  it('lists the sizes with the small flag, and each fill next to its answer', () => {
    const work = (n) => Array.from({ length: n }, (_, i) => edit(`src/f${i}.js`));
    const events = [human('plan it'), human('3: keep them in a notes.json file'), bubble('fill', '3', 'Store', 'in', 'SQLite'), ...work(6), bubble('done'), human('go'), edit('src/a.js'), bubble('done'), human('go'), ...work(7), bubble('done')];
    const text = report(scoreRun({ track: { bubbles: [] }, recording: { events } }));
    assert.match(text, /size per bubble: 1: 6 edits, 8 steps; 2: 1 edit, 2 steps; 3: 7 edits, 8 steps\n {2}small: bubble 2 took far less than the others/);
    assert.match(text, /fill 3 "Store in SQLite": the human said "keep them in a notes\.json file" \(P18: does the fill say that\?\)/);
  });
});

describe('the saved baseline tracks', () => {
  const baseline = { 'flow-analysis.json': [-14, { P1: 1, P2: 1, P3: 12 }], 'goal-guard-test.json': [0, {}], 'src-tour.json': [-8, { P3: 8 }] };
  for (const [file, [points, counts]] of Object.entries(baseline)) {
    it(`${file} scores ${points}`, () => {
      const score = scoreRun({ track: JSON.parse(fs.readFileSync(path.join(BENCH, file), 'utf8')) });
      const seen = {};
      for (const m of score.marks) seen[m.id] = (seen[m.id] || 0) + 1;
      assert.strictEqual(score.points, points);
      assert.deepStrictEqual(seen, counts);
    });
  }
});

describe('the command line', () => {
  it('prints the report, or JSON, and exits 1 on a bad call', () => {
    const run = (...args) => spawnSync('node', [SCORE, ...args], { encoding: 'utf8' });
    const text = run('--track', path.join(BENCH, 'src-tour.json'));
    assert.strictEqual(text.status, 0);
    assert.match(text.stdout, /^-8 points \(8 bubbles, -1 per bubble\)\n {4}-1 {2}P3 {3}bubble 1 "Big picture map" names no boundary/);
    assert.match(text.stdout, /\nnot checked: F1 F2 F3 F4 P6 /);
    const asJson = run('--track', path.join(BENCH, 'goal-guard-test.json'), '--json');
    assert.strictEqual(JSON.parse(asJson.stdout).points, 0);
    assert.strictEqual(run().status, 1);
    assert.match(run('--nope').stderr, /unknown option "--nope"/);
  });
});
