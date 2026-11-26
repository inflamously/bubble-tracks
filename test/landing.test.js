// The landing page (src/site/landingpage/) is plain HTML with one script, the hero's track card. This walks the
// card's track from Start to Finish, and checks that the markup index.html ships for the card is what the script
// draws first: a visitor sees the same card before and after the script loads.
import test, { before } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import * as esbuild from 'esbuild';
import { ROOT, importTs } from '../build.mjs';

const LANDING = path.join(ROOT, 'src', 'site', 'landingpage');

/**
 * The card, with the React that draws it: bundled as one module, so both use the same copy of React.
 * server.edge is the build of React's renderer that needs no Node modules and lets the test process end
 * (server.browser opens a message port and keeps it alive).
 */
const CARD_ENTRY = `
export { createElement } from 'react';
export { renderToStaticMarkup } from 'react-dom/server.edge';
export { TrackCard } from './track-card/view.js';
`;

let track;
let model;
let card;
before(async () => {
  track = await importTs('src/site/landingpage/track-card/state.mts');
  model = await importTs('src/site/landingpage/track-card/model.mts');
  const { outputFiles } = await esbuild.build({
    stdin: { contents: CARD_ENTRY, resolveDir: LANDING, loader: 'ts' },
    bundle: true,
    format: 'esm',
    platform: 'node',
    write: false,
    logLevel: 'warning',
  });
  card = await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
});

test('the track card walks to the fog, stops there, and goes on to Finish once the human plans it', () => {
  const { step, plan, describe: view } = track;
  let state = model.START;
  assert.equal(view(state).line, 'S ● ◐ ○ ? ○ F', 'it opens with one bubble done and the fog ahead');
  assert.equal(view(state).message, 'The agent is working on: Add the CSV endpoint.');
  assert.equal(view(state).next, 'step');
  assert.equal(plan(state), state, 'the fog cannot be planned before the agent stands on it');

  state = step(state);
  assert.equal(view(state).line, 'S ● ● ◐ ? ○ F');
  state = step(state);
  assert.equal(view(state).line, 'S ● ● ● ? ○ F', 'on the fog nothing is active');
  assert.equal(view(state).stopped, true);
  assert.equal(view(state).next, 'plan', 'the only move on fog is to plan it');
  assert.match(view(state).message, /^Stopped at fog\./);
  assert.equal(step(state), state, 'the agent does not step past unplanned fog');

  state = plan(state);
  assert.equal(view(state).line, 'S ● ● ● ◐ ○ F', 'the planned fog is the active bubble');
  assert.deepEqual(view(state).bubbles[3], { label: 'Stream big exports in chunks', kind: 'active', mark: '◐' }, 'it carries the title the human gave it');
  assert.equal(view(state).stopped, false);

  state = step(step(state));
  assert.equal(view(state).line, 'S ● ● ● ● ● F');
  assert.equal(view(state).next, null, 'at Finish only the restart is left');
  assert.match(view(state).message, /^Finish reached\./);
  assert.equal(step(state), state, 'there is no step past Finish');
});

test("index.html ships the track card's first state as plain markup", () => {
  const page = fs.readFileSync(path.join(LANDING, 'index.html'), 'utf8');
  const shipped = /<div class="[^"]*" id="track-card">([\s\S]*?)<\/div>/.exec(page);
  assert.ok(shipped, 'index.html has the #track-card element');
  const drawn = card.renderToStaticMarkup(card.createElement(card.TrackCard));
  // The page indents its markup, the script does not: the space between two tags is not part of either.
  assert.equal(shipped[1].replace(/>\s+</g, '><').trim(), drawn);
});
