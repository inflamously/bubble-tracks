// scoring/sizes.mjs: tokens and work per bubble, and the two flags.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { bubbleSizes, tokenReport } from '../../.bubble-tracks-benchmark/scoring/sizes.mjs';

const human = (text) => ({ who: 'human', text });
const bubble = (...words) => ({ who: 'agent', bubble: words });
const edit = (file) => ({ who: 'agent', edit: file });

describe('tokens', () => {
  it('are split at each done, and an outlier bubble is flagged', () => {
    const events = [
      { who: 'agent', text: 'plan', tokens: 100 },
      { ...bubble('done'), tokens: 100 },
      { who: 'agent', text: 'roundabout', tokens: 1800 },
      bubble('done'),
      { ...bubble('done'), tokens: 300 },
      { who: 'agent', text: 'summary', tokens: 50 },
    ];
    assert.deepStrictEqual(tokenReport(events), { total: 2350, perBubble: [200, 1800, 300], afterLastDone: 50, flagged: [2] });
  });

  it('nothing is flagged with too few bubbles, and no counts means no report', () => {
    assert.deepStrictEqual(tokenReport([{ ...bubble('done'), tokens: 10 }, { ...bubble('done'), tokens: 900 }]).flagged, []);
    assert.strictEqual(tokenReport([human('go'), bubble('done')]), null);
  });
});

describe('bubble sizes', () => {
  it('are counted per bubble, and one far smaller than the others is flagged as small', () => {
    const work = (edits) => [...Array.from({ length: edits }, (_, i) => edit(`src/f${i}.js`)), { who: 'agent', text: 'checked' }, { who: 'agent', text: 'tested' }];
    const events = [human('go'), ...work(3), ...work(3), bubble('done'), human('go'), edit('src/a.js'), bubble('done'), human('go'), edit('.bubble-tracks/x.json'), ...work(4), ...work(2), bubble('done')];
    assert.deepStrictEqual(bubbleSizes(events), { perBubble: [{ edits: 6, steps: 11 }, { edits: 1, steps: 2 }, { edits: 6, steps: 12 }], small: [2] });
  });

  it('go by tokens when the recording has them, and flag nothing in a short run', () => {
    const step = (tokens) => ({ ...bubble('done'), tokens });
    assert.deepStrictEqual(bubbleSizes([step(900), step(100), step(1000)]).small, [2]);
    assert.deepStrictEqual(bubbleSizes([step(900), step(100), step(1000)]).perBubble[1], { edits: 0, steps: 1, tokens: 100 });
    assert.deepStrictEqual(bubbleSizes([step(900), step(100)]).small, []);
  });
});
