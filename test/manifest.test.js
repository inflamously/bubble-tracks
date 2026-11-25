// The plugin is published from three manifests; keep their shared fields in step.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { VERSION_FILES, bump } from '../build.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
// The marketplace entry's source: an install copies only this folder.
const PLUGIN_ROOT = 'skills';
const PLUGIN_JSON = `${PLUGIN_ROOT}/.claude-plugin/plugin.json`;
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));

test('package.json, plugin.json and marketplace.json agree', () => {
  const pkg = read('package.json');
  const plugin = read(PLUGIN_JSON);
  const market = read('.claude-plugin/marketplace.json');
  const entry = market.plugins.find((p) => p.name === plugin.name);
  assert.ok(entry, `marketplace.json lists no plugin named "${plugin.name}"`);
  assert.strictEqual(entry.source, `./${PLUGIN_ROOT}`, 'marketplace.json must install only the plugin folder');
  assert.strictEqual(plugin.skills, './', 'plugin.json must find the skill beside it, at bubble/');
  assert.strictEqual(plugin.version, pkg.version, 'plugin.json version != package.json version (run: npm run bump)');
  const lock = read('package-lock.json');
  assert.strictEqual(lock.version, pkg.version, 'package-lock.json version != package.json version');
  assert.strictEqual(lock.packages[''].version, pkg.version, 'package-lock.json root package version != package.json version');
  assert.strictEqual(entry.version, undefined, 'set the version in plugin.json only (it wins over marketplace.json)');
  assert.strictEqual(plugin.license, pkg.license);
  assert.strictEqual(entry.license, pkg.license);
  assert.strictEqual(entry.repository, plugin.repository);
  assert.ok(fs.existsSync(path.join(ROOT, 'LICENSE')), 'LICENSE file missing');
});

test('plugin.json: every hook runs a script that exists', () => {
  // Claude Code reads the manifest only at .claude-plugin/plugin.json under the plugin root,
  // and ${CLAUDE_PLUGIN_ROOT} is that root.
  const plugin = read(PLUGIN_JSON);
  const commandsOf = (event) => (plugin.hooks?.[event] || []).flatMap((group) => group.hooks.map((h) => h.command));
  const expected = { PreToolUse: 'fog-gate.js', SessionStart: 'statusline-launcher.js' };
  for (const [event, name] of Object.entries(expected)) {
    const command = commandsOf(event).find((c) => c.includes(name));
    assert.ok(command, `plugin.json has no ${event} hook that runs ${name}`);
    const script = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/.exec(command);
    assert.ok(script && fs.existsSync(path.join(ROOT, PLUGIN_ROOT, script[1])), `the hook runs a missing script: ${command}`);
  }
});

// bump: tried on a throwaway repo, so the real version stays as it is.

const readJson = (dir, file) => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));

/** A repo with only the files that state the version, all at `version`. One dependency has that version too. */
function versionRepo(version) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-bump-'));
  const files = {
    'package.json': { name: 'demo', version },
    'package-lock.json': { name: 'demo', version, packages: { '': { name: 'demo', version }, 'node_modules/dep': { version } } },
    [PLUGIN_JSON]: { name: 'demo', version },
  };
  for (const [file, json] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    fs.writeFileSync(path.join(dir, file), JSON.stringify(json, null, 2) + '\n');
  }
  return dir;
}

/** Every version the repo states, by where it is stated. */
function versionsIn(dir) {
  const lock = readJson(dir, 'package-lock.json');
  return {
    package: readJson(dir, 'package.json').version,
    lock: lock.version,
    lockRoot: lock.packages[''].version,
    plugin: readJson(dir, PLUGIN_JSON).version,
    dependency: lock.packages['node_modules/dep'].version,
  };
}

const allAt = (version, dependency = '1.2.3') => ({ package: version, lock: version, lockRoot: version, plugin: version, dependency });

test('bump: the fixture covers every file the real bump writes', () => {
  assert.deepStrictEqual(VERSION_FILES.map((v) => v.file).sort(), ['package-lock.json', 'package.json', PLUGIN_JSON].sort());
});

for (const [level, next] of [['patch', '1.2.4'], ['minor', '1.3.0'], ['major', '2.0.0']]) {
  test(`bump ${level}: 1.2.3 becomes ${next} in every file, and the dependency keeps its version`, () => {
    const dir = versionRepo('1.2.3');
    assert.strictEqual(bump(level, dir), next);
    assert.deepStrictEqual(versionsIn(dir), allAt(next));
  });
}

test('bump: without a level it raises the patch version', () => {
  const dir = versionRepo('1.2.3');
  assert.strictEqual(bump(undefined, dir), '1.2.4');
});

test('bump: an unknown level changes nothing', () => {
  const dir = versionRepo('1.2.3');
  assert.throws(() => bump('huge', dir), /unknown level "huge"/);
  assert.deepStrictEqual(versionsIn(dir), allAt('1.2.3'));
});

test('bump: a file that fell out of step stops it before anything is written', () => {
  const dir = versionRepo('1.2.3');
  fs.writeFileSync(path.join(dir, PLUGIN_JSON), JSON.stringify({ name: 'demo', version: '9.9.9' }, null, 2) + '\n');
  assert.throws(() => bump('patch', dir), /plugin\.json states version 1\.2\.3 0 time\(s\), expected 1/);
  assert.deepStrictEqual(versionsIn(dir), { ...allAt('1.2.3'), plugin: '9.9.9' });
});
