# AGENTS.md: the benchmark

Notes for coding agents working in `.bubble-tracks-benchmark/`. The repo's own rules are in the root
`AGENTS.md`; this file adds what holds for the benchmark only.

The benchmark scores how well an agent walks a bubble track. It only measures: it reads track files and
recordings from outside, and nothing a user runs depends on it.

## Layout

| Path | What |
|---|---|
| `benchmark-rule-fail.md`, `benchmark-rule-points.md` | the rules, by id (F, P, H): the wording a person reads |
| `benchmark-runs.md` | how a run happens: automatic and human-scored |
| `benchmark-scenarios.md`, `scenarios/*.json` | the fixed tasks a run walks, and their file format |
| `benchmark-feedback.md` | hints about the rules from runs, and what is parked for later |
| `flow-analysis.json`, `goal-guard-test.json`, `src-tour.json` | the three saved baseline tracks |
| `README.md` | the baseline results (empty until the baseline run) |
| `score.mjs` | the command line: reads files, parses options, prints. No scoring |
| `scoring/` | the scoring, one module per job (below) |
| `../test/benchmark/` | one test file per module, plus `docs.test.js` |

## The scoring modules

| Module | Its one job | May import |
|---|---|---|
| `scoring/model.mjs` | the shapes passed around (track, event, mark, scenario) and the few helpers every module shares | nothing |
| `scoring/rules.mjs` | the table of rule ids and who checks each | nothing |
| `scoring/track.mjs` | the rules read from the track file: P1 to P5 | `model` |
| `scoring/fills.mjs` | fog answers and fills: what the human answered, what got filled | nothing |
| `scoring/recording.mjs` | the rules read from the recording: F1 to F4, P8 to P10 | `model`, `fills` |
| `scoring/sizes.mjs` | tokens and work per bubble, and the two flags. Reported, never scored | `model` |
| `scoring/judgements.mjs` | the judge's and the human's lines, parsed into marks | `rules` |
| `scoring/run.mjs` | one run's score: calls the modules above and adds up | all of the above |
| `scoring/report.mjs` | a score as text. Formats only, computes nothing | nothing |

Every check returns **marks** (`{ id, points, what, by }`). A module never prints and never reads a file:
`score.mjs` does both.

## Rules

- **No god script.** One module, one job. A module over 150 lines is doing two: split it. The command
  line stays a command line. `test/benchmark/docs.test.js` checks the size, the imports and that the
  table above lists every module.
- **A new piece of work gets its own folder next to `scoring/`** (the scenario runner: `runner/`), with
  its own entry file next to `score.mjs` and its own rows in this file. Don't grow `scoring/` to hold it.
- **Readable before short.** One named function per rule or per event, marked with the rule ids it checks
  (`/** F2, F3, F4 */`). Full names (`bubbleNumber`, `lastHumanMessage`), not single letters. No nested
  ternaries. An inline comment says why, where the code alone doesn't.
- **A rule lives in three places, changed together:** its row in `benchmark-rule-fail.md` or
  `benchmark-rule-points.md`, its entry in `scoring/rules.mjs`, and, when a script can check it, its check
  in `track.mjs` or `recording.mjs` with a test. Rule ids are never reused or renumbered: a dropped rule
  leaves a gap (P17).
- **Everything counted costs 1 point.** The human gives -1 or +1. Don't add weights. A threshold or
  number you had to invent is a named constant with a comment, and gets a line in `benchmark-feedback.md`.
- **Don't edit the three saved tracks.** They are the baseline, and `test/benchmark/run.test.js` pins
  their scores.
- **Scenario tracks are built with `bubble` commands** (`repo.setup`), never as hand-written track JSON.
- **Plain JavaScript (`.mjs`) with JSDoc types, on purpose.** The repo's TypeScript in `src/` builds into
  the skill that users run; the benchmark must not ship there. No runtime dependencies, no build step.
- **Nothing in `src/` imports from here**, and the benchmark never changes the CLI or the skill. A flow
  fix a run suggests goes to its own track.
- **No live agent in `npm test`.** Scoring a saved run is deterministic and tested. Making a new run
  needs an agent, costs tokens and varies: it is started by hand.
- **File shape** as in the root `AGENTS.md`: header comment, imports, types, constants, functions with a
  helper before its users.

## Commands

```
node .bubble-tracks-benchmark/score.mjs --track <file> [--scenario <file>] [--recording <file>] [--judgements <file>] [--json]
node --test "test/benchmark/*.test.js"   # the benchmark's tests only
npm test                                # everything
```
