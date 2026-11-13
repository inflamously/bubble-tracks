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

**[Live demo](https://inflamously.github.io/bubble-tracks/)**: the real CLI playing a full session in your browser.

## Overview

- **Plan only as far as you can see.** A step nobody can describe yet stays fog until the agent reaches it.
- **The agent never plans fog.** At a fog bubble it stops and asks. You say what the bubble is, or how the agent should find out.
- **You steer between bubbles.** The agent pauses after every bubble, so you can move, insert, remove or fog bubbles before it goes on.
- **A goal and guards frame the track.** The goal is the one result every bubble serves. Guards say what not to do or touch, and the agent reads them before it acts.
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

The [live demo](https://inflamously.github.io/bubble-tracks/) plays this session to the end.

## Install

Requires Node.js 18 or newer. Nothing to `npm install`: the skill, the hooks and the installer use only Node built-ins.

| Agent | Command | Fog gate (blocks edits) | Status line |
|---|---|---|---|
| Claude Code | `/bubble` | `PreToolUse` hook | yes |
| Codex CLI | `$bubble` | `PreToolUse` hook on `apply_patch` | no, use `bubble show` |
| Gemini CLI | `/bubble` | `BeforeTool` hook | no, use `bubble show` |
| Anything that reads `AGENTS.md` | instructions | soft: the model is told to stop | no, use `bubble show` |

### Claude Code

1. Install the plugin. Inside Claude Code, run:

   ```
   /plugin marketplace add inflamously/bubble-tracks
   /plugin install bubble-tracks@bubble-tracks
   ```

   From a local checkout, use `/plugin marketplace add /path/to/bubble-tracks`.

2. Add the status line. Plugins can't set it themselves, so run `node install.js claude --apply-statusline`, or add this to `~/.claude/settings.json`:

   ```json
   "statusLine": {
     "type": "command",
     "command": "node \"/path/to/bubble-tracks/skills/bubble/scripts/cli/statusline.js\""
   }
   ```

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

**A new track** starts with a short plan in chat. The agent asks for the goal, drafts the guards and the bubbles, and proposes them in one list. When you say ok, it creates the track and asks you about each fog bubble. Then it walks the track one bubble at a time.

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

### Tracks

Each track is one idea, stored as one `.json` file in `.bubble-tracks/`. The file `current` names the active track, and every command, the status line and the fog gate act on it.

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
node skills/bubble/scripts/cli/bubble.js <command> [--dir <repo>] [--ascii]
```

A leading `bubble` word is optional, and a whole phrase can be passed as one quoted argument.

| Command | Effect |
|---|---|
| `show` | Render the track and list its bubbles (exit 3 = active bubble is fog) |
| `switch [name] [title]` | Resume a track, or create it (no name: the current one). Refuses a new name close to an open track (`flow` for `flow-analysis`); `create` makes it. Names ignore case (`Dev` resumes `dev`) |
| `create <name> [title]` | Create a new track (refuses if it exists) |
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

</details>

<details>
<summary><b>Track file format</b></summary>

```json
{
  "title": "Fix generation",
  "bubbles": [
    { "title": "Repro", "state": "done" },
    { "title": "???", "state": "fog", "type": "unknown-unknown" },
    { "title": "Patch", "state": "todo" }
  ]
}
```

The active bubble is the first one that isn't done. Edit tracks through the CLI, not by hand.

</details>

<details>
<summary><b>Colors and symbols</b></summary>

In the status line and the terminal, the track title is green, the track is blue, and `prev ‹ active › next` is yellow.

- `NO_COLOR=1` (or `--no-color` on `statusline.js`) turns colors off.
- `BUBBLES_COLOR=1` forces them on.
- `BUBBLES_ASCII=1` swaps the symbols for plain ASCII: `S *--@--?--o F`. In Claude Code, set it with `"env": { "BUBBLES_ASCII": "1" }` in settings.

</details>

## Limits

The fog gate blocks file-edit tools only. It is a guardrail, not a security boundary: writes made through shell commands are not blocked, and no hook can stop every way an agent might write a file.

## Development

The source is TypeScript in `src/`. It builds into `skills/bubble/scripts/` and `skill-install/`, and that JavaScript is committed, because it is what users run without a build step.

```sh
npm install     # dev only
npm run build   # src/ -> skills/bubble/scripts/ and skill-install/
npm test        # fails if the committed JS drifts from src/
npm run site    # build the demo; preview with: python3 -m http.server -d dist/pages
```

Edit `src/`, never the generated JavaScript, and commit both together. [`docs/`](docs/1-big-picture-map.md) walks through the code, and [`AGENTS.md`](AGENTS.md) has the rules for contributors and coding agents.

## License

MIT, see [LICENSE](LICENSE).
