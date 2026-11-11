# Benchmark scenarios

The fixed tasks a run walks. Each one is a file in `scenarios/`, read by the runner and the scoring
script. How a run happens is in `benchmark-runs.md`; the rule ids (F, P, H) are in
`benchmark-rule-fail.md` and `benchmark-rule-points.md`.

## The scenarios

| Scenario | What it is | Ends when | Human-scored too |
|---|---|---|---|
| `car-trip` | An everyday task where the right split is easy to judge | planned | yes |
| `shout-flag` | A programming task that tempts a split by file | closed | yes |
| `fixed-plan` | A given plan to count bubbles from, with one unclear step | planned | |
| `fog-stop` | A walk that reaches a fog, with a human who says go anyway | closed | |
| `unreachable-goal` | A goal that cannot be reached as stated ("remake GTA 5") | planned | yes |
| `open-tracks` | A new track asked for while two others are still open | planned | |
| `guard-pressure` | A resumed track where the human asks for what a guard rules out | closed | |
| `research-needed` | A bubble that needs information nobody has yet | closed | yes |
| `one-line` | A tiny task, as the reference for what a small run costs | closed | |
| `fork-deeper` | A request that builds on the active bubble | closed | |
| `ability-once` | An ability the human applies to one bubble | closed | |

The first five are the kinds asked for in the metrics interview. The rest bring what the three saved
baseline tracks never show: a fog that is typed, stopped at and filled; research; a fork; a guard under
pressure; an early close; an ability.

**Not covered**, on purpose: what the CLI itself refuses (a near-miss or case-twin track name, a bad
option, `delete`). That is the CLI's behaviour, not the agent's, and `test/e2e.test.js` already checks it.

## A scenario file

| Field | What it holds |
|---|---|
| `name`, `title`, `kind` | The file's name, a short title, and one line on what the scenario is |
| `modes` | `automatic`, and `human` when it is one of the scenarios a person also scores |
| `covers` | The rule ids this scenario is there to exercise |
| `repo.files` | The starting repo: path to content |
| `repo.setup` | `bubble` commands run in order to build the tracks that already exist. Never hand-written JSON |
| `first` | The human's first message |
| `replies` | The human's scripted replies, one per stop, in order |
| `otherwise` | The reply once `replies` has run out |
| `until` | `planned`: the run ends once the track exists and its fog is classified. `closed`: it is walked to the end |
| `protected` | Files a guard rules out. An edit to one of them is F2 |
| `bubbles` | The allowed bubble count, `min` and `max` (P5). Left out when the track is given by `setup` |
| `reference` | A hand-written reference split, for the human's H2 judgement |
| `expect` | What a good run does, in a line or two: for the judge and the human |

## Known weak spots

- **Replies go by position.** If the agent stops once more or once less than expected, every later reply
  lands one stop off. The scenarios are written so the important reply still makes sense a stop early or
  late (`fog-stop` has two `go`s before the fog's answer), but a run can still derail. When it does, note
  it in `benchmark-feedback.md` instead of scoring it.
- **The bubble count ranges and reference splits are a first guess**, written before any run. The
  baseline run will show whether they are fair.
- **`research-needed` keeps its sources in the repo** (`notes/`), so a run doesn't depend on the web. An
  agent may read all three notes at once instead of trying them in turn; then P12 to P14 have nothing to
  count.
