# Demo story

One run of the real CLI in a throwaway repo. Lines starting with `>` are captions: what the human
types to their agent, or what the agent says. They are not model output. Every `bubble …` line is a
real CLI call, and its output is shown as the CLI prints it. The demo page plays these scenes in
order, and `test/web.test.js` replays them on the real CLI.

## 1. A first plan

> human: Let's make a todo app.

> agent: A first plan, before I write anything down: set up the project, then build what the app does.

> human: Also include a list for the items.

> agent: Added to the plan: an item list. Say when to start.

## 2. The track, with a goal

> human: Let's start.

```
bubble create todo "Todo app"
bubble goal "A todo app that keeps a list of items"
bubble add "Project setup"
bubble add "Item list"
```

> agent: The track is up, and every bubble on it serves that goal. Is there anything I should stay away from?

## 3. Guards

> human: I just want a minimalistic MVP: a basic design, nothing fancy.

```
bubble guard "No fancy design: a basic, minimal look"
bubble guard "MVP only: nothing the goal does not need"
```

> agent: Two guards, so I keep it small.

## 4. Fog

```
bubble insert at 2 ? "Nobody has said which functions the app has"
bubble add ? "What counts as finished for the MVP is unsaid"
```

> agent: Two things I cannot see yet. I don't guess them: they are fog. When I reach one, I stop and you plan it. The plan is ready: say go.

> human: Go.

## 5. The agent stops at fog

> agent: Starting the first bubble: Project setup.

```
bubble done
```

> agent: Project setup is done, and I stop here. The next bubble is fog: nobody has said which functions the app has, and only you plan fog. What should it do?

> human: Add items, delete them, and show the list.

```
bubble fill 2 "Add items"
bubble insert at 3 "Delete items"
```

> agent: The fog is gone. Adding and deleting are bubbles now, and showing the list was already planned. Say go.

> human: Go.

## 6. The human steers

> agent: Starting the next bubble: Add items.

```
bubble done
```

> agent: Add items is done. I stop after every bubble, so you can change the plan before the next one.

> human: Show the list before deleting.

```
bubble move 4 to 3
```

> agent: Moved. Item list is next, and the last bubble is still fog.

> human: The list is more than one step: show the items, and say something when it is empty.

> agent: That builds on Item list. Fork it into its own track? The bubble waits here until the fork is finished.

> human: Fork it.

## 7. A fork goes deeper

```
bubble fork 3 item-list
bubble add "Show items"
bubble add "Empty list"
```

> agent: Item list has its own track now, with two steps. Its bubble on the main track waits for it. Say go.

> human: Go.

## 8. The fork finishes

```
bubble done
```

> agent: Show items is done. One more on this fork.

> human: Go.

```
bubble done
bubble switch todo
```

> agent: The fork is finished, so it closed itself and popped Item list on the main track. Delete items is next.

> human: Could it also sync to the cloud?

> agent: That goes against guard 2, MVP only, so not on this track. Diverge it into a side track? The idea is kept, and nothing here waits for it.

> human: Yes, diverge.

## 9. A side track goes elsewhere

```
bubble diverge 4 cloud-sync "Cloud sync"
bubble add ? "Nobody has picked where the items would be stored"
bubble switch todo
```

> agent: Cloud sync is its own track now, in fog until you plan it. Todo app is untouched: Delete items is next, and the last bubble is still fog. Say go.
