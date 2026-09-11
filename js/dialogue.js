// The guide card: the guided tour's one surface (O10, O12). A head row (the guide's canvas, name and
// state, the chapter, End tour), a progress bar (aria-hidden), the caption with word spans, callout
// tiles with their printed sources, the choice group and the Previous / Next bar. The card is built
// once and updated in place, so #tour-next, which keeps focus through the tour, is never replaced.
//
// The caption, the room's screen-reader list (what its surfaces show, O14), tiles and choice sit in
// #tour-body inside a column (.tour-text) that js/tour.js also puts the synthetic-voice disclosure
// in, after the body, so the disclosure never scrolls away.
// Whenever the body's content is taller than the body, the body becomes a named, focusable region
// (tabindex 0, labelled by the chapter) so a keyboard can scroll it (WCAG 2.1.1); otherwise it is a
// plain container again.
//
// Keys act only while focus is inside the card (WCAG 2.1.4): → and ← step between lines, or between
// options when an option has focus; digits pick an option. There is no global shortcut. An
// auto-repeated digit, Enter or Space is ignored, and so is the second click of a double-click on an
// option, so one press never commits a choice the visitor has not seen yet. Every word comes from
// the manifest or the tour script; this file only arranges them.
import { getManifest, str, reducedMotion, guideName } from './content.js?v=2026-09-10f';
import { tokens } from './tourtext.js?v=2026-09-10f';

const card = document.getElementById('tour');
const live = document.getElementById('tour-live');
const titleCard = document.getElementById('tour-titlecard');
let els = null;
let on = { next() {}, prev() {}, end() {}, pick() {}, preview() {} };

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

// Build the card's skeleton once. handlers: {next, prev, end, pick(option, event), preview(option|null)}.
export function buildCard(handlers) {
  on = { ...on, ...handlers };
  if (els) return;
  const m = getManifest();
  card.setAttribute('aria-label', `${guideName()}, ${m.guide.title}`);
  card.replaceChildren();

  const face = el('div', 'tour-face');
  const orb = el('canvas', 'tour-orb'); orb.id = 'tour-guide'; orb.width = 220; orb.height = 220; orb.setAttribute('aria-hidden', 'true');
  face.append(orb);
  const head = el('div', 'tour-head');
  const who = el('div', 'tour-who');
  const name = el('p', 'tour-name', guideName());
  const state = el('p', 'tour-state'); state.id = 'tour-state';
  who.append(name, state);
  const chapter = el('p', 'tour-chapter'); chapter.id = 'tour-chapter';
  const end = el('button', 'btn outline tour-end'); end.type = 'button'; end.id = 'tour-end';
  const x = el('span', 'tour-x', '×'); x.setAttribute('aria-hidden', 'true');
  end.append(x, ` ${str('tourEnd')}`);
  head.append(who, chapter, end);

  const progress = el('div', 'tour-progress'); progress.setAttribute('aria-hidden', 'true');
  const fill = el('span'); fill.id = 'tour-progress';
  progress.append(fill);

  const main = el('div', 'tour-main');
  const text = el('div', 'tour-text');
  const body = el('div', 'tour-body'); body.id = 'tour-body';
  const caption = el('p', 'tour-caption'); caption.id = 'tour-caption';
  const src = el('p', 'tour-src'); src.id = 'tour-src'; src.hidden = true;
  // What the room's surfaces show (O14), for a screen reader: the surfaces themselves are aria-hidden.
  const room = el('div', 'sr'); room.id = 'tour-room'; room.hidden = true;
  const roomHead = el('p', null, str('tourRoomShows')); roomHead.id = 'tour-room-h';
  const roomList = el('ul'); roomList.setAttribute('aria-labelledby', 'tour-room-h');
  room.append(roomHead, roomList);
  const callouts = el('div', 'tour-callouts'); callouts.id = 'tour-callouts'; callouts.hidden = true;
  const choice = el('div', 'tour-choice'); choice.id = 'tour-choice'; choice.hidden = true;
  choice.setAttribute('role', 'group'); choice.setAttribute('aria-labelledby', 'tour-prompt');
  const prompt = el('p', 'tour-prompt'); prompt.id = 'tour-prompt';
  const options = el('div', 'tour-options'); options.id = 'tour-options';
  choice.append(prompt, options);
  body.append(caption, room, src, callouts, choice);

  const bar = el('div', 'tour-bar'); bar.id = 'tour-bar';
  const prev = el('button', 'btn outline tour-prev', str('tourPrev')); prev.type = 'button'; prev.id = 'tour-prev';
  const next = el('button', 'btn primary tour-next', str('tourNext')); next.type = 'button'; next.id = 'tour-next';
  // Previous is never `disabled` (that would drop the focus it holds); aria-disabled marks a first
  // line, and js/tour.js prev() does nothing there.
  prev.setAttribute('aria-disabled', 'true');
  bar.append(prev, next);
  text.append(body);
  main.append(text, bar);

  card.append(face, head, progress, main);
  els = { name, state, chapter, fill, text, body, caption, room, roomList, src, callouts, choice, prompt, options, bar, prev, next, end, orb };
  next.addEventListener('click', () => on.next());
  prev.addEventListener('click', () => on.prev());
  end.addEventListener('click', () => on.end());
  card.addEventListener('keydown', onKey);
  // The body's height changes with the card's (a resize, the voice's disclosure showing) as well as
  // with its content, so its scroll-region state is kept in step with both.
  if (typeof ResizeObserver === 'function') new ResizeObserver(() => syncBody()).observe(card);
}

// The body scrolls only when its content is taller than it: then it is a focusable region named by
// the chapter, so a keyboard can reach and scroll it; otherwise none of the three attributes stay.
export function syncBody() {
  if (!els) return;
  const b = els.body;
  const over = !card.hidden && b.scrollHeight > b.clientHeight + 1;
  if (over === (b.getAttribute('tabindex') === '0')) return;
  if (over) { b.tabIndex = 0; b.setAttribute('role', 'region'); b.setAttribute('aria-labelledby', 'tour-chapter'); return; }
  // It had focus (the visitor stepped on from it): Next takes it rather than the page.
  if (document.activeElement === b) els.next.focus({ preventScroll: true });
  b.removeAttribute('tabindex'); b.removeAttribute('role'); b.removeAttribute('aria-labelledby');
}

function onKey(e) {
  if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.target.closest?.('input, textarea, select, [contenteditable]')) return;
  // A held key repeats: after a pick focus is on Next (or a new option sits where the last one was),
  // so a repeat would commit a step the visitor never saw. preventDefault stops the button's own
  // activation too.
  if (e.repeat && (/^[1-9]$/.test(e.key) || e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); return; }
  const opts = [...els.options.querySelectorAll('.tour-opt')];
  if (/^[1-9]$/.test(e.key)) {
    const o = !els.choice.hidden && opts[+e.key - 1];
    if (o) { e.preventDefault(); o.click(); }
    return;
  }
  const at = opts.indexOf(e.target.closest?.('.tour-opt'));
  if (at >= 0) {
    // Arrows move focus between options only; Enter, Space or a digit commits.
    const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (step) { e.preventDefault(); opts[(at + step + opts.length) % opts.length].focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); opts[e.key === 'Home' ? 0 : opts.length - 1].focus(); }
    return;
  }
  if (e.key === 'ArrowRight') { e.preventDefault(); on.next(); }
  else if (e.key === 'ArrowLeft') { e.preventDefault(); on.prev(); }
}

export function showCard(visible) { card.hidden = !visible; }
export function cardContains(node) { return !!node && card.contains(node); }
export function nextButton() { return els?.next || null; }
// For the modules that join the card later (the guide sphere, the voice controls, map and Ask).
export function cardParts() { return els; }

// Two guides (O12). The head row names whoever says the line on screen, and the card carries that
// guide's id (data-guide: the sphere's tint); the card's accessible name follows the lead, the guide
// the visitor chose, so it does not change from line to line.
export function setSpeaker(id, name) {
  if (!els) return;
  if (els.name.textContent !== name) els.name.textContent = name;
  if (card.dataset.guide !== id) card.dataset.guide = id || '';
}
export function setCardLabel(name) { card.setAttribute('aria-label', `${name}, ${getManifest().guide.title}`); }

export function setHead({ state, chapter, progress }) {
  els.state.textContent = state;
  els.chapter.textContent = chapter;
  els.fill.style.setProperty('--p', String(Math.max(0, Math.min(1, progress))));
}

// A figure written with digits: the digit rules of figures() in tools/check-manifest.js (percent,
// currency, thousands, multiples, magnitudes, durations). Every figure in a caption arrives through
// a ref to a sourced manifest field, which are written with digits.
const FIGURE = /\d(?:[\d,.]*\d)?\s?%|[$€£]\s?\d|\b\d{1,3}(?:,\d{3})+\b|\b\d+(?:\.\d+)?\s?(?:\+|×|x\b)|\b\d+(?:\.\d+)?(?:k|bn|b|m)\b|\b\d+(?:\.\d+)?[\s-]+(?:hundred|thousand|million|billion|trillion|(?:(?:business|working|calendar)[\s-]+)?(?:second|minute|hour|day|week|month|quarter|year)s?)\b|\bpercent\b/i;

// The caption: one clean text node for assistive technology, and word spans (aria-hidden) that a
// voice can highlight. Every word keeps full contrast; the spans reproduce the text exactly.
// callouts: [{text, source, same}]; one that repeats the caption (same) prints only its source,
// under the caption; the others are tiles with their source. A caption that carries a figure while
// its source sits in a tile for another field (an opening line citing the room's statistic) also
// prints that tile's source under the caption, so the figure and its source are read together at
// any card height.
export function setLine(line, { callouts = [] } = {}) {
  const cap = els.caption;
  cap.replaceChildren();
  cap.hidden = !line;
  if (line) {
    const words = el('span', 'tour-words'); words.setAttribute('aria-hidden', 'true');
    let at = 0;
    tokens(line.text).forEach((t, i) => {
      if (t.start > at) words.append(line.text.slice(at, t.start));
      const w = el('span', 'w', t.text); w.dataset.i = String(i);
      words.append(w);
      at = t.end;
    });
    if (at < line.text.length) words.append(line.text.slice(at));
    cap.append(el('span', 'sr', line.text), words);
    cap.dataset.line = line.id || '';
  }
  const tiles = callouts.filter((c) => !c.same);
  const cite = callouts.find((c) => c.same && c.source) || (line && FIGURE.test(line.text) ? tiles.find((c) => c.source) : null);
  els.src.textContent = cite ? cite.source : '';
  els.src.hidden = !cite;
  els.callouts.replaceChildren(...tiles.map((c) => {
    const t = el('div', 'tour-callout');
    t.append(el('p', 'tour-callout-text', c.text));
    if (c.source) t.append(el('p', 'src', c.source));
    return t;
  }));
  els.callouts.hidden = !tiles.length;
  els.body.scrollTop = 0;
  syncBody();
}

// The rooms that talk back (O14): a visually hidden list after the caption, "The room shows:" and
// the words on every lit surface (a sourced figure with its source), so nothing the room writes is
// visual only. items: [string]; none hides the list.
export function setRoomShows(items) {
  if (!els) return;
  const list = (items || []).filter((t) => typeof t === 'string' && t.trim());
  const same = list.length === els.roomList.children.length && list.every((t, i) => els.roomList.children[i].textContent === t);
  if (!same) els.roomList.replaceChildren(...list.map((t) => el('li', null, t)));
  els.room.hidden = !list.length;
}

// The choice group, labelled by its prompt: buttons (or links, for Talk and the summary's mail
// draft), each at least 44 px, with a number badge for the digit keys and Suggested / Visited
// written as text inside the name. choice: {prompt, options:[{id, label, sub?, tags, href?,
// newTab?, ariaLabel?}]} or null.
export function setChoice(choice) {
  if (!choice) { els.choice.hidden = true; els.options.replaceChildren(); card.classList.remove('choosing'); syncBody(); return; }
  els.prompt.textContent = choice.prompt;
  els.options.replaceChildren(...choice.options.map(optionEl));
  els.choice.hidden = false;
  card.classList.add('choosing');
  syncBody();
}

function optionEl(o, i) {
  const b = el(o.href ? 'a' : 'button', 'tour-opt');
  if (o.href) { b.href = o.href; if (o.newTab) { b.target = '_blank'; b.rel = 'noopener noreferrer'; } }
  else b.type = 'button';
  b.dataset.option = o.id;
  if (i < 9) { const n = el('span', 'n', String(i + 1)); n.setAttribute('aria-hidden', 'true'); b.append(n); }
  b.append(el('span', 'tour-opt-label', o.label));
  if (o.sub) b.append(' ', el('span', 'tour-opt-sub', o.sub));
  for (const t of o.tags || []) b.append(' ', el('span', `tour-tag ${t.kind}`, t.text));
  if (o.ariaLabel) b.setAttribute('aria-label', o.ariaLabel);
  // The second click of a double-click lands on whatever the first one put here (the next node's
  // option in the same place): only a single click (detail 1) or a key (detail 0) picks.
  b.addEventListener('click', (e) => { if (e.detail > 1) { e.preventDefault(); return; } on.pick(o, e); });
  b.addEventListener('focus', () => on.preview(o));
  b.addEventListener('blur', () => on.preview(null));
  b.addEventListener('pointerenter', () => on.preview(o));
  b.addEventListener('pointerleave', () => { if (document.activeElement !== b) on.preview(null); });
  return b;
}

export function setNext(label) { if (els.next.textContent !== label) els.next.textContent = label; }
// Previous on a node's first line: aria-disabled, never `disabled`, so a Previous that has focus
// keeps it when the voice moves the tour into a new node (focus moves only on the visitor's action).
export function setPrev(disabled) {
  const v = disabled ? 'true' : 'false';
  if (els.prev.getAttribute('aria-disabled') !== v) els.prev.setAttribute('aria-disabled', v);
}

export function focusNext() { els?.next.focus({ preventScroll: true }); }
// Choose: the first option takes focus and is scrolled into the visible part of the card (the body,
// or the whole card on a short viewport) without moving the page.
export function focusFirstOption() {
  const o = els?.options.querySelector('.tour-opt');
  if (o) { o.focus({ preventScroll: true }); o.scrollIntoView({ block: 'nearest', inline: 'nearest' }); }
  return !!o;
}

// The polite live region: cleared, then set on the next tick, so the same words twice still speak.
let sayT = 0;
export function say(text) {
  live.textContent = '';
  clearTimeout(sayT);
  if (text) sayT = setTimeout(() => { live.textContent = text; }, 0);
}

// The chapter title card: decorative (aria-hidden; the chapter is announced and shown in the card),
// opacity and transform only, never under reduced motion. at: the frame's centre in viewport px.
let tcT = 0;
export function showTitleCard({ eyebrow, title, at }) {
  if (!titleCard || reducedMotion()) return;
  titleCard.replaceChildren();
  if (eyebrow) titleCard.append(el('p', 'tour-tc-eyebrow', eyebrow));
  titleCard.append(el('p', 'tour-tc-title', title));
  titleCard.style.left = `${Math.round(at.x)}px`;
  titleCard.style.top = `${Math.round(at.y)}px`;
  titleCard.classList.remove('on');
  titleCard.hidden = false;
  void titleCard.offsetWidth;   // restart the animation when chapters follow each other quickly
  titleCard.classList.add('on');
  clearTimeout(tcT);
  tcT = setTimeout(hideTitleCard, 2100);
}
export function hideTitleCard() {
  clearTimeout(tcT);
  if (!titleCard) return;
  titleCard.classList.remove('on');
  titleCard.hidden = true;
}
