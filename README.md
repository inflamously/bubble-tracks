<h1>
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/logo-dark.svg">
    <img src="assets/logo.svg" alt="bubble-tracks" height="56">
  </picture>
</h1>

Planning for coding agents, with fog of war.

bubble-tracks keeps a coding agent on a plan you can see: one track of task bubbles from start to
finish. The agent builds the bubbles that are planned and stops at the ones that are not. Those are
fog, and only you plan fog.

```
Fix generation   S ●──●──❓──○ F   Read logs ‹ ❓ needs you › Write failing test
```

`●` done · `◐` active · `○` todo · `❓` fog · `prev ‹ active › next` shows where you are

**[Live demo](https://inflamously.github.io/bubble-tracks/demo/)**: the real CLI playing a full session in your browser ([data policy](https://inflamously.github.io/bubble-tracks/data-policy.html)).

## Overview

- **Plan only as far as you can see.** A step nobody can describe yet stays fog until the agent reaches it.
- **The agent never plans fog.** At a fog bubble it stops and asks. You say what the bubble is, or how the agent should find out.
- **You steer between bubbles.** The agent pauses after every bubble, so you can move, insert, remove or fog bubbles before it goes on.
- **A goal and guards frame the track.** The goal is the one result every bubble serves. Guards say what not to do or touch, and the agent reads them before it acts.
- **You choose who does the work.** The agent does every bubble by default. You can take single bubbles, or all of them, and the agent then hints and checks instead.
- **One idea per track.** Work that goes deeper becomes a fork, and work that goes elsewhere becomes a side track.

It is a skill plus a small CLI. They run on plain Node.js with no dependencies, and the tracks are JSON files in `.bubble-tracks/`.

## Example

You ask for a todo app. The agent proposes a track, and two steps are unclear, so they become fog:

```
Todo app   S ◐──❓──○──❓ F   ◐ Project setup › ???
```

You say go. The agent builds the first bubble, pops it, and stops, because the next one is fog:

```
Todo app   S ●──❓──○──❓ F   Project setup ‹ ❓ needs you › Item list
```

You answer "add items and delete them". The fog becomes two bubbles, and the agent waits for your go:

```
Todo app   S ●──◐──○──○──❓ F   Project setup ‹ ◐ Add items › Delete items
```

The [live demo](https://inflamously.github.io/bubble-tracks/demo/) plays this session to the end.

## Install

Requires Node.js 18 or newer. Nothing to `npm install`: the skill, the hooks and the installer use only Node built-ins.

| Agent | Command | Fog gate (blocks edits) | Status line |
|---|---|---|---|
| Claude Code | `/bubble` | `PreToolUse` hook | yes |
| Codex CLI | `$bubble` | `PreToolUse` hook on `apply_patch`, `Edit` and `Write` | no, use `bubble show` |
| Gemini CLI | `/bubble` | `BeforeTool` hook | no, use `bubble show` |
| Anything that reads `AGENTS.md` | instructions | soft: the model is told to stop | no, use `bubble show` |

### Claude Code

1. Install the plugin. Inside Claude Code, run:

   ```
   /plugin marketplace add inflamously/bubble-tracks
   /plugin install bubble-tracks@bubble-tracks
   ```

   From a local checkout, use `/plugin marketplace add /path/to/bubble-tracks`.

2. Add the status line. Plugins can't set it themselves, so add this to `~/.claude/settings.json`:

   ```json
   "statusLine": {
     "type": "command",
     "command": "node ~/.claude/plugins/data/bubble-tracks-bubble-tracks/statusline.js",
     "padding": 0
   }
   ```

   The plugin writes that file when a session starts, so the status line stays empty until the first session after the install has started. The file runs the status line of the installed plugin version, and the entry stays the same after a plugin update.

   From a local checkout, `node install.js claude --apply-statusline` writes an entry for you; it points at the checkout instead.

### Codex CLI, Gemini CLI and AGENTS.md

From a checkout of this repo:

```sh
node install.js codex gemini agents-md --project /path/to/your/repo   # one repo
node install.js codex gemini --user                                   # all repos (~/.agents, ~/.codex, ~/.gemini)
node install.js all --project . --dry-run                             # preview only
```

The installer copies the skill to `.agents/skills/bubble/`, merges the fog gate into `.codex/hooks.json` and `.gemini/settings.json`, writes `.gemini/commands/bubble.toml`, and inserts a marked block into `AGENTS.md`. Re-running it is safe, and every file it changes is backed up to `*.bak`. Codex and Gemini ask you to trust the new hook the first time.

> [!NOTE]
> Hook paths are absolute. If you commit `.codex/` or `.gemini/` to a shared repo, teammates need to re-run the installer.

## Usage

Start or resume a track in chat:

```
/bubble switch fix-generation
```

**A new track** starts with a short plan in chat. The agent asks for the goal, drafts the guards and the bubbles, and proposes them in one fixed shape: a TL;DR first, then the track, goal, guards, ownership and bubbles, each bubble with its `[Boundary: …]` (what it may touch), and a diagram when a flow needs one. Change anything and it shows the revised plan again. Only when you say go does it create the track. It then asks you about each fog bubble and walks the track one bubble at a time.

**An existing track** is picked up where it stopped. Hints on the bubbles and a handoff note carry the context between chats, so a fresh chat needs nothing else.

You steer with the same short commands in three ways:

| Where | Example |
|---|---|
| In chat | `bubble move 2 to 3` (the agent runs it word for word and shows the track) |
| As a command | `/bubble insert at 3 ?` (Claude Code, Gemini CLI) · `$bubble insert at 3 ?` (Codex) |
| Without an agent | `node skills/bubble/scripts/cli/bubble.js fog 4:8` |

### Fog

When the agent reaches a fog bubble, you either say what it is or classify it:

| Type | Who does what |
|---|---|
| `known-known` | You write the bubble. |
| `known-unknown` | The agent researches or spikes options, and you pick one. |
| `unknown-known` | The agent surfaces what the codebase and docs already say, and you confirm. |
| `unknown-unknown` | The agent interviews you, one question at a time. |

If you don't know enough to say, answer `N:?` and the agent researches the bubble first.

### Ownership

Every track has an ownership mode. It says who does the work of its bubbles, whether that work is code, a spreadsheet or a text:

| Mode | Who does the work |
|---|---|
| `agent` (default) | The agent does every bubble. |
| `hybrid` | You do the bubbles you pick, and the agent does the rest. |
| `user` | You do every bubble. |

Set the mode when the track is planned: `/bubble switch fix-generation --ownership hybrid`. On a hybrid track, `own 4` takes bubble 4 and `own 4 -` hands it back, at any time before it is done. Your bubbles are diamonds on the line:

```
Todo app   S ●──●──●──◈──❓ F   Item list ‹ ◈ Delete items › ???
```

At one of your bubbles the agent does not do the work. It hints at the steps, waits, checks your work once you say it is done, and then pops the bubble. Planning, fog and guards are the same in every mode.

The mode is meant to be chosen once:

- `agent` and `user` swap freely until the first bubble is done. After that they only move into `hybrid`.
- A hybrid track stays hybrid for good.
- `own` on an agent track and `own -` on a user track switch the track to hybrid.
- A different mode is a new track.

### Tracks

Each track is one idea, stored as one `.json` file in `.bubble-tracks/`. The file `current` names the active track, and every command, the status line and the fog gate act on it. Tracks change only through the CLI: the hook that gates fog also refuses hand edits to a track file.

- **`fork`** builds on a bubble in a child track. The bubble waits until the fork is finished.
- **`diverge`** goes a different direction from a bubble, in a side track. Nothing waits for it.
- **A finished track closes itself** on its last `done`, and `close` ends one early. A closed track is read-only for good. A follow-up is a `diverge` or a new track.

### Research

Say "let's research" or `research 4` when a bubble needs information nobody has yet. The agent looks things up for that one bubble and notes each guide or tip on it, with its source, as a `finding`. Then it proposes new bubbles or a fork, and you decide. Research only adds: it never renames a bubble, rewrites your hint or fills fog.

### Abilities

An ability is a reusable workflow that you apply to the active bubble or the whole track. Put a `<name>.md` file in `.bubble-tracks/abilities/` (project) or `~/.bubble-tracks/abilities/` (user). When both have the same name, the project one wins.

```markdown
---
name: ready
description: Check the active bubble is ready to build
type: bubble
---
Restate the bubble's task in one line, and list the files it will touch.
Flag anything its hint leaves open as a question for the human.
```

Write `bubble:ready` in chat, plus any extra words to steer it. The agent runs the workflow once against the active bubble (`type: bubble`) or the whole track (`type: track`), reports back and stops. `abilities` lists the ones it can find.

## Reference

<details>
<summary><b>CLI reference</b></summary>

```
node skills/bubble/scripts/cli/bubble.js <command> [--dir <repo>] [--ascii] [--force]
```

A leading `bubble` word is optional, and a whole phrase can be passed as one quoted argument. Exit codes: `0` ok, `1` error, `3` (`show` only) the active bubble is fog.

| Command | Effect |
|---|---|
| `show` | Render the track and list its bubbles (exit 3 = active bubble is fog). Ends with a notice when the active bubble is yours to do |
| `switch [name] [title]` | Resume a track, or create it (no name: the current one). Refuses a new name close to an open track (`flow` for `flow-analysis`); `create` makes it. Names ignore case (`Dev` resumes `dev`) |
| `create <name> [title]` | Create a new track (refuses if it exists) |
| `switch <name> --ownership <MODE>` | Set who does the bubbles' work: `agent` · `hybrid` · `user` (`create` and `init` take it too). A hybrid track stays hybrid; after the first `done`, `agent` and `user` only move into `hybrid` |
| `tracks` · `--closed` · `--all` | List tracks, current marked `→`; closed ones are hidden unless `--closed` (only closed) or `--all` |
| `close <name> --force` | Finish a track for good: read-only, closes its forks, pops its parent bubble |
| `delete <name> --force` | Delete a track (not the current one) |
| `fork [N] <name>` | Build on bubble N in a child track; the bubble waits for it |
| `diverge [N] <name> [title]` | Go a different direction from bubble N in a side track; nothing waits |
| `init <title>` | Create the default track (`.bubble-tracks/track.json`) |
| `add <title>` · `add ? <why>` | Append a todo (or fog) bubble; a fog says why it's unclear |
| `insert at N <title>` · `insert at N ? <why>` | Insert a todo (or fog) bubble at position N |
| `remove N` · `remove N:M` | Delete a bubble or a range (not while its fork or side track is open) |
| `move N to M` · `move N:M to M` | Move a bubble or block so it starts at position M |
| `move N --to <track>` · `move N:M --to <track>` | Move a bubble or block to the end of another track |
| `rename N <title>` | Retitle a planned bubble |
| `title <text>` | Rename the track itself |
| `goal <text>` | Set the one end result every bubble serves, once (a new goal is a new track; `--force` rewords it) |
| `guard <text>` · `guard N <text>` · `guard show` | Add a rule of what not to do, rewrite guard N, or list them |
| `guard drop N` · `guard drop --all` | Drop guard N, or all of them (`--all` needs `--force`) |
| `handoff <note>` · `handoff -` | Save (or clear) the note a fresh chat resumes from |
| `hint N <text>` · `hint N -` | Attach (or clear) a note for that bubble |
| `own [N \| N:M]` · `own [N \| N:M] -` | Take bubbles to do yourself, or hand them back to the agent (not done ones). `own` on an agent track and `own -` on a user track switch it to hybrid for good, so they need `--force` |
| `fog [N \| N:M] [TYPE]` | Turn bubbles into fog (done bubbles need `--force`; not while its fork is open) |
| `why [N] <text>` · `why [N] -` | Say (or clear) why a fog bubble is unclear |
| `type [N] <TYPE>` | Set the fog type: `kk` · `ku` · `uk` · `uu` (or the full names) |
| `answer [N] <text>` · `answer [N] -` | Keep (or clear) your own words on a fog that stays fog |
| `fill [N] <title>` | Plan a fog bubble with your content: fog → todo |
| `done` | Pop the active bubble, then ⏸ stop; the last one closes the track |
| `research [N] [focus]` | Print the research workflow and bubble N's context, to run once |
| `finding N <text>` · `finding N M -` · `finding N -` | Note (or drop) what research found for bubble N |
| `abilities` | List the abilities: name, type, project or user, description |
| `bubble:<name> [text]` | Print an ability's workflow and its context, to run once |

- `N` is the Nth bubble on the track. Omitted, it means the active bubble. `N:M` is N through M, inclusive.
- `--to <track>` (or `--to=<track>`) on `add`, `insert` and `hint` writes into another existing track, and the current track stays current.
- A word that starts with `-` is an option. Put text like that after `--`: `hint 2 -- use -v for verbose`.
- Options go before or after the text, each once. An option in the middle of the text is refused.
- `--force` confirms the steps that can't be undone: `close`, `delete`, `guard drop --all`, a reworded `goal`, fog on a done bubble, and an `own` that turns a track hybrid.

</details>

<details>
<summary><b>Track file format</b></summary>

```json
{
  "title": "Fix generation",
  "goal": "Generation no longer fails on empty input",
  "guards": ["No changes to the public API"],
  "bubbles": [
    { "title": "Repro", "state": "done", "id": 1 },
    { "title": "???", "state": "fog", "type": "unknown-unknown", "why": "the cause is unknown", "id": 2 },
    { "title": "Patch", "state": "todo", "hint": "Fix the cause. [Boundary: src/generate/]", "id": 3 }
  ],
  "nextId": 4
}
```

The active bubble is the first one that isn't done. Each bubble keeps a stable `id`, so links survive a move. A bubble can also carry `answer` (your words on a fog), `findings` (from research), `fork` and `sides` (its child and side tracks). The track can carry a `handoff` note, a `parent` or `origin` link, and `closed`. A track that isn't the agent's has `"ownership": "hybrid"` or `"user"`, and on a hybrid track your bubbles have `"owner": "user"`.

Change tracks through the CLI, not by hand: the hook refuses edits to a track file. A file that no longer parses is the exception, because a hand edit is its only repair.

</details>

<details>
<summary><b>Colors and symbols</b></summary>

In the status line and the terminal, the track title is green, the track is blue, and `prev ‹ active › next` is yellow. A bubble you do yourself is a diamond (`◆` done, `◈` active, `◇` todo), in red.

Other marks: `⚑` the goal · `¦` the guards (the status line ends with their count, `¦ 2 guards`) · `⑂` a bubble's fork · `↗` a side track · `🔒` a closed track · `…` a label cut to 20 characters.

- The CLI colors its output on a terminal and prints plain text when an agent reads it. `BUBBLES_COLOR=1` forces colors on, and `BUBBLES_COLOR=0` forces them off.
- `NO_COLOR=1` (or `--no-color` on `statusline.js`) turns colors off everywhere.
- `BUBBLES_ASCII=1` swaps the symbols for plain ASCII: `S *--@--?--o F` (your bubbles: `+` done, `H` active, `h` todo). In Claude Code, set it with `"env": { "BUBBLES_ASCII": "1" }` in settings.

</details>

## Limits

The hook has three gates: fog, ownership, and hand edits to track files. They block file-edit tools only. Work that is not a file edit, like a data pull, is held back by the skill's rules alone. It is a guardrail, not a security boundary: writes made through shell commands are not blocked, and no hook can stop every way an agent might write a file.

## Development

The source is TypeScript in `src/`. It builds into `skills/bubble/scripts/` and `skill-install/`, and that JavaScript is committed, because it is what users run without a build step.

```sh
npm install     # dev only
npm run build   # src/ -> skills/bubble/scripts/ and skill-install/
npm test        # fails if the committed JS drifts from src/
npm run check   # type-check the site's source in src/site/
npm run site    # build the landing page and the demo; preview with: python3 -m http.server -d dist/pages
```

Edit `src/`, never the generated JavaScript, and commit both together. [`docs/`](docs/1-big-picture-map.md) walks through the code, and [`AGENTS.md`](AGENTS.md) has the rules for contributors and coding agents.

### Release

Claude Code keeps an installed plugin on its cached copy until the plugin's version changes, so a push alone reaches nobody.

1. Run `npm run bump` (or `npm run bump minor`, `npm run bump major`). It raises the version in `package.json`, `package-lock.json` and `skills/.claude-plugin/plugin.json` together; `npm test` fails when they differ.
2. Commit and push to `master`.
3. Wherever the plugin is installed, run `claude plugin update bubble-tracks@bubble-tracks` and restart Claude Code.

## License

MIT, see [LICENSE](LICENSE).

The logo's wordmark is set in [Bricolage Grotesque](https://github.com/ateliertriay/bricolage) Bold, © 2022 The Bricolage Grotesque Project Authors, used under the [SIL Open Font License 1.1](https://openfontlicense.org).
