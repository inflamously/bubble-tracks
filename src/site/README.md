# src/site/

The GitHub Pages demo: `demo/story.md` played as the human sees it (the tracks and the conversation), with the real bubble-tracks CLI in an emulated terminal one tab away.
TypeScript (`.mts`) in three standalone folders, each with its own tsconfig that limits what it may use.
tsc only type-checks them; `build.mjs` bundles them with esbuild.

| Folder | What it is | May use |
|---|---|---|
| `bubble-web/` | The CLI (`src/lib/cli/main.ts`, bundled in) on an in-memory machine: fake `node:fs`, POSIX `node:path`, per-run `process` and `console` (`host.mts`) | the language only (no DOM, no Node) |
| `terminal/` | The page: `index.html`, `style.css` and the modules behind them (the tabs, the human's view, terminal, shell, disk files, player, header) | the DOM; imports `bubble-web/` |
| `build/` | Node code `build.mjs` runs at build time: parses the story | Node |

```
npm run site                          # type-check, then bundle into dist/pages/
python3 -m http.server -d dist/pages  # preview at http://localhost:8000
npm run deploy                        # redeploy GitHub Pages from master (gh workflow run)
```

Every push to `master` deploys too: `.github/workflows/pages.yml` runs the tests, `npm run site`,
and publishes `dist/pages/`. One-time setup: Settings → Pages → Source: GitHub Actions.

`test/web.test.js` type-checks all three, bundles bubble-web the way the page does, and replays every
`bubble …` line of the story on both bubble-web and the real CLI; the output and the files on disk must match.

## Palette

Five colours, from [colorpalettes.net/color-palette-4657](https://colorpalettes.net/color-palette-4657/).
Each has one job, and every other colour on the page is a tint or shade of one of them. They are the
first tokens in `terminal/style.css`; change them there.

| Token | Hex | Job |
|---|---|---|
| `--red` | `#AC3539` | Fog, and the human's turn: the human's messages, the fog callout |
| `--pink` | `#E8A5AD` | The edge of fog surfaces; fog itself in the dark theme and in the terminal |
| `--mint` | `#E5F7EB` | The page: sunk surfaces, and tinted lighter (`#F4FBF6`) for the paper |
| `--ice` | `#D0ECF7` | The agent's surfaces: its messages, the pitch |
| `--sky` | `#71C1D6` | The track and the agent: fills and edges |

Rules that keep it one palette:

- **Colour means who.** Blue is the agent and the track, red is fog and the human. Nothing is coloured for decoration.
- **Sky is too light for text.** Where the agent colour carries text or a button, it is `--accent` (`#1B6E84`,
  the same hue, 5.8:1 on white). Red carries white text as it is (6.3:1).
- **Ink and the terminal are sky taken to near black** (`#16262C`, `#12222A`), so the dark surfaces belong to the palette too.
- **One colour comes from outside:** `--ansi-yellow` (`#F0CF7A`), because the CLI prints its warnings in yellow.
- **The dark theme** swaps roles instead of adding colours: sky becomes the accent as it is, and pink stands in for red.
- **No shadows.** Depth is a border or a background step. Spacing sits on a 0.25rem scale.
