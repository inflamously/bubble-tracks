// The model of the hero's track card: what a track is made of, and the one scripted track the card shows.
// Types and data only. logic.mts moves through it, view.tsx draws it.

export type BubbleKind = 'done' | 'active' | 'todo' | 'fog';

/** Where the walk stands: `pos` is the active bubble (one past the last at Finish), `planned` whether the human has planned the fog. */
export interface TrackState {
  readonly pos: number;
  readonly planned: boolean;
}

/** One bubble as the card shows it. */
export interface Bubble {
  readonly label: string;
  readonly kind: BubbleKind;
  readonly mark: string;
}

/** The visitor's move besides a restart. */
export type Move = 'step' | 'plan';

/** Everything the card shows for one state. `next` is the move open to the visitor; null at Finish. */
export interface TrackView {
  readonly line: string;
  readonly bubbles: readonly Bubble[];
  readonly message: string;
  readonly stopped: boolean;
  readonly next: Move | null;
}

export const TITLES: readonly string[] = [
  'Read the export code',
  'Add the CSV endpoint',
  'Write the endpoint tests',
  'How do big exports get delivered?',
  'Wire the export button',
];

/** The position of the fog bubble, and the title the human gives it when they plan it. */
export const FOG = 3;
export const FOG_PLANNED = 'Stream big exports in chunks';

export const MARKS: Record<BubbleKind, string> = { done: '●', active: '◐', todo: '○', fog: '?' };

/** The first bubble is done when the card opens, so the track shows all four kinds at once. */
export const START: TrackState = { pos: 1, planned: false };
