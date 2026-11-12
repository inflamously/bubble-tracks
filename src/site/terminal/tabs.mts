// The tabs over the stage: Chat first, the deeper views (Terminal, Files) one click away.
import { $ } from './dom.mjs';

/** One view at a time; ←/→ move between the tabs, as tabs do. */
export class Tabs {
  private readonly tabs: HTMLButtonElement[];
  private readonly shown: (name: string) => void;

  /** `shown` runs after a view comes on screen, with its name (the part of the tab's id after `tab-`). */
  constructor(shown: (name: string) => void) {
    this.shown = shown;
    this.tabs = [...$('tabs').querySelectorAll<HTMLButtonElement>('[role="tab"]')];
    this.tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => this.show(tab));
      tab.addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
        const next = this.tabs[(i + (e.key === 'ArrowRight' ? 1 : this.tabs.length - 1)) % this.tabs.length];
        next.focus();
        this.show(next);
      });
    });
  }

  private show(tab: HTMLButtonElement): void {
    for (const t of this.tabs) {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      $(t.getAttribute('aria-controls') ?? '').hidden = !on;
    }
    this.shown(tab.id.replace(/^tab-/, ''));
  }
}
