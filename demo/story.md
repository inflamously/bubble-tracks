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

## 3. Guards and fog

> human: I just want a minimalistic MVP: a basic design, nothing fancy.

```
bubble guard "No fancy design: a basic, minimal look"
bubble guard "MVP only: nothing the goal does not need"
bubble insert at 2 ? "Nobody has said which functions the app has"
bubble add ? "What counts as finished for the MVP is unsaid"
```

> agent: Two guards, so I keep it small. And two things I cannot see yet. I don't guess them: they are fog.

## 4. The agent walks into fog

> human: Go.

> agent: Starting the first bubble: Project setup.

```
bubble done
```

> agent: Project setup is done, and I stop here. The next bubble is fog: nobody has said which functions the app has, and only you plan fog. What should it do?

## 5. The human plans the fog

> human: Add items, delete them, and show the list.

```
bubble fill 2 "Add items"
bubble insert at 3 "Delete items"
```

> agent: The fog is gone. Adding and deleting are bubbles now, and showing the list was already planned.

## 6. The human steers

> human: Go.

> agent: Starting the next bubble: Add items.

```
bubble done
```

> agent: Add items is done. I stop after every bubble, so you can change the plan before the next one.

> human: Show the list before deleting.

```
bubble move 4 to 3
```

> agent: Moved. Item list is next, and the last bubble is still fog. Say go.
