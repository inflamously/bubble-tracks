// The prompt line under the output, where the reader types their own commands.
import { $ } from './dom.mjs';
import type { Shell } from './shell.mjs';
import type { Terminal } from './terminal.mjs';

/** The line editor: Enter runs, ↑/↓ walk the history, Ctrl+L clears, Ctrl+C drops the line. */
export class Prompt {
  private readonly input = $<HTMLInputElement>('cmd');
  private readonly history: string[] = [];
  private at = 0; // the history entry on the line; history.length is the empty line after the last one
  private readonly term: Terminal;
  private readonly shell: Shell;

  /** `typed` runs before a key that edits or runs the line: the reader has taken over. */
  constructor(term: Terminal, shell: Shell, typed: () => void) {
    this.term = term;
    this.shell = shell;
    this.input.addEventListener('keydown', (e) => {
      const edits = e.key.length === 1 && !e.metaKey && !e.ctrlKey;
      if (edits || e.key === 'Enter') typed();
      if (this.handle(e)) e.preventDefault();
    });
    // A click anywhere on the screen lands at the prompt, unless it selected text.
    term.screen.addEventListener('click', () => {
      if (!getSelection()?.toString()) this.focus();
    });
  }

  focus(): void {
    this.input.focus({ preventScroll: true });
  }

  /** Act on a key the prompt handles itself; false leaves the key to the input. */
  private handle(e: KeyboardEvent): boolean {
    if (e.key === 'Enter') this.run();
    else if (e.key === 'ArrowUp') this.recall(this.at - 1);
    else if (e.key === 'ArrowDown') this.recall(this.at + 1);
    else if (e.ctrlKey && e.key === 'l') this.term.clear();
    else if (e.ctrlKey && e.key === 'c' && this.input.selectionStart === this.input.selectionEnd) this.cancel();
    else return false;
    return true;
  }

  private run(): void {
    const text = this.take();
    if (text.trim()) this.history.push(text);
    this.at = this.history.length;
    this.shell.exec(text);
  }

  private recall(at: number): void {
    this.at = Math.max(0, Math.min(this.history.length, at));
    this.input.value = this.history[this.at] ?? '';
  }

  private cancel(): void {
    this.shell.echo(`${this.take()}^C`);
  }

  /** The line, which is then empty. */
  private take(): string {
    const text = this.input.value;
    this.input.value = '';
    return text;
  }
}
