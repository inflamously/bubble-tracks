// The one-line track: the status line and `tracks`, plus the status line's guard count.
import { activeIndex, ownedByHuman } from '../model.js';
import { paint, paintHuman, shorten, symbolFor, symbolsFor, useColor } from './symbols.js';
/** One-line render: `Title   S ●──●──◐──❓ F   prev ‹ ◐ active › next`, or `… F   🔒 closed` / `◌ draft` / `all done` / `empty` (nothing active). */
export function render(track, opts) {
    const sym = symbolsFor(opts);
    const bubbles = track.bubbles || [];
    const index = track.closed || track.draft ? -1 : activeIndex(track);
    const color = useColor(opts);
    // The human's bubbles have their own shape (◆ ◈ ◇), and are red when color is on.
    const symbol = (i, around) => {
        const human = ownedByHuman(track, bubbles[i]);
        const s = symbolFor(bubbles[i], i === index, sym, human);
        return human && bubbles[i].state !== 'fog' ? paintHuman(color, around, s) : s;
    };
    const line = bubbles.map((_, i) => symbol(i, 'track')).join(sym.sep);
    const head = `${paint(color, 'title', track.title || 'Plan')}   ${paint(color, 'track', `S ${line}${line ? ' ' : ''}F`)}   `;
    if (track.closed)
        return head + paint(color, 'context', `${sym.lock} closed`);
    if (track.draft)
        return head + paint(color, 'context', `${sym.draft} draft`);
    const active = bubbles[index];
    if (!active)
        return head + paint(color, 'context', bubbles.length ? 'all done' : 'empty');
    const prev = bubbles[index - 1];
    const next = bubbles[index + 1];
    const here = active.state === 'fog' ? `${sym.fog} needs you` : `${symbol(index, 'context')} ${shorten(active.title, sym)}`;
    const context = (prev ? shorten(prev.title, sym) + sym.prev : '') + here + (next ? sym.next + shorten(next.title, sym) : '');
    return head + paint(color, 'context', context);
}
/** The status line's guard count after the line: `   ¦ 2 guards`, or '' when the track has none. */
export function renderGuardCount(track, opts) {
    const count = (track.guards || []).length;
    if (!count)
        return '';
    const sym = symbolsFor(opts);
    return '   ' + paint(useColor(opts), 'context', `${sym.guard} ${count} guard${count === 1 ? '' : 's'}`);
}
