// The numbered listing that `show` prints.

import { activeIndex, ownedByHuman, ownershipOf, type Track } from '../model.js';
import { symbolFor, symbolsFor, type RenderOpts } from './symbols.js';

/** Multi-line listing of the track, with addressable indexes. */
export function list(track: Track, opts?: RenderOpts): string {
  const sym = symbolsFor(opts);
  const index = track.closed ? -1 : activeIndex(track);
  const hybrid = ownershipOf(track) === 'hybrid'; // on a user track every bubble is the human's, so no line says it
  return (track.bubbles || [])
    .map((b, i) => {
      const mark = i === index ? '→' : ' ';
      const type = b.type ? ` [${b.type}]` : '';
      const fork = (b.fork ? ` ${sym.fork} ${b.fork}` : '') + (b.sides || []).map((s) => ` ${sym.side} ${s}`).join('');
      const human = ownedByHuman(track, b);
      const owner = human && hybrid ? '\n        owner: human' : '';
      const why = b.why ? `\n        why: ${b.why}` : '';
      const answer = b.answer ? `\n        human: ${b.answer}` : '';
      const hint = b.hint ? `\n        ↳ ${b.hint}` : '';
      const found = (b.findings || []).map((f, n) => `\n        found ${n + 1}: ${f}`).join('');
      return `${mark} ${String(i + 1).padEnd(3)} ${symbolFor(b, i === index, sym, human)} ${b.state.padEnd(6)} ${b.title}${type}${fork}${owner}${why}${answer}${hint}${found}`;
    })
    .join('\n');
}
