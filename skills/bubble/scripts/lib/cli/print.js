// What `show` and every mutation print: the track line, the goal, the ownership (unless it is the agent's; and guards on switch, guard or a draft), the listing, the handoff note or closed line, the draft notice, the fog warning or the human's-bubble notice.
import * as lib from '../index.js';
import * as links from '../links/index.js';
/** The track's guards, numbered; nothing when it has none. */
export function printGuards(track, opts) {
    if (!track.guards || !track.guards.length)
        return;
    console.log(`${lib.symbolsFor(opts).guard} guards (before you act):`);
    track.guards.forEach((g, i) => console.log(`    ${i + 1}  ${g}`));
}
/**
 * Print the track saved at `file`; returns 3 when the active bubble is fog (the human has to plan it), else 0.
 * An active bubble that is the human's to do gets a notice and still returns 0: nothing is missing, the agent just keeps off.
 * Guards print only with `guards` (switch and the guard command); otherwise `guard show` lists them.
 * A draft prints as the proposal: always with its guards, nothing active, a draft notice, and 0.
 */
export function printTrack(file, track, opts, guards = false) {
    console.log(lib.render(track, opts));
    const { fork, side } = lib.SYMBOLS.unicode;
    if (track.parent)
        console.log(`${fork} fork of ${links.linkLabel(file, track.parent)} in ${track.parent.track}`);
    if (track.origin)
        console.log(`${side} diverged from ${links.linkLabel(file, track.origin)} in ${track.origin.track}`);
    if (track.goal)
        console.log(`${lib.symbolsFor(opts).goal} goal: ${track.goal}`);
    if (track.ownership)
        console.log(`${lib.symbolsFor(opts).owner} ${lib.describeOwnership(track)}`);
    if (guards || track.draft)
        printGuards(track, opts); // a draft is the proposal: its guards are part of it
    console.log('');
    console.log(lib.list(track, opts));
    if (track.closed) {
        console.log('');
        console.log(`${lib.SYMBOLS.unicode.lock} closed ${track.closed.at} — read-only; fork, diverge or switch to keep working`);
        return 0; // archived: nothing is active, so fog here never needs the human
    }
    if (track.handoff && track.handoff.note) {
        console.log('');
        console.log(`✎ handoff (${track.handoff.at}): ${track.handoff.note}`);
    }
    if (track.draft) {
        console.log('');
        console.log(`${lib.symbolsFor(opts).draft} draft — a proposal, not a track yet: project edits are blocked and done refuses. Change it with the human; on their go, run: approve`);
        return 0; // nothing is active on a draft, so its fog doesn't stop anything yet
    }
    const active = lib.activeBubble(track);
    if (active && active.state === 'fog') {
        console.log('');
        console.log(`⚠ "${active.title}" is fog — the human plans it. Ask them to classify it (${lib.TYPES.join(', ')}) and fill it.`);
        if (active.answer)
            console.log('  Their words above are the start: turn them, with the human, into a fill, a hint, a guard, new bubbles or a fork.');
        return 3;
    }
    if (active && lib.ownedByHuman(track, active)) {
        console.log('');
        console.log(`${lib.symbolsFor(opts).humanActive} "${active.title}" is the human's to do — don't do its work yourself. Hint at the steps; once they say it's done, check it, then run done.`);
    }
    return 0;
}
