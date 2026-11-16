/* `window.ED`: a small handle on the editor for tests and debugging in the console. */
import type { Doc } from './model/types';
import type { EqEdit, ToolName } from './state';

export interface EditorHook {
  readonly doc: Doc;
  readonly cw: number;
  readonly ch: number;
  readonly cv: HTMLCanvasElement;
  readonly cur: number;
  readonly eqEdit: EqEdit | null;
  setTool(t: ToolName): void;
  snap(): string;
  undo(): void;
  redo(): void;
  gotoSlide(k: number): void;
  layout(): void;
  fresh(): void;
}

declare global {
  interface Window {
    ED: EditorHook;
  }
}
