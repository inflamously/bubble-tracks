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
- **A token point.** Decided on 2026-11-12: a run loses 1 point when it uses far more tokens than its
  scenario's baseline run. Not built yet, because "far more" needs a number: one scenario has to be run
  several times first, to see how much the same task varies. Until then tokens are only reported.

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
- **The runner's own numbers.** Three choices made before any run: a run counts as derailed after 3
  `otherwise` replies past the scripted ones, one agent turn may take 10 minutes, and a step's tokens
  are its output tokens only (what the agent wrote and thought, not the history it re-read, which grows
  with every turn). The baseline run will show whether they fit.

## Hints from runs

None open. The hints from the baseline run are settled below.

## Decided

From the interview after the baseline run (2026-11-12, Sonnet, see `README.md`):

| What the run showed | Decided | Where it is now |
|---|---|---|
| `planned` scenarios derailed: the agent asked for its fog to be classified, the script only said "ok" and "go" (`car-trip`, `open-tracks`, `unreachable-goal`) | The flow is plan, then the track exists, then bubble by bubble. Each scenario says how far its run goes | To build: scenario format and runner |
| "go" against a real question: the agent rightly refused to guess, and the run derailed | The scenario plays along. Two kinds of automatic run: answers written into the scenario (the same every time), and a human-faking agent that answers the walking agent (more variety) | To build: scenario format and runner |
| P8 in `fixed-plan`: the human gave the plan, the agent made the track at once and lost a point | Two ways in. The human starts with a plan: the agent enhances it and makes bubbles. The human starts with a goal: the agent plans until approved, then makes bubbles. P8 only counts on the second | Done: `start: plan` in the scenario |
| What a track must hold | A goal, or the run fails: the goal is the purpose and the bubbles are the path. Guards may be missing, but that is risky | Done: F5, and P20 (1 point) |
| P3 in `fixed-plan`: one omission cost 5 points | By share: 1 point for any bubble without a boundary, 2 when more than half have none | Done |
| "ok" read as "go" after the track was shown | Fine: ok means carry on | Done: said in `benchmark-rule-points.md`, no rule |
| `research-needed` tested a lookup in a file the human could name | That is a search. Research is for a real unknown: the agent highlights it, explains it, and the human goes on with what they learned. The check: the agent explained and stopped before it built | To build: a new scenario and its check |
| Failing a run on points for its size | No. Points never fail a run. The loop is run, feedback, better rules that lose fewer points; on some tracks losing points is hard to avoid | Done: said in both rule files |
| A token limit | A point far over the scenario's baseline | Parked above until "far over" has a number |

`ability-once` and `fork-deeper` start on a track their setup makes. Those tracks had no guard, which P20
would have charged to the agent, so each setup now sets one.
