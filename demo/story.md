# Demo story

One run of the real CLI in a throwaway repo. Lines starting with `>` are captions: what the human
types to their agent, or what the agent says. They are not model output. Every `bubble …` line is a
real CLI call, and its output is shown as the CLI prints it. The demo page plays these scenes in
order, and `test/web.test.js` replays them on the real CLI.

## 1. Plan what you can see

> human: plan a todo CLI: add items, list them, keep them between runs

```
bubble switch todo "Todo app"
bubble add "Add command"
bubble add ? "Where the items live between runs is undecided"
bubble add "List command"
```

The unclear step is not guessed. It goes on the track as fog, with the reason it is unclear.

## 2. The agent walks

> agent: implements "Add command"

```
bubble done
```

> agent: ⏸ stop, waiting for the human

## 3. Fog stops the agent

> human: go

```
bubble show
```

> agent: bubble 2 is fog, so I stop. What is it? `2: <what it is>`

## 4. The human plans it

> human: 2: persist to JSON

```
bubble fill 2 "Persist to JSON"
```

> agent: implements "Persist to JSON"

```
bubble done
```

## 5. A side idea gets its own track

> human: what about a web UI someday?

```
bubble diverge web-ui "Web UI"
bubble add ? "Nobody has said what the page shows"
bubble switch todo
```

The todo track stays about the todo CLI. The idea waits on its own track, as fog.

## 6. Finish

> agent: implements "List command"

```
bubble done
bubble tracks
```

The last `done` closes `todo`. `web-ui` is still open, for another day.
