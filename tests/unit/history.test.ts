import { describe, expect, it } from 'vitest';
import { History } from '../../src/model/history';

describe('History', () => {
  it('records only operations that changed something', () => {
    const h = new History();
    expect(h.commit('a', 'a')).toBe(false);
    expect(h.commit('a', 'b')).toBe(true);
    expect(h.undoS).toEqual(['a']);
  });

  it('undoes and redoes in order', () => {
    const h = new History();
    let doc = 'v0';
    const op = (next: string) => { const pre = doc; doc = next; h.commit(pre, doc); };
    op('v1'); op('v2'); op('v3');
    doc = h.undo(doc)!; expect(doc).toBe('v2');
    doc = h.undo(doc)!; expect(doc).toBe('v1');
    doc = h.redo(doc)!; expect(doc).toBe('v2');
    doc = h.undo(doc)!; doc = h.undo(doc)!; expect(doc).toBe('v0');
    expect(h.undo(doc)).toBeNull();
    doc = h.redo(doc)!; doc = h.redo(doc)!; doc = h.redo(doc)!; expect(doc).toBe('v3');
    expect(h.redo(doc)).toBeNull();
  });

  it('a new operation after undo drops the redo branch', () => {
    const h = new History();
    h.commit('v0', 'v1');
    h.commit('v1', 'v2');
    const back = h.undo('v2')!;
    h.commit(back, 'v1b');
    expect(h.redo('v1b')).toBeNull();
    expect(h.undo('v1b')).toBe('v1');
  });

  it('keeps at most `limit` steps, dropping the oldest', () => {
    const h = new History(3);
    for (let i = 0; i < 5; i++) h.commit('s' + i, 's' + (i + 1));
    expect(h.undoS).toEqual(['s2', 's3', 's4']);
  });
});
