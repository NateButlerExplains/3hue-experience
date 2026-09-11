// Ask (O10, O12): "Ask Avi" (or Huey, whoever leads) in the header's top right, opening a console
// docked on the right: the owner's Ask console, ported with his permission (3HUE/3HUE-Website
// experience/js/tour/ask.js at 797b153, see docs/PROVENANCE.md) onto this repo's approved-answers
// engine. It answers only with the approved answers in content/tour.json (ask.questions). Nothing is
// generated and nothing leaves the page.
//
// The console is a native modal <dialog id="tour-ask"> (the owner's is not: here the page behind is
// inert, focus stays inside, Escape closes it and focus returns to the button that opened it). Its
// head carries the lead's sphere and name, Minimise and Close; two tabs follow (the ARIA tabs
// pattern, arrow keys between them): Conversation and Explore.
//   Conversation  the approved answers the visitor has asked for this tour, in order: the visitor's
//                 own words (shown here only), "Answering: {q}" so they see which approved question
//                 was matched, its lines with their printed sources, then Take me there (when the
//                 question points at a chapter), Send me this answer (a mail draft with no
//                 recipient: the approved question and answer, never the visitor's own words),
//                 Learn more on 3hue.net (a page on the manifest's allowlist, new tab), Play (the
//                 lead's voice, when a voice can play) and related questions. Under the answers:
//                 suggested questions (the node's own `ask` list, else those that point at the
//                 chapter on screen) and every question behind a disclosure. The one text field has
//                 no name and sits in a form that submits nowhere: it collects nothing.
//   Explore       the tour's chapters (the map's rows): a row goes there.
// Minimise closes the console into a pill under the header's right edge, keeping the conversation;
// the tour stays paused ("Paused", Resume in the card) until the visitor resumes it or opens the
// pill again and closes the console. Close resumes the tour. A chip answers by its question's id
// (the owner's re-ran the chip's words through the matcher, which could answer another question).
//
// Outside the tour (the gate open, the tour not started) the header button still opens the console:
// the script is fetched then, and Take me there or an Explore row starts the tour at that chapter.
//
// The microphone is optional: shown only where the browser has speech recognition, and the first
// press in a page shows the manifest's disclosure (tourMicDisclosure) before anything listens. The
// transcript fills the field and is matched like typed text; the sphere shows its listening ring.
// The acknowledgement lives in memory only, for this page; nothing is stored.
//
// Opening Ask pauses the tour (pause reason "ask"; "mic" while listening). An answer is said by the
// lead's voice when it can (api.speak, js/voice.js on its own element, so the tour keeps its place);
// for a typed or spoken question, whatever the voice does not actually play (no audio, an MP3 that
// fails, a refused play(), the voice off) is read out in the console's own polite live region (the
// page's live region is inert under a modal dialog). Closing Ask, or showing anything else, stops
// the voice.
import { getManifest, str, resolveHref, guideName, guideNames } from './content.js?v=2026-09-10f';
import { resolveLine, fillTemplate } from './tourtext.js?v=2026-09-10f';
import { buildIndex, match, related, MAX_INPUT } from './ask-match.js?v=2026-09-10f';
import { modal, icon, chapterRow } from './tourmap.js?v=2026-09-10f';
import { attachOrb, setLeadGuide } from './guide.js?v=2026-09-10f';

const dlg = document.getElementById('tour-ask');
const hudBtn = document.getElementById('tour-ask-btn');
const pill = document.getElementById('ask-pill');
const MAIL_MAX = 1800;        // characters in the mail draft's body
const SUGGEST = 4;            // suggested questions
const HISTORY = 12;           // answers kept in the conversation
// Ids the newest entry carries; an older entry's get its number appended.
const ENTRY_IDS = ['tour-ask-answering', 'tour-ask-goto', 'tour-ask-mail', 'tour-ask-learn', 'tour-ask-play', 'tour-ask-related', 'tour-ask-choose', 'tour-ask-none', 'tour-ask-you'];
// api, from js/tour.js: script(), ensure() → Promise<boolean>, ctx(), lead(), suggest(), chapters(),
// jump(node), chapterOf(node), chapter(), node(), hold(reason, on), speak(lines, {onMiss}), hush(),
// canSpeak(), touring().
let api = null;
let shell = null, els = null;
let Q = [], index = null;     // the questions as the visitor reads them, and their match index
let micAck = false, rec = null;
let lead = null, greeted = false, minimised = false, heldByPill = false, entries = 0;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;

export function initAsk(a) {
  api = a;
  shell = modal(dlg, 'ask', {
    onOpen: () => { document.body.classList.add('ask-open'); api.hold('ask', true); },
    onClose: () => {
      stopMic(true); api.hush?.();
      document.body.classList.remove('ask-open');
      if (!minimised && heldByPill) { heldByPill = false; api.hold('user', false); }
      api.hold('ask', false);
    },
  });
  if (!hudBtn.querySelector('.hud-ask-label')) hudBtn.replaceChildren(icon('ask'), el('span', 'hud-ask-label'));
  hudBtn.addEventListener('click', () => openAsk(hudBtn));
  pill.replaceChildren(el('canvas', 'ask-orb ask-pill-orb'), el('span', 'ask-pill-label'));
  pill.querySelector('canvas').setAttribute('aria-hidden', 'true');
  pill.addEventListener('click', () => restoreAsk());
  setAskLead(api.lead());
}
// The header button shows whenever the tour is on (gate approved, or ?tour=1): index.html's head
// script already set data-tour-on before first paint; this keeps it in step with the manifest.
export function showAskButton(on) { document.documentElement.toggleAttribute('data-tour-on', !!on); }
export function askButton() { return hudBtn; }
export const askOpen = () => !!shell?.isOpen();
export function closeAsk(opts) { shell?.close(opts); }

// The lead changed (the visitor's pick, a replay): the button, the pill, the console's name and sphere.
export function setAskLead(id) {
  lead = id;
  const name = guideName(id);
  const label = str('tourAsk', { guide: name });
  hudBtn.querySelector('.hud-ask-label').textContent = label;
  pill.querySelector('.ask-pill-label').textContent = label;
  pill.setAttribute('aria-label', str('tourAskPill', { guide: name }));
  if (els) { els.title.textContent = label; }
  setLeadGuide(id);
}

// The tour ended or started over: the conversation goes, and the pill with it.
export function resetAsk() {
  if (shell?.isOpen()) shell.close({ restore: false });
  minimised = false; heldByPill = false; greeted = false; entries = 0;
  pill.hidden = true;
  if (els) { els.log.replaceChildren(els.intro); els.input.value = ''; hideNote(); status(''); }
}

export function openAsk(opener) {
  if (!api || shell.isOpen()) return;
  if (api.script()) { show(opener); return; }
  api.ensure().then((ok) => { if (ok && !shell.isOpen()) show(opener); });
}

function show(opener) {
  if (!load()) return;
  build();
  minimised = false;
  pill.hidden = true;
  hideNote(); status('');
  selectTab('conv', { focus: false });
  const intro = greet();
  refreshSuggest();
  shell.open(opener === pill ? hudBtn : opener, els.input);
  scrollToEnd();
  // The intro is said once a tour, by the lead's voice when it is on (rendered like any other line).
  if (intro?.id && intro.text && api.speak) api.speak([intro]);
}

// Minimise: the conversation stays; the tour stays paused until the visitor resumes it.
function minimise() {
  if (!shell.isOpen()) return;
  minimised = true;
  if (api.touring()) { heldByPill = true; api.hold('user', true); }
  shell.close({ restore: false });
  pill.hidden = false;
  pill.focus({ preventScroll: true });
}
function restoreAsk() {
  if (!minimised) return;
  show(hudBtn);
}

// The approved questions, resolved for this visitor (names and refs filled from the manifest; the
// lead's name wherever an answer says {guide}).
function load() {
  const a = api.script()?.ask;
  if (!a?.questions?.length) return false;
  const m = getManifest(), c = api.ctx();
  Q = a.questions.map((x) => {
    // say: what the voice read instead of the caption; part of the line's hash (js/voice.js).
    const lines = (x.lines || []).map((l) => { const r = resolveLine(l, m, c); if (r && !r.source && x.source) r.source = x.source; if (r) r.say = typeof l.say === 'string' ? fillTemplate(l.say, m, c) : ''; return r; }).filter((r) => r && r.text.trim());
    return { id: x.id, label: fillTemplate(x.q, m, c), keys: x.keys || [], goto: x.goto || null, learnMore: x.learnMore || null, lines };
  }).filter((x) => x.label.trim() && x.lines.length);
  index = buildIndex(Q.map((x) => ({ id: x.id, q: x.label, keys: x.keys, text: x.lines.map((l) => l.text).join(' ') })), { names: guideNames() });
  return Q.length > 0;
}
const byId = (id) => Q.find((x) => x.id === id) || null;

function build() {
  if (els) return;
  const m = getManifest();
  dlg.replaceChildren();
  dlg.classList.add('ask-console');

  const head = el('div', 'ask-head');
  const orb = el('canvas', 'ask-orb'); orb.setAttribute('aria-hidden', 'true');
  const who = el('div', 'ask-who');
  const title = el('h2', 'ask-title', str('tourAsk', { guide: guideName(lead) })); title.id = 'tour-ask-h';
  who.append(title, el('p', 'ask-sub', m.guide.title));
  const min = el('button', 'btn outline ask-min'); min.type = 'button'; min.id = 'tour-ask-min';
  min.append(icon('minimise'), el('span', 'sr', str('tourAskMinimise')));
  const x = el('button', 'btn outline ask-x'); x.type = 'button'; x.id = 'tour-ask-x';
  x.append(icon('close'), el('span', 'sr', str('tourClose')));
  head.append(orb, who, min, x);
  dlg.setAttribute('aria-labelledby', title.id);

  // Tabs: a tablist of two; each panel is labelled by its tab. Arrow keys, Home and End move between
  // the tabs (roving tabindex), and a tab shows its panel as it takes focus.
  const tabs = el('div', 'ask-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', title.textContent);
  const tab = (id, text) => { const b = el('button', 'ask-tab', text); b.type = 'button'; b.id = `tour-ask-tab-${id}`; b.dataset.tab = id; b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', `tour-ask-panel-${id}`); return b; };
  const tConv = tab('conv', str('tourAskConversation')), tExp = tab('explore', str('tourAskExplore'));
  tabs.append(tConv, tExp);
  const panel = (id) => { const p = el('div', 'ask-panel'); p.id = `tour-ask-panel-${id}`; p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', `tour-ask-tab-${id}`); p.tabIndex = 0; return p; };
  const conv = panel('conv'), explore = panel('explore');

  const log = el('div', 'ask-log'); log.id = 'tour-ask-result';
  const intro = el('p', 'ask-intro'); intro.id = 'tour-ask-intro';
  log.append(intro);
  const suggest = el('div', 'ask-suggest'); suggest.id = 'tour-ask-suggest';
  conv.append(log, suggest);
  const list = el('ol', 'tour-map-list ask-explore'); list.id = 'tour-ask-explore';
  explore.append(list);
  explore.hidden = true;

  const form = el('form', 'ask-form'); form.noValidate = true;
  const label = el('label', 'ask-label', str('tourAskLabel')); label.htmlFor = 'tour-ask-q'; label.id = 'tour-ask-label';
  const row = el('div', 'ask-row');
  const input = el('input', 'ask-input'); input.id = 'tour-ask-q'; input.type = 'text';
  Object.assign(input, { autocomplete: 'off', spellcheck: true, maxLength: MAX_INPUT });
  input.setAttribute('autocapitalize', 'sentences'); input.setAttribute('enterkeyhint', 'send');
  const submit = el('button', 'btn primary ask-submit', str('tourAskSubmit')); submit.type = 'submit'; submit.id = 'tour-ask-submit';
  const mic = el('button', 'btn outline ask-mic'); mic.type = 'button'; mic.id = 'tour-ask-mic';
  mic.append(icon('mic'), el('span', 'sr', str('tourAskMic')));
  mic.setAttribute('aria-pressed', 'false');
  mic.hidden = !SR();
  row.append(input, mic, submit);
  const note = el('div', 'ask-mic-note'); note.id = 'tour-ask-mic-note'; note.hidden = true;
  const noteText = el('p', 'ask-mic-text', str('tourMicDisclosure')); noteText.id = 'tour-ask-mic-text';
  const noteBar = el('div', 'ask-mic-bar');
  const ok = el('button', 'btn primary', str('tourMicConfirm')); ok.type = 'button'; ok.id = 'tour-ask-mic-ok'; ok.setAttribute('aria-describedby', noteText.id);
  const no = el('button', 'btn outline', str('tourMicCancel')); no.type = 'button'; no.id = 'tour-ask-mic-no';
  noteBar.append(ok, no);
  note.append(noteText, noteBar);
  const stat = el('p', 'ask-status'); stat.id = 'tour-ask-status'; stat.setAttribute('role', 'status');
  form.append(note, label, row, stat);

  const foot = el('div', 'ask-foot');
  foot.append(talkLink('ask-foot-talk'));
  const live = el('p', 'sr'); live.id = 'tour-ask-live'; live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
  dlg.append(head, tabs, conv, explore, form, foot, live);
  els = { title, orb, min, x, tabs, tConv, tExp, conv, explore, log, intro, suggest, list, form, input, submit, mic, note, ok, no, stat, live };
  attachOrb(orb, { follow: 'lead' });
  attachOrb(pill.querySelector('canvas'), { follow: 'lead' });

  min.addEventListener('click', minimise);
  x.addEventListener('click', () => closeAsk());
  for (const t of [tConv, tExp]) t.addEventListener('click', () => selectTab(t.dataset.tab));
  tabs.addEventListener('keydown', onTabKey);
  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  mic.addEventListener('click', () => { if (rec) { stopMic(false); return; } if (!micAck) showNote(); else startMic(); });
  // Accepting hides the note; focus goes back to the microphone button, which now shows it listens.
  ok.addEventListener('click', () => { micAck = true; hideNote(); mic.focus({ preventScroll: true }); startMic(); });
  no.addEventListener('click', () => { hideNote(); mic.focus(); });
}

// ---- Tabs ----
function selectTab(id, { focus = true } = {}) {
  const conv = id !== 'explore';
  for (const [t, p, on] of [[els.tConv, els.conv, conv], [els.tExp, els.explore, !conv]]) {
    t.setAttribute('aria-selected', on ? 'true' : 'false');
    t.tabIndex = on ? 0 : -1;
    p.hidden = !on;
  }
  if (!conv) renderExplore();
  if (focus) (conv ? els.tConv : els.tExp).focus({ preventScroll: true });
}
function onTabKey(e) {
  const order = [els.tConv, els.tExp];
  const at = order.indexOf(document.activeElement);
  if (at < 0) return;
  const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: order.length - 1 }[e.key];
  if (to === undefined) return;
  e.preventDefault();
  selectTab(order[(to + order.length) % order.length].dataset.tab);
}

// Explore: the tour's chapters, as the map shows them; a row goes there (starting the tour when it
// has not started).
function renderExplore() {
  const rows = api.chapters().map((c, i) => chapterRow(c, i, () => { closeAsk({ restore: false }); api.jump(c.entry); }));
  els.list.replaceChildren(...rows);
}

// ---- The conversation ----
// The intro, once a tour, at the top of the conversation.
function greet() {
  if (greeted) return null;
  greeted = true;
  const a = api.script().ask;
  const m = getManifest(), c = api.ctx();
  const intro = a.intro ? resolveLine(a.intro, m, c) : null;
  if (intro) intro.say = typeof a.intro.say === 'string' ? fillTemplate(a.intro.say, m, c) : '';
  els.intro.textContent = intro?.text || '';
  els.intro.hidden = !intro?.text;
  return intro;
}

// Suggested questions: the node's own list (content/tour.json nodes.<id>.ask), else those that point
// at the chapter on screen, then script order; every question behind a disclosure.
function refreshSuggest() {
  const own = (api.suggest() || []).map(byId).filter(Boolean);
  const here = api.chapter();
  const near = Q.filter((q) => q.goto && here && api.chapterOf(q.goto) === here);
  const pick = [...new Set([...own, ...near, ...Q])].slice(0, SUGGEST);
  els.suggest.replaceChildren(chips(str('tourAskSuggested'), pick.map((q) => q.id), 'tour-ask-suggested'), all());
}

function all() {
  const d = el('details', 'ask-all');
  const s = el('summary', null, str('tourAskAll', { count: Q.length }));
  const ul = el('ul', 'ask-chips');
  for (const q of Q) { const li = el('li'); li.append(chip(q)); ul.append(li); }
  d.append(s, ul);
  return d;
}

function chips(title, ids, id) {
  const wrap = el('div', 'ask-group');
  const h = el('h3', 'ask-h', title); h.id = id;
  const ul = el('ul', 'ask-chips'); ul.setAttribute('aria-labelledby', id);
  for (const q of ids.map(byId).filter(Boolean)) { const li = el('li'); li.append(chip(q)); ul.append(li); }
  wrap.append(h, ul);
  return wrap;
}
function chip(q) {
  const b = el('button', 'ask-chip', q.label); b.type = 'button'; b.dataset.q = q.id;
  b.addEventListener('click', () => answer(q.id, { focus: true }));
  return b;
}

// Lines that share a source print it once, after the last of them.
function groups(lines) {
  const out = [];
  for (const l of lines) {
    const g = out[out.length - 1];
    if (g && g.source === (l.source || null)) g.lines.push(l); else out.push({ source: l.source || null, lines: [l] });
  }
  return out;
}

function talkLink(cls = 'ask-talk') {
  const m = getManifest(), url = resolveHref('booking');
  const a = el('a', `btn ${cls === 'ask-talk' ? 'primary' : 'outline'} ${cls}`, str('talk'));
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', `${str('talk')}, ${str('newTab', { host: new URL(m.site.bookingUrl).host })}`);
  return a;
}

// Learn more: a question's page on 3hue.net, only from the manifest's allowlist (site.learnMore:
// {hosts, pages: {key: {url, label}}}), and only https on a listed host with no query string.
export function learnMoreOf(key) {
  const lm = getManifest().site?.learnMore;
  const page = key && lm?.pages?.[key];
  if (!page || typeof page.url !== 'string') return null;
  let u;
  try { u = new URL(page.url); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || !(lm.hosts || []).includes(u.host)) return null;
  return { url: u.href, host: u.host, label: page.label || '' };
}

// A new entry: the one before it gives up the entry ids (its own number appended), and the oldest
// goes past HISTORY.
function addEntry(sec) {
  const prev = els.log.querySelector('.ask-entry:last-of-type');
  if (prev) retire(prev);
  sec.classList.add('ask-entry');
  sec.dataset.n = String(++entries);
  els.log.append(sec);
  const all = els.log.querySelectorAll('.ask-entry');
  for (let i = 0; i < all.length - HISTORY; i++) all[i].remove();
  return sec;
}
function retire(sec) {
  const n = sec.dataset.n;
  for (const id of ENTRY_IDS) {
    const e = sec.querySelector(`#${id}`);
    if (!e) continue;
    e.id = `${id}-${n}`;
    for (const ref of sec.querySelectorAll(`[aria-labelledby="${id}"]`)) ref.setAttribute('aria-labelledby', e.id);
  }
  if (sec.getAttribute('aria-labelledby') && !sec.querySelector(`#${sec.getAttribute('aria-labelledby')}`)) sec.setAttribute('aria-labelledby', `${sec.getAttribute('aria-labelledby')}-${n}`);
}
function you(text) {
  if (!text?.trim()) return null;
  const p = el('p', 'ask-you'); p.id = 'tour-ask-you';
  p.append(el('span', 'ask-you-k', str('tourAskYou')), ' ', el('span', 'ask-you-t', text.trim()));
  return p;
}
function scrollToEnd(node = null) {
  const p = els.conv;
  if (node) node.scrollIntoView({ block: 'nearest' }); else p.scrollTop = p.scrollHeight;
}

function answer(id, { focus = false, announce = false, asked = null } = {}) {
  const q = byId(id);
  if (!q) return;
  if (els.conv.hidden) selectTab('conv', { focus: false });
  const sec = el('section', 'ask-answer'); sec.setAttribute('aria-labelledby', 'tour-ask-answering');
  const mine = you(asked);
  const head = el('p', 'ask-answering', str('tourAskAnswering', { question: q.label })); head.id = 'tour-ask-answering'; head.tabIndex = -1;
  const lines = el('div', 'ask-lines');
  for (const g of groups(q.lines)) {
    for (const l of g.lines) { const p = el('p', 'ask-line', l.text); if (l.id) p.dataset.line = l.id; lines.append(p); }
    if (g.source) lines.append(el('p', 'ask-src', g.source));
  }
  const acts = el('div', 'ask-actions');
  if (q.goto && api.chapterOf(q.goto) && api.node() !== q.goto) {
    const go = el('button', 'btn outline ask-goto', str('tourTakeMeThere')); go.type = 'button'; go.id = 'tour-ask-goto';
    go.addEventListener('click', () => { closeAsk({ restore: false }); api.jump(q.goto); });
    acts.append(go);
  }
  const mail = el('a', 'btn outline ask-mail', str('tourAskSend')); mail.id = 'tour-ask-mail'; mail.href = mailFor(q);
  acts.append(mail);
  const lm = learnMoreOf(q.learnMore);
  if (lm) {
    const a = el('a', 'btn outline ask-learn', str('tourAskLearn', { host: lm.host })); a.id = 'tour-ask-learn';
    a.href = lm.url; a.target = '_blank'; a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', `${str('tourAskLearn', { host: lm.host })}${lm.label ? `: ${lm.label}` : ''}, ${str('newTab', { host: lm.host })}`);
    acts.append(a);
  }
  if (api.canSpeak?.()) {
    const play = el('button', 'btn outline ask-play'); play.type = 'button'; play.id = 'tour-ask-play';
    play.append(icon('play'), el('span', null, str('tourAskPlay')));
    play.addEventListener('click', () => api.speak(q.lines));
    acts.append(play);
  }
  sec.append(...[mine, head, lines, acts, chips(str('tourAskRelated'), related(index, q.id, 3), 'tour-ask-related')].filter(Boolean));
  addEntry(sec);
  scrollToEnd(sec);
  if (focus) head.focus({ preventScroll: true });
  // A typed or spoken question: whatever the voice does not actually say (off, no audio, an MP3
  // that fails to load or play, from that line on) is read out here instead, while this answer
  // is still the newest.
  const readOut = (rest) => { if (announce && rest?.length && els.log.lastElementChild === sec) say(`${head.textContent} ${rest.map((l) => l.text).join(' ')}`); };
  if (api.speak) api.speak(q.lines, { onMiss: readOut }); else readOut(q.lines);
}

function choose(ids, { announce = false, asked = null } = {}) {
  api.hush?.();
  const sec = el('section', 'ask-choice');
  const mine = you(asked);
  if (mine) sec.append(mine);
  sec.append(chips(str('tourAskChoose'), ids, 'tour-ask-choose'));
  addEntry(sec);
  scrollToEnd(sec);
  if (announce) say(`${str('tourAskChoose')} ${str('tourChoicesLive', { count: ids.length })}`);
}

function none({ announce = false, asked = null } = {}) {
  api.hush?.();
  const sec = el('section', 'ask-none');
  const mine = you(asked);
  const p = el('p', 'ask-note', str('tourAskNone')); p.id = 'tour-ask-none';
  const acts = el('div', 'ask-actions');
  acts.append(talkLink());
  sec.append(...[mine, p, acts].filter(Boolean));
  addEntry(sec);
  scrollToEnd(sec);
  if (announce) say(str('tourAskNone'));
}

function ask(text) {
  const r = match(index, text);
  if (r.kind === 'empty') { els.input.focus(); return; }
  const asked = String(text).slice(0, MAX_INPUT);
  els.input.value = '';
  if (r.kind === 'answer') answer(r.id, { announce: true, asked });
  else if (r.kind === 'choose') choose(r.ids, { announce: true, asked });
  else none({ announce: true, asked });
}

// The mail draft for one answer: the approved question and answer with their sources, the team's
// page and the lobby. No recipient; the visitor's own words are never in it.
function mailFor(q) {
  const m = getManifest();
  const parts = [q.label, ''];
  for (const g of groups(q.lines)) { parts.push(...g.lines.map((l) => l.text)); if (g.source) parts.push(`(${g.source})`); parts.push(''); }
  parts.push(`${str('talk')}: ${m.site.bookingUrl}`, str('tourAskMailSite', { site: m.site.name, url: m.site.url }));
  const subject = str('tourAskMailSubject', { question: q.label, site: m.site.name });
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(clip(parts.join('\r\n'), MAIL_MAX))}`;
}
function clip(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 40))}…`;
}

// The console's own live region: cleared, then set on the next tick, so the same words twice still speak.
let sayT = 0;
function say(text) {
  els.live.textContent = '';
  clearTimeout(sayT);
  if (text) sayT = setTimeout(() => { els.live.textContent = text; }, 0);
}
function status(text) { if (els) els.stat.textContent = text; }

// ---- The microphone ----
function showNote() { els.note.hidden = false; els.ok.focus({ preventScroll: true }); }
function hideNote() { if (els) els.note.hidden = true; }
function setMic(on) {
  els.mic.setAttribute('aria-pressed', on ? 'true' : 'false');
  els.mic.classList.toggle('on', on);
  api.hold('mic', on);
  document.dispatchEvent(new CustomEvent('lobby:ask', { detail: { type: 'listening', on } }));
}

function startMic() {
  const R = SR();
  if (!R || rec) return;
  let me, heard = '', done = false;
  const finish = () => { if (heard.trim() && !done && !me.cancelled) { done = true; ask(heard); } };
  try { me = new R(); } catch { status(str('tourMicFailed')); return; }
  rec = me;
  me.lang = getManifest().guide?.voice?.locale || 'en-US';
  me.interimResults = true; me.maxAlternatives = 1; me.continuous = false;
  me.onresult = (e) => {
    let t = '', final = false;
    for (let i = 0; i < e.results.length; i++) { t += e.results[i][0]?.transcript || ''; if (e.results[i].isFinal) final = true; }
    heard = t.slice(0, MAX_INPUT);
    els.input.value = heard;
    if (final) { status(''); finish(); try { me.stop(); } catch { /* already stopping */ } }
  };
  me.onerror = (e) => {
    if (e.error === 'aborted') return;
    const key = { 'not-allowed': 'tourMicBlocked', 'service-not-allowed': 'tourMicBlocked', 'no-speech': 'tourMicNoSpeech' }[e.error] || 'tourMicFailed';
    done = true;
    status(str(key));
  };
  me.onend = () => { if (rec === me) { rec = null; setMic(false); } if (els.stat.textContent === str('tourAskListening')) status(''); finish(); };
  setMic(true);
  status(str('tourAskListening'));
  try { me.start(); } catch { rec = null; setMic(false); status(str('tourMicFailed')); }
}
function stopMic(abort) {
  if (!rec) return;
  const me = rec;
  rec = null;
  if (abort) me.cancelled = true;
  try { if (abort) me.abort(); else me.stop(); } catch { /* not started */ }
  if (els) setMic(false);
}
