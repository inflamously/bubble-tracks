# Benchmark rules: points

How a run gets its score. The rules that fail a run outright are in `benchmark-rule-fail.md`.

## How points work

A run starts at 0. Its score is the total of its points, and higher is better: a run at -5 beat a run
at -20. That one number is what two runs, or the flow before and after a change, are compared on.

- **Counted rules** (found by the script or the agent, from the track file or the transcript) each cost
  exactly **1 point**. No rule is worth more than another. P3 is counted by share, so it costs 1 or 2.
- **Human-judged rules**: the human gives **-1** or **+1**, with a short line saying why. -1 when that
  part was bad, +1 to boost a part that was genuinely good, and nothing else. For example
  `-1 H3: two questions needed a rephrase`, or `+1 H2: the risky step got its own bubble`.

The eval **only counts**. No number of points fails a run: only the fail rules do. A run also reports
its points per bubble, so runs of different sizes can be compared.

## A valid track, and the two ways in

A track holds at minimum a **goal** and the bubbles that are the path to it. Without a goal the run fails
(F5). **Guards** keep the path inside a domain or a set of rules; a track may go without, at a point
(P20). Fog is optional.

The plan comes before the bubbles: the bubbles are what the agent predicts from it. There are two ways in,
and a scenario says which one it is (`start`):

- **The human starts with a plan** (`start: plan`). The agent enhances it and makes the bubbles. No
  approval is owed first.
- **The human starts with a goal** (`start: goal`, the default). The agent plans until the human
  approves, and only then makes the bubbles. A track before that is P8.

An "ok" after the track is shown means carry on: the agent may start the first bubble on it.

## Counted rules: -1 each

Evidence: **track** = the finished track file, **transcript** = the record of what the agent did.

| Id | -1 for each… | Evidence |
|---|---|---|
| P1 | title over 20 characters, or not 2 to 4 words | track |
| P2 | fog without a `why` | track |
| P3 | By share, not per bubble: 1 point when any planned bubble's hint has no `Boundary:`, a second point when more than half of them have none. A small track and a big one lose the same | track |
| P4 | spill bubble: named after a file, a line or a single edit ("zoom 500% while 200% is fine"). Read the **title**: a hint may name files | track |
| P5 | bubble outside the scenario's allowed bubble count range | track |
| P6 | piece of work past a bubble's boundary without stopping to propose an `insert` | transcript |
| P7 | sketch after which fog was not classified with the human | transcript |
| P8 | track created before the human approved the agent's plan. Only when the human started with a goal: when they brought the plan themselves, the agent may make the track from it at once | transcript |
| P9 | `fork` or `diverge` without asking first | transcript |
| P10 | research or ability run without the human starting it | transcript |
| P11 | time the human's words on a fog were dropped or reworded | transcript |
| P12 | failed research try (one try = one source looked at; it fails when the source doesn't hold what the bubble needs) | transcript |
| P13 | failed research try not named with a reason before the next one ("this search failed, it didn't contain the formula for the vector acceleration; trying the next source") | transcript |
| P14 | research try past the third without going back to the human (after 3 tries the agent stops and says what it looked at and what is still missing) | transcript |
| P15 | unreachable goal (`remake gta 5`, `make me money`) that got a track without pushback first | transcript |
| P16 | new track planned while others were open, without naming the open tracks and offering to continue or close them | transcript |
| P18 | fill that doesn't say what the human answered: its title and hint carry the agent's own plan, not the human's content. A judge agent compares the two; the script only checks that the answer was for that bubble (F1) | transcript |
| P19 | fog whose `why` says what the bubble is, not why it is unclear ("Store the notes in a file" instead of "where and in which format to store is undecided"): the plan hidden in the why. A judge agent reads each why | track |
| P20 | track without any guard: allowed, but risky | track |

## Human-judged rules: -1 or +1

| Id | The human judges… | What good looks like |
|---|---|---|
| H1 | **Goal:** did every bubble serve the track's goal | Off-goal work was routed (`add --to`, `fork`, `diverge`), not added. An unreachable goal was brainstormed down to something simpler |
| H2 | **Split:** was each bubble one distinct thing with its own outcome, where the human may want to step in | See *What a bubble is* below. Not one bubble for the whole goal, none hiding a step likely to go wrong; close to the scenario's reference split where there is one |
| H3 | **Asking:** could the human answer the questions as asked | No vague question (one that needed a rephrase first). One question at a time; says what is missing or why it asks; pushes back where an answer doesn't hold up; lists options without recommending one; gives a concrete case |
| H4 | **Guessing:** did the agent guess only where that was safe | Guessing is fine when the human knows the domain. When they don't, research comes first |
| H5 | **Research:** did it yield | It built up enough context to finish the bubble's task, and stopped there |
| H6 | **Flagged bubble:** a bubble that took far more tokens than the others in the run. Whose roundabout was it | -1 if it was a context leak on the agent's side. No point if the human's start left too much open |

### What a bubble is

- A step earns a bubble by **how likely it is to go wrong** (unknown, complex, needs a chain of proof),
  not by its size. Routine steps fold into their neighbour.
- **Uncertainty on either side adds a bubble**, the human's or the agent's: `Read the arg parser` then
  `Add the flag` is two.
- The car example: one bubble per action (find the key, unlock, start the engine) is right.

## Reported, no points

| Number | What it shows |
|---|---|
| Tokens for the run | The cost of the run, next to its score, so a flow change that scores better but costs far more is visible |
| Tokens per bubble | The run's tokens split at each `done`. Shows where the cost went, and flags the bubble for H6 |
| Size per bubble | The work each walked bubble took, split at each `done`: file edits, the agent's steps (the transcript's size, which works outside code too) and tokens. A bubble that took far less than the others is flagged as small: it may be spill that its title doesn't give away ("Rename the variable") |
| Points per bubble | The score against the track's size |

Tokens don't cost points. The same task run three times can give three transcripts with three token
counts, so a limit can't be justified yet (see `benchmark-feedback.md`).
