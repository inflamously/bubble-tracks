// The human's note on a bubble.
import { resolve } from '../model.js';
/** A hint that ends with its boundary: `… [Boundary: the places the bubble may touch]`. */
const BOUNDARY_RE = /\[Boundary: [^\]]+\]\s*$/;
/** Attach a note to a bubble; "-" or empty clears it. A todo bubble's hint without a boundary at its end only
 *  warns: the hint is still saved. Fog isn't planned yet and a done bubble's work is over, so they get no warning. */
export function hint(track, addr, text) {
    const b = track.bubbles[resolve(track, addr)];
    if (!text || text === '-') {
        delete b.hint;
        return `cleared hint on "${b.title}"`;
    }
    b.hint = text;
    const note = b.state === 'todo' && !BOUNDARY_RE.test(text) ? ' (⚠ no [Boundary: …] at the end — name the places this bubble may touch)' : '';
    return `hint on "${b.title}": ${text}${note}`;
}
