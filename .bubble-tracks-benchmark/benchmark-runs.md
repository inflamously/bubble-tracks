# Benchmark runs

How a run happens and who scores it. The rules it is scored on are in `benchmark-rule-fail.md` and
`benchmark-rule-points.md`.

A **run** is one agent walking one scenario in a throwaway repo. It leaves two things behind:

- the **track file** the walk ended with
- the **recording**: every message, every tool call (the `bubble` commands and the file edits) and the
  tokens used, in order

There are two ways to run and score. Both start from the same scenarios and the same rules; they differ
in who plays the human and who scores.

| | Automatic | Human-scored |
|---|---|---|
| For | regression: did a flow change break something | judging quality: is the flow better |
| The human's side | a fixed list of replies, written into the scenario | a real person, answering as themselves |
| Scored by | the script alone | the script, then a judge agent, then the human |
| Rules it covers | the ones a script can check | all of them |
| Same input, same score | yes, for the scoring | no: a person and a judge are in it |

## Automatic

The scenario carries the human's replies as a script: the first message, then one reply per stop
("ok", "go", a fog answer). The agent is started without a person, and gets the next reply each time it
stops. The script then scores the track file and the recording. Nobody reads anything.

Because the replies are known in advance, breaks that normally need judgement become plain checks:

| Rule | The check |
|---|---|
| P1 to P5 | read from the track file: titles, `why`, `Boundary:`, spill titles, bubble count against the scenario's range |
| F1 fills a fog itself | a `fill N` with no reply that gave content for bubble N (`N: …`). Whether the fill says what the reply said is the judge's count (P18) |
| F2 crosses a guard | the scenario sets a guard on named files; an edit to one of them |
| F3 no stop after `done` | another bubble command or file edit after `done`, before the next reply |
| F4 hand-edits the JSON | a file edit under `.bubble-tracks/` that isn't a CLI call |
| P8 track before approval | `create` or `init` before the reply that approves the plan |
| P9 fork or diverge unasked | `fork` or `diverge` before a reply that picks one |
| P10 research or ability unasked | `research` or `bubble:<name>` not named in the reply before it |

Everything else is left out of an automatic score: P6, P7, P11 to P18 and all H rules. An automatic score
is therefore a floor, not the full picture. It says "no rule a script can see was broken".

**Two layers, kept apart:**

- **Scoring a saved run** needs no agent and gives the same score every time. This is the part that can
  be a normal test: saved track files and recordings go in, expected scores come out.
- **Making a new run** needs a live agent, costs tokens and comes out a little different each time. It
  is started by hand, on demand, and never as part of `npm test`.

## Human-scored

A person walks the scenario with the agent in a real chat and answers as themselves. Afterwards:

1. **The script** scores what it can, exactly as in the automatic mode.
2. **A judge agent** reads the recording and counts the remaining counted rules (P6, P7, P11 to P18).
   For each point it takes, it quotes the line it is based on, so the human can strike a wrong one.
   For P18 it gets each fill next to the answer it was made from, as the script's report lists them.
3. **The human** fills in a short sheet: for each of H1 to H6, `-1` or `+1` and one line why. For H2 the
   sheet shows the scenario's reference split next to the agent's. For H6 it shows the flagged bubble.

The run's score is the three added up. A fail from any of the three fails the run.

The human-scored mode is meant for a few scenarios (about three), not the whole set: it takes a person's
time.

## What a scenario has to bring

| Part | Used by |
|---|---|
| The first message (the task) | both |
| The starting repo: its files, and any tracks already open | both |
| The scripted replies, one per stop | automatic |
| The guard and the files it protects | automatic (F2) |
| The allowed bubble count range | both (P5) |
| A hand-written reference split | human-scored (H2) |

## What the recording has to hold

- every message, with who sent it
- every tool call: the full `bubble` command line, and for file edits the path
- the tokens used per turn, so the run's total can be split at each `done` (tokens per bubble)

Nothing in the bubble CLI or the skill changes for this: the recording comes from the agent's own
session log, and the eval reads it from outside.
