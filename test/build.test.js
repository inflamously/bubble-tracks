// The hooks and the installer run committed JS, so it must be exactly what src/*.ts builds to.
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { ROOT, CLI_BUILDS, NOTICES_FILE, IMPRESSUM, IMPRESSUM_PAGE, IMPRESSUM_PAGE_DE, DATA_POLICY_PAGE, DATA_POLICY_PAGE_DE, DEMO_DIR, buildCli, buildSite, impressumDetails, impressumEnabled } from '../build.mjs';

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

test('the site opens on the landing page, and the demo is one click away in its own folder', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-site-'));
  try {
    await buildSite(out, null);
    const landing = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
    assert.match(landing, /id="track-card"/, 'the root page is the landing page');
    assert.ok(landing.includes(`href="${DEMO_DIR}/"`), 'it links the demo');
    assert.ok(landing.includes(`href="${DATA_POLICY_PAGE}"`), 'its footer links the policy');
    assert.ok(!landing.includes(IMPRESSUM_PAGE), 'its footer does not link an Impressum that is not built');
    const demo = fs.readFileSync(path.join(out, DEMO_DIR, 'index.html'), 'utf8');
    assert.match(demo, /id="panel-terminal"/, 'the demo is in its folder');
    assert.ok(demo.includes('href="../"'), 'the demo links back to the landing page');

    // Each page loads its own hashed script and stylesheet, and every local link leads to a file that was built.
    for (const [page, html] of [['index.html', landing], [`${DEMO_DIR}/index.html`, demo]]) {
      assert.match(html, /src="main-[^"/]+\.js"/, `${page} loads its built script`);
      assert.match(html, /href="style-[^"/]+\.css"/, `${page} uses its built stylesheet`);
    }
    for (const page of filesIn(out).filter((f) => f.endsWith('.html'))) {
      const html = fs.readFileSync(path.join(out, page), 'utf8');
      for (const [, , ref] of html.matchAll(/(src|href)="([^"#:]+)"/g)) {
        const target = path.join(out, path.dirname(page), ref);
        assert.ok(fs.existsSync(ref.endsWith('/') ? path.join(target, 'index.html') : target), `${page}: ${ref} leads to a built file`);
      }
    }

    const script = fs.readFileSync(path.join(out, filesIn(out).find((f) => /^main-[^/]+\.js$/.test(f))), 'utf8');
    assert.doesNotMatch(script, /process\.env/, "the landing page's script does not ask the browser for process.env");
    assert.ok(/react-dom-client\.production\.js/.test(script) && !/react[a-z-]*\.development\.js/.test(script), "it bundles React's production build");

    await buildSite(out, {});
    assert.ok(fs.readFileSync(path.join(out, 'index.html'), 'utf8').includes(`href="${IMPRESSUM_PAGE}"`), "with the Impressum built, the landing page's footer links it");
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('the site ships the licence notices of the third-party code in its bundles, and names them', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-site-'));
  try {
    await buildSite(out);
    const notices = fs.readFileSync(path.join(out, NOTICES_FILE), 'utf8');
    assert.match(notices, /@pkgjs\/parseargs \d/, 'the bundled package is named with its version');
    assert.match(notices, /Apache License/, "the package's LICENSE file is included");
    assert.match(notices, /Copyright Node\.js contributors/, 'the header of the file copied from Node is included');
    for (const name of ['react', 'react-dom', 'scheduler']) assert.match(notices, new RegExp(`^${name} \\d.* \\(MIT\\)$`, 'm'), `${name}, bundled into the landing page, is named with its version`);
    assert.match(notices, /Copyright \(c\) Meta Platforms/, "React's LICENSE file is included");
    assert.ok(fs.readFileSync(path.join(out, DEMO_DIR, 'index.html'), 'utf8').includes(`href="../${NOTICES_FILE}"`), 'the demo links the notices');
    for (const [where, names] of [[DEMO_DIR, '@pkgjs/parseargs'], ['.', 'react, react-dom, scheduler']]) {
      const bundle = fs.readdirSync(path.join(out, where)).find((f) => /^main-.*\.js$/.test(f));
      const text = fs.readFileSync(path.join(out, where, bundle), 'utf8');
      assert.ok(text.startsWith(`/*! Bundles ${names}; licence notices in ${NOTICES_FILE} */`), `${where}/${bundle} names what it bundles and points at the notices`);
    }
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
    assert.match(page(), /href="demo\/style-[^"]+\.css"/, "the page uses the demo's built stylesheet");

    await buildSite(out, { name: 'Test <Person>', address: 'Test Street 1\n00000 Testtown', email: 'test@example.invalid' });
    for (const { placeholder } of Object.values(IMPRESSUM)) assert.ok(!page().includes(placeholder), `${placeholder} is filled`);
    assert.ok(page().includes('Test &#60;Person&#62;'), 'details are escaped');
    assert.match(page(), /Test Street 1<br>\s*00000 Testtown/, 'an address keeps its lines');
    assert.ok(page().includes('href="mailto:test@example.invalid"'), 'the email is a link');

    const german = fs.readFileSync(path.join(out, IMPRESSUM_PAGE_DE), 'utf8');
    assert.match(german, /<html lang="de">/, 'the German Impressum is built with it');
    for (const { placeholder } of Object.values(IMPRESSUM)) assert.ok(!german.includes(placeholder), `${placeholder} is filled in German too`);
    assert.ok(german.includes('Test &#60;Person&#62;') && german.includes('href="mailto:test@example.invalid"'), 'with the same details');
  } finally {
    fs.rmSync(out, { recursive: true, force: true });
  }
});

test('the data policy ships with the site, and what it says about the site holds', async () => {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'bubbles-site-'));
  try {
    const policy = () => fs.readFileSync(path.join(out, DATA_POLICY_PAGE), 'utf8');
    await buildSite(out, null);
    assert.match(policy(), /href="demo\/style-[^"]+\.css"/, "the page uses the demo's built stylesheet");
    assert.ok(!policy().includes(IMPRESSUM_PAGE), 'no link to an Impressum that is not built');
    const demo = () => fs.readFileSync(path.join(out, DEMO_DIR, 'index.html'), 'utf8');
    assert.ok(demo().includes(`href="../${DATA_POLICY_PAGE}"`), "the demo's footer links the policy");
    assert.ok(!demo().includes(IMPRESSUM_PAGE), "the demo's footer does not link an Impressum that is not built");
    assert.ok(policy().includes('href="./"') && policy().includes(`href="${DEMO_DIR}/"`), 'the policy links back to the landing page and to the demo');

    const german = () => fs.readFileSync(path.join(out, DATA_POLICY_PAGE_DE), 'utf8');
    assert.match(german(), /<html lang="de">/, 'the policy ships in German too');
    assert.match(german(), /href="demo\/style-[^"]+\.css"/, "the German policy uses the demo's built stylesheet");
    assert.ok(policy().includes(`href="${DATA_POLICY_PAGE_DE}"`) && german().includes(`href="${DATA_POLICY_PAGE}"`), 'each language links the other');
    assert.ok(german().includes('href="./"') && german().includes(`href="${DEMO_DIR}/"`), 'the German policy links back to the landing page and to the demo');
    assert.ok(!german().includes(IMPRESSUM_PAGE_DE), 'no link to a German Impressum that is not built');
    assert.equal((german().match(/<h2>/g) ?? []).length, (policy().match(/<h2>/g) ?? []).length, 'both languages have the same sections');

    // The policy says: no cookies, nothing stored in the browser, nothing loaded or sent elsewhere.
    for (const f of filesIn(out).filter((name) => /\.(js|css|html)$/.test(name))) {
      const text = fs.readFileSync(path.join(out, f), 'utf8');
      assert.doesNotMatch(text, /localStorage|sessionStorage|indexedDB|document\.cookie|sendBeacon|XMLHttpRequest|WebSocket|\bfetch\(/, `${f} stores or sends nothing`);
      assert.doesNotMatch(text, /(src|href)="https?:\/\/(?!github\.com\/|docs\.github\.com\/)|@import|url\(\s*["']?https?:/, `${f} loads nothing from another server`);
    }

    await buildSite(out, {});
    assert.ok(policy().includes(`href="${IMPRESSUM_PAGE}"`), 'with the Impressum built, the policy points to it');
    assert.ok(demo().includes(`href="../${IMPRESSUM_PAGE}"`), "and the demo's footer links it");
    const impressum = fs.readFileSync(path.join(out, IMPRESSUM_PAGE), 'utf8');
    assert.ok(impressum.includes(`href="${DEMO_DIR}/"`) && impressum.includes(`href="${DATA_POLICY_PAGE}"`), 'the Impressum links back to the demo and to the policy');
    assert.ok(german().includes(`href="${IMPRESSUM_PAGE_DE}"`), 'the German policy points to the German Impressum');
    const germanImpressum = fs.readFileSync(path.join(out, IMPRESSUM_PAGE_DE), 'utf8');
    assert.ok(germanImpressum.includes(`href="${DEMO_DIR}/"`) && germanImpressum.includes(`href="${DATA_POLICY_PAGE_DE}"`), 'the German Impressum links back to the demo and to the German policy');
    assert.ok(impressum.includes(`href="${IMPRESSUM_PAGE_DE}"`) && germanImpressum.includes(`href="${IMPRESSUM_PAGE}"`), 'each Impressum links the other language');
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
