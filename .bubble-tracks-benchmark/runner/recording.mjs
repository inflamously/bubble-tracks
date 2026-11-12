// Turns the agent's session log into the recording the scoring reads: its messages, its bubble
// commands and its file edits, in order, with the tokens each step used (the shape is in
// scoring/model.mjs). Reads no file: the log lines come in, events come out.
/** @import { Event } from '../scoring/model.mjs' */
import path from 'node:path';

/** One piece of a shell line: a "quoted" or 'quoted' word, a separator between commands, or a bare word. */
const SHELL_PIECE = /"((?:[^"\\]|\\.)*)"|'([^']*)'|(&&|\|\||[;|\n])|([^\s"';|&]+)/g;
const BUBBLE_CLI = /bubble\.js$/;
const REDIRECT = /^\d*>/;
const EDIT_TOOLS = ['Edit', 'Write', 'NotebookEdit'];

/** A shell line as commands, each a list of words. Knows quotes and separators, nothing more. */
function shellCommands(line) {
  const commands = [[]];
  for (const [, doubleQuoted, singleQuoted, separator, bareWord] of line.matchAll(SHELL_PIECE)) {
    if (separator) commands.push([]);
    else if (doubleQuoted !== undefined) commands.at(-1).push(doubleQuoted.replace(/\\(.)/g, '$1'));
    else commands.at(-1).push(singleQuoted ?? bareWord);
  }
  return commands;
}

/**
 * Remembers a shell variable that holds the CLI, as agents like to write it:
 * `B='node …/bubble.js'; $B add "Format rows"`.
 */
function rememberCliVariables(words, cliVariables) {
  words.forEach((word, index) => {
    const assignment = word.match(/^(\w+)=(.*)$/);
    if (!assignment) return;
    // a quoted value is its own word, right after `B=`
    const value = assignment[2] || words[index + 1] || '';
    if (BUBBLE_CLI.test(value)) cliVariables.add(assignment[1]);
  });
}

/** The words after the CLI (`…/bubble.js` or a variable holding it), without `--dir <repo>` and without a redirect like `2>&1`. */
function bubbleWords(words, cliVariables) {
  const isCli = (word) => {
    const variable = word.match(/^\$\{?(\w+)\}?$/);
    return BUBBLE_CLI.test(word) || Boolean(variable && cliVariables.has(variable[1]));
  };
  const cliAt = words.findIndex(isCli);
  if (cliAt === -1) return [];
  let args = words.slice(cliAt + 1);
  const redirectAt = args.findIndex((word) => REDIRECT.test(word));
  if (redirectAt !== -1) args = args.slice(0, redirectAt);
  const dirAt = args.indexOf('--dir');
  if (dirAt !== -1) args.splice(dirAt, 2);
  return args;
}

/** Every bubble command in one shell line: `node …/bubble.js add "Format rows" && node …/bubble.js show`. */
export function bubbleCommands(shellLine) {
  const cliVariables = new Set();
  const found = [];
  for (const words of shellCommands(shellLine)) {
    rememberCliVariables(words, cliVariables);
    const args = bubbleWords(words, cliVariables);
    if (args.length > 0) found.push(args);
  }
  return found;
}

/** The events one piece of an agent message stands for. @returns {Event[]} */
function eventsFromBlock(block, repoDir) {
  if (block.type === 'text' && block.text.trim()) return [{ who: 'agent', text: block.text }];
  if (block.type !== 'tool_use') return [];
  if (block.name === 'Bash') {
    return bubbleCommands(block.input.command || '').map((words) => ({ who: 'agent', bubble: words }));
  }
  if (EDIT_TOOLS.includes(block.name)) {
    const file = block.input.file_path || block.input.notebook_path;
    return [{ who: 'agent', edit: path.relative(repoDir, file).replace(/\\/g, '/') }];
  }
  return [];
}

/**
 * @param {object[]} agentLines the `assistant` lines of a session log, in order
 * @param {string} repoDir edits are recorded relative to it
 * @returns {Event[]}
 */
export function eventsFromLog(agentLines, repoDir) {
  const events = [];
  const countedMessages = new Set();
  let tokensWaiting = 0; // tokens of messages that have no event to carry them yet
  for (const { message } of agentLines) {
    // one message is logged as several lines, each with the message's whole usage: count it once.
    // Output tokens only: what the agent wrote and thought, not the history it re-read.
    if (!countedMessages.has(message.id)) {
      countedMessages.add(message.id);
      tokensWaiting += message.usage?.output_tokens || 0;
    }
    for (const block of message.content) {
      for (const event of eventsFromBlock(block, repoDir)) {
        if (tokensWaiting > 0) event.tokens = tokensWaiting;
        tokensWaiting = 0;
        events.push(event);
      }
    }
  }
  return events;
}
