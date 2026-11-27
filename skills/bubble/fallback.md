# bubble-tracks without Node

Read this only when the CLI can't run because `node` is missing. Then the shell says so: exit 127 with `command not found`; in cmd.exe, exit 9009 with `is not recognized as an internal or external command`; in PowerShell, `The term 'node' is not recognized`. Everything in SKILL.md still applies: sketch, classify fog, walk, ⏸ stop after every bubble, hand off. The only change is that you edit the track files yourself. This is the one case where hand-editing `.bubble-tracks/` is allowed.

Tell the human once: *"Node isn't available here, so I'm editing the track by hand. Fork, diverge, close, delete and move --to need Node."*

## The fog gate is on you

Without Node, no hook blocks your edits. Before editing any project file, read the current track. If its active bubble is fog, **don't edit**. Go to SKILL.md step 4 and ask the human. Edits under `.bubble-tracks/` are always allowed.

The track files are the one exception to the hook's other rule. With Node, the hook refuses every hand edit to `.bubble-tracks/<name>.json` and `.bubble-tracks/current`, because the CLI writes them. Here nothing writes them but you.

The ownership gate is on you too. The active bubble is the human's to do when the track's `ownership` is `user`, or when it is `hybrid` and the bubble has `owner`. Then **don't edit** either: follow SKILL.md's **Ownership** section (hint, wait, check, then `done`).

## The checks are on you

With Node, the CLI checks these rules on every command. Without it, check each one yourself before you save the file:

- **A title has 2–4 words.** This holds for `add`, `insert`, `fill` and `rename`. The track line cuts each label at 20 characters, so a longer title is cut off. Details, scope and file lists go in the `hint`. The CLI only warns here: if the human wants another length, keep their title.
- **Every fog has a `why`.** It says in one line why the bubble is unclear: what is missing or undecided, never what the bubble is. When you make a fog with `add ?` or `fog` and have no reason yet, ask the human for it or write it, then set `why`.
- **A todo bubble's hint ends with its boundary.** The boundary is `[Boundary: …]`, in square brackets, with the places the bubble may touch separated by commas. A fog bubble and a done bubble need none.
- **Only a fog bubble has a `type`.** Don't set `type` on a todo or done bubble. If the human classifies a planned bubble, it has to become fog first. A filled bubble keeps the `type` it got as fog.
- **Turning a track `hybrid` is permanent.** `own` on a track with no `ownership`, and `own … -` on a `user` track, both do it. Say that there is no way back, and make the edit only after the human confirms. On a track that is already `hybrid`, `own` needs no confirmation.

## Where tracks live

- `.bubble-tracks/` sits at the repo root. Look for it in the working directory, then in each parent.
- Each track is `.bubble-tracks/<name>.json`. Names use only letters, digits, `-` and `_`.
- `.bubble-tracks/current` holds the current track's name plus a newline. With no `current` file, the current track is `track` (`track.json`).

## A track file

```json
{
  "title": "Fix generation",
  "bubbles": [
    { "title": "Reproduce the bug", "state": "done", "id": 1 },
    { "title": "???", "state": "fog", "id": 2, "type": "unknown-known", "why": "unclear which inputs break the generator" },
    { "title": "Patch the generator", "state": "todo", "id": 3, "hint": "Fix the off-by-one in the loop. [Boundary: gen.py]" }
  ],
  "nextId": 4,
  "handoff": { "note": "The repro is in test_gen.py. Next: ask the human about bubble 2.", "at": "2026-10-20 18:10 UTC" }
}
```

Track fields:

- `title`: the track's name, kept short.
- `goal`: the one end result every bubble serves.
- `guards`: rules of what not to do, as an array of strings. Read them before acting, not as a check at `done`.
- `ownership`: who does the bubbles' work: `hybrid` (the human does the bubbles they pick) or `user` (the human does every bubble, you hint and check it). Missing means `agent`: you do all of it. Change it only when the human asks, and only as the `switch` row below allows.
- `draft`: `true` while the track is a draft: the proposal the human hasn't approved yet. Missing means a normal track. Only `create --draft` sets it and only `approve` deletes it.
- `bubbles`: the bubbles in order, S to F. Required, even when empty (`[]`).
- `nextId`: the id the next new bubble gets. Missing means 1.
- `handoff`: `{ "note", "at" }`, where `at` is UTC as `YYYY-MM-DD HH:MM UTC`.
- `parent`, `origin`, `closed`: set by fork, diverge and close. Never add or change them by hand.

Bubble fields:

- `title`: 2–4 words; fog bubbles have `???` until filled.
- `state`: `todo`, `fog` or `done`. Never store `active`: the **active bubble is the first one that isn't `done`**.
- `id`: stable and never reused. Take it from `nextId`, then add 1 to `nextId`.
- `type`: the fog classification: `known-known`, `known-unknown`, `unknown-known` or `unknown-unknown`. Set it only while the bubble is fog.
- `hint`: the human's note for this bubble. On a todo bubble it ends with `[Boundary: …]`.
- `owner`: `user` when the human does this bubble's work. Only on a `hybrid` track. Never change it on a `done` bubble.
- `why`: set while fog: one line on why it's unclear (not what it is).
- `answer`: set while fog: the human's own words on it, kept as they said them while it stays fog.
- Both stay after `fill`, as the trail of how the bubble was planned.
- `findings`: what research found for this bubble, as an array of strings (a guide or tip, with its source).
- `fork`, `sides`: links to other tracks. Leave them as they are.

Keep valid JSON with 2-space indentation and a final newline. Change only the fields a command touches, and leave unknown fields alone.

## Doing the commands by hand

N is a 1-based position on the track. When N is left out, it means the active bubble.

| Command | Edit |
|---|---|
| `show` | Read the file and draw the line: `<title>   S ●──◐──○ F   prev ‹ ◐ active › next`. `●` is done, `◐` is the active bubble, `○` is todo and `❓` is fog. A bubble the human does (see the gate above) is `◆`, `◈` or `◇` instead. If the active bubble is fog, its label is `❓ needs you`; with every bubble done it's `all done`, and with no bubbles at all it's `empty` (not done). Then list the bubbles by number with their hints. An active fog bubble is the gate (step 4). |
| `switch <name>` | If `<name>.json` exists, or one that differs only in case (names ignore case), write the stored name to `current` and resume it. Otherwise, if an open track's name starts with `<name>` or is a typo or two from it (ignoring case; none for names of 3 characters or less, 1 at 4, 2 from 5), don't create it: name that track and ask. Else create it (below). |
| `switch <name> --ownership <mode>` | Set `ownership` (delete the field for `agent`), but never change `hybrid`. `agent` and `user` swap only while no bubble is `done`; after that they only become `hybrid`. When `user` becomes `hybrid`, set `owner` to `user` on every bubble. A refused change is a new track. |
| `create <name> [title]` · `init <title>` | Write `{ "title": "<title or name>", "bubbles": [] }` to `<name>.json`, then write `<name>` to `current`. `init` creates `track`. |
| `create <name> [title] --draft` | Like `create`, but also set `draft` to `true`. Every plan edit below works on a draft. Nothing on it is active: make no project edits and don't run `done`. Its line ends in `◌ draft`, and `show` lists it with its `goal` and `guards`. The `goal` of a draft can still be reworded. To drop an abandoned draft, the human deletes its file. |
| `approve` | Only on the human's go, and only when the draft has a bubble: delete `draft`. The track is a normal track from then on. |
| `add <title>` · `add ? <why>` | Append `{ "title", "state": "todo", "id" }`, or `{ "title": "???", "state": "fog", "id", "why" }` for fog. Take the id from `nextId`. |
| `insert at N …` | Like `add`, but put the bubble at position N. |
| `fill [N] <title>` | Only for a fog bubble: set `title`, and set `state` to `todo`. |
| `type [N] <TYPE>` | Only for a fog bubble: set `type`. Expand `kk`, `ku`, `uk` and `uu`. |
| `why [N] <text>` · `answer [N] <text>` | Only for a fog bubble: set `why` or `answer`, or delete the field with `-`. |
| `hint N <text>` · `hint N -` | Set `hint`, or delete the field with `-`. A todo bubble's hint ends with `[Boundary: …]`. |
| `own [N \| N:M]` · `own [N \| N:M] -` | Only when the human asks, and only for bubbles that aren't `done`: set `owner` to `user`, or delete the field with `-`. On a track with no `ownership`, `own` first sets `ownership` to `hybrid`; `own … -` has nothing to hand back there. On a `user` track, `own` changes nothing; `own … -` first makes the track `hybrid` as the `switch` row says, then deletes `owner` on those bubbles. Both steps into `hybrid` are permanent: make them only after the human confirms (with Node, `--force`). |
| `handoff <note>` · `handoff -` | Set `handoff` to `{ "note", "at" }`, or delete it with `-`. |
| `finding N <text>` · `finding N M -` · `finding N -` | Append to `findings`, drop finding M, or delete `findings` with `-`. Delete the field when it ends up empty. `show` lists them as `found 1:`, `found 2:`… |
| `research [N] [focus]` | Changes nothing. Follow SKILL.md's **Research** section on bubble N, with its context: the track's `goal` and `guards`, the bubble's `title`, `state`, `type`, `why`, `answer`, `hint` and `findings`, and the bubbles before and after it. Not on a closed track. |
| `verify` | Changes nothing. Follow **Verify once** in SKILL.md's step 1 on the current track: its `title`, `goal` and `guards`, and every bubble's `title`, `state`, `why`, `answer` and `hint`. A reader with no chat context looks for a vague boundary, a missing guard, a bubble that is too big, and a hint that needs the chat. Each gap is a proposed change for the human to approve. Not on a closed track or one with no bubbles. |
| `goal <text>` | Set `goal` if the track has none. It's set once: never delete it, and change its wording only after the human confirms (`--force`). A new goal is a new track. |
| `guard <text>` · `guard N <text>` · `guard drop N` · `guard drop --all` · `guard show` | Append to `guards`, or replace guard N in place. `drop` removes guard N; `drop --all` deletes `guards`, only after the human confirms. Delete the field when it ends up empty. `guard show` lists them; `show` doesn't, only `switch` does. |
| `done` | Set the active bubble's `state` to `done` (never a fog bubble), then ⏸ stop. If it has a `fork`, don't pop it: that bubble waits for its fork track. If that was the last bubble, the track is finished: with Node it closes now. By hand, leave `closed` unset (close needs Node), tell the human, and treat it as closed: a follow-up is a diverge or a new track. |
| `rename N` · `title` · `remove` · `move N to M` · `fog` | Edit `title`, delete bubbles, reorder the array, or set `state` to `fog`. Done bubbles turn into fog only after the human confirms. Don't remove a bubble whose `fork` or `sides` track is still open (exists and isn't `closed`), or fog one whose `fork` is. |
| `tracks` · `--closed` · `--all` | List the `*.json` files and mark the current one with `→`. Skip tracks that have `closed` (unless current) and say how many you skipped; `--closed` lists only those, `--all` lists everything. |

If a track has `closed`, it's read-only, so don't change it. `fork`, `diverge`, `close`, `delete` and `move … --to` keep links between tracks in sync. Leave them for when Node is available and tell the human that.

## Abilities by hand

An ability is a workflow the human applies with `bubble:<name>` (or `/bubble:<name>`). Reading them needs no Node:

- **Where:** `<name>.md` in `.bubble-tracks/abilities/` (project) and `~/.bubble-tracks/abilities/` (user). When both have the same name, the project one wins.
- **The file:** a `---` frontmatter block with `name` (default: the filename without `.md`), `description` (one line) and `type` (`bubble` or `track`), then the body: the workflow. A file is broken if it has no frontmatter, a `type` that isn't one of those two, a name with characters other than letters, digits, `-` and `_`, or an empty body.
- **`abilities`:** list every ability by name with its type, `project` or `user`, and its description. Mark broken ones `broken`, with the reason.
- **`bubble:<name> [text]`:** read the file and run its body **once**. Any words after the name are the human's extra steer. The context is the active bubble (number, title, state, type, hint) for `type: bubble`, or the whole track, as `show` gives it, for `type: track`. A `type: bubble` ability needs an active bubble. If the track is all done or closed, say so and don't run it. Afterwards, report back to the human. Change the track only with the edits above, and never fill fog yourself. Nothing stays attached: the ability runs again only when the human invokes it.
