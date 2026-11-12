import { $, button, el } from './dom.mjs';
import type { Scene } from './story.mjs';

/** What the header shows about the player. */
export interface PlayerState {
  playing: boolean;
  started: boolean;
  atEnd: boolean;
}

/** What the header's controls ask for. */
export interface HeaderActions {
  toggle(): void;
  step(): void;
  restart(): void;
  jump(scene: number): void;
}

/** The top bar: which scene is on, the scenes, and the controls. */
export class Header {
  private readonly story: Scene[];
  private readonly track = $('scenes');

  constructor(story: Scene[], actions: HeaderActions) {
    this.story = story;
    story.forEach((scene, si) => {
      const b = button('', () => actions.jump(si));
      b.title = `${si + 1}. ${scene.title}`;
      b.setAttribute('aria-label', `Play from scene ${si + 1}: ${scene.title}`);
      this.track.append(el('li', '', b));
    });
    // The name runs from full size down to three quarters, letter by letter.
    const name = $('brand-name');
    const letters = [...(name.textContent ?? '')];
    name.setAttribute('role', 'img');
    name.setAttribute('aria-label', letters.join(''));
    name.textContent = '';
    name.append(
      el(
        'span',
        'word',
        ...letters.map((ch, i) => {
          const letter = el('span', '', ch);
          letter.style.fontSize = `${1 - (0.25 * i) / Math.max(1, letters.length - 1)}em`;
          return letter;
        }),
      ),
    );
    // The stage fills the window below the bar, whose height changes as its contents wrap.
    const bar = $('topbar');
    new ResizeObserver(() => document.documentElement.style.setProperty('--topbar-h', `${bar.offsetHeight}px`)).observe(bar);
    $('play').addEventListener('click', () => actions.toggle());
    $('step').addEventListener('click', () => actions.step());
    $('restart').addEventListener('click', () => actions.restart());
  }

  /** Scene `si` is on: -1 is the intro, story.length is the end. */
  show(si: number): void {
    const total = this.story.length;
    const [label, title] = si < 0 ? ['Intro', 'Welcome'] : si >= total ? ['Done', 'Your turn'] : [`Scene ${si + 1} of ${total}`, this.story[si].title];
    $('scene-num').textContent = label;
    $('scene-title').textContent = title;
    [...this.track.children].forEach((li, i) => {
      li.className = i < si ? 'done' : i === si ? 'active' : '';
      li.firstElementChild?.setAttribute('aria-current', i === si ? 'step' : 'false');
    });
  }

  update(state: PlayerState): void {
    $('play').textContent = state.playing ? 'Pause' : state.atEnd ? 'Replay' : state.started ? 'Resume' : 'Play';
    $<HTMLButtonElement>('step').disabled = state.atEnd;
  }
}
