// The human's view: the tracks as the CLI prints them, the conversation between the human and the
// agent, and the narrator's notice. The tracks are asked from the CLI after each command; the player fills the conversation
// from the story.
import {ansi} from './ansi.mjs';
import type {Machine} from '../bubble-web/index.mjs';
import {$, el} from './dom.mjs';

/** What the view reads from a track file (the CLI's `Track`, src/lib/model.ts). */
interface TrackFile {
    guards?: unknown[];
}

const WHO: Record<string, string> = {human: 'Human', agent: 'Agent'};

/** A track file's content; an empty track when it can't be read. */
function parseTrack(json: string): TrackFile {
    try {
        return JSON.parse(json) as TrackFile;
    } catch {
        return {};
    }
}

/** The tracks and the conversation. */
export class View {
    private readonly tracks = $('tracks');
    private readonly chat = $('chat');
    private readonly notice = $('notice');
    private readonly dir: string;
    private readonly machine: () => Machine;
    private lines: string[] = []; // the tracks as last shown, to tell what a command changed

    constructor(machine: () => Machine, project: string) {
        this.machine = machine;
        this.dir = `${project}/.bubble-tracks`;
    }

    /** A fresh disk: no tracks, no conversation. */
    reset(): void {
        this.chat.textContent = '';
        this.note(null);
        this.refresh();
    }

    /**
     * Show the tracks as the CLI prints them (`bubble tracks --all`): the same lines an agent pastes
     * into its chat, so the page draws nothing of its own. A line that is new or reads differently
     * than before is marked `changed`, and the style sheet lets it settle in. The current track's
     * guards follow, as `bubble guard show` prints them.
     */
    refresh(): void {
        const machine = this.machine();
        const {fs, path} = machine;
        this.tracks.textContent = '';
        const shown = this.lines;
        const print = (argv: string[]) => machine.bubble(argv).out.flatMap((o) => o.text.replace(/\n$/, '').split('\n'));
        const row = (l: string) => el('div', shown.includes(l) ? '' : 'changed', ansi(l));
        const board = el('div', 'board');
        const any = fs.existsSync(this.dir) && fs.readdirSync(this.dir).some((n) => n.endsWith('.json'));
        // With no track, the CLI tells its user which command to run; the visitor has nothing to do yet.
        this.lines = any ? print(['tracks', '--all']) : [];
        if (!any) board.append(el('div', 'empty', 'No track yet.'));
        else board.append(...this.lines.map(row));
        this.tracks.append(board);

        const current = path.join(this.dir, 'current');
        const file = fs.existsSync(current) ? path.join(this.dir, `${fs.readFileSync(current).trim()}.json`) : null;
        if (!file || !fs.existsSync(file)) return;
        const track = parseTrack(fs.readFileSync(file));
        if (track.guards?.length) {
            const guards = print(['guard', 'show']);
            this.tracks.append(el('div', 'board guards', ...guards.map(row)));
            this.lines = [...this.lines, ...guards];
        }
    }

    // ── the conversation ──

    /** What bubble-tracks is, before the story starts. */
    intro(lead: string, body: string): void {
        this.add(el('div', 'pitch', el('p', 'pitch-lead', lead), el('p', '', body)));
    }

    hideIntro(): void {
        this.remove('div.pitch')
    }

    /** The line that counts down to the story; `null` takes it away. */
    countdown(text: string | null): void {
        const line = this.chat.querySelector('.countdown');
        if (text === null) line?.remove();
        else if (line) line.textContent = text;
        else this.add(el('p', 'countdown', text));
    }

    scene(number: number, title: string): void {
        this.add(el('h3', 'chat-scene', el('span', '', String(number)), title));
    }

    /**
     * Someone is about to speak: three dots on their side, until the next thing in the conversation
     * takes their place. `null` takes them away. Not read out: the message that follows is.
     */
    get isTyping(): boolean {
        return this.chat.querySelector('.typing') !== null;
    }

    typing(who: string | null): void {
        this.chat.querySelector('.typing')?.remove();
        if (who === null) return;
        const dots = el('div', `msg ${who} typing`, el('i'), el('i'), el('i'));
        dots.setAttribute('aria-hidden', 'true');
        this.chat.append(dots);
        this.scrollDown();
    }

    say(who: string, text: string): void {
        this.note(null);
        this.add(el('div', `msg ${who}`, el('span', 'who', WHO[who] ?? who), el('p', '', text)));
    }

    /** A command the agent ran. Commands in a row share one block; the terminal shows what they print. */
    ran(line: string): void {
        this.note(null);
        this.typing(null);
        let block = this.chat.lastElementChild;
        if (!block?.classList.contains('ran')) block = this.add(el('div', 'msg agent ran', el('span', 'who', 'Agent runs')));
        block.append(el('code', '', line));
        this.scrollDown();
    }

    /**
     * The narrator speaks to the visitor, not in the conversation: a notice beside the tabs, which stays
     * until the conversation moves on. `null` takes it away.
     */
    note(text: string | null): void {
        this.notice.textContent = text ?? '';
        this.notice.hidden = text === null;
    }

    private add<T extends HTMLElement>(node: T): T {
        this.typing(null);
        this.chat.append(node);
        this.scrollDown();
        return node;
    }

    private remove(className: string) {
        const node = document.querySelector(className)
        if (!node) {
            return;
        }
        this.chat.removeChild(node)
    }

    scrollDown(): void {
        this.chat.scrollTop = this.chat.scrollHeight;
    }
}
