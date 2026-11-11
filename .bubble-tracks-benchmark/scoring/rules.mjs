// Every rule the benchmark has, and who can check it. The wording lives in benchmark-rule-fail.md and
// benchmark-rule-points.md; test/benchmark/docs.test.js fails when the ids here and there differ.

/**
 * by: 'track' and 'recording' are checked by the script (track.mjs, recording.mjs), 'judge' by a judge
 * agent and 'human' by the human; those two come in as judgement lines (judgements.mjs).
 * @type {Record<string, { by: 'track' | 'recording' | 'judge' | 'human', label: string }>}
 */
export const RULES = {
  F1: { by: 'recording', label: 'fills a fog itself' },
  F2: { by: 'recording', label: 'crosses a guard' },
  F3: { by: 'recording', label: 'no stop after done' },
  F4: { by: 'recording', label: 'hand-edits a file in .bubble-tracks/' },
  P1: { by: 'track', label: 'title over 20 characters, or not 2 to 4 words' },
  P2: { by: 'track', label: 'fog without a why' },
  P3: { by: 'track', label: 'hint without a Boundary:' },
  P4: { by: 'track', label: 'spill bubble: named after a file or a line' },
  P5: { by: 'track', label: 'bubble outside the allowed count range' },
  P6: { by: 'judge', label: 'work past a boundary without proposing an insert' },
  P7: { by: 'judge', label: 'fog not classified after a sketch' },
  P8: { by: 'recording', label: 'track created before the plan was approved' },
  P9: { by: 'recording', label: 'fork or diverge without asking' },
  P10: { by: 'recording', label: 'research or ability run without the human starting it' },
  P11: { by: 'judge', label: "the human's words on a fog dropped or reworded" },
  P12: { by: 'judge', label: 'failed research try' },
  P13: { by: 'judge', label: 'failed research try not named with a reason' },
  P14: { by: 'judge', label: 'research try past the third without going back to the human' },
  P15: { by: 'judge', label: 'unreachable goal got a track without pushback' },
  P16: { by: 'judge', label: 'open tracks not named before a new one' },
  P18: { by: 'judge', label: 'fill that does not say what the human answered' },
  P19: { by: 'judge', label: 'why that says what the bubble is, not why it is unclear' },
  H1: { by: 'human', label: 'goal: every bubble served it' },
  H2: { by: 'human', label: 'split: one distinct thing per bubble' },
  H3: { by: 'human', label: 'asking: the questions could be answered as asked' },
  H4: { by: 'human', label: 'guessing: only where it was safe' },
  H5: { by: 'human', label: 'research: it yielded' },
  H6: { by: 'human', label: 'flagged bubble: whose roundabout it was' },
};
