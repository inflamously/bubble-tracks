// Move bubbles within the track, or to another one.
import { resolveRange, ensureId, ownedByHuman, ownershipOf } from '../model.js';
/** Move a bubble (or N:M block) so it starts at position `to` in the resulting track. */
export function move(track, spec, to) {
    const [from, last] = resolveRange(track, spec);
    const block = track.bubbles.splice(from, last - from + 1);
    const pos = Number(to) - 1;
    if (!Number.isInteger(pos) || pos < 0 || pos > track.bubbles.length) {
        track.bubbles.splice(from, 0, ...block); // undo
        throw new Error(`bad position "${to}"`);
    }
    track.bubbles.splice(pos, 0, ...block);
    return `moved ${block.map((b) => `"${b.title}"`).join(', ')} to ${pos + 1}`;
}
/**
 * Move a bubble (or N:M block) to the end of another track, state, type and hint included. They get new ids
 * from `target`'s counter. `owner` is kept only where it means something: on the human's bubble, in a hybrid target.
 * Bubbles with a fork or side track are refused: those tracks link back here by id.
 */
export function moveTo(track, spec, target, targetName) {
    const [from, last] = resolveRange(track, spec);
    const linked = track.bubbles.slice(from, last + 1).filter((b) => b.fork || b.sides?.length);
    if (linked.length) {
        throw new Error(`${linked.map((b) => `"${b.title}"`).join(', ')} ${linked.length > 1 ? 'have' : 'has'} a fork or side track ` +
            'linked to this track — it stays here');
    }
    const block = track.bubbles.splice(from, last - from + 1);
    for (const moved of block) {
        const { title, state, id: _old, owner: _owner, ...rest } = moved;
        const b = { title, state }; // the new id goes right after state, as on every other bubble
        ensureId(target, b);
        Object.assign(b, rest);
        if (ownershipOf(target) === 'hybrid' && ownedByHuman(track, moved))
            b.owner = 'user';
        target.bubbles.push(b);
    }
    return `moved ${block.map((b) => `"${b.title}"`).join(', ')} to track "${targetName}"`;
}
