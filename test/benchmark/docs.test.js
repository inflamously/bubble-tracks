// The benchmark's documents, scenario files and code have to say the same thing: every rule id, every
// scenario, and the module list in the folder's AGENTS.md.
import { describe, it } from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'node:url';
import { RULES } from '../../.bubble-tracks-benchmark/scoring/rules.mjs';

const BENCH = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '.bubble-tracks-benchmark');
const MODULE_MAX_LINES = 150;

const read = (file) => fs.readFileSync(path.join(BENCH, file), 'utf8');
const scenarioFiles = () => fs.readdirSync(path.join(BENCH, 'scenarios')).filter((f) => f.endsWith('.json'));

describe('the rules', () => {
  it('every rule id in the rule files is one the script knows, and the other way round', () => {
    const inDocs = new Set((read('benchmark-rule-fail.md') + read('benchmark-rule-points.md')).match(/^\| [FPH]\d+ /gm).map((row) => row.slice(2).trim()));
    assert.deepStrictEqual([...inDocs].sort(), Object.keys(RULES).sort());
  });
});

describe('the scenarios', () => {
  it('every scenario names rules that exist and brings what its mode needs', () => {
    assert.ok(scenarioFiles().length >= 5);
    for (const file of scenarioFiles()) {
      const s = JSON.parse(read(path.join('scenarios', file)));
      assert.strictEqual(s.name + '.json', file);
      for (const id of s.covers) assert.ok(RULES[id], `${file}: no rule ${id}`);
      assert.ok(s.first && Array.isArray(s.replies) && s.otherwise, `${file}: first, replies, otherwise`);
      assert.ok(['planned', 'closed'].includes(s.until), `${file}: until`);
      assert.ok(s.modes.includes('automatic'), `${file}: modes`);
      if (s.covers.includes('F2')) assert.ok(s.protected?.length, `${file}: covers F2 but protects no file`);
      if (s.bubbles) assert.ok(s.bubbles.min <= s.bubbles.max, `${file}: bubble range`);
    }
  });

  it('every scenario is listed in benchmark-scenarios.md', () => {
    const table = read('benchmark-scenarios.md').split('## A scenario file')[0];
    const listed = new Set(table.match(/^\| `[\w-]+` /gm).map((row) => row.slice(3, -2)));
    assert.deepStrictEqual([...listed].sort(), scenarioFiles().map((f) => f.replace(/\.json$/, '')).sort());
  });
});

describe('the code structure', () => {
  const modules = fs.readdirSync(path.join(BENCH, 'scoring')).filter((f) => f.endsWith('.mjs'));

  it('every scoring module is listed in AGENTS.md, and the other way round', () => {
    const listed = new Set(read('AGENTS.md').match(/^\| `scoring\/[\w-]+\.mjs` /gm).map((row) => row.slice(11, -2)));
    assert.deepStrictEqual([...listed].sort(), modules.sort());
  });

  it(`no module is over ${MODULE_MAX_LINES} lines: past that it is doing two jobs`, () => {
    for (const file of [...modules.map((m) => path.join('scoring', m)), 'score.mjs']) {
      const lines = read(file).split('\n').length;
      assert.ok(lines <= MODULE_MAX_LINES, `${file} is ${lines} lines`);
    }
  });

  it('only run.mjs pulls the modules together; the others import model, rules or fills at most', () => {
    const allowed = { 'run.mjs': null, 'track.mjs': ['model'], 'recording.mjs': ['model', 'fills'], 'sizes.mjs': ['model'], 'judgements.mjs': ['rules'] };
    for (const file of modules) {
      const imports = [...read(path.join('scoring', file)).matchAll(/^import .* from '\.\/([\w-]+)\.mjs';$/gm)].map((m) => m[1]);
      if (allowed[file] === null) continue;
      assert.deepStrictEqual(imports.filter((i) => !(allowed[file] || []).includes(i)), [], `${file} imports ${imports.join(', ')}`);
    }
  });
});
