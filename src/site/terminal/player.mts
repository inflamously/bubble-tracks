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
type Action = { kind: 'scene'; si: number } | { kind: 'note'; si: number; text: string } | (Step & { si: number });

const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Plays the story: captions into the human's view, commands into the terminal, which also shows what the human asked. Every pause or jump starts a new run; a command that was
 * being typed out starts again on resume; an action that is already on screen is not shown twice.
 * Step and jump show actions at once, without the typing and the pauses.
 */
export class Player {
    playing = false;
    inIntro = false;
    private pos = 0; // the next action
    private run = 0;
    private readonly actions: Action[];
    private readonly story: Scene[];
    private readonly term: Terminal;
    private readonly shell: Shell;
    private readonly header: Header;
    private readonly view: View;

    constructor(story: Scene[], parts: { term: Terminal; shell: Shell; header: Header; view: View }) {
        this.story = story;
        this.actions = story.flatMap((scene, si): Action[] => [
            {kind: 'scene', si},
            ...scene.steps.map((s) => ({...s, si})),
            ...scene.notes.map((text): Action => ({kind: 'note', si, text})),
        ]);
        this.term = parts.term;
        this.shell = parts.shell;
        this.header = parts.header;
        this.view = parts.view;
    }

    get atEnd(): boolean {
        return this.pos >= this.actions.length;
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
            if (!(await this.perform(this.actions[this.pos], run))) return;
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
        do this.show(this.actions[this.pos++]);
        while (!this.atEnd && this.actions[this.pos - 1].kind === 'scene');
        if (this.atEnd) this.finish();
        else this.header.update(this.state);
    }

    /** Start over on a fresh disk and play from scene `si`; the scenes before it run at once. */
    jump(si: number): void {
        this.pause();
        this.shell.boot();
        this.pos = 0;
        while (!this.atEnd && this.actions[this.pos].si < si) this.show(this.actions[this.pos++]);
        this.play();
    }

    /** Mark the story as played, quietly (the shell's reset does this). */
    end(): void {
        this.pause();
        this.pos = this.actions.length;
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

    /** Put an action on screen, at once. */
    private show(action: Action): void {
        if (action.kind === 'scene') {
            const scene = this.story[action.si];
            this.header.show(action.si);
            this.term.line(`── ${action.si + 1} · ${scene.title} ${'─'.repeat(Math.max(3, 44 - scene.title.length))}`, 'scene-head');
            this.view.scene(action.si + 1, scene.title);
        } else if (action.kind === 'note') {
            this.view.note(action.text);
        } else if (action.kind === 'say') {
            this.view.say(action.who, action.text);
            // The terminal is the agent's side: it shows the request it received, before the commands that answer it.
            if (action.who === 'human') this.term.say(action.who, action.text);
        } else {
            this.view.ran(action.line);
            this.term.typed.textContent = '';
            this.shell.exec(action.line);
        }
        this.term.scrollDown();
    }

    /**
     * Play an action as part of `run`, in three steps: the lead-in (the speaker's dots, and a command typed
     * out), the action itself, then the reading time. False if the run was interrupted on the way.
     */
    private async perform(action: Action, run: number): Promise<boolean> {
        const wait = async (ms: number) => {
            await delay(ms);
            return run === this.run;
        };

        // The dots are up since the last action's reading time, unless the story was paused or starts here.
        const who = speaker(action);
        if (who && !this.view.isTyping) {
            this.view.typing(who);
            if (!(await wait(PACE.typing))) return false;
        }
        if (action.kind === 'run' && !reduceMotion && !(await this.type(action.line, wait))) return false;

        // Shown is done: a pause during the reading time must not show the action again on resume.
        this.show(action);
        this.pos++;
        if (this.atEnd) return true;

        // Whoever speaks next shows their dots through the reading time, so the chat never stands still.
        const next = speaker(this.actions[this.pos]);
        if (!next) return wait(pauseAfter(action));
        if (!(await wait(PACE.beforeTyping))) return false;
        this.view.typing(next);
        return wait(Math.max(PACE.typing, pauseAfter(action) - PACE.beforeTyping));
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

/** Whose dots announce an action in the chat; null for an action that just appears. */
function speaker(action: Action): string | null {
    if (action.kind === 'say') return action.who;
    return action.kind === 'run' && !reduceMotion ? 'agent' : null;
}

/** How long the reader gets after an action. */
function pauseAfter(action: Action): number {
    if (action.kind === 'scene') return PACE.scene;
    if (action.kind === 'say' || action.kind === 'note') return Math.min(PACE.sayMax, PACE.sayBase + action.text.length * PACE.sayPerChar);
    return /^(bubble done|cat)\b/.test(action.line) ? PACE.afterLongRun : PACE.afterRun;
}
