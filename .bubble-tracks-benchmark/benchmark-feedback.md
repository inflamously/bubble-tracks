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

## Hints from runs

None yet.
