// Retitle a bubble or the track itself.

import { resolve, type Addr, type Track } from '../model.js';

/** A bubble title is a short name of this many words; the track line cuts each label at 20 characters. */
const TITLE_WORDS = { min: 2, max: 4 };

/** What add, insert, fill and rename append for a title that isn't 2–4 words, or ''. A style rule: it warns, the command still runs. */
export function titleNote(title: string): string {
  const words = title.trim().split(/\s+/).filter(Boolean).length;
  if (words >= TITLE_WORDS.min && words <= TITLE_WORDS.max) return '';
  return ` (⚠ ${words} word${words === 1 ? '' : 's'} — a title is ${TITLE_WORDS.min}–${TITLE_WORDS.max} words; details go in a hint)`;
}

export function rename(track: Track, addr: Addr, title: string): string {
  const b = track.bubbles[resolve(track, addr)];
  if (b.state === 'fog') throw new Error(`"${b.title}" is fog — plan it with fill`);
  if (!title) throw new Error('rename needs a title');
  const old = b.title;
  b.title = title;
  return `renamed "${old}" → "${title}"${titleNote(title)}`;
}

/** Rename the track itself. */
export function setTitle(track: Track, title: string): string {
  if (!title) throw new Error('title needs text');
  const old = track.title;
  track.title = title;
  return `track "${old}" → "${title}"`;
}
