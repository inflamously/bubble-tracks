// Every build in one place:
//   node build.mjs        tsc: src/ → skills/bubble/scripts/ and src/skill-install/ → skill-install/ (committed)
//   node build.mjs site   tsc type-checks src/site/, then esbuild bundles it with the CLI and demo/story.md → dist/pages/;
//                         the Impressum is built only with IMPRESSUM_ENABLED=1; its name, address and email come from
//                         the environment or .impressum.json (see IMPRESSUM)
//   node build.mjs check  just the src/site/ type check (the CLI builds above type-check as they emit)
//   node build.mjs bump [patch|minor|major]   raise the version in every file that states it (see VERSION_FILES)
// Plain JS so it runs on a fresh clone with nothing compiled yet. The tests import it to build into temp dirs.
import * as esbuild from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

/**
 * Each committed folder and the tsconfig that builds it. tsc, not esbuild: one .js per .ts with the
 * comments kept, since agents read what they run, and hooks and tests import single modules.
 */
export const CLI_BUILDS = [
  { config: 'tsconfig.json', out: 'skills/bubble/scripts' },
  { config: 'tsconfig.skill-install.json', out: 'skill-install' },
];

/**
 * Written into each committed folder: the built JS uses `import`, and a copy of the folder leaves this repo's
 * package.json behind (the plugin installs only skills/, the installer copies skills/bubble/). Without the
 * marker, a Node that doesn't detect modules itself (18, early 20) refuses to load the scripts.
 */
const MODULE_MARKER = JSON.stringify({ type: 'module' }, null, 2) + '\n';

/**
 * Every file that states the release version, and how often. A release raises all of them together
 * (`bump`): Claude Code keeps an installed plugin on its cached copy until plugin.json's version changes.
 */
export const VERSION_FILES = [
  { file: 'package.json', count: 1 },
  { file: 'package-lock.json', count: 2 }, // the lockfile's own version, and its root package's
  { file: 'skills/.claude-plugin/plugin.json', count: 1 },
];

/** The demo site's folders; each tsconfig limits what its folder may use (see src/site/README.md). */
export const SITE_CONFIGS = ['src/site/bubble-web', 'src/site/terminal', 'src/site/build'];

const BUBBLE_WEB = path.join(ROOT, 'src', 'site', 'bubble-web');

/** The licence notices the demo ships with, next to the bundle. The page's footer links to it. */
export const NOTICES_FILE = 'THIRD-PARTY-NOTICES.txt';

/** Third-party packages whose code ends up in the demo's bundle; each one's licence terms ask for its notice in copies. */
const BUNDLED_PACKAGES = ['@pkgjs/parseargs'];

/** The data policy page, built next to the demo. It says only what the site really does. */
export const DATA_POLICY_PAGE = 'data-policy.html';

/** Its German version. Each links the other. */
export const DATA_POLICY_PAGE_DE = 'data-policy.de.html';

/** Where a data policy page points to its Impressum, when that page is built. */
const IMPRESSUM_LINK_SLOT = '<!-- impressum-link -->';

/** Where a footer (index.html, a data policy page) links the Impressum, when that page is built. */
const IMPRESSUM_FOOTER_SLOT = '<!-- impressum-footer-link -->';

/** The Impressum page, built next to the demo. */
export const IMPRESSUM_PAGE = 'impressum.html';

/** Its German version, built with it. Each links the other. */
export const IMPRESSUM_PAGE_DE = 'impressum.de.html';

/** The feature toggle: the Impressum page is only built when this environment variable is 1 (or true, on, yes). Off by default. */
export const IMPRESSUM_TOGGLE = 'IMPRESSUM_ENABLED';

/** The git-ignored file a local build reads the Impressum details from: `{ "name": …, "address": …, "email": … }`. */
export const IMPRESSUM_FILE = '.impressum.json';

/**
 * The owner's details on the Impressum: the placeholder in src/site/terminal/impressum.html and the environment
 * variable that fills it. They are passed into the build and never committed.
 */
export const IMPRESSUM = {
  name: { placeholder: '[YOUR NAME]', env: 'IMPRESSUM_NAME' },
  address: { placeholder: '[YOUR STREET ADDRESS]', env: 'IMPRESSUM_ADDRESS' },
  email: { placeholder: '[YOUR EMAIL]', env: 'IMPRESSUM_EMAIL' },
};

/**
 * The legal pages, one entry per language: the data policy, its Impressum, and the words the build puts into the
 * policy's two slots when the Impressum is built. The demo itself is English and links the first entry.
 */
const LEGAL_PAGES = [
  {
    policy: DATA_POLICY_PAGE,
    impressum: IMPRESSUM_PAGE,
    pointer: (href) => ` Their name and address are in the <a href="${href}">legal notice</a>.`,
    footer: 'Legal notice (Impressum)',
  },
  {
    policy: DATA_POLICY_PAGE_DE,
    impressum: IMPRESSUM_PAGE_DE,
    pointer: (href) => ` Name und Anschrift stehen im <a href="${href}">Impressum</a>.`,
    footer: 'Impressum',
  },
];

/** Bundles bubble-web's CLI from src/lib/cli/main.ts with node:fs and node:path swapped for the machine's (see host.mts),
 *  and node:util for @pkgjs/parseargs. */
const machine = {
  name: 'bubble-web-machine',
  setup(build) {
    build.onResolve({ filter: /^bubble-cli$/ }, () => ({ path: path.join(ROOT, 'src', 'lib', 'cli', 'main.ts') }));
    build.onResolve({ filter: /^node:(fs|path|util)$/ }, (args) => ({ path: path.join(BUBBLE_WEB, `node-${args.path.slice(5)}.mts`) }));
  },
};

/** esbuild options for anything that includes bubble-web: the page, and the tests' copy of it. */
export const browserOptions = {
  bundle: true,
  format: 'esm',
  target: 'es2022',
  plugins: [machine],
  inject: [path.join(BUBBLE_WEB, 'globals.mts')],
  // @pkgjs/parseargs reads Node's `global` (internal/primordials.js); browsers only have globalThis.
  define: { global: 'globalThis' },
};

/** Run tsc with `args`; throws with its output if it fails. */
function tsc(...args) {
  const bin = path.join(path.dirname(require.resolve('typescript/package.json')), 'bin', 'tsc');
  const r = spawnSync(process.execPath, [bin, ...args], { cwd: ROOT, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`tsc ${args.join(' ')} failed:\n${r.stdout}${r.stderr}${r.error ?? ''}`);
}

// Committed JS.

/** Build one of CLI_BUILDS into `outdir` (default: its committed folder), from scratch so no stale module survives. */
export function buildCli(build, outdir = path.join(ROOT, build.out)) {
  fs.rmSync(outdir, { recursive: true, force: true });
  tsc('-p', build.config, '--outDir', outdir);
  fs.writeFileSync(path.join(outdir, 'package.json'), MODULE_MARKER);
}

// The release version.

/**
 * Raise the version (`level`: patch, minor or major) in every one of VERSION_FILES under `root`, and return
 * the new version. Only the version strings change, so each file keeps its formatting. Nothing is written
 * unless every file states the current version as often as expected.
 */
export function bump(level = 'patch', root = ROOT) {
  const at = ['major', 'minor', 'patch'].indexOf(level);
  if (at < 0) throw new Error(`bump: unknown level "${level}" (use: patch, minor or major)`);
  const current = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (!/^\d+\.\d+\.\d+$/.test(current)) throw new Error(`bump: package.json version "${current}" is not x.y.z`);
  const next = current.split('.').map((part, i) => (i < at ? part : i === at ? Number(part) + 1 : 0)).join('.');
  const from = `"version": "${current}"`;
  const texts = VERSION_FILES.map(({ file, count }) => {
    let text = fs.readFileSync(path.join(root, file), 'utf8');
    // the first `count` matches: in the lockfile they are the root's, ahead of any dependency's
    for (let i = 0; i < count; i++) {
      if (!text.includes(from)) throw new Error(`bump: ${file} states version ${current} ${i} time(s), expected ${count}`);
      text = text.replace(from, `"version": "${next}"`);
    }
    return text;
  });
  VERSION_FILES.forEach(({ file }, i) => fs.writeFileSync(path.join(root, file), texts[i]));
  return next;
}

// The demo site.

export function checkSite() {
  for (const config of SITE_CONFIGS) tsc('-p', config, '--noEmit');
}

/**
 * esbuild, with warnings fatal: a node:fs call the machine doesn't provide (say fs.rmSync) is only an
 * "always undefined" warning to esbuild, but a crash in the browser.
 */
async function bundle(options) {
  const result = await esbuild.build({ ...options, absWorkingDir: ROOT, logLevel: 'warning' });
  if (result.warnings.length) throw new Error(`esbuild: ${result.warnings.length} warning(s), see above`);
  return result;
}

/** Bundle the TypeScript module `entry` (relative to ROOT) in memory and import it. For tests and the site build. */
export async function importTs(entry, options = { bundle: true, format: 'esm', platform: 'node' }) {
  const { outputFiles } = await bundle({ ...options, entryPoints: [entry], write: false });
  return import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`);
}

/** The comment a file opens with, without its markers: where a copied file states its own licence. */
function leadingComment(file) {
  const match = /^\s*\/\*([\s\S]*?)\*\//.exec(fs.readFileSync(file, 'utf8'));
  return match ? match[1].trim() : '';
}

/**
 * The text of NOTICES_FILE: for each of BUNDLED_PACKAGES its LICENSE file, plus the licence header of any of
 * its source files that carries one. Read from node_modules, so it follows the installed version.
 */
export function thirdPartyNotices() {
  const rule = '-'.repeat(78);
  const parts = ['The bubble-tracks demo page bundles code from the packages below. Their licence notices follow.'];
  for (const name of BUNDLED_PACKAGES) {
    const dir = path.dirname(require.resolve(`${name}/package.json`));
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    const license = path.join(dir, 'LICENSE');
    if (!fs.existsSync(license)) throw new Error(`${name}: no LICENSE file to ship with the demo; update build.mjs`);
    parts.push(`${rule}\n${name} ${pkg.version} (${pkg.license})\n${pkg.homepage ?? ''}\n${rule}`, fs.readFileSync(license, 'utf8').trim());
    const sources = fs.readdirSync(dir, { recursive: true, encoding: 'utf8' })
      .filter((f) => f.endsWith('.js') && !f.split(path.sep).includes('node_modules'))
      .sort();
    for (const source of sources) {
      const header = leadingComment(path.join(dir, source));
      if (!/copyright/i.test(header)) continue;
      parts.push(`${rule}\n${name}: ${source.split(path.sep).join('/')}\n${rule}`, header);
    }
  }
  return `${parts.join('\n\n')}\n`;
}

/** Whether this build ships the Impressum page (IMPRESSUM_TOGGLE). */
export function impressumEnabled(env = process.env) {
  return /^(1|true|on|yes)$/i.test(String(env[IMPRESSUM_TOGGLE] ?? '').trim());
}

/**
 * The Impressum details this build was given: each of IMPRESSUM from its environment variable, else from
 * IMPRESSUM_FILE, else missing. `required` (the deploy) throws when one is missing, so the page never goes
 * live with a placeholder.
 */
export function impressumDetails({ env = process.env, file = path.join(ROOT, IMPRESSUM_FILE), required = false } = {}) {
  const local = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  const details = {};
  for (const [key, { env: name }] of Object.entries(IMPRESSUM)) {
    const value = String(env[name] ?? '').trim() || String(local[key] ?? '').trim();
    if (value) details[key] = value;
  }
  const missing = Object.keys(IMPRESSUM).filter((key) => !details[key]);
  if (required && missing.length) {
    throw new Error(`the Impressum needs ${missing.map((key) => IMPRESSUM[key].env).join(', ')}: set them as repository secrets (Settings → Secrets and variables → Actions)`);
  }
  return details;
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
}

/** `page` (the Impressum page `name`) with each placeholder replaced by its detail; one that is missing stays, visibly. An address may span lines. */
export function fillImpressum(page, details, name = IMPRESSUM_PAGE) {
  for (const [key, { placeholder }] of Object.entries(IMPRESSUM)) {
    if (!page.includes(placeholder)) throw new Error(`src/site/terminal/${name}: ${placeholder} moved; update build.mjs`);
    if (!details[key]) continue;
    const lines = details[key].split(/\r?\n/).map((line) => escapeHtml(line.trim())).filter(Boolean);
    page = page.replaceAll(placeholder, lines.join('<br>\n    '));
  }
  return page;
}

/**
 * dist/pages/: index.html, the LEGAL_PAGES in each language (a data policy, and its Impressum filled from `impressum`; that one is left out when `impressum` is null, the toggle being off), main-<hash>.js (the page, bubble-web, the CLI and the story in one bundle),
 * style-<hash>.css, and NOTICES_FILE for the third-party code in the bundle. The hashed names keep a browser from mixing a new page with stale cached files.
 */
export async function buildSite(out = path.join(ROOT, 'dist', 'pages'), impressum = impressumEnabled() ? impressumDetails() : null) {
  const { parseStory } = await importTs('src/site/build/story.mts');
  const story = parseStory(fs.readFileSync(path.join(ROOT, 'demo', 'story.md'), 'utf8'));

  fs.rmSync(out, { recursive: true, force: true });
  const { metafile } = await bundle({
    ...browserOptions,
    entryPoints: { main: 'src/site/terminal/main.mts', style: 'src/site/terminal/style.css' },
    entryNames: '[name]-[hash]',
    outdir: out,
    platform: 'browser',
    define: { ...browserOptions.define, STORY: JSON.stringify(story) },
    banner: { js: `/*! Bundles ${BUNDLED_PACKAGES.join(', ')}; licence notices in ${NOTICES_FILE} */` },
    metafile: true,
  });

  const built = (entry) => path.basename(Object.keys(metafile.outputs).find((f) => metafile.outputs[f].entryPoint === entry));
  const source = (name) => fs.readFileSync(path.join(ROOT, 'src', 'site', 'terminal', name), 'utf8');
  const link = (name, links) => links.reduce((s, [from, to]) => {
    if (!s.includes(from)) throw new Error(`src/site/terminal/${name}: ${from} moved; update build.mjs`);
    return s.replace(from, to);
  }, source(name));
  const style = ['href="style.css"', `href="${built('src/site/terminal/style.css')}"`];
  const footerLink = (legal) => [IMPRESSUM_FOOTER_SLOT, impressum ? ` · <a href="${legal.impressum}">${legal.footer}</a>` : ''];
  const html = link('index.html', [style, ['src="main.js"', `src="${built('src/site/terminal/main.mts')}"`], footerLink(LEGAL_PAGES[0])]);
  for (const file of [NOTICES_FILE, DATA_POLICY_PAGE]) {
    if (!html.includes(`href="${file}"`)) throw new Error(`src/site/terminal/index.html: the link to ${file} is gone; update build.mjs`);
  }
  fs.writeFileSync(path.join(out, 'index.html'), html);
  for (const legal of LEGAL_PAGES) {
    const pointer = [IMPRESSUM_LINK_SLOT, impressum ? legal.pointer(legal.impressum) : ''];
    fs.writeFileSync(path.join(out, legal.policy), link(legal.policy, [style, pointer, footerLink(legal)]));
    if (impressum) fs.writeFileSync(path.join(out, legal.impressum), fillImpressum(link(legal.impressum, [style]), impressum, legal.impressum));
  }
  fs.writeFileSync(path.join(out, NOTICES_FILE), thirdPartyNotices());
  fs.writeFileSync(path.join(out, '.nojekyll'), '');
}

// Run as a script (not when a test imports it).

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const what = process.argv[2] ?? 'cli';
  if (what === 'cli') {
    for (const build of CLI_BUILDS) buildCli(build);
    console.log(`built ${CLI_BUILDS.map((b) => `${b.out}/`).join(', ')}`);
  } else if (what === 'site') {
    checkSite();
    // CI is the deploy (pages.yml): there every detail must be given, if the page is switched on at all.
    const impressum = impressumEnabled() ? impressumDetails({ required: Boolean(process.env.CI) }) : null;
    await buildSite(undefined, impressum);
    const open = Object.keys(IMPRESSUM).filter((key) => impressum && !impressum[key]);
    const note = !impressum ? ` (no ${IMPRESSUM_PAGE}: ${IMPRESSUM_TOGGLE} is off)`
      : open.length ? ` (${IMPRESSUM_PAGE} keeps its placeholders: set ${open.map((key) => IMPRESSUM[key].env).join(', ')} or write ${IMPRESSUM_FILE})` : '';
    console.log(`built dist/pages/${note}`);
  } else if (what === 'check') {
    checkSite();
  } else if (what === 'bump') {
    console.log(`version ${bump(process.argv[3])} in ${VERSION_FILES.map((v) => v.file).join(', ')}`);
  } else {
    console.error('usage: node build.mjs [cli|site|check|bump [patch|minor|major]]');
    process.exitCode = 2;
  }
}
