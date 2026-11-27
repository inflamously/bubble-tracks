// The verify command: prints the verify workflow and the whole current track (line, goal, guards, every
// bubble with its hint) for a subagent with no chat context to read once and report the plan's gaps.
// It changes nothing itself; each gap comes back as a proposed command for the human to approve.
import { currentTrack } from './bubbles.js';
import { printTrack } from './print.js';
/** The workflow: read the track as the builder will, report gaps, propose and never apply. */
const WORKFLOW = [
    '  1. Hand over: start one subagent and give it this whole output, and nothing from the chat. If you',
    "     can't start one, read the track below as if you had never seen the chat.",
    '  2. Read: the goal, the guards and every bubble with its hint. This is all the builder will have.',
    '  3. Report gaps, one line each, with the bubble number and the reason:',
    '     - a vague boundary: a todo bubble with no [Boundary: …], or one that names no place to point at',
    '     - a missing guard: something the goal or a hint rules out that no guard says',
    '     - a bubble that is too big: more than one use case, or more than a human can judge in one review',
    "     - a hint that needs the chat: a word, a name or a decision the track doesn't explain",
    "  4. Propose, don't apply: with each gap, the one command that closes it (hint N …, guard …,",
    '     insert at N …). Change nothing. Fog is no gap: it is unclear on purpose, and the human fills it.',
    '  5. No gaps is an answer too: say so in one line.',
];
const STOP = '⏸ stop — show the gaps to the human as proposed changes and wait. They approve each one. Verify runs again only when the human asks.';
/** Run the verify command; returns an exit code, or undefined if `cmd` isn't it. */
export function runVerifyCommand(cmd, args, { dir, renderOpts }) {
    if (cmd !== 'verify')
        return undefined;
    if (args.length)
        throw new Error('usage: verify');
    const { file, name, track } = currentTrack(dir);
    if (track.closed)
        throw new Error(`track "${name}" is closed (read-only) — nothing left to verify`);
    if (!track.bubbles.length)
        throw new Error(`track "${name}" has no bubbles — nothing to verify`);
    console.log(`verify "${name}" — run this once, without the chat's context; it only proposes`);
    console.log('');
    for (const line of WORKFLOW)
        console.log(line);
    console.log('');
    console.log(`── context: track "${name}"${track.title ? ` — ${track.title}` : ''} ──`);
    printTrack(file, track, renderOpts, true); // with the guards; its fog exit code is show's business
    console.log('');
    console.log(STOP);
    return 0;
}
