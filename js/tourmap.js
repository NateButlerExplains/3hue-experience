// The tour map (O10): a native modal <dialog id="tour-map"> listing the tour's chapters, each named
// by the lobby landmark it happens at ("Door 2 · Gain Control", "The tower · The maturity path"),
// with Now and Visited written as text. A row jumps to that chapter; "Replay from the start" starts
// over with nothing remembered. The dialog is a focus.js layer as well, so Escape closes only it and
// focus returns to the button that opened it; a jump or a replay hands focus to the card's Next.
// Opening it pauses the tour (pause reason "map"); closing it lifts that reason.
//
// Also here, shared with js/ask.js: modal(), the dialog shell (showModal plus a focus.js layer),
// toolButton(), the icon buttons the card's head row carries (Voice, Map), and chapterRow(), a
// chapter as a row (the map's list and Ask's Explore tab).
import { getManifest, str } from './content.js?v=2026-09-10f';
import { pushLayer, popLayer, dropLayer, topLayer } from './focus.js?v=2026-09-10f';

const dlg = document.getElementById('tour-map');
let api = null;   // from js/tour.js: chapters(), jump(entry), replay(), hold(reason, on)
let els = null;
let shell = null;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const SVG = 'http://www.w3.org/2000/svg';
// Stroked 24 px icons, decoration only: the button's text names it.
const ICONS = {
  map: 'M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Zm0 0v14m6-12v14',
  ask: 'M4.5 5.5h15v10h-8l-4.5 3.5v-3.5H4.5z M9.5 9.2a2.5 2.5 0 1 1 3.4 2.3c-.6.3-.9.7-.9 1.3 M12 14.6v.1',
  mic: 'M12 3.5a2.8 2.8 0 0 1 2.8 2.8v5.4a2.8 2.8 0 0 1-5.6 0V6.3A2.8 2.8 0 0 1 12 3.5Zm-6 8.2a6 6 0 0 0 12 0M12 17.7v3',
  close: 'M6 6l12 12M18 6 6 18',
  minimise: 'M6 17.5h12',
  play: 'M8 5.5v13l10.5-6.5z',
};
export function icon(name) {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); s.setAttribute('class', 'tour-icon');
  const p = document.createElementNS(SVG, 'path');
  p.setAttribute('d', ICONS[name]); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.7'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  s.append(p);
  return s;
}
// An icon button whose text is its name (shown beside the icon on desktop, visually hidden on
// composed layouts; css/tour.css).
export function toolButton(id, label, name) {
  const b = el('button', 'btn outline tour-tool');
  b.type = 'button'; b.id = id;
  b.append(icon(name), el('span', 'tour-tool-label', label));
  return b;
}

// The dialog shell. open(opener, first): showModal, then a layer whose Escape closes the dialog and
// whose opener gets focus back. close({restore}): restore false when what follows places focus itself.
export function modal(dialog, id, { onOpen, onClose } = {}) {
  let layered = false;
  const finish = (restore) => {
    if (restore && topLayer()?.id === id) popLayer(); else dropLayer(id);
    onClose?.();
  };
  function open(opener, first) {
    if (dialog.open) return;
    // showModal() focuses the [autofocus] element, so focus lands once, where the layer puts it.
    for (const e of dialog.querySelectorAll('[autofocus]')) e.removeAttribute('autofocus');
    if (first instanceof Element) first.setAttribute('autofocus', '');
    dialog.showModal();
    layered = true;
    pushLayer({ id, opener: opener || document.activeElement, first, onEscape: () => close() });
    onOpen?.();
  }
  function close({ restore = true } = {}) {
    if (!layered) { if (dialog.open) dialog.close(); return; }
    layered = false;
    if (dialog.open) dialog.close();
    // Chromium hands focus back to the opener as the dialog closes; WebKit can leave it on the hidden
    // control inside. Either way the layer (or what follows) now places it.
    if (dialog.contains(document.activeElement)) document.activeElement.blur();
    finish(restore);
  }
  // Escape that reaches the dialog itself (focus.js normally takes it first), and a close from
  // anywhere else: the layer goes too.
  dialog.addEventListener('cancel', (e) => { e.preventDefault(); close(); });
  dialog.addEventListener('close', () => { if (layered) { layered = false; finish(false); } });
  return { open, close, isOpen: () => dialog.open };
}

// A dialog's head: its heading (which names it) and a Close button.
export function dialogHead(dialog, idH, title, onClose) {
  const head = el('div', 'tour-dlg-head');
  const h = el('h2', 'tour-dlg-title', title); h.id = idH;
  const x = el('button', 'btn outline tour-dlg-x'); x.type = 'button';
  x.append(icon('close'), el('span', 'sr', str('tourClose')));
  x.addEventListener('click', onClose);
  head.append(h, x);
  dialog.setAttribute('aria-labelledby', idH);
  return { head, h, x };
}

export function initMap(a) {
  api = a;
  shell = modal(dlg, 'map', { onOpen: () => api.hold('map', true), onClose: () => api.hold('map', false) });
}
export function mapButton() {
  const b = toolButton('tour-map-btn', str('tourMap'), 'map');
  b.addEventListener('click', () => openMap(b));
  return b;
}
export const mapOpen = () => !!shell?.isOpen();

function build() {
  if (els) return els;
  dlg.replaceChildren();
  const { head } = dialogHead(dlg, 'tour-map-h', str('tourMap'), () => closeMap());
  const body = el('div', 'tour-dlg-body');
  const list = el('ol', 'tour-map-list'); list.id = 'tour-map-list';
  const foot = el('div', 'tour-dlg-foot');
  const replay = el('button', 'btn outline tour-map-replay', str('tourReplay')); replay.type = 'button'; replay.id = 'tour-map-replay';
  replay.addEventListener('click', () => { closeMap({ restore: false }); api.replay(); });
  foot.append(replay);
  body.append(list);
  dlg.append(head, body, foot);
  els = { list, replay };
  return els;
}

// The landmark a chapter happens at, as the lobby names it (the manifest's door numbers and titles).
function where(c) {
  const l = String(c.landmark || '');
  if (l === 'lobby') return str('tourMapLobby');
  if (l === 'tower') return str('tourMapTower');
  if (l === 'kiosk') return str('tourMapKiosk');
  if (l.startsWith('door:')) { const d = getManifest().doors.find((x) => x.id === l.slice(5)); return d ? str('tourMapDoor', { number: d.number }) : ''; }
  return '';
}

// One chapter as a list item holding its row button: number, landmark, title, Now or Visited.
export function chapterRow(c, i, onPick) {
  const li = el('li');
  const b = el('button', 'tour-map-row'); b.type = 'button'; b.dataset.chapter = c.id;
  const n = el('span', 'n', String(i + 1)); n.setAttribute('aria-hidden', 'true');
  const text = el('span', 'tour-map-text');
  const at = where(c);
  if (at) text.append(el('span', 'tour-map-where', at), el('span', 'sr', ' · '));
  text.append(el('span', 'tour-map-title', c.title));
  b.append(n, text);
  const tag = c.now ? ['now', str('tourMapNow')] : c.visited ? ['visited', str('tourVisited')] : null;
  if (tag) b.append(el('span', 'sr', ', '), el('span', `tour-tag ${tag[0]}`, tag[1]));
  b.addEventListener('click', onPick);
  li.append(b);
  return li;
}

function render() {
  const { list } = build();
  let firstRow = null, nowRow = null;
  const rows = api.chapters().map((c, i) => {
    const li = chapterRow(c, i, () => { closeMap({ restore: false }); api.jump(c.entry); });
    const b = li.firstChild;
    firstRow ||= b;
    if (c.now) nowRow = b;
    return li;
  });
  list.replaceChildren(...rows);
  return nowRow || firstRow;
}

export function openMap(opener) {
  if (!api || shell.isOpen()) return;
  const first = render();
  shell.open(opener, first);
}
export function closeMap(opts) { shell?.close(opts); }
