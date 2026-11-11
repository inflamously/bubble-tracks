# Benchmark feedback

High-level hints about the rules themselves, collected from runs. The rules in `benchmark-rule-fail.md`
and `benchmark-rule-points.md` are not tuned up front: run, note here what felt wrong about the scoring,
then adjust the rules.

A hint is one or two lines: what happened in the run, which rule it is about (by id), and what it
suggests. For example: *"P8 (track before approval) cost 1 point but the whole run went the wrong way
after it. Fail tier?"*

## Parked for later

Decided to leave out for now, to bring back once runs give something to go on:

- **Moving a points rule to the fail tier** (or a fail down to points). Open question from the start: is
  any 1-point rule really bad enough to fail a run? Watch for runs where a single P rule ruined it.
- **Failing a run on points for its size.** -20 on a 3-bubble track can be too much, while -20 on 10
  bubbles is fine, so a fail line would have to scale with the track. For now nothing fails on points:
  count first. Also open: whether "size" is just the bubble count.
- **A token limit.** Asking three times with the same prompt to change one line can give three
  transcripts with three token counts, so there is no fair line yet. Idea to come back to: each
  scenario's baseline run as the reference, a later run reported as a multiple of it, and a point lost
  only far over it. Needs repeated runs first, to see how much the same task varies.

- **Spill by size.** P4 only sees a spill bubble by its title (a file or a line). A bubble cut too fine
  with an ordinary title is measured instead: edits, steps and tokens per bubble, with the ones far
  smaller than the rest of the run flagged. Only reported for now. Open: whether a flagged small
  bubble costs a point, and what "far smaller" is (now: under a third of the median of the others, in
  a run of at least three bubbles). A small bubble is not always wrong: a step earns its bubble by how
  likely it is to go wrong, not by its size. Only walked runs have sizes; a run that ends at
  `planned` has none.
- **Research the human didn't start (P10).** The script passes a `research` when the human's last
  message says "research", "yes" or `N:?`, so a "yes, go" that only meant "go on" lets unoffered
  research through. Left as it is for now. What makes it hard: a bubble's own text can already imply
  research ("Find the formula"), and then running it is not really unasked.
- **Offering research is optional.** There was a rule P17 (research not offered where it was needed);
  it is dropped. An agent may offer research, and nothing is lost when it doesn't.
- **Idea: a research flag on a bubble.** If a bubble could be marked as "this one is research", the eval
  could tell asked-for research from unasked without guessing from the chat. That is a change to the
  flow and the CLI, so it belongs on its own track, not this one.

## Hints from runs

None yet.
