// scoring/judgements.mjs: the judge's and the human's lines.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseJudgements } from '../../.bubble-tracks-benchmark/scoring/judgements.mjs';

describe('judgements', () => {
  it('a judge costs a point or fails the run, the human gives -1 or +1', () => {
    const marks = parseJudgements('# sheet\n-1 P12: note 1 had no formula\n\n+1 H2: the risky step got its own bubble\n-1 h3: two questions needed a rephrase\nfail F2: renamed the export');
    assert.deepStrictEqual(marks, [
      { id: 'P12', points: -1, what: 'note 1 had no formula', by: 'judge' },
      { id: 'H2', points: 1, what: 'the risky step got its own bubble', by: 'human' },
      { id: 'H3', points: -1, what: 'two questions needed a rephrase', by: 'human' },
      { id: 'F2', points: 0, what: 'renamed the export', by: 'judge' },
    ]);
  });

  it('refuses anything else', () => {
    assert.throws(() => parseJudgements('-3 H3: awful'), /not a judgement line/);
    assert.throws(() => parseJudgements('+1 P12: nice try'), /can only cost a point/);
    assert.throws(() => parseJudgements('-1 P99: what'), /no rule P99/);
    assert.throws(() => parseJudgements('-1 H3'), /not a judgement line/);
  });
});
