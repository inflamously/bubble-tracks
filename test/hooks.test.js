import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'node:url';
import { extractTargetPaths } from '../skills/bubble/scripts/lib/hooks/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS = path.join(__dirname, '..', 'skills', 'bubble', 'scripts', 'cli');
const run = (script, input, env = {}) =>
  spawnSync(process.execPath, [path.join(SCRIPTS, script)], {
    input: JSON.stringify(input),
    encoding: 'utf8',
    env: { ...process.env, BUBBLES_ASCII: '', NO_COLOR: '1', FORCE_COLOR: undefined, ...env },
  });

function repo(track) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-'));
  fs.mkdirSync(path.join(dir, 'src', 'deep'), { recursive: true });
  if (track !== undefined) {
    fs.mkdirSync(path.join(dir, '.bubble-tracks'));
    fs.writeFileSync(path.join(dir, '.bubble-tracks', 'track.json'), typeof track === 'string' ? track : JSON.stringify(track));
  }
  return dir;
}
const fogTrack = { title: 'P', bubbles: [{ title: 'A', state: 'done' }, { title: '???', state: 'fog' }] };
const todoTrack = { title: 'P', bubbles: [{ title: 'A', state: 'todo' }] };

test('extractTargetPaths: claude, gemini, codex apply_patch', () => {
  const root = path.resolve('/r');
  assert.deepStrictEqual(extractTargetPaths({ tool_input: { file_path: 'a.js' } }, root), [path.join(root, 'a.js')]);
  const patch = '*** Begin Patch\n*** Update File: src/a.js\n@@\n*** Add File: b.js\n+x\n*** Delete File: c.js\n*** End Patch';
  assert.deepStrictEqual(
    extractTargetPaths({ tool_name: 'apply_patch', tool_input: { command: patch } }, root),
    ['src/a.js', 'b.js', 'c.js'].map((p) => path.join(root, p))
  );
});

test('gate ignores a closed track, even at fog', () => {
  const dir = repo({ ...fogTrack, closed: { at: '2026-10-16T00:00:00.000Z' } });
  const r = run('fog-gate.js', { cwd: dir, tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'src', 'a.js') } });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stderr, '');
});

test('gate blocks edits at fog for every payload shape', () => {
  const dir = repo(fogTrack);
  const payloads = [
    { cwd: dir, tool_name: 'Edit', tool_input: { file_path: path.join(dir, 'src', 'a.js') } },
    { cwd: dir, tool_name: 'replace', tool_input: { file_path: 'src/a.js' } },
    { cwd: dir, tool_name: 'apply_patch', tool_input: { command: '*** Begin Patch\n*** Add File: x.js\n+1\n*** End Patch' } },
  ];
  for (const p of payloads) {
    const r = run('fog-gate.js', p);
    assert.strictEqual(r.status, 2, p.tool_name);
    assert.match(r.stderr, /unplanned/);
    assert.strictEqual(r.stdout, '');
  }
});

test('gate blocks edits while the active bubble is the human\'s to do: user track, or picked on a hybrid one', () => {
  const edit = (dir, file = 'src/a.js') => run('fog-gate.js', { cwd: dir, tool_name: 'Edit', tool_input: { file_path: file } });
  const A = { title: 'A', state: 'todo' };
  const mine = { title: 'A', state: 'todo', owner: 'user' };
  const B = { title: 'B', state: 'todo', owner: 'user' };
  for (const track of [{ title: 'P', ownership: 'user', bubbles: [A] }, { title: 'P', ownership: 'hybrid', bubbles: [mine] }]) {
    const r = edit(repo(track));
    assert.strictEqual(r.status, 2, track.ownership);
    assert.match(r.stderr, /Active bubble "A" is the human's to do — don't do its work yourself\. Hint at the steps, and check the work once they say it's done\. Only the human hands it to you: bubble own -/);
    assert.strictEqual(r.stdout, '');
  }
  // the plan folder stays open, as at fog; the track file itself is the CLI's
  assert.strictEqual(edit(repo({ title: 'P', ownership: 'user', bubbles: [A] }), '.bubble-tracks/abilities/ready.md').status, 0);
  assert.match(edit(repo({ title: 'P', ownership: 'user', bubbles: [A] }), '.bubble-tracks/track.json').stderr, /is a track file/);
  // allowed: the agent's bubble on a hybrid track (a later one is the human's), a stray owner on an agent track, all done, closed
  assert.strictEqual(edit(repo({ title: 'P', ownership: 'hybrid', bubbles: [A, B] })).status, 0);
  assert.strictEqual(edit(repo({ title: 'P', bubbles: [mine] })).status, 0);
  assert.strictEqual(edit(repo({ title: 'P', ownership: 'user', bubbles: [{ title: 'A', state: 'done' }] })).status, 0);
  assert.strictEqual(edit(repo({ title: 'P', ownership: 'user', closed: { at: '2026-10-16T00:00:00.000Z' }, bubbles: [A] })).status, 0);
  // fog on the human's bubble: the fog message wins, planning comes first
  const fog = edit(repo({ title: 'P', ownership: 'user', bubbles: [{ title: '???', state: 'fog' }] }));
  assert.strictEqual(fog.status, 2);
  assert.match(fog.stderr, /unplanned/);
});

test('gate refuses hand edits to track files, at any bubble state: only the CLI writes them', () => {
  const cli = path.join(SCRIPTS, 'bubble.js');
  for (const track of [todoTrack, fogTrack, { ...todoTrack, closed: { at: '2026-01-01T00:00:00.000Z' } }]) {
    const dir = repo(track);
    const edit = (file) => run('fog-gate.js', { cwd: dir, tool_input: { file_path: file } });
    const r = edit('.bubble-tracks/track.json');
    assert.strictEqual(r.status, 2);
    assert.strictEqual(r.stdout, '');
    assert.strictEqual(r.stderr, `"track.json" is a track file — don't edit it by hand. Change the track through the CLI: node "${cli}" <command> (try: help)\n`);
    assert.strictEqual(edit(path.join(dir, '.bubble-tracks', 'current')).status, 2); // the pointer, absolute path
    assert.strictEqual(edit('.bubble-tracks/new.json').status, 2); // a track that doesn't exist yet: create makes it
    assert.strictEqual(edit('.bubble-tracks/Track.JSON').status, 2); // names ignore case
    assert.strictEqual(edit('.bubble-tracks/abilities/ready.md').status, 0); // abilities are files the human and agent write
    assert.strictEqual(edit('.bubble-tracks/abilities/notes.json').status, 0); // only the top level holds tracks
  }
  const dir = repo(todoTrack);
  const patch = run('fog-gate.js', { cwd: dir, tool_input: { command: '*** Update File: .bubble-tracks/track.json\n*** Update File: .bubble-tracks/current\n*** Update File: src/a.js' } });
  assert.strictEqual(patch.status, 2);
  assert.match(patch.stderr, /^"track\.json", "current" are track files — don't edit them by hand\. /);
  // a second track's file is gated too, also when the current track is missing
  fs.writeFileSync(path.join(dir, '.bubble-tracks', 'other.json'), JSON.stringify(todoTrack));
  fs.writeFileSync(path.join(dir, '.bubble-tracks', 'current'), 'gone\n');
  assert.strictEqual(run('fog-gate.js', { cwd: dir, tool_input: { file_path: '.bubble-tracks/other.json' } }).status, 2);
  // a track file that no longer parses: the CLI can't load it, so a hand edit is the repair
  const broken = repo('{nope');
  assert.strictEqual(run('fog-gate.js', { cwd: broken, tool_input: { file_path: '.bubble-tracks/track.json' } }).status, 0);
});

test('gate allows: abilities at fog, todo bubble, no track, corrupt track, subdir cwd', () => {
  const fog = repo(fogTrack);
  assert.strictEqual(run('fog-gate.js', { cwd: fog, tool_input: { file_path: '.bubble-tracks/abilities/ready.md' } }).status, 0);
  assert.strictEqual(
    run('fog-gate.js', { cwd: fog, tool_input: { command: `*** Update File: .bubble-tracks/abilities/ready.md\n*** Update File: src/a.js` } }).status,
    2,
    'mixed patch still blocked'
  );
  assert.strictEqual(run('fog-gate.js', { cwd: path.join(fog, 'src', 'deep'), tool_input: { file_path: 'z.js' } }).status, 2);
  assert.strictEqual(run('fog-gate.js', { cwd: repo(todoTrack), tool_input: { file_path: 'a.js' } }).status, 0);
  assert.strictEqual(run('fog-gate.js', { cwd: repo(), tool_input: { file_path: 'a.js' } }).status, 0);
  assert.strictEqual(run('fog-gate.js', { cwd: repo('{nope'), tool_input: { file_path: 'a.js' } }).status, 0);
});

test('statusline renders from workspace dir, subdir, ascii, empty, invalid', () => {
  const dir = repo(fogTrack);
  assert.strictEqual(run('statusline.js', { workspace: { current_dir: dir } }).stdout, 'P   S ●──❓ F   A ‹ ❓ needs you\n');
  assert.strictEqual(run('statusline.js', { cwd: path.join(dir, 'src', 'deep') }).stdout, 'P   S ●──❓ F   A ‹ ❓ needs you\n');
  assert.strictEqual(run('statusline.js', { cwd: dir }, { BUBBLES_ASCII: '1' }).stdout, 'P   S *--? F   A < ? needs you\n');
  assert.strictEqual(run('statusline.js', { cwd: repo() }).stdout, '\n');
  assert.strictEqual(run('statusline.js', { cwd: repo('[]') }).stdout, 'bubbles: invalid track.json\n');
});

test('CLI: init, add, show exit 3 at fog, fill, done', () => {
  const dir = repo();
  const cli = (...args) => spawnSync(process.execPath, [path.join(SCRIPTS, 'bubble.js'), ...args, '--dir', dir], { encoding: 'utf8' });
  assert.strictEqual(cli('init', 'Demo').status, 0);
  assert.strictEqual(cli('init', 'Again').status, 1);
  cli('add', 'First');
  assert.strictEqual(cli('add', '--fog').status, 0);
  cli('done');
  const show = cli('show');
  assert.strictEqual(show.status, 3);
  assert.match(show.stdout, /needs you/);
  assert.strictEqual(cli('type', 'known-known').status, 0);
  assert.strictEqual(cli('fill', 'Second').status, 0);
  assert.strictEqual(cli('show').status, 0);
  assert.match(cli('done').stdout, /all done/);
  const saved = JSON.parse(fs.readFileSync(path.join(dir, '.bubble-tracks', 'track.json'), 'utf8'));
  assert.deepStrictEqual(saved.bubbles, [
    { title: 'First', state: 'done', id: 1 },
    { title: 'Second', state: 'done', type: 'known-known', id: 2 },
  ]);
});

test('statusline colors: title green, track blue, context yellow; --no-color and NO_COLOR turn it off', () => {
  const dir = repo(fogTrack);
  const out = run('statusline.js', { cwd: dir }, { NO_COLOR: '' }).stdout;
  assert.strictEqual(out, '\x1b[32mP\x1b[0m   \x1b[34mS ●──❓ F\x1b[0m   \x1b[33mA ‹ ❓ needs you\x1b[0m\n');
  const plain = 'P   S ●──❓ F   A ‹ ❓ needs you\n';
  assert.strictEqual(run('statusline.js', { cwd: dir }, { NO_COLOR: '1' }).stdout, plain);
  const noColor = spawnSync(process.execPath, [path.join(SCRIPTS, 'statusline.js'), '--no-color'], {
    input: JSON.stringify({ cwd: dir }), encoding: 'utf8', env: { ...process.env, BUBBLES_ASCII: '', NO_COLOR: '', FORCE_COLOR: undefined },
  });
  assert.strictEqual(noColor.stdout, plain);
});

test('statusline counts guards after the line: singular, plural, ascii, color; none adds nothing', () => {
  const guarded = (guards) => repo({ ...todoTrack, guards });
  assert.strictEqual(run('statusline.js', { cwd: guarded(['x']) }).stdout, 'P   S ◐ F   ◐ A   ¦ 1 guard\n');
  assert.strictEqual(run('statusline.js', { cwd: guarded(['x', 'y', 'z']) }).stdout, 'P   S ◐ F   ◐ A   ¦ 3 guards\n');
  assert.strictEqual(run('statusline.js', { cwd: guarded(['x', 'y']) }, { BUBBLES_ASCII: '1' }).stdout, 'P   S @ F   @ A   ! 2 guards\n');
  assert.strictEqual(
    run('statusline.js', { cwd: guarded(['x', 'y']) }, { NO_COLOR: '' }).stdout,
    '\x1b[32mP\x1b[0m   \x1b[34mS ◐ F\x1b[0m   \x1b[33m◐ A\x1b[0m   \x1b[33m¦ 2 guards\x1b[0m\n'
  );
  assert.strictEqual(run('statusline.js', { cwd: guarded([]) }).stdout, 'P   S ◐ F   ◐ A\n');
});

test('fog gate and statusline follow the current track', () => {
  const dir = repo(todoTrack);
  fs.writeFileSync(path.join(dir, '.bubble-tracks', 'foggy.json'), JSON.stringify(fogTrack));
  const edit = { cwd: dir, tool_input: { file_path: path.join(dir, 'src', 'a.js') } };
  assert.strictEqual(run('fog-gate.js', edit).status, 0);
  fs.writeFileSync(path.join(dir, '.bubble-tracks', 'current'), 'foggy\n');
  assert.strictEqual(run('fog-gate.js', edit).status, 2);
  assert.match(run('statusline.js', { cwd: dir }).stdout, /needs you/);
});

test('statusline launcher: the session-start hook writes a launcher that runs the status line', () => {
  const dir = repo(fogTrack);
  // a data folder that doesn't exist yet, with a space in its path
  const data = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles data-')), 'bubble-tracks-bubble-tracks');
  const hook = run('statusline-launcher.js', { hook_event_name: 'SessionStart' }, { CLAUDE_PLUGIN_DATA: data });
  assert.strictEqual(hook.status, 0);
  assert.strictEqual(hook.stdout, '', 'a SessionStart hook must not write stdout: Claude Code adds it to the context');
  const launcher = path.join(data, 'statusline.js');
  const launch = (args = []) =>
    spawnSync(process.execPath, [launcher, ...args], {
      input: JSON.stringify({ cwd: dir }),
      encoding: 'utf8',
      env: { ...process.env, BUBBLES_ASCII: '', NO_COLOR: '1', FORCE_COLOR: undefined },
    });
  assert.strictEqual(launch().stdout, run('statusline.js', { cwd: dir }).stdout);
  assert.strictEqual(launch().stdout, 'P   S ●──❓ F   A ‹ ❓ needs you\n');
  assert.strictEqual(launch(['--ascii']).stdout, 'P   S *--? F   A < ? needs you\n', 'flags reach the status line');

  // a second session start leaves an up-to-date launcher alone
  const written = fs.statSync(launcher).mtimeMs;
  run('statusline-launcher.js', {}, { CLAUDE_PLUGIN_DATA: data });
  assert.strictEqual(fs.statSync(launcher).mtimeMs, written);

  // a launcher left by another plugin version is replaced
  fs.writeFileSync(launcher, 'import("file:///gone/statusline.js").catch(() => process.stdout.write("\\n"));\n');
  assert.strictEqual(launch().stdout, '\n', 'a launcher whose plugin version is gone prints a blank line');
  run('statusline-launcher.js', {}, { CLAUDE_PLUGIN_DATA: data });
  assert.match(launch().stdout, /needs you/);
});

test('statusline launcher: outside a plugin (no data folder) it does nothing', () => {
  const r = run('statusline-launcher.js', {}, { CLAUDE_PLUGIN_DATA: '' });
  assert.strictEqual(r.status, 0);
  assert.strictEqual(r.stdout + r.stderr, '');
});
