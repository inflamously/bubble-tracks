import type { Header, PlayerState } from './header.mjs';
import type { Shell } from './shell.mjs';
import type { Scene, Step } from './story.mjs';
import type { Terminal } from './terminal.mjs';
import { banner, countdown, PITCH, TERMINAL_INTRO, YOUR_TURN, YOUR_TURN_VIEW } from './text.mjs';
import type { View } from './view.mjs';

/** Milliseconds. */
const PACE = {
  key: 48,
  space: 90,
  beforeRun: 550,
  afterRun: 1900,
  afterLongRun: 2800,
  scene: 1400,
  sayBase: 1300,
  sayPerChar: 38,
  sayMax: 4200,
};
const COUNTDOWN_SECONDS = 5;

/** The story as one list: each scene's heading, its captions and commands, then its notes. */
type Beat = { kind: 'scene'; si: number } | { kind: 'note'; si: number; text: string } | (Step & { si: number });

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Plays the story: captions into the human's view, commands into the terminal. Every pause or jump starts a new run; a command that was
 * being typed out starts again on resume; a beat that is already on screen is not shown twice.
 * Step and jump show beats at once, without the typing and the pauses.
 */
export class Player {
  playing = false;
  inIntro = false;
  private pos = 0; // the next beat
  private run = 0;
  private readonly beats: Beat[];
  private readonly story: Scene[];
  private readonly term: Terminal;
  private readonly shell: Shell;
  private readonly header: Header;
  private readonly view: View;

  constructor(story: Scene[], parts: { term: Terminal; shell: Shell; header: Header; view: View }) {
    this.story = story;
    this.beats = story.flatMap((scene, si): Beat[] => [
      { kind: 'scene', si },
      ...scene.steps.map((s) => ({ ...s, si })),
      ...scene.notes.map((text): Beat => ({ kind: 'note', si, text })),
    ]);
    this.term = parts.term;
    this.shell = parts.shell;
    this.header = parts.header;
    this.view = parts.view;
  }

  get atEnd(): boolean {
    return this.pos >= this.beats.length;
  }

  get state(): PlayerState {
    return { playing: this.playing, started: this.pos > 0, atEnd: this.atEnd };
  }

  /** The banner, the pitch and a countdown; then the story starts. Any key or Play starts it sooner. */
  async intro(): Promise<void> {
    const run = ++this.run;
    this.inIntro = true;
    this.header.show(-1);
    this.header.update(this.state);
    for (const l of banner()) this.term.line(l, 'banner');
    this.term.line('');
    this.term.print(TERMINAL_INTRO, 'hint');
    this.view.intro(PITCH.lead, PITCH.body);
    for (let t = COUNTDOWN_SECONDS; t > 0 && run === this.run; t--) {
      this.view.countdown(countdown(t));
      await delay(1000);
    }
    if (run === this.run) this.play();
  }

  async play(): Promise<void> {
    if (this.playing) return;
    this.endIntro();
    if (this.atEnd) return this.jump(0);
    const run = ++this.run;
    this.playing = true;
    this.header.update(this.state);
    while (!this.atEnd) {
      if (!(await this.perform(this.beats[this.pos], run))) return;
    }
    this.finish();
  }

  pause(): void {
    this.endIntro();
    this.run++;
    this.playing = false;
    this.term.typed.textContent = '';
    this.header.update(this.state);
  }

  toggle(): void {
    if (this.playing) this.pause();
    else this.play();
  }

  /** The next caption or command; a scene heading comes along, since alone it shows nothing new. */
  step(): void {
    this.pause();
    if (this.atEnd) return;
    do this.show(this.beats[this.pos++]);
    while (!this.atEnd && this.beats[this.pos - 1].kind === 'scene');
    if (this.atEnd) this.finish();
    else this.header.update(this.state);
  }

  /** Start over on a fresh disk and play from scene `si`; the scenes before it run at once. */
  jump(si: number): void {
    this.pause();
    this.shell.boot();
    this.pos = 0;
    while (!this.atEnd && this.beats[this.pos].si < si) this.show(this.beats[this.pos++]);
    this.play();
  }

  /** Mark the story as played, quietly (the shell's reset does this). */
  end(): void {
    this.pause();
    this.pos = this.beats.length;
    this.header.show(this.story.length);
    this.header.update(this.state);
  }

  private finish(): void {
    this.end();
    this.term.print(YOUR_TURN, 'hint');
    this.view.note(YOUR_TURN_VIEW);
    this.term.scrollDown();
  }

  private endIntro(): void {
    if (!this.inIntro) return;
    this.inIntro = false;
    this.view.countdown(null);
  }

  /** Put a beat on screen, at once. */
  private show(beat: Beat): void {
    if (beat.kind === 'scene') {
      const scene = this.story[beat.si];
      this.header.show(beat.si);
      this.term.line(`── ${beat.si + 1} · ${scene.title} ${'─'.repeat(Math.max(3, 44 - scene.title.length))}`, 'scene-head');
      this.view.scene(beat.si + 1, scene.title);
    } else if (beat.kind === 'note') {
      this.view.note(beat.text);
    } else if (beat.kind === 'say') {
      this.view.say(beat.who, beat.text);
    } else {
      this.view.ran(beat.line);
      this.term.typed.textContent = '';
      this.shell.exec(beat.line);
    }
    this.term.scrollDown();
  }

  /**
   * Play a beat as part of `run`: type a command out first (unless motion is reduced), show the
   * beat, then give the reader time. False if the run was interrupted on the way.
   */
  private async perform(beat: Beat, run: number): Promise<boolean> {
    const wait = async (ms: number) => {
      await delay(ms);
      return run === this.run;
    };
    if (beat.kind === 'run' && !reduceMotion) {
      for (let i = 1; i <= beat.line.length; i++) {
        this.term.typed.textContent = beat.line.slice(0, i);
        this.term.scrollDown();
        if (!(await wait(beat.line[i - 1] === ' ' ? PACE.space : PACE.key))) return false;
      }
      if (!(await wait(PACE.beforeRun))) return false;
    }
    if (run !== this.run) return false;
    // Shown is done: a pause during the reading time must not show the beat again on resume.
    this.show(beat);
    this.pos++;
    return this.atEnd || wait(pauseAfter(beat));
  }
}

/** How long the reader gets after a beat. */
function pauseAfter(beat: Beat): number {
  if (beat.kind === 'scene') return PACE.scene;
  if (beat.kind === 'say' || beat.kind === 'note') return Math.min(PACE.sayMax, PACE.sayBase + beat.text.length * PACE.sayPerChar);
  return /^(bubble done|cat)\b/.test(beat.line) ? PACE.afterLongRun : PACE.afterRun;
}
