// The guided tour (O10/O11): AiVRIC walks the visitor through the lobby node by node from the script
// in content/tour.json (or ?tour-manifest=, a same-origin path), fetched only once the tour starts.
//
// The tour is one layer at #/tour/<node>. Starting it pushes one history entry; every node change
// replaces it, so Back always lands on the lobby. It moves the lobby only through the scene API in
// js/main.js and never opens a panel: stat and proof lines show callout tiles with their printed
// source instead. "See the details" (the explore action) hands over to #/door/<id>/<station> or
// #/path/<stage> by replacing the tour's entry, which ends the tour inside the normal panel.
//
// Pacing. With the voice on (js/voice.js) the tour moves at its pace: a line that played to its end
// hands over to the next 350 ms later, and the last line of a node continues to its next node the
// same way; a choice waits for the visitor ("Your call" once the last line has been said), and so
// does a terminal node. With the voice off, muted, locked (no gesture yet) or without audio for a
// line, that line waits for Next (or →) and nothing runs on a timer. Next skips what the voice is
// saying; Previous says the earlier line again. The live region (#tour-live) speaks a line only
// when the voice does not: the chapter when it changes, the line, and a waiting choice (with the
// voice on, once the voice has finished). A chapter is announced once, even when the visitor steps
// on before it was said (it carries to the next line); with the voice on, the first line of a new
// chapter waits until its announcement has been heard, so a screen reader and the voice never
// talk at once. A choice whose options take focus (a pick into a node with no lines, the summary)
// is not read out: the group's label says its prompt. Focus moves only because the visitor did
// something: start → Next; Choose → the first option; a pick → Next; End, Escape or Back → the walk
// button (of the layout on screen then); See the details → the panel heading. A control that hides
// under focus (Pause as the voice locks) hands it on: Pause to Voice, Voice to Next.
//
// Pause reasons (st.pausedBy): user (Pause), map, ask, mic, hidden (the tab), layer (holdTour(), for
// a layer that joins later). While any is held the voice stops where it is and nothing steps on; it
// carries on when the last one lifts. hidden and user lift only when the visitor moves the tour
// (Resume, Next, Previous, a pick, a jump from the map or Ask, Replay), so a returning tab never
// starts talking by itself; asking Ask a question lifts hidden too (the answer is the visitor's
// own move), while the tour stays held for Ask until it closes.
//
// The card's head row carries the guide's sphere (js/guide.js), the Voice toggle (aria-pressed; its
// description is guide.disclosure, shown in the card while the voice is on), Tour map
// (js/tourmap.js) and Ask (js/ask.js): two native modal dialogs that pause the tour while open and
// close on Escape back to the button that opened them. Pause / Resume sits between Previous and
// Next while the voice is on. The `ask` action opens Ask too; the summary stays in the card (a mail
// draft with no recipient, plus Copy).
//
// Rooms that talk back (O14). In a door or station scene the room's own surfaces (js/surfaces.js)
// show the fold of the node's writes (js/tourtext.js foldWrites): the node's base write, then every
// shown line's write up to the line on screen, re-derived on every render, so Previous, a deep link, a
// resize and each trigger version need no state of their own and nothing carries into the next node.
// An entry with `at` waits, while the voice says its line, for that word (lobby:voice word events);
// otherwise it shows as its line starts. A line's {surface} cue frames that surface and marks it; a
// click on a lit surface goes back to the first line of the node that writes or cues it. The card
// carries a visually hidden list of what the room shows, so none of it is visual only.
//
// Node fields read here (shape and rules: js/tourtext.js, tools/check-manifest.js): chapter, scene,
// write, lines (when, cue, callout, write), choice (prompt, remember, options with next|action,
// suggest, hideWhen), next, end, and quiet (no chapter title card when this node opens its chapter).
import { getManifest, getGeometry, getParams, str, safeRelative, resolveHref, kioskLines, guideName } from './content.js?v=2026-09-10f';
import { setInset, frameRect, bandOffset } from './stage.js?v=2026-09-10f';
import { go, back, currentRoute } from './router.js?v=2026-09-10f';
import { pushLayer, dropLayer, setOpener, topLayer } from './focus.js?v=2026-09-10f';
import { walkButton } from './hud.js?v=2026-09-10f';
import { setCurrent } from './hotspots.js?v=2026-09-10f';
import { lightStage, clearArcs } from './path.js?v=2026-09-10f';
import { resolveRef, resolveLine, fillTemplate, sceneOf, matches, resolveNext, optionValue, guideId, guideIds, speakerOf, foldWrites, resolveEntry, entryText } from './tourtext.js?v=2026-09-10f';
import { buildCard, showCard, cardContains, cardParts, setHead, setLine, setChoice, setNext, setPrev, focusNext, focusFirstOption, say, showTitleCard, hideTitleCard, syncBody, setSpeaker, setCardLabel, setRoomShows } from './dialogue.js?v=2026-09-10f';
import { setSurfaceState, clearSurfaces, surfaceStation, surfaceStats } from './surfaces.js?v=2026-09-10f';
import { initGuide, guideStats } from './guide.js?v=2026-09-10f';
import { initMap, mapButton, closeMap, mapOpen } from './tourmap.js?v=2026-09-10f';
import { initAsk, openAsk, askOpen, showAskButton, setAskLead, resetAsk } from './ask.js?v=2026-09-10f';
import { initVoice, beginVoice, endVoice, unlockVoice, speak, cancelVoice, pauseVoice, resumeVoice, voiceWanted, voiceOn, setVoiceMuted, speakAsk, hushAsk, voiceStats } from './voice.js?v=2026-09-10f';

const KEY = '3hue-experience:tour';   // sessionStorage only: the node, answers and visited chapters
const SUMMARY_MAX = 1800;             // characters in the mail draft's body
const GAP_MS = 350;                   // from the end of a voiced line to the next step
const CHAPTER_MS = 1400;              // a chapter's announcement is heard before the voice starts the line
const REASONS = new Set(['user', 'map', 'ask', 'mic', 'hidden', 'layer']);
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

let scene = null;                // the scene API from js/main.js
let T = null, loading = null;    // the script, once fetched
let touring = false;
let session = 0;                 // bumped by every start and end, so a late fetch can tell it is stale
let nodeToken = 0;               // bumped by every node entry, so a late scene can tell it is stale
const hooks = {};                // summary: a later closing screen may take the in-card summary over

const st = {
  node: null, chapter: null,
  frame: null,                   // what the card shows: a node, or the in-card Ask or summary
  nodeFrame: null,               // the node's own frame, to come back to
  li: 0,                         // the line on screen
  answers: {}, chosen: {}, visited: [], door: null,
  view: { kind: 'rest' },        // the scene on screen: {kind: rest|door|path|kiosk, door, station, stage, kiosk, cueDoor}
  applied: false,                // a scene has been set up since the tour began (a keep node needs one under it)
  ready: Promise.resolve(), sceneReady: true,
  pausedBy: new Set(),
  speaking: false,               // the voice has the line on screen (loading or playing it)
  voiceSeq: 0,                   // bumped whenever the voice is stopped, so a late report is ignored
  gapT: 0, stepPending: false,   // the step after a voiced line: waiting out the gap, or held by a pause
  chapterDue: null,              // a chapter on screen whose announcement has not been made yet
  heard: null,                   // the guide whose line the live region read last (its name leads a change)
  said: Infinity,                // the caption token the voice has reached on this line (Infinity: not voicing it)
  room: {},                      // what the room's surfaces show: {surfaceId: {kind, items}} (O14)
};
let vc = null;                   // the voice controls: {voice, pause, note}
let pickFocus = false;           // a pick is entering its target: a choice with no lines takes focus itself

// ---- Wiring ----
export function initTour({ scene: api }) {
  scene = api;
  initVoice();
  buildCard({ next, prev, end: () => endTour(), pick, preview });
  const parts = cardParts();
  initGuide(parts.orb);
  initMap({ chapters: mapChapters, jump: jumpTo, replay: replayTour, hold });
  // Ask says its intro and answers through speak() on its own element (#ask-audio), so the tour keeps
  // its place; an answer the voice cannot say (no audio, or audio that will not load or play) is read
  // out in Ask's own live region instead (opts.onMiss). Asking is the visitor's own move, so it lifts
  // a hidden tab's hold, which also holds Ask's element; the tour stays held for Ask until it closes.
  // Ask lives in the header (O12) and works outside the tour too: it fetches the script itself, and a
  // jump from it starts the tour at that node.
  initAsk({
    script: () => T, ensure: () => Promise.all([load(), loadStyles()]).then(([t, css]) => !!(t && css)),
    ctx, lead, touring: () => touring, canSpeak: () => touring && voiceWanted(),
    suggest: () => (touring && T?.nodes[st.node]?.ask) || null, chapters: mapChapters,
    jump: (id) => { if (touring) jumpTo(id); else startTour(id); },
    chapterOf: (id) => T?.nodes[id]?.chapter ?? null, chapter: () => st.chapter, node: () => st.node, hold,
    speak: (lines, opts) => {
      hushAsk();
      if (st.pausedBy.delete('hidden')) { syncPause(); emit('resume'); }
      return speakAsk((lines || []).map((l) => ({ id: l.id, text: l.text, say: l.say || '', who: lead() })), opts);
    },
    hush: hushAsk,
  });
  // Voice and Map sit in the head row before End tour (Ask is in the header); End keeps its name when
  // a composed layout shows only its ×. Pause sits between Previous and Next. The disclosure sits
  // under the card's text, outside the scrolling body.
  vc = voiceControls();
  hooks.lead = setAskLead;
  showAskButton(true);
  parts.end.before(vc.voice, mapButton());
  parts.end.setAttribute('aria-label', str('tourEnd'));
  parts.next.before(vc.pause);
  parts.body.after(vc.note);
  document.addEventListener('visibilitychange', () => { if (touring && document.hidden) hold('hidden', true); });
  // The voice reaching a word of the line on screen: a write waiting for it (`at`) shows (O14).
  document.addEventListener('lobby:voice', (e) => {
    const d = e.detail || {};
    if (!touring || d.type !== 'word' || !Number.isInteger(d.index) || d.index <= st.said) return;
    if (d.line == null || d.line !== (st.frame?.lines[st.li]?.id ?? null)) return;
    st.said = d.index;
    syncSurfaces();
  });
}
export function isTouring() { return touring; }
// A pause reason from outside the tour's own controls (a layer that joins later: 'layer').
export function holdTour(reason, on) { if (REASONS.has(reason)) hold(reason, on); }
// Later modules: setTourHooks({summary}) replaces the in-card summary; {lead(id)} hears the lead change.
export function setTourHooks(h) { Object.assign(hooks, h); }
// A jump the visitor asked for (the map, an Ask answer): that node, focus on Next. It moves the tour
// as Next does, so a Pause or a hidden tab's hold goes and the node's first line is heard.
export function jumpTo(id) { if (touring && T?.nodes[id]) { goNode(id); release(); focusNext(); } }
// Replay from the start (the close's replay action, the map): nothing remembered, focus on Next.
export function replayTour() {
  if (!touring || !T) return;
  forget(); clearStore(); st.chapter = null;
  resetAsk();
  goNode(T.start);
  afterPick();
}
export function tourScript() { return T; }

// A pause reason on or off. Captions move only when the visitor moves them, so with the voice off a
// reason changes nothing on screen; with it on, the voice stops where it is (and the step after a
// finished line waits) until no reason is left.
function hold(reason, on) {
  if (!touring) return;
  const had = st.pausedBy.has(reason);
  if (on) st.pausedBy.add(reason); else st.pausedBy.delete(reason);
  if (had !== !!on) { syncPause(); emit(on ? 'pause' : 'resume'); }
}
// The visitor moved the tour on: the holds only they lift (a hidden tab, Pause) go.
function release() {
  let changed = false;
  for (const r of ['hidden', 'user']) if (st.pausedBy.delete(r)) changed = true;
  if (changed) { syncPause(); emit('resume'); }
}
function syncPause() {
  const held = st.pausedBy.size > 0;
  // Ask speaks while the tour is held for it; a hidden tab or the microphone holds Ask too.
  if (st.pausedBy.has('hidden') || st.pausedBy.has('mic')) pauseVoice('ask'); else resumeVoice('ask');
  if (held) {
    pauseVoice('tour');
    if (st.gapT) { clearTimeout(st.gapT); st.gapT = 0; st.stepPending = true; }
  } else {
    resumeVoice('tour');
    if (st.stepPending) { st.stepPending = false; st.gapT = setTimeout(stepOn, GAP_MS); }
  }
  refreshHead();
  refreshControls();
}

// The map's rows: every chapter, titled from the manifest, with Now and Visited.
function mapChapters() {
  if (!T) return [];
  return T.chapters.map((c) => ({ id: c.id, entry: c.entry, title: chapterTitle(c), landmark: c.landmark || null, now: c.id === st.chapter, visited: st.visited.includes(c.id) }));
}

// The walk button, once the gate is open: push #/tour; the route fetches the script and replaces
// it with #/tour/<start>. A fresh start forgets the last session's answers.
export function startTour(node = null) {
  if (!scene || touring) return;
  unlockVoice();   // inside the click, before anything awaits: the audio may play from here on
  clearStore();
  go({ view: 'tour', node: typeof node === 'string' ? node : null });
}

// Every #/tour route lands here (main.js route()).
export function tourRoute(r, { animate = true, resize = false, boot = false } = {}) {
  if (!touring) { if (!resize) begin(r.node, { animate, boot }); return; }
  if (resize) { if (T && st.node) reapply(); return; }
  if (!T) return;   // still fetching: begin() reads the route when the script lands
  if (!r.node || !T.nodes[r.node]) { go({ view: 'tour', node: T.start }, { replace: true }); return; }
  if (r.node !== st.node) enterNode(r.node, { animate });
}

// End the tour. By default one Back closes its layer and the lobby returns focus to the walk
// button. silent: the route is already changing (Back, a hand-edited hash); drop: that route opens
// its own layer, so the tour's layer goes without returning focus. The walk button named at the
// start may have gone with its layout (an iPad rotated mid-tour), so the layer's opener becomes the
// walk button on screen now.
export function endTour({ silent = false, drop = false } = {}) {
  if (!touring) return;
  teardown();
  if (drop) dropLayer('tour');
  else if (topLayer()?.id === 'tour') setOpener(walkButton());
  if (!silent) back();
}

// ---- Loading ----
function tourPath() { return safeRelative(getParams().get('tour-manifest')) || safeRelative(getManifest().tour?.manifest) || null; }
function load() {
  if (T) return Promise.resolve(T);
  if (!loading) {
    const path = tourPath();
    loading = (path ? fetch(path, { cache: 'no-cache' }).then((r) => (r.ok ? r.json() : null)) : Promise.resolve(null))
      .then((t) => (isObj(t) && isObj(t.nodes) && Array.isArray(t.chapters) && t.nodes[t.start] ? t : null))
      .catch(() => null)
      .then((t) => { T = t; if (!t) loading = null; return t; });
  }
  return loading;
}

// The tour's stylesheet arrives with the tour, not in the page's render-blocking CSS, so the lobby's
// first paint pays nothing for it. It carries the ?v= stamp tools/stamp-version.py put on
// css/experience.css, so a publish busts both together.
let styles = null;
function loadStyles() {
  if (!styles) {
    styles = new Promise((res) => {
      const main = document.querySelector('link[rel="stylesheet"][href*="css/experience.css"]');
      const v = (main?.getAttribute('href').match(/\?v=[\w.-]+/) || [''])[0];
      const link = document.createElement('link');
      link.rel = 'stylesheet'; link.href = `css/tour.css${v}`;
      link.addEventListener('load', () => res(true), { once: true });
      link.addEventListener('error', () => { link.remove(); styles = null; res(false); }, { once: true });
      document.head.append(link);
    });
  }
  return styles;
}

function begin(node, { animate, boot }) {
  touring = true;
  const my = ++session;
  if (node == null) forget(); else restore();
  st.node = null; st.chapter = null; st.frame = st.nodeFrame = null; st.li = 0; st.pausedBy.clear(); st.applied = false; st.chapterDue = null; st.heard = null;
  syncLead();
  beginVoice();   // locked unless the start click unlocked it: a deep link, a reload or Forward waits for the visitor
  refreshControls();
  document.body.classList.add('touring');
  dropLayer('walk');   // a hand-edited hash from the walk: the walk's layer is not ours to keep
  setInset({ bottom: reserve() });
  pushLayer({ id: 'tour', opener: walkButton(), first: null, onEscape: () => endTour() });
  emit('start');
  Promise.all([load(), loadStyles()]).then(([t, css]) => {
    if (my !== session || !touring) return;
    if (!t || !css) { fail(); return; }
    showCard(true);
    const r = currentRoute();
    const want = r.view === 'tour' ? r.node : null;
    if (!want || !t.nodes[want]) go({ view: 'tour', node: t.start }, { replace: true });
    else enterNode(want, { animate, boot });
    focusNext();   // the visitor started the tour (or opened its link): focus goes to Next
  });
}

// The script could not be read: the silent walk takes over, in the tour's place in history.
function fail() {
  teardown();
  dropLayer('tour');
  document.documentElement.removeAttribute('data-lobby-boot');
  go({ view: 'walk', step: 0 }, { replace: true });
}

function teardown() {
  // A dialog still open (Back, a hand-edited hash) closes with the tour; nothing gets focus back.
  // Ask's conversation goes with it.
  closeMap({ restore: false }); resetAsk();
  stopVoice();
  endVoice();
  touring = false; session++; nodeToken++;
  refreshControls();
  if (cardContains(document.activeElement)) document.activeElement.blur();
  showCard(false);
  hideTitleCard();
  setChoice(null);
  say('');
  document.body.classList.remove('touring', 'tour-choosing');
  clearSurfaces(); st.room = {}; st.said = Infinity; setRoomShows(null);
  setInset({ bottom: 0 });
  st.node = null; st.chapter = null; st.frame = st.nodeFrame = null; st.li = 0; st.chapterDue = null;
  st.view = { kind: 'rest' }; st.ready = Promise.resolve(); st.sceneReady = true; st.applied = false;
  st.heard = null;
  delete document.body.dataset.lead;
  setAskLead(lead());
  emit('end');
}

// ---- Session state (sessionStorage, wrapped: Safari throws when storage is blocked) ----
function forget() { st.answers = {}; st.chosen = {}; st.visited = []; st.door = null; }
function save() {
  try { sessionStorage.setItem(KEY, JSON.stringify({ node: st.node, answers: st.answers, chosen: st.chosen, visited: st.visited, door: st.door })); } catch { /* storage blocked */ }
}
function clearStore() { try { sessionStorage.removeItem(KEY); } catch { /* storage blocked */ } }
function restore() {
  forget();
  let s = null;
  try { s = JSON.parse(sessionStorage.getItem(KEY) || 'null'); } catch { s = null; }
  if (!isObj(s)) return;
  const strings = (o) => Object.fromEntries(Object.entries(isObj(o) ? o : {}).filter(([, v]) => typeof v === 'string'));
  st.answers = strings(s.answers);
  st.chosen = strings(s.chosen);
  st.visited = Array.isArray(s.visited) ? s.visited.filter((x) => typeof x === 'string') : [];
  st.door = getManifest().doors.some((d) => d.id === s.door) ? s.door : null;
}

// ---- Nodes ----
// The lead (O12): the guide the visitor picked (a choice remembering `lead`), else the manifest's.
// It is an answer like any other, so saving, restoring, forgetting and Replay need nothing more.
const lead = () => guideId(getManifest(), st.answers.lead);
const ctx = () => ({ door: st.door, guide: lead(), answers: st.answers, chosen: st.chosen, visited: st.visited, tour: T });
// The page follows the lead: body[data-lead] (the accent), the card's name, Ask's label.
function syncLead() {
  const id = lead();
  if (id) document.body.dataset.lead = id; else delete document.body.dataset.lead;
  setCardLabel(guideName(id));
  hooks.lead?.(id);
}
const chapterOf = (id) => T.chapters.find((c) => c.id === id) || null;
const fill = (tpl) => fillTemplate(tpl, getManifest(), ctx());
const chapterTitle = (c) => (c ? fill(c.title) : '');
const chapterEyebrow = (c) => (c?.eyebrow ? fill(c.eyebrow) : '');

function goNode(id) {
  if (!T.nodes[id]) return;
  const r = currentRoute();
  // route() skips a state it already shows, so the node on screen restarts here.
  if (id === st.node && r.view === 'tour' && r.node === id) enterNode(id);
  else go({ view: 'tour', node: id }, { replace: true });
}

function enterNode(id, { animate = true, boot = false } = {}) {
  const node = T.nodes[id];
  const token = ++nodeToken;
  const chapterChanged = node.chapter !== st.chapter;
  st.node = id; st.chapter = node.chapter;
  if (!st.visited.includes(node.chapter)) st.visited.push(node.chapter);
  // The scene first: a door scene sets the door that `@` means in the lines below.
  st.sceneReady = false;
  st.ready = applyScene(sceneOf(node), { animate });
  st.ready.then(() => { if (token !== nodeToken) return; st.sceneReady = true; applyCue(st.frame?.kind === 'node' ? st.frame.lines[st.li] : null, animate); syncSurfaces(); });
  st.nodeFrame = st.frame = nodeFrame(node);
  st.li = 0;
  save();
  const ch = chapterOf(node.chapter);
  document.title = str('tourDocTitle', { chapter: chapterTitle(ch), site: getManifest().site.name });
  if (chapterChanged && !node.quiet && ch) { const R = frameRect(), o = bandOffset(); showTitleCard({ eyebrow: chapterEyebrow(ch), title: chapterTitle(ch), at: { x: o.x + R.cx, y: o.y + R.cy } }); }
  render({ chapter: chapterChanged });
  if (boot) document.documentElement.removeAttribute('data-lobby-boot');
  emit('node');
}

function nodeFrame(node) {
  const c = ctx();
  const lines = (node.lines || []).filter((l) => matches(l.when, c)).map((l) => lineOf(l, c)).filter(Boolean);
  const onContinue = node.next != null ? () => { const to = resolveNext(node.next, ctx(), T); if (to && T.nodes[to]) goNode(to); else endTour(); } : null;
  return { kind: 'node', write: isObj(node.write) ? node.write : null, lines, choice: node.choice ? choiceOf(node.choice, c) : null, onContinue };
}

// say: what the voice read instead of the caption, filled as tools/voice/items.mjs fills it; it is
// part of the line's hash, so js/voice.js can tell a line whose audio is out of date.
// who: the guide who says it (the line's `who`, else the lead), whose name {guide} fills with.
function lineOf(l, c) {
  const m = getManifest();
  const who = speakerOf(l, m, c.guide);
  const lc = who ? { ...c, guide: who } : c;
  const r = resolveLine(l, m, lc);
  if (!r || !r.text.trim()) return null;
  return { ...r, who, say: typeof l.say === 'string' ? fillTemplate(l.say, m, lc) : '', cue: isObj(l.cue) ? l.cue : null, callout: Array.isArray(l.callout) ? l.callout : [], write: isObj(l.write) ? l.write : null };
}

// A choice as shown: hidden options dropped (hideWhen, a target that does not resolve, the chapter
// the visitor is in), the first matching suggest marked Suggested, a chapter already seen marked
// Visited. Nothing is pre-selected.
function choiceOf(choice, c) {
  const m = getManifest();
  const here = chapterOf(st.chapter);
  const options = [];
  let suggested = false;
  for (const o of choice.options || []) {
    if (o.hideWhen !== undefined && matches(o.hideWhen, c)) continue;
    const target = o.next !== undefined ? resolveNext(o.next, c, T) : null;
    if (o.next !== undefined && !(target && T.nodes[target])) continue;
    const entryOf = target ? T.chapters.find((x) => x.entry === target) : null;
    if (entryOf && here && entryOf.id === here.id) continue;
    const label = fillTemplate(o.label ?? (o.action === 'talk' ? '{str:talk}' : ''), m, c).trim();
    if (!label) continue;
    const sub = o.sub ? fillTemplate(o.sub, m, c).trim() || null : null;
    const tags = [];
    if (!suggested && o.suggest !== undefined && matches(o.suggest, c)) { tags.push({ kind: 'suggested', text: str('tourSuggested') }); suggested = true; }
    if (entryOf && st.visited.includes(entryOf.id)) tags.push({ kind: 'visited', text: str('tourVisited') });
    const opt = { id: o.id, label, sub, tags, value: optionValue(o), target, action: o.action || null };
    if (o.action === 'talk') {
      const url = resolveHref('booking');
      Object.assign(opt, { href: url, newTab: true, ariaLabel: `${[label, sub, ...tags.map((t) => t.text)].filter(Boolean).join(', ')}, ${str('newTab', { host: new URL(url).host })}` });
    }
    options.push(opt);
  }
  return { prompt: fillTemplate(choice.prompt, m, c), remember: typeof choice.remember === 'string' ? choice.remember : null, options };
}

// ---- Scenes ----
// Aim the lobby for a node. Returns a promise that settles with the camera (and the room, for a
// door). A keep scene leaves everything as it is; opened first (a deep link) it gets the lobby at rest.
function applyScene(sc, { animate = true } = {}) {
  const k = sc.kind;
  if (k === 'keep' && st.applied) return st.ready;
  st.applied = true;
  if (k === 'door' || k === 'station') {
    const d = sc.door === '@' ? st.door : sc.door;
    if (d && getManifest().doors.some((x) => x.id === d)) {
      const station = k === 'station' ? sc.station : null;
      const same = st.view.kind === 'door' && st.view.door === d;
      st.door = d; st.answers.door = d;
      st.view = { kind: 'door', door: d, station };
      if (same && station) return scene.station(d, station, { animate });
      return scene.door(d, { station, animate, panel: false, onStation: onPin, onSurface });
    }
  }
  if (k === 'path') { st.view = { kind: 'path', stage: sc.stage ?? null }; return scene.path({ stage: sc.stage ?? null, animate, panel: false }); }
  if (k === 'kiosk') { const p = scene.kiosk({ animate }); st.view = { kind: 'kiosk', kiosk: !!p.shown }; return p; }
  st.view = { kind: 'rest' };
  return scene.rest({ animate });
}

// A line's cue, once its scene has settled: a surface or a station inside the room, a stage on the
// tower, or a door pointed at from the lobby.
function applyCue(line, animate = true) {
  const c = line?.cue;
  if (!c) return;
  const v = st.view;
  if (c.surface && v.kind === 'door') { v.surface = c.surface; v.station = surfaceStation(c.surface) || v.station; scene.surface(v.door, c.surface, { animate }); }
  else if (c.station && v.kind === 'door') { v.station = c.station; v.surface = null; scene.station(v.door, c.station, { animate }); }
  else if (c.stage && v.kind === 'path') { v.stage = c.stage; lightStage(c.stage); }
  else if (c.door && (v.kind === 'rest' || (v.kind === 'kiosk' && !v.kiosk))) { v.cueDoor = c.door; setCurrent(c.door); }
}

// A resize (or rotation) re-applies the scene on screen without animation and keeps the line.
function reapply() {
  setInset({ bottom: reserve() });
  const v = st.view;
  if (v.kind === 'door') {
    scene.door(v.door, { station: v.station, animate: false, resize: true, panel: false, onStation: onPin, onSurface }).then(() => {
      if (st.view !== v || !touring) return;
      if (v.surface) scene.surface(v.door, v.surface, { animate: false });
      syncSurfaces();
    });
  }
  else if (v.kind === 'path') { scene.path({ stage: v.stage, animate: false, resize: true, panel: false }); }
  else if (v.kind === 'kiosk') {
    const shown = !!scene.kiosk({ animate: false }).shown;
    if (shown !== v.kiosk) { v.kiosk = shown; render({ quiet: true }); }
  } else scene.rest({ animate: false });
  if (v.cueDoor && (v.kind === 'rest' || (v.kind === 'kiosk' && !v.kiosk))) setCurrent(v.cueDoor);
}

// A room pin clicked during the tour: the line in this node that points at that station (the
// node's first line when the node's own scene is that station), or the station itself.
function onPin(s) {
  if (!touring || st.view.kind !== 'door') return;
  const f = st.frame;
  let i = f?.kind === 'node' ? f.lines.findIndex((l) => l.cue?.station === s) : -1;
  if (i < 0 && f?.kind === 'node' && f.lines.length && sceneOf(T.nodes[st.node]).station === s) i = 0;
  st.view.station = s;
  scene.station(st.view.door, s, { animate: true });
  if (i >= 0 && i !== st.li) { st.li = i; render(); }
}

// A lit surface clicked during the tour (O14): the first line in this node that writes it or cues
// it; failing that, the line that points at the station it stands for (or the node's first line when
// the node's own scene is that station), as a pin did. The camera stays where it is unless that line
// cues something.
function onSurface(id) {
  if (!touring || st.view.kind !== 'door' || st.frame?.kind !== 'node') return;
  const f = st.frame;
  let i = f.lines.findIndex((l) => (isObj(l.write) && Object.prototype.hasOwnProperty.call(l.write, id)) || l.cue?.surface === id);
  const s = surfaceStation(id);
  if (i < 0 && s) {
    i = f.lines.findIndex((l) => l.cue?.station === s);
    if (i < 0 && f.lines.length && sceneOf(T.nodes[st.node]).station === s) i = 0;
  }
  if (i < 0 || i === st.li) return;
  release();
  st.li = i;
  render();
}

// Desktop px reserved under the frame for the card while it speaks: --tour-h in the stylesheet
// (clamp(176px, 24vh, 240px); keep the two in step) plus the card's 16 px bottom margin, so the
// frame ends exactly at the top of a card at its tallest and a low station pin keeps its room.
function reserve() { return Math.min(240, Math.max(176, window.innerHeight * 0.24)) + 16; }

// ---- The card ----
function phase() {
  const f = st.frame;
  if (!f) return null;
  if (st.li < f.lines.length - 1) return 'lines';
  if (f.choice && f.choice.options.length) return 'choice';
  if (f.onContinue) return 'continue';
  return 'end';
}
const NEXT_LABEL = { lines: 'tourNext', choice: 'tourChoose', continue: 'tourContinue', end: 'tourEnd' };
// What the card and the sphere show: a choice is the visitor's call only once the voice has said
// the line before it (the options are there, and usable, all along).
const shownPhase = () => { const ph = phase(); return ph === 'choice' && st.speaking ? 'lines' : ph; };

function render({ chapter = false, quiet = false } = {}) {
  const f = st.frame;
  if (!f) return;
  const line = f.lines[st.li] || null;
  const ph = phase();
  const ch = chapterOf(st.chapter);
  syncLead();
  const who = line?.who || lead();
  setSpeaker(who, guideName(who));
  setLine(line, { callouts: calloutsFor(line) });
  setChoice(ph === 'choice' ? f.choice : null);
  setNext(str(NEXT_LABEL[ph]));
  setPrev(st.li <= 0);
  document.body.classList.toggle('tour-choosing', ph === 'choice');
  if (!quiet) present(line, ph, chapter ? ch : null);
  refreshHead();
  refreshControls();
  if (line && st.sceneReady && f.kind === 'node') applyCue(line);
  syncSurfaces();
  emit('line');
}

// ---- The room's surfaces (O14) ----
// What they show for the line on screen: the fold of the node's writes, each entry resolved for the
// guide whose line wrote it; entries of this line waiting for their `at` word stay out until the
// voice says it. Outside a door scene nothing is written.
function roomState() {
  const f = st.frame;
  if (!touring || f?.kind !== 'node' || st.view.kind !== 'door') return null;
  const tag = (w, who) => (isObj(w) ? Object.fromEntries(Object.entries(w).map(([k, e]) => [k, isObj(e) ? { ...e, who } : e])) : null);
  const lines = f.lines.map((l) => ({ text: l.text, write: tag(l.write, l.who) }));
  const folded = foldWrites(f.write, lines, st.li, st.said);
  const m = getManifest(), c = ctx(), out = {};
  for (const [id, e] of Object.entries(folded)) { const r = resolveEntry(e, m, e.who ? { ...c, guide: e.who } : c); if (r) out[id] = r; }
  return out;
}
// Push that state to the room (it waits there for its room to mount) and to the card's list for a
// screen reader: every lit surface's words in the room's order, a ref's source after its figure. The
// summary, shown in the card, leaves the room as its node left it.
function syncSurfaces() {
  if (!touring || (st.frame && st.frame.kind !== 'node')) return;
  const r = roomState();
  st.room = r || {};
  if (r) setSurfaceState(r, { door: st.view.door });
  const order = Object.keys((st.view.kind === 'door' && getGeometry()?.rooms?.[st.view.door]?.surfaces) || {});
  setRoomShows(Object.entries(st.room).sort(([a], [b]) => order.indexOf(a) - order.indexOf(b)).map(([, e]) => e.items.map((x) => (x.source ? `${x.text} (${x.source})` : x.text)).join('; ')));
}

function refreshHead() {
  if (!st.frame || !T) return;
  const ch = chapterOf(st.chapter);
  const sp = shownPhase();
  const key = sp === 'choice' ? 'tourYourCall' : voiceOn() && st.pausedBy.size ? 'tourPaused' : 'tourSpeaking';
  setHead({ state: str(key), chapter: [chapterEyebrow(ch), chapterTitle(ch)].filter(Boolean).join(' · '), progress: progress() });
}

function progress() {
  const n = T.chapters.length || 1;
  const i = Math.max(0, T.chapters.findIndex((c) => c.id === st.chapter));
  const f = st.frame?.kind === 'node' && st.frame.lines.length ? (st.li + 1) / st.frame.lines.length : 1;
  return Math.min(1, (i + f) / n);
}

// Callout tiles: each ref the line names, with the source the manifest prints beside it. The kiosk
// falls back to a tile of its derived counts under its Representative data tag (O9) when it is not
// on screen.
function calloutsFor(line) {
  const f = st.frame, out = [];
  if (f.kind === 'summary') return f.items.map((x) => ({ text: x.text, source: x.source, same: false }));
  if (!line) return out;
  const m = getManifest(), c = ctx();
  for (const ref of line.callout || []) {
    const r = resolveRef(m, ref, c);
    if (r) out.push({ text: r.text, source: r.source, same: r.path === line.ref || r.text === line.text });
  }
  if (f.kind === 'node' && st.view.kind === 'kiosk' && !st.view.kiosk) out.push({ text: `${m.kiosk.header}: ${kioskLines().map((l) => `${l.value} ${l.label}`).join(' · ')}`, source: m.kiosk.tag, same: false });
  return out;
}

// One announcement per step: the chapter when it changes, the line while the voice is off (the voice
// speaks it otherwise), and a waiting choice's prompt, count, suggestion and how to reach it. A
// choice with no lines that a pick is entering is left out: focus goes into its group, whose label
// is the prompt.
const sentence = (s) => { const t = String(s ?? '').trim(); return !t || /[.!?:…]$/.test(t) ? t : `${t}.`; };
// The chapter still to be announced, if any; taking it means it is being said now.
const takeChapter = () => { const c = st.chapterDue; st.chapterDue = null; return c; };
// line: the line to read out (null when the voice says it); ph: 'choice' adds the waiting choice.
function announce(line, ph, chapter) {
  const parts = [];
  if (chapter) parts.push(sentence([chapterEyebrow(chapter), chapterTitle(chapter)].filter(Boolean).join(', ')));
  // With two guides, a line from a different guide than the last one read out starts with its name.
  if (line) {
    if (line.who && guideIds(getManifest()).length > 1 && line.who !== st.heard) parts.push(str('tourSpeakerLive', { guide: guideName(line.who) }));
    if (line.who) st.heard = line.who;
    parts.push(sentence(line.text));
  }
  if (ph === 'choice' && !(pickFocus && !st.frame.lines.length)) {
    const c = st.frame.choice;
    const sug = c.options.find((o) => o.tags.some((t) => t.kind === 'suggested'));
    parts.push(sentence(c.prompt), str('tourChoicesLive', { count: c.options.length }));
    if (sug) parts.push(str('tourSuggestedLive', { label: sug.label }));
    parts.push(str('tourChooseLive', { choose: str('tourChoose') }));
  }
  if (parts.length) say(parts.filter(Boolean).join(' '));
}

// ---- The voice ----
// A line comes on screen: the voice says it if it can, otherwise the live region reads it out.
// The first line of a node waits for its scene to settle before it is heard. A chapter change is
// kept in st.chapterDue until something says it (the visitor may step on before the voice was
// ready), and with the voice on its announcement is made first and given CHAPTER_MS to be heard
// before the line starts (js/voice.js caps any wait at 2.5 s).
function present(line, ph, chapter) {
  if (chapter) st.chapterDue = chapter;
  stopVoice();
  const f = st.frame;
  if (!line || f?.kind !== 'node' || !voiceOn()) { announce(line, ph, takeChapter()); return; }
  const my = st.voiceSeq;
  st.speaking = true;
  st.said = -1;   // the room's `at` writes on this line wait for their words (O14)
  const after = f.lines[st.li + 1] || null;
  let heard = null, onHeard = null;
  if (st.chapterDue) heard = new Promise((r) => { onHeard = r; });
  const wait = st.sceneReady && !heard ? null : Promise.all([st.sceneReady ? null : st.ready, heard]);
  const h = speak(voiceLine(line), { wait, next: after ? voiceLine(after) : null });
  h.ready.then(({ voiced }) => {
    if (my !== st.voiceSeq) return;
    // Voiced: only the chapter is read out, then the voice waits for it; a waiting choice is read
    // once the voice has finished.
    if (voiced) {
      const c = takeChapter();
      if (c) { announce(null, 'lines', c); setTimeout(onHeard, CHAPTER_MS); } else onHeard?.();
      return;
    }
    // No audio for this line (none rendered, out of date, unreadable): captions, and Next moves on.
    st.speaking = false;
    st.said = Infinity; syncSurfaces();
    announce(line, ph, takeChapter());
    refreshHead(); refreshControls(); emit('line');
  });
  h.done.then((how) => {
    if (my !== st.voiceSeq || !st.speaking) return;
    st.speaking = false;
    st.said = Infinity; syncSurfaces();
    if (how === 'done') { afterVoiced(); return; }
    // The browser refused to play (no gesture: the voice locks until the visitor turns it on) or the
    // audio would not load: this line becomes a caption the live region reads, and Next moves on.
    announce(line, phase(), takeChapter());
    refreshHead(); refreshControls(); emit('line');
  });
}
const voiceLine = (l) => ({ id: l.id, text: l.text, say: l.say || '', door: st.door, who: l.who || lead() });

// Whatever the voice is saying stops, and the step it would have taken with it.
function stopVoice() {
  st.voiceSeq++;
  cancelVoice();
  clearTimeout(st.gapT); st.gapT = 0; st.stepPending = false;
  st.speaking = false;
  st.said = Infinity;
}

// A voiced line has been said: a choice becomes the visitor's call (read out once), a terminal
// node waits, and anything else steps on after the gap (held while a pause reason is).
function afterVoiced() {
  const ph = phase();
  refreshHead(); refreshControls();
  if (ph === 'choice') { announce(null, 'choice', takeChapter()); emit('line'); return; }
  if (ph === 'end') { emit('line'); return; }
  if (st.pausedBy.size) st.stepPending = true;
  else st.gapT = setTimeout(stepOn, GAP_MS);
}
function stepOn() {
  st.gapT = 0;
  if (!touring || !st.frame || !voiceOn()) return;
  if (st.pausedBy.size) { st.stepPending = true; return; }
  const ph = phase();
  if (ph === 'lines') { st.li++; render(); }
  else if (ph === 'continue') st.frame.onContinue();
}

// The controls, built once and shown only while a voice can play (not with ?voice=0, nor before
// the audio is published): Voice (aria-pressed, described by the synthetic-voice disclosure) and
// Pause / Resume, which shows only while the voice is on.
const SVG = 'http://www.w3.org/2000/svg';
function speakerIcon() {
  const s = document.createElementNS(SVG, 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('aria-hidden', 'true'); s.setAttribute('focusable', 'false'); s.setAttribute('class', 'tour-icon');
  for (const [cls, d] of [['', 'M4.5 9.3h3.3L12 5.6v12.8l-4.2-3.7H4.5z'], ['v-on', 'M15.3 9.1a4.1 4.1 0 0 1 0 5.8M17.9 6.6a7.6 7.6 0 0 1 0 10.8'], ['v-off', 'M16 9.6l4.8 4.8M20.8 9.6 16 14.4']]) {
    const p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', d); p.setAttribute('fill', 'none'); p.setAttribute('stroke', 'currentColor'); p.setAttribute('stroke-width', '1.7'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    if (cls) p.setAttribute('class', cls);
    s.append(p);
  }
  return s;
}
function voiceControls() {
  const make = (tag, cls, id, text) => { const e = document.createElement(tag); e.className = cls; e.id = id; if (text != null) e.textContent = text; return e; };
  const voice = make('button', 'btn outline tour-tool tour-voice', 'tour-voice');
  voice.type = 'button';
  const label = make('span', 'tour-tool-label', 'tour-voice-label', str('tourVoice'));
  voice.append(speakerIcon(), label);
  voice.setAttribute('aria-pressed', 'false');
  voice.setAttribute('aria-describedby', 'tour-voice-note');
  voice.hidden = true;
  const pause = make('button', 'btn outline tour-pause', 'tour-pause', str('tourPause'));
  pause.type = 'button';
  pause.hidden = true;
  const note = make('p', 'tour-note', 'tour-voice-note', getManifest().guide.disclosure);
  note.hidden = true;
  voice.addEventListener('click', toggleVoice);
  pause.addEventListener('click', togglePause);
  return { voice, pause, note };
}
function refreshControls() {
  if (!vc) return;
  const wanted = touring && voiceWanted(), on = wanted && voiceOn();
  // A control about to hide never drops the focus it holds on the page: Pause (the voice locked or
  // went off under it) hands it to Voice, the way back on; Voice, when no voice can play, to Next.
  const a = document.activeElement;
  if (touring && ((a === vc.pause && !on) || (a === vc.voice && !wanted))) {
    if (a === vc.pause && wanted) vc.voice.focus({ preventScroll: true }); else focusNext();
  }
  vc.voice.hidden = !wanted;
  vc.voice.setAttribute('aria-pressed', on ? 'true' : 'false');
  vc.pause.hidden = !on;
  const label = str(st.pausedBy.has('user') || st.pausedBy.has('hidden') ? 'tourResume' : 'tourPause');
  if (vc.pause.textContent !== label) vc.pause.textContent = label;
  vc.note.hidden = !on;
  syncBody();   // the disclosure takes height from the body
}

// Voice off: it stops now; the line stays on screen and is read out once (with a waiting choice),
// and Next moves on from here. Voice on (also the way out of a locked voice: this click is the
// gesture it needed): the line on screen is said from its start.
function toggleVoice() {
  if (!touring || !st.frame) return;
  if (voiceOn()) {
    setVoiceMuted(true);
    stopVoice();
    syncSurfaces();
    refreshHead(); refreshControls();
    if (st.frame.kind === 'node') announce(st.frame.lines[st.li] || null, phase(), takeChapter());
    emit('line');
    return;
  }
  unlockVoice();
  setVoiceMuted(false);
  release();
  present(st.frame.lines[st.li] || null, phase(), null);
  syncSurfaces();
  refreshHead(); refreshControls();
  emit('line');
}
function togglePause() {
  if (!touring) return;
  if (st.pausedBy.has('user') || st.pausedBy.has('hidden')) release();
  else hold('user', true);
}

// ---- Visitor actions ----
// Next, → : the visitor moves on. What the voice was saying stops; at a choice it only gives way
// (the options take focus); the holds only the visitor lifts go.
function next() {
  if (!touring || !st.frame) return;
  release();
  const ph = phase();
  const talking = st.speaking;
  stopVoice();
  if (ph === 'lines') { st.li++; render(); }
  else if (ph === 'choice') { if (talking) { refreshHead(); refreshControls(); emit('line'); } focusFirstOption(); }
  else if (ph === 'continue') st.frame.onContinue();
  else endTour();
}
function prev() {
  if (!touring || !st.frame || st.li <= 0) return;
  release();
  stopVoice();
  st.li--;
  render();
}

function pick(o, e) {
  if (!touring || !st.frame) return;
  const f = st.frame;
  if (f.kind === 'node' && f.choice?.remember && o.value != null) { st.answers[f.choice.remember] = String(o.value); st.chosen[f.choice.remember] = o.label; save(); }
  if (o.href) return;   // Talk and the mail draft are links: the browser follows them
  e?.preventDefault?.();
  if (o.run) { if (!o.run()) afterPick(); return; }
  if (o.target) { pickFocus = true; try { goNode(o.target); } finally { pickFocus = false; } afterPick(); return; }
  if (o.action) runAction(o.action, e?.currentTarget || null);
}
// After a pick, focus goes to Next, or to the first option when what follows is only a choice. A
// pick moves the tour just as Next does: a Pause or a hidden tab's hold goes, so the new node's first
// line (queued under the hold) is heard from its start.
function afterPick() {
  if (!touring || !st.frame) return;
  release();
  if (!st.frame.lines.length && phase() === 'choice') focusFirstOption(); else focusNext();
}

// opener: the option that asked (focus returns to it when Ask closes).
function runAction(a, opener = null) {
  if (a === 'end') endTour();
  else if (a === 'explore') explore();
  else if (a === 'replay') replayTour();
  else if (a === 'ask') openAsk(opener || document.activeElement);
  else if (a === 'summary') { if (hooks.summary) hooks.summary(); else { summaryInCard(); afterPick(); } }
}

// Focusing or pointing at an option previews where it leads: its door at rest, its stage on the
// tower. Visual only; the scene's own highlight comes back on leaving.
function preview(o) {
  if (!touring || !T) return;
  const v = st.view;
  const sc = o?.target ? sceneOf(T.nodes[o.target]) : null;
  if (v.kind === 'rest' || (v.kind === 'kiosk' && !v.kiosk)) {
    const d = sc && ['door', 'station'].includes(sc.kind) && sc.door !== '@' ? sc.door : null;
    setCurrent(d || v.cueDoor || null);
  } else if (v.kind === 'path') {
    const s = sc?.kind === 'path' && sc.stage ? sc.stage : null;
    if (s) lightStage(s); else if (v.stage) lightStage(v.stage); else clearArcs();
  }
}

// See the details: hand the scene on screen to its route (the door with the station last pointed
// at, or the path at its stage), replacing the tour's entry; that route focuses its heading.
function explore() {
  const v = st.view;
  const target = v.kind === 'door' ? { view: 'door', id: v.door, station: v.station || null } : v.kind === 'path' ? { view: 'path', stage: v.stage || null } : null;
  if (!target) { endTour(); return; }
  teardown();
  dropLayer('tour');
  scene.handoff();
  go(target, { replace: true });
}

function backToNode() {
  st.frame = st.nodeFrame;
  st.li = Math.max(0, st.frame.lines.length - 1);
  render();
}

// The summary, inside the card: what the visitor saw, as a mail draft with no recipient and as text
// to copy. Nothing is sent or stored anywhere; the closing screen replaces this through
// setTourHooks({summary}). Opening it says nothing in the live region: focus goes to its first
// action (afterPick), inside the group its prompt labels, and the voice stops.
function summaryInCard() {
  const s = T.summary || {};
  const m = getManifest(), c = ctx();
  // A line quoted from the manifest keeps the source the manifest prints beside it; the derived
  // lines (visited chapters, the booking link) carry provenance, not a citation, so none prints.
  // A line's `when` holds it back unless it applies (a room the visitor never entered, a question
  // they never answered), exactly as a node's lines are filtered.
  const items = (s.lines || []).filter((l) => matches(l?.when, c)).map((l) => { const r = resolveLine(l, m, c); return r?.text?.trim() ? { text: r.text.trim(), source: r.ref ? r.source : null } : null; }).filter(Boolean);
  const subject = fillTemplate(s.subject || '{ref:site.title}', m, c);
  // A mail body breaks lines with CRLF (RFC 6068 §5, as Ask's draft does); the copied text with LF.
  const text = (nl) => clip(items.map((x) => (x.source ? `${x.text}${nl}(${x.source})` : x.text)).join(nl + nl), SUMMARY_MAX);
  const mailBody = text('\r\n'), copyBody = text('\n');
  st.frame = {
    kind: 'summary', items, onContinue: null, lines: [],
    choice: { prompt: str('tourSummaryTitle'), options: [
      { id: 'email', label: str('tourEmail'), tags: [], href: `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(mailBody)}` },
      { id: 'copy', label: str('tourCopy'), tags: [], run: () => { copy(`${subject}\n\n${copyBody}`); return true; } },
      { id: 'back', label: str('tourBack'), tags: [], run: backToNode },
    ] },
  };
  st.li = 0;
  stopVoice();
  render({ quiet: true });
}
function clip(s, n) {
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 40))}…`;
}
async function copy(text) {
  const keep = document.activeElement;
  let ok = false;
  try { await navigator.clipboard.writeText(text); ok = true; } catch { ok = false; }
  if (!ok) {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'sr';
      document.body.append(ta); ta.select();
      ok = document.execCommand('copy');
      ta.remove();
    } catch { ok = false; }
    if (keep && document.contains(keep)) keep.focus({ preventScroll: true });
  }
  say(str(ok ? 'tourCopied' : 'tourCopyFailed'));
}

// ---- Signals for the modules that join later (guide sphere, voice) and the checks ----
function emit(type) {
  const line = st.frame?.lines[st.li] || null;
  document.dispatchEvent(new CustomEvent('lobby:tour', { detail: { type, node: st.node, line: line?.id ?? null, text: line?.text ?? null, speaker: touring ? (line?.who || lead()) : null, lead: touring ? lead() : null, phase: touring && st.frame ? shownPhase() : null, voice: touring && voiceOn(), pausedBy: [...st.pausedBy] } }));
}

export function tourState() {
  const f = st.frame;
  return {
    touring, loaded: !!T, source: tourPath(), node: st.node, chapter: st.chapter,
    frame: f?.kind ?? null, line: f ? st.li : null, lineId: f?.lines[st.li]?.id ?? null, lineIds: f ? f.lines.map((l) => l.id) : [],
    phase: touring ? phase() : null, mode: touring && voiceOn() ? 'voice' : 'captions', voice: touring && voiceOn(), speaking: st.speaking, voiceState: voiceStats(),
    options: f?.choice && phase() === 'choice' ? f.choice.options.map((o) => ({ id: o.id, label: o.label, sub: o.sub, tags: o.tags.map((t) => t.kind), target: o.target, action: o.action })) : [],
    answers: { ...st.answers }, chosen: { ...st.chosen }, visited: [...st.visited], door: st.door,
    lead: touring ? lead() : null, speaker: touring ? (f?.lines[st.li]?.who || lead()) : null,
    scene: { ...st.view }, pausedBy: [...st.pausedBy],
    // The room's surfaces (O14): each lit surface's words (its kind for a glow), the caption token the
    // voice has reached on this line, and the surfaces as drawn (js/surfaces.js surfaceStats).
    surfaces: Object.fromEntries(Object.entries(st.room).map(([id, e]) => [id, entryText(e) || e.kind])), said: Number.isFinite(st.said) ? st.said : null, room: surfaceStats(),
    dialog: mapOpen() ? 'map' : askOpen() ? 'ask' : null,
    guideFrames: guideStats().frames, guide: guideStats(),
  };
}
