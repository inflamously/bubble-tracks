// runner/: the parts of a benchmark run that need no agent. The session log becomes a recording, the
// throwaway repo is built and read back, and `until` says when a run is over.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { bubbleCommands, eventsFromLog } from '../../.bubble-tracks-benchmark/runner/recording.mjs';
import { buildRepo, changedFiles, readCurrentTrack, snapshot, trackNames } from '../../.bubble-tracks-benchmark/runner/repo.mjs';
import { isFinished } from '../../.bubble-tracks-benchmark/runner/until.mjs';

const BENCH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.bubble-tracks-benchmark');

const scenario = (name) => JSON.parse(fs.readFileSync(path.join(BENCH, 'scenarios', `${name}.json`), 'utf8'));
const tempRepo = () => fs.mkdtempSync(path.join(os.tmpdir(), 'bubble-runner-test-'));
/** One line of a session log: an agent message with these content blocks. */
const logLine = (id, outputTokens, ...content) => ({ type: 'assistant', message: { id, usage: { output_tokens: outputTokens }, content } });
const bash = (command) => ({ type: 'tool_use', name: 'Bash', input: { command } });

describe('the recording from a session log', () => {
  it('reads the bubble commands out of a shell line', () => {
    assert.deepStrictEqual(bubbleCommands('node "/skill dir/scripts/cli/bubble.js" add "Format rows" --dir /tmp/repo'), [['add', 'Format rows']]);
    assert.deepStrictEqual(bubbleCommands("node x/bubble.js hint 1 'say \"hi\"' 2>&1 && node x/bubble.js done; ls"), [['hint', '1', 'say "hi"'], ['done']]);
    assert.deepStrictEqual(bubbleCommands('node x/bubble.js fill 2 "a \\"valid\\" port"\nnode x/bubble.js show | head'), [['fill', '2', 'a "valid" port'], ['show']]);
    assert.deepStrictEqual(bubbleCommands('node test.js && npm test'), []);
    // agents often keep the CLI in a shell variable
    assert.deepStrictEqual(bubbleCommands("B='node /skill/cli/bubble.js'\n$B create car \"Start the car\" &&\n$B add \"Find the key\"; ${B} show | tail -n 3"), [['create', 'car', 'Start the car'], ['add', 'Find the key'], ['show']]);
    assert.deepStrictEqual(bubbleCommands('CLI="node x/bubble.js"; "$CLI" done; echo $OTHER done'), [['done']]);
  });

  it('keeps messages, bubble commands and edits in order, and counts each message once', () => {
    const lines = [
      logLine('m1', 40, { type: 'thinking', thinking: '…' }),
      logLine('m1', 40, { type: 'text', text: 'Format rows first.' }),
      logLine('m1', 40, { type: 'tool_use', name: 'Edit', input: { file_path: '/tmp/repo/src/csv.js' } }),
      logLine('m2', 7, { type: 'tool_use', name: 'Read', input: { file_path: '/tmp/repo/src/api.js' } }),
      logLine('m3', 5, bash('node x/bubble.js done')),
    ];
    assert.deepStrictEqual(eventsFromLog(lines, '/tmp/repo'), [
      { who: 'agent', text: 'Format rows first.', tokens: 40 },
      { who: 'agent', edit: 'src/csv.js' },
      // m2 only read a file: its tokens go to the next step
      { who: 'agent', bubble: ['done'], tokens: 12 },
    ]);
  });
});

describe('the throwaway repo', () => {
  it('holds the scenario files and the tracks its setup made', () => {
    const repoDir = tempRepo();
    buildRepo(scenario('guard-pressure'), repoDir);
    assert.match(fs.readFileSync(path.join(repoDir, 'src', 'api.js'), 'utf8'), /getReport/);
    assert.deepStrictEqual(trackNames(repoDir), ['csv-export']);
    const current = readCurrentTrack(repoDir);
    assert.strictEqual(current.name, 'csv-export');
    assert.deepStrictEqual(current.track.bubbles.map((bubble) => bubble.title), ['Format rows', 'Write the file']);
  });

  it('sees which project files a turn changed, leaving the planning folder out', () => {
    const repoDir = tempRepo();
    buildRepo(scenario('guard-pressure'), repoDir);
    const before = snapshot(repoDir);
    assert.deepStrictEqual(Object.keys(before).sort(), ['src/api.js', 'src/csv.js', 'src/export.js']);
    fs.appendFileSync(path.join(repoDir, 'src', 'csv.js'), '// more\n');
    fs.writeFileSync(path.join(repoDir, 'report.csv'), 'a,b\n');
    fs.rmSync(path.join(repoDir, 'src', 'export.js'));
    assert.deepStrictEqual(changedFiles(before, snapshot(repoDir)), ['report.csv', 'src/csv.js', 'src/export.js']);
  });

  it('has no track before one is made, and reads a fork as the track it came from', () => {
    const repoDir = tempRepo();
    buildRepo({ repo: { files: { 'README.md': '# x\n' }, setup: [] } }, repoDir);
    assert.strictEqual(readCurrentTrack(repoDir), null);
    buildRepo({ repo: { setup: [['create', 'main', 'Main'], ['add', 'First'], ['fork', '1', 'deeper']] } }, repoDir);
    assert.strictEqual(readCurrentTrack(repoDir).name, 'main');
  });
});

describe('until', () => {
  const fog = { title: '???', state: 'fog' };
  const todo = { title: 'Find the key', state: 'active' };
  const on = (name, track) => ({ name, track });

  it('planned: a new track with bubbles and no unclassified fog', () => {
    assert.strictEqual(isFinished('planned', null, []), false);
    assert.strictEqual(isFinished('planned', on('car', { bubbles: [] }), []), false);
    assert.strictEqual(isFinished('planned', on('car', { bubbles: [todo, fog] }), []), false);
    assert.strictEqual(isFinished('planned', on('car', { bubbles: [todo, { ...fog, type: 'unknown-known' }] }), []), true);
    assert.strictEqual(isFinished('planned', on('car', { bubbles: [todo, { ...fog, answer: 'somewhere in the hall' }] }), []), true);
    // a track the setup made is not the one the agent was asked to plan
    assert.strictEqual(isFinished('planned', on('old-idea', { bubbles: [todo] }), ['old-idea']), false);
  });

  it('closed: the track is closed', () => {
    assert.strictEqual(isFinished('closed', on('csv', { bubbles: [todo] }), ['csv']), false);
    assert.strictEqual(isFinished('closed', on('csv', { bubbles: [todo], closed: { at: '2026-11-12' } }), ['csv']), true);
  });
});
