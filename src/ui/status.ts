import { $ } from '../dom';
import { ed } from '../state';
import { HINTS } from './hints';

export function updateStatus(): void {
  const h = ed.hover ? '<b>' + ed.hover.x + ',' + ed.hover.y + '</b>' : '';
  $('status').innerHTML =
    '<span>' + h + '</span><span>' + HINTS[ed.tool] + '</span>' +
    (ed.eqEdit ? '<span style="color:var(--acc)">equation: Enter or $ to place · Esc to cancel · $ first for display style</span>' : '') +
    (ed.msg ? '<span style="color:var(--acc)">' + ed.msg + '</span>' : '');
}
