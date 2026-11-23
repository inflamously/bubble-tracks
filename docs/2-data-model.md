# 2. Data model

Everything is in `src/lib/model.ts` (115 lines). `src/lib/index.ts` has no logic: it re-exports `store`, `model`, `render` and `ops`, so the hooks, the status line and the tests need only one import.

## A track is one JSON file

`.bubble-tracks/<name>.json` holds exactly one `Track`:

```ts
interface Track {
  title?: string;
  ownership?: 'hybrid' | 'user';         // who does the bubbles' work; missing = agent
  bubbles: Bubble[];                     // the line, S → F, in order
  nextId?: number;                       // counter for stable bubble ids
  handoff?: { note: string; at: string }; // the note a fresh chat reads
  parent?: Link;                         // set if this track is a fork
  origin?: Link;                         // set if this track is a diverge (side track)
  closed?: { at: string };               // archived: read-only for good
}

interface Bubble {
  title: string;
  state: 'todo' | 'active' | 'fog' | 'done';
  id?: number;        // stable id, survives move/insert/remove
  type?: FogType;     // known-known … unknown-unknown (fog classification)
  hint?: string;      // the human's note: the ↳ line
  owner?: 'user';     // the human does this bubble's work (hybrid tracks only)
  fork?: string;      // path to the child track this bubble waits for
  sides?: string[];   // paths to side tracks that diverged from it
}

interface Link { track: string; bubble: number; title: string } // points back at a bubble by id
```

A real one, trimmed:

```json
{
  "title": "Src changes",
  "origin": { "track": "src-tour.json", "bubble": 1, "title": "Big picture map" },
  "bubbles": [
    { "title": "Move entry points", "state": "todo", "id": 1, "hint": "Move src/bubble.ts, …" }
  ],
  "nextId": 4
}
```

## Things worth knowing

- **"Active" isn't stored, it's computed.** `activeIndex` is the first bubble that isn't `done` in a track:

  ```ts
  return (track.bubbles || []).findIndex((b) => b.state !== 'done');
  ```

  So the active bubble can be `todo` or `fog`, and `done` simply moves on to the next one. Nothing writes `state: 'active'`. The value is still in the type, and `render.ts` still draws it as `◐`, but it's left over from before.
- **There are two kinds of addresses.** A **position** (`3`, `2:5`) is what humans type; it's 1-based and shifts with `move`/`insert`/`remove`. An **id** comes from `nextId` and never changes. Links between tracks always use the id, so reordering bubbles never breaks a fork or a diverge.
- **Ids are assigned lazily.** `ensureId` gives a bubble an id the first time one is needed: when it's added, or when something links to it. That way older track files without ids still load.
- **Fork and diverge are the same shape, but they mean different things.**
  - Fork: the bubble gets `fork`, the child gets `parent`. The bubble waits, and titles stay in sync.
  - Diverge: the bubble gets an entry in `sides`, the child gets `origin`. Nothing waits and nothing syncs.

  Link paths are relative and always use `/`, so they survive a moved checkout and work on other operating systems.
- **The fog type is only a label.** `type` records what the human said (`kk`/`ku`/`uk`/`uu` are expanded by `normalizeType`). The CLI never acts on it; it tells the agent how to work the bubble.
- **Ownership is one field on the track and one on the bubble.** `ownershipOf` reads the mode, and `agent` is never stored, so an older track file is an agent track. `ownedByHuman(track, bubble)` is the one question everything asks: true on a `user` track, and on a `hybrid` track when the bubble has `owner`. The track line, the listing and the gate hook only read it; there is no extra bubble state.
- **The mode only tightens.** `setOwnership` (`src/lib/ops/ownership.ts`) never leaves `hybrid`, and once a bubble is `done` it lets `agent` and `user` only move into `hybrid`. When a `user` track turns hybrid, every bubble gets `owner`, so none silently moves to the agent.
- **`resolve` and `resolveRange` do all the address checking.** No address means the active bubble. `N:M` is inclusive. Errors are plain messages like `no bubble at "9"` that the CLI prints as they are.
