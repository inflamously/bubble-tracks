// The hooks and the installer run committed JS, so it must be exactly what src/*.ts builds to.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ROOT, CLI_BUILDS, NOTICES_FILE, buildCli, buildSite } from '../build.mjs';

/** Every file under `dir`, as sorted forward-slash relative paths. */
const filesIn = (dir) =>
  fs.readdirSync(dir, { recursive: true })
    .filter((f) => fs.statSync(path.join(dir, f)).isFile())
    .map((f) => f.split(path.sep).join('/'))
    .sort();

for (const build of CLI_BUILDS) {
  const { config, out: committedDir } = build;
  test(`committed ${committedDir}/ matches a fresh build of ${config} (run: npm run build)`, () => {
    const committed = path.join(ROOT, committedDir);
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-build-'));
    try {
      buildCli(build, out);
      assert.deepStrictEqual(filesIn(committed), filesIn(out), `${committedDir}/ has files ${config} does not build (or misses some)`);
      for (const f of filesIn(out)) {
        const built = fs.readFileSync(path.join(out, f), 'utf8');
        assert.ok(built === fs.readFileSync(path.join(committed, f), 'utf8'), `${committedDir}/${f} is out of date with src/`);
      }
    } finally {
      fs.rmSync(out, { recursive: true, force: true });
    }
  });
}

test('the demo ships the licence notices of the third-party code in its bundle, and links them', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-site-'));
  try {
    await buildSite(out);
    const notices = fs.readFileSync(path.join(out, NOTICES_FILE), 'utf8');
    assert.match(notices, /@pkgjs\/parseargs \d/, 'the bundled package is named with its version');
    assert.match(notices, /Apache License/, "the package's LICENSE file is included");
    assert.match(notices, /Copyright Node\.js contributors/, 'the header of the file copied from Node is included');
    assert.ok(fs.readFileSync(path.join(out, 'index.html'), 'utf8').includes(`href="${NOTICES_FILE}"`), 'the page links the notices');
    const bundle = filesIn(out).find((f) => /^main-.*\.js$/.test(f));
    assert.ok(fs.readFileSync(path.join(out, bundle), 'utf8').includes(NOTICES_FILE), 'the bundle points at the notices');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});
