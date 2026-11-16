import type { ToolName } from '../state';

/** [tool, label, key] for the toolbar. */
export const TOOLS: [ToolName, string, string][] = [
  ['select', 'select', 'V'], ['box', 'box', 'B'], ['line', 'line', 'L'], ['text', 'text', 'T'],
  ['brush', 'draw', 'F'], ['erase', 'erase', 'E'], ['plot', 'plot', 'G'],
];

export const HINTS: Record<ToolName, string> = {
  select: 'Drag to select cells (R toggles a highlighted bar on them), drag a selection to move it (arrow keys nudge, Delete clears, Ctrl+C/X/V). Click a vector object to select it.',
  box: 'Drag a rectangle. Edges join automatically with neighbouring lines.',
  line: 'Drag from start to end. Route is horizontal first; hold Shift for vertical first, Alt for an arrow head.',
  arrow: 'Like line, with an arrow head at the end.',
  text: 'Click a cell and type (R: type on a highlighted bar). Press $ to type an equation in the highlighted bar (live preview). Enter starts a new line; click an equation to edit it.',
  brush: 'Paint with the brush character. Click the brush box in the toolbar and type or paste any character, or click a shade.',
  erase: 'Drag to erase cells.',
  path: 'Click points of a vector line; double-click or Enter to finish, Esc to cancel.',
  plot: 'Drag a rectangle to place a plot; edit its data in the panel on the right.',
};
