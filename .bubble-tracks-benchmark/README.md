# Benchmark baseline

The flow as it stood at commit `ee54779`, scored once. Later runs are compared against this.

- **When:** 2026-11-12
- **Agent:** Claude Code 2.1.322, model Sonnet (`--model sonnet`)
- **Mode:** automatic: scripted replies, scored by the script alone. The judge's rules (P6, P7, P11 to
  P19) and the human's (H1 to H6) are not in these numbers, so a score is a floor, not the full picture.
- **How:** `node .bubble-tracks-benchmark/run.mjs --scenario <file> --model sonnet`, once per scenario

One run per scenario. The same scenario comes out a little different each time, so one run is a first
reading, not a fixed number.

## Scored runs

| Scenario | Points | What cost a point | Bubbles | Turns (scripted) | Tokens | Tokens per bubble |
|---|---|---|---|---|---|---|
| `one-line` | 0 | | 1 | 2 (2) | 1210 | 1121 |
| `shout-flag` | 0 | | 3 | 4 (2) | 3331 | 1906, 529, 658 |
| `fixed-plan` | -5 | P3 ×2, P1, P4, P20 | 5 | 3 (3) | 2697 | 1786 |
| `fog-stop` | 0 | | 3 | 8 (6) | 5409 | 2315, 1954, 885 |
| `guard-pressure` | 0 | | 2 | 4 (4) | 3214 | 1594, 1350 |
| `research-needed` | -1 | P5 (1 bubble, 2 to 3 allowed) | 1 | 2 (2) | 2027 | 1801 |
| `fork-deeper` | 0 | | 2 | 8 (5) | 7612 | 3490, 1746, 1875 |
| `ability-once` | 0 | | 2 | 6 (3) | 3139 | 2269, 642 |

Scored with the rules as adjusted after this run (P3 by share, P8 only when the human starts with a
goal, F5 and P20 added); with the rules the run was made under, `fixed-plan` was -8. No run failed
(F1 to F5), and no file changed without a recorded edit. Tokens are output tokens: what
the agent wrote and thought. "Turns" counts the human's messages; "(scripted)" is how many the scenario
wrote out before falling back to `otherwise`.

Flags for a human to look at, not scored: in `shout-flag`, bubble 1 took far more tokens than the other
two (H6).

## Derailed runs: not scored

All three `planned` scenarios that sketch a fog derailed the same way. The agent made the track and asked
the human to classify its fog; the scripted replies only say "ok" and "go", so the fog was never
classified, `planned` never held, and the "go"s pushed the agent into walking the track.

| Scenario | What happened | Tokens |
|---|---|---|
| `car-trip` | 6 bubbles, 2 of them fog. The agent kept asking whether the key was found and would not guess | 3240 |
| `open-tracks` | Closed `old-idea` after being told to, made `dark-mode` with 1 fog. After four "go"s it picked an option itself and scaffolded a site | 4773 |
| `unreachable-goal` | Pushed back on "remake GTA 5", then planned the smaller goal with 1 fog and walked 4 bubbles | 13275 |

What this says about the scenarios and rules is in `benchmark-feedback.md`, under "Hints from runs".
