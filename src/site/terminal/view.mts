// The human's view: the tracks as the CLI prints them, the conversation between the human and the
// agent, and the narrator's notice. The tracks are asked from the CLI after each command; the player fills the conversation
// from the story.
import { ansi } from './ansi.mjs';
import type { Machine } from '../bubble-web/index.mjs';
import { $, el } from './dom.mjs';

/** What the view reads from a track file (the CLI's `Track`, src/lib/model.ts). */
interface TrackFile {
  bubbles?: { state: string; why?: string }[];
  closed?: unknown;
}

const WHO: Record<string, string> = { human: 'Human', agent: 'Agent' };

/** The sentence under the tracks when the current track's active bubble is fog; null when it isn't. */
function fogNote(json: string): HTMLElement | null {
  let track: TrackFile;
  try {
    track = JSON.parse(json) as TrackFile;
  } catch {
    return null;
  }
  const active = track.closed ? undefined : (track.bubbles ?? []).find((b) => b.state !== 'done');
  if (active?.state !== 'fog') return null;
  const why = active.why ? ` Unclear: ${active.why.replace(/[.!?]+$/, '')}.` : '';
  return el('p', 'needs-you', el('strong', '', 'Fog. The agent stops here.'), `${why} Only the human plans it.`);
}

/** The tracks and the conversation. */
export class View {
  private readonly tracks = $('tracks');
  private readonly chat = $('chat');
  private readonly notice = $('notice');
  private readonly dir: string;
  private readonly machine: () => Machine;

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
   * into its chat, so the page draws nothing of its own.
   */
  refresh(): void {
    const machine = this.machine();
    const { fs, path } = machine;
    this.tracks.textContent = '';
    const board = el('div', 'board');
    const any = fs.existsSync(this.dir) && fs.readdirSync(this.dir).some((n) => n.endsWith('.json'));
    // With no track, the CLI tells its user which command to run; the visitor has nothing to do yet.
    if (!any) board.append(el('div', 'empty', 'No track yet.'));
    else {
      for (const o of machine.bubble(['tracks', '--all']).out) {
        for (const l of o.text.replace(/\n$/, '').split('\n')) board.append(el('div', '', ansi(l)));
      }
    }
    this.tracks.append(board);
    const current = path.join(this.dir, 'current');
    const file = fs.existsSync(current) ? path.join(this.dir, `${fs.readFileSync(current).trim()}.json`) : null;
    const note = file && fs.existsSync(file) ? fogNote(fs.readFileSync(file)) : null;
    if (note) this.tracks.append(note);
  }

  // ── the conversation ──

  /** What bubble-tracks is, before the story starts. */
  intro(lead: string, body: string): void {
    this.add(el('div', 'pitch', el('p', 'pitch-lead', lead), el('p', '', body)));
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

  say(who: string, text: string): void {
    this.note(null);
    this.add(el('div', `msg ${who}`, el('span', 'who', WHO[who] ?? who), el('p', '', text)));
  }

  /** A command the agent ran. Commands in a row share one block; the terminal shows what they print. */
  ran(line: string): void {
    this.note(null);
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
    this.chat.append(node);
    this.scrollDown();
    return node;
  }

  scrollDown(): void {
    this.chat.scrollTop = this.chat.scrollHeight;
  }
}
