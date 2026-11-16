// The hooks and the installer run committed JS, so it must be exactly what src/*.ts builds to.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ROOT, CLI_BUILDS, NOTICES_FILE, IMPRESSUM, IMPRESSUM_PAGE, buildCli, buildSite, impressumDetails, impressumEnabled } from '../build.mjs';

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

test('the Impressum is filled from what the build is given, and keeps its placeholders otherwise', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-site-'));
  try {
    const page = () => fs.readFileSync(path.join(out, IMPRESSUM_PAGE), 'utf8');
    await buildSite(out, null);
    assert.ok(!fs.existsSync(path.join(out, IMPRESSUM_PAGE)), 'no page while the toggle is off');
    assert.equal(impressumEnabled({}), false, 'the toggle is off by default');
    assert.equal(impressumEnabled({ IMPRESSUM_ENABLED: '1' }), true);

    await buildSite(out, {});
    for (const { placeholder } of Object.values(IMPRESSUM)) assert.ok(page().includes(placeholder), `${placeholder} stays when nothing is given`);
    assert.match(page(), /href="style-[^"]+\.css"/, 'the page uses the built stylesheet');

    await buildSite(out, { name: 'Test <Person>', address: 'Test Street 1\n00000 Testtown', email: 'test@example.invalid' });
    for (const { placeholder } of Object.values(IMPRESSUM)) assert.ok(!page().includes(placeholder), `${placeholder} is filled`);
    assert.ok(page().includes('Test &#60;Person&#62;'), 'details are escaped');
    assert.match(page(), /Test Street 1<br>\s*00000 Testtown/, 'an address keeps its lines');
    assert.ok(page().includes('href="mailto:test@example.invalid"'), 'the email is a link');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('the Impressum details come from the environment or the local file, and a deploy refuses to go without', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-impressum-'));
  try {
    const file = path.join(dir, 'impressum.json');
    assert.deepEqual(impressumDetails({ env: {}, file }), {});
    assert.throws(() => impressumDetails({ env: { IMPRESSUM_NAME: 'A', IMPRESSUM_EMAIL: ' ' }, file, required: true }), /IMPRESSUM_ADDRESS, IMPRESSUM_EMAIL/);
    fs.writeFileSync(file, JSON.stringify({ name: 'File Name', address: 'File Street', email: 'file@example.invalid' }));
    assert.deepEqual(impressumDetails({ env: { IMPRESSUM_NAME: 'Env Name' }, file, required: true }),
      { name: 'Env Name', address: 'File Street', email: 'file@example.invalid' });
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
