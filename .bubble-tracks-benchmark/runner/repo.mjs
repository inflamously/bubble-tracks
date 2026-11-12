// The throwaway repo a run happens in: builds it from the scenario, and reads back the track the run
// ended with. Tracks are only ever made through the bubble CLI, never written as JSON.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const BUBBLE_CLI = fileURLToPath(new URL('../../skills/bubble/scripts/cli/bubble.js', import.meta.url));
const TRACK_DIR = '.bubble-tracks';
const DEFAULT_TRACK = 'track';

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

/** Writes the scenario's files and runs its setup commands. @param {string} repoDir an empty folder */
export function buildRepo(scenario, repoDir) {
  // The CLI walks up the folders looking for .bubble-tracks. Making it here first keeps every command,
  // ours and the agent's, inside the throwaway repo.
  fs.mkdirSync(path.join(repoDir, TRACK_DIR), { recursive: true });
  for (const [file, content] of Object.entries(scenario.repo?.files || {})) {
    const target = path.join(repoDir, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
  for (const words of scenario.repo?.setup || []) {
    execFileSync('node', [BUBBLE_CLI, ...words], { cwd: repoDir, stdio: 'pipe' });
  }
}

/** Every project file with its content, to see what a turn changed. The planning folder is the CLI's to change. */
export function snapshot(repoDir, folder = '') {
  const files = {};
  for (const entry of fs.readdirSync(path.join(repoDir, folder), { withFileTypes: true })) {
    const file = path.posix.join(folder, entry.name);
    if (file === TRACK_DIR) continue;
    if (entry.isDirectory()) Object.assign(files, snapshot(repoDir, file));
    else files[file] = fs.readFileSync(path.join(repoDir, file), 'utf8');
  }
  return files;
}

/** The files that differ between two snapshots: changed, new or gone. */
export function changedFiles(before, after) {
  const names = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...names].filter((file) => before[file] !== after[file]).sort();
}

/** The names of the tracks in the repo. */
export function trackNames(repoDir) {
  const files = fs.readdirSync(path.join(repoDir, TRACK_DIR));
  return files.filter((file) => file.endsWith('.json')).map((file) => path.basename(file, '.json'));
}

/**
 * The track the run is on, or null when there is none yet.
 * @returns {{ name: string, track: object } | null}
 */
export function readCurrentTrack(repoDir) {
  const trackDir = path.join(repoDir, TRACK_DIR);
  const currentFile = path.join(trackDir, 'current');
  const currentName = fs.existsSync(currentFile) ? fs.readFileSync(currentFile, 'utf8').trim() : DEFAULT_TRACK;
  let file = path.join(trackDir, `${currentName}.json`);
  if (!fs.existsSync(file)) return null;
  let track = readJson(file);
  // a fork is only a part of the track it was forked from: the run is about that one
  while (track.parent) {
    file = path.resolve(path.dirname(file), track.parent.track);
    track = readJson(file);
  }
  return { name: path.basename(file, '.json'), track };
}
