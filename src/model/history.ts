import { UNDO_LIMIT } from './constants';

/**
 * Snapshot undo/redo. A snapshot is an opaque string (the editor uses JSON of the whole doc).
 * Callers take a snapshot before an operation and `push` it if the operation changed anything.
 */
export class History {
  undoS: string[] = [];
  redoS: string[] = [];

  constructor(private limit = UNDO_LIMIT) {}

  push(pre: string): void {
    this.undoS.push(pre);
    if (this.undoS.length > this.limit) this.undoS.shift();
    this.redoS = [];
  }

  /** Push `pre` only if it differs from `now`. Returns whether it was pushed. */
  commit(pre: string, now: string): boolean {
    if (now === pre) return false;
    this.push(pre);
    return true;
  }

  /** Step back: returns the snapshot to load, or null if there is nothing to undo. */
  undo(now: string): string | null {
    const s = this.undoS.pop();
    if (s === undefined) return null;
    this.redoS.push(now);
    return s;
  }

  redo(now: string): string | null {
    const s = this.redoS.pop();
    if (s === undefined) return null;
    this.undoS.push(now);
    return s;
  }

  clear(): void {
    this.undoS = [];
    this.redoS = [];
  }
}
