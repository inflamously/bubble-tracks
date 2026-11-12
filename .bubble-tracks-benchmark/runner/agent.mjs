// The agent, without a person: sends one message to Claude Code in the throwaway repo, waits for it to
// stop, and returns what its session log gained. The agent needs the bubble-tracks plugin installed.
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** @typedef {{ repoDir: string, model?: string, id: string | null, seenLines: Set<string> }} Session */

const CONFIG_DIR = process.env.CLAUDE_CONFIG_DIR || path.join(os.homedir(), '.claude');
/** What the agent may always do without a person to ask. What else it may do is the machine's own permission settings. */
const ALLOWED_TOOLS = ['Skill', 'Read', 'Glob', 'Grep', 'Edit', 'Write', 'Bash(node:*)'];
/** Only edits made with the edit tools show up in the session log as edits, so the recording needs them made that way. */
const HOUSE_RULE = 'Change files only with the Edit and Write tools, never through the shell.';
/** One turn that takes longer than this is stuck. */
const TURN_TIMEOUT_MS = 10 * 60 * 1000;

/** @returns {Session} */
export function newSession(repoDir, model) {
  return { repoDir, model, id: null, seenLines: new Set() };
}

/** The session's log, as Claude Code keeps it: one JSON line per message. */
function readSessionLog(sessionId) {
  const projectsDir = path.join(CONFIG_DIR, 'projects');
  for (const project of fs.readdirSync(projectsDir)) {
    const file = path.join(projectsDir, project, `${sessionId}.jsonl`);
    if (!fs.existsSync(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
    return lines.map((line) => JSON.parse(line));
  }
  throw new Error(`no session log found for ${sessionId} under ${projectsDir}`);
}

/**
 * Sends one message and waits for the agent to stop.
 * @param {Session} session
 * @returns {object[]} the agent's log lines from this turn, in order
 */
export function askAgent(session, message) {
  const args = ['-p', message, '--output-format', 'json', '--append-system-prompt', HOUSE_RULE];
  if (session.id) args.push('--resume', session.id);
  if (session.model) args.push('--model', session.model);
  args.push('--allowedTools', ...ALLOWED_TOOLS); // takes a list, so it goes last

  const run = spawnSync('claude', args, { cwd: session.repoDir, encoding: 'utf8', timeout: TURN_TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024 });
  if (run.error) throw run.error;
  if (run.status !== 0) throw new Error(`claude exited ${run.status}: ${run.stderr || run.stdout}`);
  session.id = JSON.parse(run.stdout).session_id;

  // the log holds the whole session: keep only the lines this turn added
  const agentLines = readSessionLog(session.id).filter((line) => line.type === 'assistant');
  const newLines = agentLines.filter((line) => !session.seenLines.has(line.uuid));
  for (const line of newLines) session.seenLines.add(line.uuid);
  return newLines;
}
