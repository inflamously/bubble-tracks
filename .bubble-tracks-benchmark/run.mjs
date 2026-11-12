// The command line: makes one benchmark run. An agent walks one scenario in a throwaway repo, with the
// scenario's scripted replies as the human, and leaves the track file and the recording that
// score.mjs reads. Needs a live agent and costs tokens: started by hand, never from npm test.
// The work itself is in runner/ (see AGENTS.md next to this file).
//
//   node .bubble-tracks-benchmark/run.mjs --scenario <file> [--model <name>]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { askAgent, newSession } from './runner/agent.mjs';
import { eventsFromLog } from './runner/recording.mjs';
import { buildRepo, changedFiles, readCurrentTrack, snapshot, trackNames } from './runner/repo.mjs';
import { isFinished } from './runner/until.mjs';

const USAGE = 'usage: run.mjs --scenario <file> [--model <name>]';
const OPTIONS = ['scenario', 'model'];
/** How many times the `otherwise` reply is sent after the scripted replies ran out, before the run counts as derailed. */
const SPARE_TURNS = 3;

function parseOptions(argv) {
  const opts = {};
  for (let i = 0; i < argv.length; i++) {
    const key = argv[i].replace(/^--/, '');
    if (OPTIONS.includes(key) && argv[i + 1]) opts[key] = argv[++i];
    else throw new Error(`unknown option "${argv[i]}"`);
  }
  if (!opts.scenario) throw new Error(USAGE);
  return opts;
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function main(argv) {
  const opts = parseOptions(argv);
  const scenario = JSON.parse(fs.readFileSync(opts.scenario, 'utf8'));

  // realpath: the agent reports the files it edits by their real path
  const runDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `bubble-run-${scenario.name}-`)));
  const repoDir = path.join(runDir, 'repo');
  buildRepo(scenario, repoDir);
  const tracksBefore = trackNames(repoDir);

  const session = newSession(repoDir, opts.model);
  const messages = [scenario.first, ...scenario.replies];
  const events = [];
  const unrecorded = []; // files a turn changed without an edit in the recording (changed through the shell)
  let finished = false;
  for (let turn = 0; turn < messages.length + SPARE_TURNS && !finished; turn++) {
    const message = messages[turn] ?? scenario.otherwise;
    console.error(`turn ${turn + 1}: ${message.split('\n')[0]}`);
    const before = snapshot(repoDir);
    const agentEvents = eventsFromLog(askAgent(session, message), repoDir);
    events.push({ who: 'human', text: message }, ...agentEvents);
    const recorded = agentEvents.map((event) => event.edit);
    unrecorded.push(...changedFiles(before, snapshot(repoDir)).filter((file) => !recorded.includes(file)));
    finished = isFinished(scenario.until, readCurrentTrack(repoDir), tracksBefore);
  }

  const trackFile = path.join(runDir, 'track.json');
  const recordingFile = path.join(runDir, 'recording.json');
  writeJson(trackFile, readCurrentTrack(repoDir)?.track ?? { bubbles: [] });
  writeJson(recordingFile, { events, unrecorded });

  if (!finished) console.log(`derailed: never got to "${scenario.until}". Note it in benchmark-feedback.md instead of scoring it.`);
  if (unrecorded.length) console.log(`recording incomplete: changed without a recorded edit: ${unrecorded.join(', ')}`);
  console.log(`run kept in ${runDir}`);
  console.log(`node .bubble-tracks-benchmark/score.mjs --scenario ${opts.scenario} --track ${trackFile} --recording ${recordingFile}`);
}

try {
  main(process.argv.slice(2));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
