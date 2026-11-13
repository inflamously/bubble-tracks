import type {Header, PlayerState} from './header.mjs';
import type {Shell} from './shell.mjs';
import type {Scene, Step} from './story.mjs';
import type {Terminal} from './terminal.mjs';
import {banner, countdown, PITCH, TERMINAL_INTRO, YOUR_TURN, YOUR_TURN_VIEW} from './text.mjs';
import type {View} from './view.mjs';

/** Milliseconds. */
const PACE = {
    key: 40,
    space: 75,
    beforeRun: 460,
    afterRun: 1580,
    afterLongRun: 2330,
    scene: 1170,
    beforeTyping: 300,
    typing: 700,
    sayBase: 450,
    sayPerChar: 32,
    sayMax: 3500,
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
            {kind: 'scene', si},
            ...scene.steps.map((s) => ({...s, si})),
            ...scene.notes.map((text): Beat => ({kind: 'note', si, text})),
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
        return {playing: this.playing, started: this.pos > 0, atEnd: this.atEnd};
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
        this.view.hideIntro()
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
        this.view.typing(null);
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
     * Play a beat as part of `run`, in three steps: the lead-in (the speaker's dots, and a command typed
     * out), the beat itself, then the reading time. False if the run was interrupted on the way.
     */
    private async perform(beat: Beat, run: number): Promise<boolean> {
        const wait = async (ms: number) => {
            await delay(ms);
            return run === this.run;
        };

        // The dots are up since the last beat's reading time, unless the story was paused or starts here.
        const who = speaker(beat);
        if (who && !this.view.isTyping) {
            this.view.typing(who);
            if (!(await wait(PACE.typing))) return false;
        }
        if (beat.kind === 'run' && !reduceMotion && !(await this.type(beat.line, wait))) return false;

        // Shown is done: a pause during the reading time must not show the beat again on resume.
        this.show(beat);
        this.pos++;
        if (this.atEnd) return true;

        // Whoever speaks next shows their dots through the reading time, so the chat never stands still.
        const next = speaker(this.beats[this.pos]);
        if (!next) return wait(pauseAfter(beat));
        if (!(await wait(PACE.beforeTyping))) return false;
        this.view.typing(next);
        return wait(Math.max(PACE.typing, pauseAfter(beat) - PACE.beforeTyping));
    }

    /** Type a command out at the prompt, key by key. False if interrupted. */
    private async type(line: string, wait: (ms: number) => Promise<boolean>): Promise<boolean> {
        for (let i = 1; i <= line.length; i++) {
            this.term.typed.textContent = line.slice(0, i);
            this.term.scrollDown();
            if (!(await wait(line[i - 1] === ' ' ? PACE.space : PACE.key))) return false;
        }
        return wait(PACE.beforeRun);
    }
}

/** Whose dots announce a beat in the chat; null for a beat that just appears. */
function speaker(beat: Beat): string | null {
    if (beat.kind === 'say') return beat.who;
    return beat.kind === 'run' && !reduceMotion ? 'agent' : null;
}

/** How long the reader gets after a beat. */
function pauseAfter(beat: Beat): number {
    if (beat.kind === 'scene') return PACE.scene;
    if (beat.kind === 'say' || beat.kind === 'note') return Math.min(PACE.sayMax, PACE.sayBase + beat.text.length * PACE.sayPerChar);
    return /^(bubble done|cat)\b/.test(beat.line) ? PACE.afterLongRun : PACE.afterRun;
}
