---
name: bubble
description: bubble-tracks — iterative, fog-of-war planning on a linear track of task bubbles (S ○──○──❓──○ F) stored in .bubble-tracks/ (one .json per track, switchable). Use when the user runs /bubble or $bubble (e.g. /bubble switch <track> to resume), applies an ability with bubble:<name> or /bubble:<name>, asks to plan/sketch a task, asks "what's next" or "where are we", marks something done, or when an edit is blocked because the active bubble is fog/unplanned.
---

# bubble-tracks

A plan is a linear track from **S**tart to **F**inish. Each bubble is a task:
`●` done · `◐` active · `○` todo · `❓` fog (unplanned — the human plans it).
Plan only as far as you can see. The rest stays fog until it's reached.
`◆` `◈` `◇` are done, active and todo on a bubble the human does themselves (see **Ownership**).

The track line reads `S ●──●──◐──○ F   prev ‹ ◐ active › next`, with each label cut to 20 characters.
So **titles are short names (2–4 words)**, like `Remove nesting` or `Fog-only fill`: the CLI warns on any other length. Put details, scope and file lists in a `hint`.

## The CLI

Every change goes through the CLI. **Don't hand-edit anything in `.bubble-tracks/`.** The CLI lives next to this file:

```
node "<dir containing this SKILL.md>/scripts/cli/bubble.js" <command> [args]
```

If `node` is missing, the shell says so: exit 127 with `command not found`; in cmd.exe, exit 9009 with `is not recognized as an internal or external command`; in PowerShell, `The term 'node' is not recognized`. Then read `fallback.md` next to this file and work the track by hand.

Run it from the repo root, or pass `--dir <repo>`. The CLI speaks the **bubble language**, the same words the human uses:

| Command | Effect |
|---|---|
| `show` | Render the track and list its bubbles with addresses. Exits **3** if the active bubble is fog. |
| `switch [name] [title]` | Resume track `<name>`, or create it if it doesn't exist. It becomes current. No name: resume the current track (else the default `track`). A new name that starts an open track's name or is a typo or two from it (`flow` → `flow-analysis`) is refused, naming the match; `create` makes it. Names ignore case: `switch Flow-Analysis` resumes `flow-analysis`, and `create` refuses a case-only twin. |
| `create <name> [title]` | Create a new track (refuses if it exists) and make it current |
| `create <name> [title] --draft` | Create it as a **draft**: the proposal, stored. Every plan command works on it. Nothing on it is active: the gate blocks project edits, and `done`, `fork`, `diverge` and `close` refuse. `show` prints it with its guards. Its goal can be reworded without `--force`. |
| `approve` | The human's go: turn the current draft into a normal track. Refuses a draft with no bubbles. |
| `switch <name> --ownership <MODE>` | Set who does the bubbles' work on that track; `create` and `init` take it too. A hybrid track stays hybrid. After the first `done`, `agent` and `user` only move into `hybrid`. See **Ownership**. |
| `tracks` · `tracks --closed` · `tracks --all` | List the tracks, current marked `→`. Closed tracks are hidden (except the current one) and counted in a footer; `--closed` lists only closed tracks, `--all` lists everything. |
| `close <name> --force` | Finish a track early, for good, after the human confirms: read-only, no reopen. Also closes all its forks (side tracks stay open) and pops its parent bubble. Without `--force` it refuses and lists every track it would close. |
| `delete <name> --force` | Delete a track that isn't current, after the human confirms. An abandoned draft goes even while it is current; no track is current after that. |
| `init <title>` | Create the default track (`.bubble-tracks/track.json`) |
| `fork [N] <name>` | **Build on** bubble N in a new child track `<name>`, titled after the bubble, and make it current. The bubble keeps its state and gets `fork` (relative path to the child); the child gets `parent` (relative path, the bubble's stable `id`, and its title for display). The bubble waits for its fork. |
| `diverge [N] <name> [title]` | Go **a different direction** from bubble N in a new side track `<name>` (titled after the bubble unless you give a title), and make it current. The bubble (any state) adds the path to its `sides`; the side track gets `origin`. Nothing waits for it. |
| `add <title>` · `add ? <why>` | Append a todo (or fog) bubble. A fog says in one line why it's unclear: the CLI warns when it doesn't. |
| `insert at N <title>` · `insert at N ? <why>` | Insert a todo (or fog) bubble at position N |
| `remove N` · `remove N:M` | Delete a bubble or a range. Refuses a bubble whose fork or side track is still open: close or delete that track first. |
| `move N to M` · `move N:M to M` | Move a bubble or block so it starts at position M |
| `move N --to <track>` · `move N:M --to <track>` | Move a bubble or block to the end of another existing track (state, type and hint kept; new ids). Refuses bubbles with a fork or side track. |
| `rename N <title>` | Retitle a planned bubble (not fog) |
| `title <text>` | Rename the track itself (keep it short too) |
| `goal <text>` | Set the track's goal, **once**: the one end result every bubble serves. `show` prints it. It can't be cleared or replaced: a new goal is a new track (`diverge`). `--force` rewords it, only after the human confirms. |
| `guard <text>` · `guard N <text>` | Add a guard (a rule of what **not** to do), or rewrite guard N in place. A new guard can't start with a number. |
| `guard drop N` · `guard drop --all` | Drop guard N, or all of them. `--all` refuses and lists them; re-run with `--force` only after the human confirms. |
| `guard show` | List the guards. `switch` (resume) and every guard change print them too; `show` doesn't. |
| `handoff <note>` · `handoff -` | Save (or clear) the note a fresh chat reads to resume this track |
| `hint N <text>` · `hint N -` | Attach (or clear) the human's note for that bubble. Warns when a todo bubble's hint doesn't end with `[Boundary: …]`. |
| `fog [N \| N:M] [TYPE]` | Turn bubbles into fog. Done bubbles need `--force`, after the human confirms. Refuses a bubble whose fork is still open. Warns when a fog has no `why` yet. |
| `why [N] <text>` · `why [N] -` | Say (or clear) why a fog bubble is unclear: not what it is |
| `type [N] <TYPE>` | Record the human's fog classification. Fog only: the CLI refuses any other bubble. |
| `answer [N] <text>` · `answer [N] -` | Keep (or clear) the human's own words on a fog that stays fog |
| `fill [N] <title>` | The human's content for a fog bubble: fog → todo |
| `done` | Pop the active bubble, then ⏸ stop. The last `done` closes the track, with no ask (see **Closed tracks**). |
| `research [N] [focus]` | Print the research workflow and bubble N's whole context, to run once. See **Research**. Changes nothing itself. |
| `own [N \| N:M]` · `own [N \| N:M] -` | The human takes bubbles to do themselves, or hands them back to you. Not for done bubbles. `own` on an `agent` track and `own -` on a `user` track switch the track to `hybrid` for good: the CLI refuses them without `--force`, after the human confirms. See **Ownership**. |
| `finding N <text>` · `finding N M -` · `finding N -` | Note what research found for bubble N (a guide or tip, with its source), drop finding M, or drop them all |
| `abilities` | List the abilities: name, type, project or user, description (or why one is broken) |
| `bubble:<name> [text]` | Print ability `<name>`'s workflow, the human's extra text, and its context (the active bubble or the whole track), to run once. See **Abilities**. |

Every bubble command acts on the **current track**. Each track is its own idea or implementation, with its own fog gate.

`--to <track>` on `add`, `insert` and `hint` writes into another existing track instead, and the current track stays current. Use it to record future work for another track while you walk this one, rather than `switch`, `add`, `switch` back.

A word that starts with `-` is read as an option, so a title or hint with one, like `-v`, goes after `--`: `hint 2 -- use -v for verbose`. A lone `-` (as in `hint N -`) is fine. Options go before or after the text, each once: the CLI refuses an option in the middle of the text (`add Move --to x spacing`) or one given twice with different values, so nothing gets dropped silently.

N: position on the track; omitted = the active bubble. `N:M` = N through M, inclusive.
TYPE: `known-known` · `known-unknown` · `unknown-known` · `unknown-unknown` (or `kk` · `ku` · `uk` · `uu`).
MODE: `agent` · `hybrid` · `user`.

### The human's commands

When the human writes a line in the bubble language, like `bubble move 2 to 3`, `/bubble remove 5` or `bubble fog 4:8`, run it **exactly**: pass the words after `bubble` to the CLI unchanged, then show the result. Don't reinterpret, batch or "improve" it. If the CLI rejects it, show the error and the usage line, and don't guess a fix. Plain-language requests ("drop the last one") are fine too; translate them into these commands and show what you ran.

## How to work

0. **Resume or start.** `/bubble switch <name>` is often the first line of a fresh chat. Run `tracks` first, on its own, and read it before you run `switch`: a `switch` on a name that doesn't exist creates that track, unless it's close to an open one, which it refuses and names.
   - **It's a draft** (`switch` prints `resumed draft`): the human hasn't approved the plan yet. Go on at **Refine until go** in step 1.
   - **It exists:** run `switch <name>` right away, without asking why. You have no memory of this track, so the track is your context. Read every bubble, its `↳` hint, the `✎ handoff` note, the goal and the guards it prints, then say in one line where you are (prev ‹ active › next) and continue at the active bubble with the usual rules. It's a ⏸ stop if the human hasn't said go.
   - **It's new** (or the human says "I want X" with no track): go to step 1. Don't create the track yet.

   If the name is short for an existing track or close to one (`flow` → `flow-analysis`), resume that track and say so in one line. If you see a better name for a new one, use it and say so instead of asking. For example, `switch single commit` becomes `switch single-commit "Single commit"`.
1. **Plan, in chat, then on a draft.** Keep it short, not a plan-mode wall of text. The plan needs three things:
   - **Goal:** the one end result every bubble serves.
   - **Guards:** what not to do or touch (files, domains, approaches).
   - **Use cases:** the separate jobs the goal breaks into.

   Ask for the goal. The human often answers only that, so don't ask again for the rest: draft the guards and use cases yourself from the goal and the codebase, and they confirm or edit them in the proposal. Use whatever they did give as they gave it.

   **Write the plan in plain sentences**, so the human can check it in one read. This covers the proposal and everything in it (goal, guards, hints, fog reasons):
   - One sentence says one thing: one instruction or one fact, in about 20 words at most.
   - Use the active voice and name who acts: "the reviewer signs the draft", not "the draft gets signed".
   - One word for one thing. If you call it a "track" once, don't call it a "list" later.
   - Use the simple word, and the exact name of a thing (the file, command, section or person) instead of a description of it.
   - Plain is not shallow. If a part is complex, keep the complexity and explain it in more short sentences. Never leave something out to make the plan look simple.

   Then make one compact proposal, always in this order, so the human finds each part in the same place every time:
   - **TL;DR:** one or two sentences that say what changes and what the human has at the end. It comes first, so they can stop reading there if the direction is wrong.
   - **Track:** its name and title.
   - **Goal:** one sentence.
   - **Guards:** numbered, one rule each.
   - **Ownership:** the mode, in one line (see **Ownership**). Propose `agent` unless the human said they want to do work themselves. Say that the mode is hard to change later, so they check it now.
   - **Bubbles:** numbered in track order, each with a short title, one line on what it does, and its boundary in square brackets on a line of its own; fog with its reason. On a `hybrid` track, mark the human's bubbles with `(yours)` after the title.

     ```
     2. Welcome mail: rewrite the text new members get.
        [Boundary: the welcome mail template]
     3. ❓ why: undecided who signs the mail
     ```

   **A diagram, only when it helps.** Add one when the plan has a flow, an order or a structure that sentences make harder to follow: three or more steps or parts that depend on each other, a branch, or a before and after. Use at most one per plan, right after the TL;DR. A plain list of independent bubbles gets none, because the track line already shows it. Draw it in ASCII when the human reads the plan in a terminal, and in Mermaid when the plan is a markdown file they can open. In ASCII, put every step in a box of its own and join the boxes with arrows, even though that takes more lines: it is easier to read.

   If an existing track already covers it, propose that instead: "this fits track X, add it there?".

   **Store the proposal as a draft.** Right after you show the first proposal, create it in one burst: `create <name> <title> --draft` (with `--ownership <mode>` unless it is `agent`), `goal`, one `guard` per rule, the `add`s and their `hint`s, and `own N` for each bubble the human took. A draft is not a track yet: the gate blocks project edits on it, and `done` refuses.

   **Refine until go.** If the human changes something (add a guard, move a bubble, reword the goal) or asks a question, that is not approval:
   - Make each change with one CLI command on the draft.
   - Then show only the lines that changed, plus the track line. Don't print the whole proposal again.
   - When the human asks for the whole plan, run `show` and paste its output.
   - Wait. Repeat this as often as they want.

   **Go runs `approve`.** Run it only when the human says go to the draft as it stands ("ok", "go", "create it"). If one reply approves and changes it ("ok, but add a guard …"), apply the change, run `approve` and say what you changed. If the human drops the plan, confirm, then run `delete <name> --force`.

   After `approve`, classify the fog (step 2).

   **Seams: one bubble per use case**, not one per file and not one bubble for the whole goal. Its boundary names the places it may touch, so the work stays scoped and easy to review. A place is whatever the work is made of: files, a domain, a section of a document, a system, a step in a process. Always write it in square brackets, `[Boundary: …]`, with the places separated by commas, so it stands out from the sentences around it. In the proposal it stands on its own line under the bubble, so the human can check all boundaries at a glance. On the track it is the end of the bubble's hint: `hint` warns when it is missing. If a bubble needs work past its boundary, stop and propose an `insert` instead of doing it.
2. **Sketch.** For later passes on an existing track (or after `init`), make one rough pass from the active bubble to F. Steps that are clear become todo bubbles with short titles; add a `hint` when a step needs more words. Anything unclear becomes `add ? <why>`: fog, plus one line on **why** it's unclear (what's missing or undecided), never what it is. Keep it short and don't over-plan.
   - **Then always classify every fog bubble in one go.** Do this after every sketch, without skipping it. List every fog bubble by number and ask the human to answer each line with either:
     - `N: <what they think it is>`: their content. Run `fill N` with a short title, and put the detail in a `hint`.
       If their words don't settle it yet (a direction, not a task), it stays fog: keep them **as they said them** with `answer N <their words>`, and type it if they gave a level.
     - `N:kk` · `N:ku` · `N:uk` · `N:uu`: the knowledge level. Run `type N`.
     - `N:?`: they don't know enough to say yet. Run `research N` on it (see **Research**), show the findings, then ask them to classify or fill it again. It stays fog until they do.

     For example: `1:uk  2: tighten the fog gate  3:?`. The levels shape everything after this, because they decide how you work each bubble in step 4.
3. **Walk.** Run `show`. If the active bubble is known, implement it, then run `done`. Read the bubble's `↳` hint first: it's the human's steer for that bubble, and its `[Boundary: …]` is how far the bubble reaches.
   - **Guards come before acting**, not as a check at `done`. Before you implement a bubble or take any other action, read them (`guard show`, or the list `switch` printed) and keep to them.
   - **A bubble the human does is not yours to implement.** If `show` ends with `◈ "…" is the human's to do`, hint at the steps, wait, check their work, then run `done` (see **Ownership**).
   - **A guard stands even against a direct ask from the human.** If they ask for something a guard rules out, don't do it on this track: say which guard it hits and route the work where it belongs (`add <title> --to <track>`, or offer `fork` / `diverge`).
4. **Hit fog → STOP.** When the active bubble is fog (`show` exits 3, or an edit is blocked):
   - **Never plan fog yourself.** Don't invent its content and don't run `fill` on your own.
   - Ask the human to classify it, using the same `N: text` / `N:kk|ku|uk|uu` / `N:?` reply format (and if more fog lies ahead, ask about all of it at once):
     - **known-known**: they write the bubble.
     - **known-unknown**: you research (see **Research**) or spike options, they pick.
     - **unknown-known**: you surface what the codebase and docs already say, they confirm.
     - **unknown-unknown**: you interview them, one question at a time.
   - Record the answer with `type`. The type can change as you go.
   - The listing shows the fog's `why:` and, if the human said something, `human:`. Their words are where the work starts: propose turning them into a `fill`, a `hint`, a `guard`, new bubbles or a `fork`, and let them confirm. Don't drop or reword them.
   - Only after the human gives or approves the content, run `fill` (single task). If it's really several tasks, `fill` it with the first and `insert at` the rest right after it on the same line.
5. **⏸ Stop after every bubble.** After `done`, the CLI prints a ⏸ line. After the last one it prints `all done — closed track …` instead: the track is finished, so don't ask whether to close it. Show the track, summarize what you did, and **wait for the human** before starting the next bubble. This is their chance to move, insert, remove, rename, hint or fog bubbles. Start the next bubble only when they say go (or give an edit, then go).
6. **Hand off when the chat gets heavy.** At a ⏸ stop, offer a fresh chat if:
   - this chat was compacted or summarized,
   - about 3 or more bubbles were finished in this chat, or
   - the human says the context is too long.

   First save what only this chat knows: `handoff <note>` (what's half done, the decisions made and why, gotchas, and the next concrete step), plus `hint`s on the bubbles ahead. Keep the note to a few lines. Then tell the human: *"Context is getting heavy. Run `/clear`, then `/bubble switch <name>`."* The CLI prints that exact line, track name included. Don't push it: if they want to keep going, keep going.
7. **Show progress.** After every change, show the user the rendered line the CLI prints. Most agents have no status line, so this is how they see the track.
   When the human asks for a list or overview (`list`, "list tracks", "where are we"), run `tracks` (or `show` for one track; `tracks --all` when they ask about closed tracks too) and paste its output **unchanged in a code block**: every line, aligned as printed, nothing summarized or reworded. Then add at most a few short bullets on what stands out (current track, broken or finished tracks).

## Fork or diverge: keep each track to one domain

A track stays clean when every bubble on it serves one goal. If the human asks for something that doesn't serve the active bubble, such as a new feature, another domain, a side idea or a cleanup somewhere else, it's a **side task**. Don't just do it, and don't `add` it to this track on your own, because that poisons its workflow. **Always ask where it goes.** The human picks one of four:

- **`fork`**: the request **builds on** the active bubble (it goes deeper into the same idea). The bubble waits until its fork is finished.
- **`diverge`**: the request goes **a different direction**. The side track remembers where it came from, but nothing waits for it.
- **keep here**: it becomes a bubble on this track (`add` or `insert`).
- **now**: do it right away, with no bubble and no new track. This is for a task too small to be worth a track.

**Ask, never decide.** Name the request as a side task, suggest the answer you think fits with a one-line reason, and let the human pick. For example: *"That's a side task: it goes a different direction from 'Login'. Diverge into `auth-sso`? (fork / diverge / keep here / now)"*. Act only after they answer. A reply that doesn't pick, like "do it", is not `now`: ask once more.

**A `now` task stays off the track, but the rules still hold:**

- The guards and the fog gate apply to it like to any other work, and it never fills fog.
- Keep it out of the bubble's commit: it gets its own.
- If it changes something a later bubble relies on, leave a `hint` on that bubble, so a fresh chat knows.

After `fork` or `diverge`, the new track is current and starts **fresh**: ask the human what to do around the new goal, plan it (step 1: goal, guards, use cases; the track already exists), and classify all fog. Small, related follow-ups (a missing step of the same goal) still go on the current track with `insert`.

Work that belongs to a track that **already exists** doesn't need a split: record it there with `add <title> --to <track>` (plus `hint N <text> --to <track>`) and keep walking. To regroup bubbles that ended up on the wrong track, `move N:M --to <track>`.

Links use the bubble's stable `id` (from the track's `nextId` counter), so `move`, `insert` and `remove` never break them.

A fork stays in sync with its bubble. `title` on the fork renames the bubble, and `rename` on the bubble retitles the fork. The bubble can't be popped until its fork is finished (it has at least one bubble and all are done). When the fork's last bubble is popped, the fork closes and the parent bubble pops too, and so on up the chain. A side track from `diverge` never syncs.

A **closed** track is read-only: every bubble command on it refuses, and its line shows 🔒 closed. A track closes itself on its last `done` (an empty track never counts as done), with no ask; `close` ends one early. There's no reopen: a follow-up is a `diverge` or a new track. A closed fork counts as finished, so closing it pops its parent bubble; closing a track closes all its forks too. A closed parent is skipped: its child runs on, but pops and title syncs never reach it.

## Ownership: who does a bubble's work

Every track has an ownership mode. It says who does the work of its bubbles. The work is whatever the bubble is made of: code, a spreadsheet, a text, a data pull.

| Mode | Who does the work | On the line |
|---|---|---|
| `agent` (default) | you, on every bubble | `●` `◐` `○` |
| `hybrid` | the human, on the bubbles they picked; you, on the rest | theirs are `◆` `◈` `◇` |
| `user` | the human, on every bubble | every bubble is `◆` `◈` `◇` |

Ownership changes only who does the work. In every mode you draft the plan, the human fills the fog, the guards hold, and you run the track commands.

**Only the human sets it.** Never change the mode or an owner on your own.

- The mode: `switch <name> --ownership <mode>`. `show` prints it under the goal, unless it is `agent`.
- Single bubbles: `own N` or `own N:M` takes them for the human, and `own N -` hands them back to you. The listing marks the human's bubbles with `owner: human`.
- The human can take later bubbles while you work on another one. "I'll do 4 and 5 myself" means `own 4:5`: run it, show the line, and carry on with your bubble. On an `agent` track this is the permanent step below, so confirm it first.

**What can still change later.** Say this when the human asks for a change, before you run it:

- `agent` and `user` swap freely until the first `done`. After it they only move into `hybrid`.
- A `hybrid` track stays `hybrid` for good. On it, the human takes and hands back single bubbles at any time.
- `own N` on an `agent` track and `own N -` on a `user` track switch the track to `hybrid`, for good. The CLI refuses both without `--force`: say that the step is permanent, and add `--force` only after the human confirms.
- Nothing forces another change. A different mode is a new track (`diverge`).

**At a bubble the human does** (`show` ends with `◈ "…" is the human's to do`):

1. **Don't do its work.** Make no edits and run no commands that do the bubble for them. The gate blocks your edits anyway.
2. **Hint at the steps.** Say in a few lines what the steps could be and where to look. Take them from the bubble's hint, its boundary, its findings, the guards and what you see in the project. Give steps and pointers, not the finished result, unless the human asks to see it.
3. **Wait, and answer.** The human works at their own pace. Answer their questions while they do.
4. **Check the work once they say it's done.** Check it against the bubble's title, its hint, its `[Boundary: …]` and the guards. Report what you found in a few lines. If something is wrong, the human fixes it. Don't fix it yourself.
5. **Then run `done`.** Run it when the check passes, or when the human says the work stands as it is. Then ⏸ stop as after every bubble.

The other rules still hold at such a bubble:

- A fog bubble is planned first, as any fog. Who does the work matters only after `fill`.
- The guards and the boundary bind the human's work too. If their work breaks one, say so in the check, and they decide.
- A `now` task waits as well: the gate blocks your edits until the bubble is popped or handed back.

## Research

Research fills the human's knowledge gaps: a topic they don't know, or the information a bubble needs before it can be built or planned. It works on any bubble, any time, fog included.

- **The human starts it**: "let's research", "research 4", or `N:?` when classifying fog. You may *offer* it when a bubble clearly needs information nobody has yet, but run it only after they say yes.
- **Run `research [N] [focus]`** (N omitted = the active bubble; any words after it are the human's focus) and follow the printed workflow once against the printed context.
- **Extend the human's intent, never overrule it.** Research adds to what they asked for. It doesn't rename the bubble, rewrite its hint or fill its fog. A finding that goes against what they asked is a question for them, not a change.
- **Stay on the target bubble.** Bring back at least 2–3 guides or tips, each with what it means for this bubble and its source. If you can start subagents, give each one focused question plus the printed context instead of the whole chat, so the research stays focused and this chat stays light.
- **Note each one on the bubble** with `finding N <tip — source>`. The listing shows them as `found 1:`, `found 2:`…, so whoever builds the bubble later reads them as context.
- **Then propose, don't apply**: a missing step of this bubble → `insert at N+1 <title>`; another direction → `fork` or `diverge`; on fog, the findings help the human classify and `fill` it. Then ⏸ stop and wait for the human.

## Abilities

An ability is a short workflow, kept as a file, that the human applies to the active bubble or the whole track. Abilities live in `.bubble-tracks/abilities/<name>.md` (project) and `~/.bubble-tracks/abilities/<name>.md` (user). When both have the same name, the project one wins. Each file has a `---` frontmatter block with `name`, `description` and `type: bubble | track`, followed by the workflow.

- **Only the human applies one.** When they write `bubble:<name>` or `/bubble:<name>` (any words after it are their extra steer), run `bubble:<name> [text]` through the CLI. Never pick or apply an ability yourself. To see which ones exist, run `abilities`.
- **Run it once.** Follow the printed workflow against the printed context: the active bubble for `type: bubble`, or the whole track for `type: track`. Then report back and ⏸ stop. Nothing stays attached: the ability runs again only when the human invokes it again.
- **The track rules still hold.** The workflow can lead to track changes, such as a `research` ability that suggests new bubbles, or a `step` ability whose checks the bubble must pass before `done`. Make those changes only through the CLI. Never fill fog yourself, and the fog gate still applies to project edits.
- If the CLI refuses (no such ability, a broken file, or no active bubble for `type: bubble`), show the error and stop.

## Fog gate

Before editing project files, check `show`. If it exits 3, don't edit; go to step 4. Some agents (Claude Code, Codex CLI, Gemini CLI) also enforce this with a hook that blocks edits while the active bubble is fog. The hook also refuses hand edits to the track files (`.bubble-tracks/<name>.json` and `.bubble-tracks/current`) at any bubble: change a track through the CLI. `.bubble-tracks/abilities/` stays open.

The same hook is the **draft gate**: it blocks your edits while the current track is a draft. `show` exits 0 there and ends with the `◌ draft` line. If you see that line, don't edit; go to **Refine until go** in step 1.

The same hook is also the **ownership gate**: it blocks your edits while the active bubble is the human's to do. `show` exits 0 there and ends with the `◈ "…" is the human's to do` line. If you see that line, don't edit; go to **Ownership**.
