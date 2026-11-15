// The demo page. It wires the parts together around the CLI (bundled in, see build.mjs):
//   view     – what the human sees: the tracks and the conversation
//   terminal – the screen  shell  – runs a command line (bubble-web underneath)
//   prompt   – the line the reader types at
//   disk     – the .bubble-tracks/ files  player – plays demo/story.md after an intro
//   header   – scenes and controls  tabs – Chat first; Terminal and Files are the deeper views
import { Disk } from './disk.mjs';
import { Header } from './header.mjs';
import { Player } from './player.mjs';
import { Prompt } from './prompt.mjs';
import { PROJECT, Shell } from './shell.mjs';
import { Tabs } from './tabs.mjs';
import type { Scene } from './story.mjs';
import { Terminal } from './terminal.mjs';
import { FRESH_DISK } from './text.mjs';
import { View } from './view.mjs';

/** demo/story.md as scenes, inlined by build.mjs (esbuild `define`). */
declare const STORY: Scene[];

// The parts need each other in a circle (the shell resets the player, the player runs the shell), so
// the callbacks name parts built further down. They only run after everything below exists.
const term = new Terminal();
const shell = new Shell(term, {
  booted: () => {
    disk.reset();
    view.reset();
  },
  ran: () => {
    disk.refresh();
    view.refresh();
  },
  reset: () => {
    player.end();
    shell.boot();
    term.print(FRESH_DISK, 'hint');
  },
  replay: () => player.jump(0),
});
const disk = new Disk(() => shell.machine, PROJECT);
const view = new View(() => shell.machine, PROJECT);
const header = new Header(STORY, {
  toggle: () => player.toggle(),
  step: () => player.step(),
  restart: () => player.jump(0),
  jump: (si) => player.jump(si),
});
const player = new Player(STORY, { term, shell, header, view });
// Typing at the prompt takes over from the story.
const prompt = new Prompt(term, shell, () => {
  if (player.playing) player.pause();
});

/** Start the page: hook up the tabs and the keys, then boot the shell and show the intro. */
function main(): void {
  // A hidden view can't scroll: catch up when it comes on screen.
  new Tabs((name) => {
    if (name === 'chat') view.scrollDown();
    if (name === 'terminal') {
      term.scrollDown();
      prompt.focus();
    }
  });

  // During the intro, any key starts the story.
  addEventListener('keydown', (e) => {
    if (player.inIntro && !e.metaKey && !e.ctrlKey && !e.altKey && e.key !== 'Tab') {
      e.preventDefault();
      player.play();
    }
  });

  shell.boot();
  player.intro();
}

main();
