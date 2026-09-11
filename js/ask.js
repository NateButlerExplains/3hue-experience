// Ask AiVRIC (O10): a native modal <dialog id="tour-ask"> that answers only with the approved
// answers in content/tour.json (ask.questions). Nothing is generated and nothing leaves the page.
//
// The visitor types a question (or speaks one, below) or picks a suggested one; js/ask-match.js
// finds the approved question it matches. The answer always shows "Answering: {q}" first, so the
// visitor sees which approved question was matched, then its lines with their printed sources, then:
//   Take me there (when the question points at a chapter), Send me this answer (a mail draft with
//   no recipient: the approved question and answer, never the visitor's own words), Talk to our
//   team (resolveHref('booking'), new tab, O2), and related questions.
// A near miss offers "Did you mean" questions; no match says so and offers the team and suggestions.
// The one text field has no name and sits in a form that submits nowhere: it collects nothing.
//
// The microphone is optional: shown only where the browser has speech recognition, and the first
// press in a page shows the manifest's disclosure (tourMicDisclosure) before anything listens. The
// transcript fills the field and is matched like typed text. The acknowledgement lives in memory
// only, for this page; nothing is stored.
//
// Opening Ask pauses the tour (pause reason "ask"; "mic" while listening); closing lifts them and
// returns focus to the button that opened it. An answer is said by the voice when it can (api.speak,
// js/voice.js on its own element, so the tour keeps its place); for a typed or spoken question,
// whatever the voice does not actually play (no audio, an MP3 that fails, a refused play(), the
// voice off) is read out in the dialog's own polite live region (the page's live region is inert
// under a modal dialog). Closing Ask, or showing anything else, stops the voice.
import { getManifest, str, resolveHref, guideName, guideNames } from './content.js?v=2026-09-10f';
import { resolveLine, fillTemplate } from './tourtext.js?v=2026-09-10f';
import { buildIndex, match, related, MAX_INPUT } from './ask-match.js?v=2026-09-10f';
import { modal, dialogHead, toolButton, icon } from './tourmap.js?v=2026-09-10f';

const dlg = document.getElementById('tour-ask');
const MAIL_MAX = 1800;        // characters in the mail draft's body
const SUGGEST = 4;            // suggested questions on the first view
let api = null;               // from js/tour.js: script(), ctx(), jump(node), chapterOf(node), chapter(), node(), hold(reason, on), speak(lines, {onMiss}), hush()
let shell = null, els = null;
let Q = [], index = null;     // the questions as the visitor reads them, and their match index
let micAck = false, rec = null;

const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const SR = () => window.SpeechRecognition || window.webkitSpeechRecognition || null;

export function initAsk(a) {
  api = a;
  shell = modal(dlg, 'ask', { onOpen: () => api.hold('ask', true), onClose: () => { stopMic(true); api.hush?.(); api.hold('ask', false); } });
}
export function askButton() {
  const b = toolButton('tour-ask-btn', str('tourAsk', { guide: guideName() }), 'ask');
  b.addEventListener('click', () => openAsk(b));
  return b;
}
export const askOpen = () => !!shell?.isOpen();
export function closeAsk(opts) { shell?.close(opts); }

export function openAsk(opener) {
  if (!api || shell.isOpen() || !load()) return;
  build();
  els.input.value = '';
  hideNote();
  status('');
  const intro = home();
  shell.open(opener, els.input);
  // The intro is said by the voice when it is on (rendered like any other line; ask-intro).
  if (intro?.id && intro.text && api.speak) api.speak([intro]);
}

// The approved questions, resolved for this visitor (names and refs filled from the manifest).
function load() {
  const a = api.script()?.ask;
  if (!a?.questions?.length) return false;
  const m = getManifest(), c = api.ctx();
  Q = a.questions.map((x) => {
    // say: what the voice read instead of the caption; part of the line's hash (js/voice.js).
    const lines = (x.lines || []).map((l) => { const r = resolveLine(l, m, c); if (r && !r.source && x.source) r.source = x.source; if (r) r.say = typeof l.say === 'string' ? fillTemplate(l.say, m, c) : ''; return r; }).filter((r) => r && r.text.trim());
    return { id: x.id, label: fillTemplate(x.q, m, c), keys: x.keys || [], goto: x.goto || null, lines };
  }).filter((x) => x.label.trim() && x.lines.length);
  index = buildIndex(Q.map((x) => ({ id: x.id, q: x.label, keys: x.keys, text: x.lines.map((l) => l.text).join(' ') })), { names: guideNames() });
  return Q.length > 0;
}
const byId = (id) => Q.find((x) => x.id === id) || null;

function build() {
  if (els) return;
  const m = getManifest();
  dlg.replaceChildren();
  const { head } = dialogHead(dlg, 'tour-ask-h', str('tourAsk', { guide: guideName() }), () => closeAsk());
  const body = el('div', 'tour-dlg-body');
  const intro = el('p', 'ask-intro'); intro.id = 'tour-ask-intro';

  const form = el('form', 'ask-form'); form.noValidate = true;
  const label = el('label', 'ask-label', str('tourAskLabel')); label.htmlFor = 'tour-ask-q'; label.id = 'tour-ask-label';
  const row = el('div', 'ask-row');
  const input = el('input', 'ask-input'); input.id = 'tour-ask-q'; input.type = 'text';
  Object.assign(input, { autocomplete: 'off', spellcheck: true, maxLength: MAX_INPUT });
  input.setAttribute('autocapitalize', 'sentences'); input.setAttribute('enterkeyhint', 'send');
  const submit = el('button', 'btn primary ask-submit', str('tourAskSubmit')); submit.type = 'submit'; submit.id = 'tour-ask-submit';
  row.append(input, submit);
  const mic = el('button', 'btn outline ask-mic'); mic.type = 'button'; mic.id = 'tour-ask-mic';
  mic.append(icon('mic'), el('span', 'sr', str('tourAskMic')));
  mic.setAttribute('aria-pressed', 'false');
  mic.hidden = !SR();
  row.append(mic);
  const note = el('div', 'ask-mic-note'); note.id = 'tour-ask-mic-note'; note.hidden = true;
  const noteText = el('p', 'ask-mic-text', str('tourMicDisclosure')); noteText.id = 'tour-ask-mic-text';
  const noteBar = el('div', 'ask-mic-bar');
  const ok = el('button', 'btn primary', str('tourMicConfirm')); ok.type = 'button'; ok.id = 'tour-ask-mic-ok'; ok.setAttribute('aria-describedby', noteText.id);
  const no = el('button', 'btn outline', str('tourMicCancel')); no.type = 'button'; no.id = 'tour-ask-mic-no';
  noteBar.append(ok, no);
  note.append(noteText, noteBar);
  const stat = el('p', 'ask-status'); stat.id = 'tour-ask-status'; stat.setAttribute('role', 'status');
  form.append(label, row, note, stat);

  const result = el('div', 'ask-result'); result.id = 'tour-ask-result';
  const live = el('p', 'sr'); live.id = 'tour-ask-live'; live.setAttribute('aria-live', 'polite'); live.setAttribute('aria-atomic', 'true');
  body.append(intro, form, result, live);
  dlg.append(head, body);
  els = { body, intro, form, input, submit, mic, note, ok, no, stat, result, live };

  form.addEventListener('submit', (e) => { e.preventDefault(); ask(input.value); });
  mic.addEventListener('click', () => { if (rec) { stopMic(false); return; } if (!micAck) showNote(); else startMic(); });
  // Accepting hides the note; focus goes back to the microphone button, which now shows it listens.
  ok.addEventListener('click', () => { micAck = true; hideNote(); mic.focus({ preventScroll: true }); startMic(); });
  no.addEventListener('click', () => { hideNote(); mic.focus(); });
}

// ---- Views ----
// The first view: the intro line, a few suggested questions (those that point at the chapter on
// screen first), and every approved question behind a disclosure.
function home() {
  const a = api.script().ask;
  const m = getManifest(), c = api.ctx();
  const intro = a.intro ? resolveLine(a.intro, m, c) : null;
  if (intro) intro.say = typeof a.intro.say === 'string' ? fillTemplate(a.intro.say, m, c) : '';
  els.intro.textContent = intro?.text || '';
  els.intro.hidden = !intro?.text;
  const here = api.chapter();
  const near = Q.filter((q) => q.goto && here && api.chapterOf(q.goto) === here);
  const pick = [...near, ...Q.filter((q) => !near.includes(q))].slice(0, SUGGEST);
  els.result.replaceChildren(chips(str('tourAskSuggested'), pick.map((q) => q.id), 'tour-ask-suggested'), all());
  return intro;
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

function talkLink() {
  const m = getManifest(), url = resolveHref('booking');
  const a = el('a', 'btn primary ask-talk', str('talk'));
  a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
  a.setAttribute('aria-label', `${str('talk')}, ${str('newTab', { host: new URL(m.site.bookingUrl).host })}`);
  return a;
}

function answer(id, { focus = false, announce = false } = {}) {
  const q = byId(id);
  if (!q) return;
  const sec = el('section', 'ask-answer'); sec.setAttribute('aria-labelledby', 'tour-ask-answering');
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
  acts.append(mail, talkLink());
  sec.append(head, lines, acts, chips(str('tourAskRelated'), related(index, q.id, 3), 'tour-ask-related'));
  els.result.replaceChildren(sec);
  els.body.scrollTop = 0;
  if (focus) head.focus({ preventScroll: true });
  // A typed or spoken question: whatever the voice does not actually say (off, no audio, an MP3
  // that fails to load or play, from that line on) is read out here instead, while this answer
  // is still the one on screen.
  const readOut = (rest) => { if (announce && rest?.length && els.result.contains(sec)) say(`${head.textContent} ${rest.map((l) => l.text).join(' ')}`); };
  if (api.speak) api.speak(q.lines, { onMiss: readOut }); else readOut(q.lines);
}

function choose(ids, { announce = false } = {}) {
  api.hush?.();
  const wrap = chips(str('tourAskChoose'), ids, 'tour-ask-choose');
  els.result.replaceChildren(wrap, all());
  if (announce) say(`${str('tourAskChoose')} ${str('tourChoicesLive', { count: ids.length })}`);
}

function none({ announce = false } = {}) {
  api.hush?.();
  const note = el('div', 'ask-none');
  const p = el('p', 'ask-note', str('tourAskNone')); p.id = 'tour-ask-none';
  const acts = el('div', 'ask-actions');
  acts.append(talkLink());
  note.append(p, acts);
  els.result.replaceChildren(note, chips(str('tourAskSuggested'), Q.slice(0, SUGGEST).map((q) => q.id), 'tour-ask-suggested'), all());
  if (announce) say(str('tourAskNone'));
}

function ask(text) {
  const r = match(index, text);
  if (r.kind === 'empty') { els.input.focus(); return; }
  if (r.kind === 'answer') answer(r.id, { announce: true });
  else if (r.kind === 'choose') choose(r.ids, { announce: true });
  else none({ announce: true });
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

// The dialog's own live region: cleared, then set on the next tick, so the same words twice still speak.
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
