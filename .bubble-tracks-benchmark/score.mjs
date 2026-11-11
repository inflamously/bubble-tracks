// The command line: scores one benchmark run and prints it. Only reads files, parses options and
// prints; the scoring itself is in scoring/ (see AGENTS.md next to this file).
//
//   node .bubble-tracks-benchmark/score.mjs --track <file>
//        [--scenario <file>] [--recording <file>] [--judgements <file>] [--json]
import fs from 'node:fs';
import { parseJudgements } from './scoring/judgements.mjs';
import { report } from './scoring/report.mjs';
import { scoreRun } from './scoring/run.mjs';

const USAGE = 'usage: score.mjs --track <file> [--scenario <file>] [--recording <file>] [--judgements <file>] [--json]';
const FILE_OPTIONS = ['scenario', 'track', 'recording', 'judgements'];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function parseOptions(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (key === 'json') opts.json = true;
    else if (FILE_OPTIONS.includes(key) && argv[i + 1]) opts[key] = argv[++i];
    else throw new Error(`unknown option "${argv[i]}"`);
  }
  if (!opts.track) throw new Error(USAGE);
  return opts;
}

function main(argv) {
  const opts = parseOptions(argv);
  const score = scoreRun({
    scenario: opts.scenario ? readJson(opts.scenario) : {},
    track: readJson(opts.track),
    recording: opts.recording ? readJson(opts.recording) : undefined,
    judgements: opts.judgements ? parseJudgements(fs.readFileSync(opts.judgements, 'utf8')) : [],
  });
  console.log(opts.json ? JSON.stringify(score, null, 2) : report(score));
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
