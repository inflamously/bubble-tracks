// The plugin is published from three manifests; keep their shared fields in step.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';

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
  assert.strictEqual(plugin.version, pkg.version, 'plugin.json version != package.json version');
  assert.strictEqual(entry.version, undefined, 'set the version in plugin.json only (it wins over marketplace.json)');
  assert.strictEqual(plugin.license, pkg.license);
  assert.strictEqual(entry.license, pkg.license);
  assert.strictEqual(entry.repository, plugin.repository);
  assert.ok(fs.existsSync(path.join(ROOT, 'LICENSE')), 'LICENSE file missing');
});

test('plugin.json: the fog-gate hook runs a script that exists', () => {
  // Claude Code reads the manifest only at .claude-plugin/plugin.json under the plugin root,
  // and ${CLAUDE_PLUGIN_ROOT} is that root.
  const plugin = read(PLUGIN_JSON);
  const commands = (plugin.hooks?.PreToolUse || []).flatMap((group) => group.hooks.map((h) => h.command));
  const gate = commands.find((c) => c.includes('fog-gate.js'));
  assert.ok(gate, 'plugin.json has no PreToolUse fog-gate hook');
  const script = /\$\{CLAUDE_PLUGIN_ROOT\}\/([^"]+)/.exec(gate);
  assert.ok(script && fs.existsSync(path.join(ROOT, PLUGIN_ROOT, script[1])), `the hook runs a missing script: ${gate}`);
});
