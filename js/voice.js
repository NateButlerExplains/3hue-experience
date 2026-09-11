// AiVRIC's voice (O10): plays the lines rendered at build time (tools/voice, docs/VOICE.md) and
// highlights each caption word from their timings. Nothing is synthesised in the browser and
// nothing under media/voice/ is requested before the visitor starts the tour.
//
// Back ends (?voice=):
//   audio  <audio id="tour-audio"> (and #ask-audio for Ask), plain media elements, no Web Audio.
//          On once guide.voice.required is true (the render is committed); ?voice=1 turns it on
//          earlier to hear a trial render.
//   sim    the same fetches and checks, but timers instead of sound, driven by each line's timing
//          JSON; ?rate=N plays N times faster. For the checks.
//   off    captions only: ?voice=0, or while guide.voice.required is false (no audio yet).
//
// Per line (the runtime contract in docs/VOICE.md):
//   1. media/voice/manifest.json, fetched once with cache: 'no-cache' the first time a line is to
//      be spoken (after the start gesture; never while muted).
//   2. The entry items["<id>--<door>"], else items["<id>"]; none means captions for that line.
//   3. hashLine(caption, say) must equal the entry's lineHash, else the script changed after the
//      render and the line runs captions-only, with nothing fetched.
//   4. <key>.json?h=<hash>: a 404, a bad shape, or a `text` that is not the caption means captions
//      for that line. Then <key>.mp3?h=<hash> (or the preloaded copy): a load error means captions
//      for that line; a refused play() (no gesture) locks the voice until the visitor turns it on.
//   5. Caption words [charStart, charEnd) are highlighted from each word's start, 50 ms early; a
//      word with no range keeps the previous highlight. Every word keeps full contrast.
// Only the next line of the same node is preloaded (its JSON, and its MP3 as a blob URL revoked
// after use); nothing at a choice, while muted, or with Save-Data on.
//
// Autoplay: unlockVoice() runs inside the start click, before anything awaits, and plays a tiny
// silent MP3 (the data URI on #tour-audio) on both elements, so iOS lets them play later lines. A
// tour opened any other way (a deep link, a reload, Forward) starts locked: captions until the
// visitor turns the voice on. Mute is the visitor's choice, kept in localStorage
// '3hue-experience:voice' = 'off' (removed when turned back on), read and written in try/catch.
//
// js/tour.js owns pacing, pause reasons and announcements; this module only reports what happened:
// speak() → {ready: Promise<{voiced, reason}>, done: Promise<'done'|'cancelled'|'error'|'blocked'>}.
// The guide's sphere hears the voice through lobby:voice events {type: play | word (strength) | stop};
// a word also carries {line, index, word}: the line's id, the caption token it lights (-1 for none) and
// the word as timed, which js/tour.js uses to write on the room at a line's `at` word (O14).
import { getManifest, getParams, safeRelative } from './content.js?v=2026-09-10f';
import { hashLine, tokens } from './tourtext.js?v=2026-09-10f';

const STORE = '3hue-experience:voice';
const LEAD = 0.05;          // s: a word lights this much before it is heard
const WATCHDOG = 2;         // s after the line's duration: finish it if `ended` never fires
const WAIT_MAX = 2500;      // ms: the longest a first line waits for its scene to settle
const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

const els = { tour: document.getElementById('tour-audio'), ask: document.getElementById('ask-audio') };

const V = {
  mode: 'off', rate: 1, base: 'media/voice/',
  muted: false, locked: true, failed: false,
  manifest: null, loading: null,
  paused: { tour: false, ask: false },   // what js/tour.js holds each element for
  gesture: false,           // unlockVoice() ran since the last begin
  pre: null,                // the one preloaded line: {line, text, door, p: Promise<{key, hash, json, url}|null>}
  ch: { tour: null, ask: null },   // the playback in progress on each element
  spoken: 0,                // lines voiced this page (for the checks)
};

// ---- Set-up ----
export function initVoice() {
  const m = getManifest();
  const q = getParams();
  const p = q.get('voice');
  const required = m.guide?.voice?.required === true;
  V.mode = p === '0' ? 'off' : p === 'sim' ? 'sim' : (p === '1' || required) ? 'audio' : 'off';
  if (V.mode === 'audio' && !els.tour) V.mode = 'off';
  const r = Number(q.get('rate'));
  V.rate = V.mode === 'sim' && Number.isFinite(r) && r > 0 ? Math.min(100, Math.max(0.1, r)) : 1;
  const b = safeRelative(q.get('voice-base')) || safeRelative(m.tour?.voiceBase) || 'media/voice/';
  V.base = b.endsWith('/') ? b : `${b}/`;
  V.muted = stored() === 'off';
  addEventListener('pagehide', () => { cancelVoice(); hushAsk(); dropPreload(); });
}

const stored = () => { try { return localStorage.getItem(STORE); } catch { return null; } };

// A tour begins. gesture: it began from the visitor's click (unlockVoice ran inside it).
export function beginVoice() {
  cancelVoice(); hushAsk(); dropPreload();
  V.locked = V.mode !== 'off' && !V.gesture;
  V.gesture = false;
  V.paused = { tour: false, ask: false };
  if (V.failed) { V.failed = false; V.manifest = null; V.loading = null; }   // try again next tour
}
// A tour ends: a gesture given during it (the Voice toggle) belongs to it, so a tour opened later
// by Forward or a deep link starts locked again.
export function endVoice() { cancelVoice(); hushAsk(); dropPreload(); V.paused = { tour: false, ask: false }; V.gesture = false; }

// Inside a click, before any await: both elements play a silent clip so later lines may play.
export function unlockVoice() {
  if (V.mode === 'off') return false;
  V.gesture = true;
  V.locked = false;
  if (V.mode === 'audio') {
    const silent = els.tour?.dataset.unlock;
    for (const el of [els.tour, els.ask]) {
      if (!el || !silent || V.ch.tour?.el === el || V.ch.ask?.el === el) continue;
      try { el.src = silent; const p = el.play(); if (p?.catch) p.catch(() => {}); } catch { /* the element cannot play */ }
    }
  }
  return true;
}

export const voiceWanted = () => V.mode !== 'off' && !V.failed;
export const voiceOn = () => V.mode !== 'off' && !V.failed && !V.muted && !V.locked;
export const voiceMuted = () => V.muted;

// The visitor's choice. persist: write it (an explicit toggle); a blocked play() never does.
export function setVoiceMuted(on, { persist = true } = {}) {
  V.muted = !!on;
  if (persist) { try { if (on) localStorage.setItem(STORE, 'off'); else localStorage.removeItem(STORE); } catch { /* storage blocked */ } }
  if (on) { cancelVoice(); hushAsk(); dropPreload(); }
}

// ---- The voice manifest ----
function loadManifest() {
  if (V.manifest) return Promise.resolve(V.manifest);
  if (!V.loading) {
    V.loading = fetch(`${V.base}manifest.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null)
      .then((j) => {
        if (isObj(j) && isObj(j.items)) V.manifest = j;
        else { V.failed = true; document.dispatchEvent(new CustomEvent('lobby:voice', { detail: { type: 'failed' } })); }
        return V.manifest;
      });
  }
  return V.loading;
}

// line: {id, text, say, door} → {key, hash} or {reason} (no audio for it, or the text changed).
async function locate(line) {
  const vm = await loadManifest();
  if (!vm) return { reason: 'unavailable' };
  const keys = line.door ? [`${line.id}--${line.door}`, line.id] : [line.id];
  const key = keys.find((k) => isObj(vm.items[k]));
  if (!key) return { reason: 'no-audio' };
  const e = vm.items[key];
  let lh = null;
  try { lh = await hashLine(line.text, line.say || ''); } catch { lh = null; }   // no WebCrypto: cannot tell, so do not play
  if (!lh || lh !== e.lineHash || typeof e.hash !== 'string' || !/^[\w-]+$/.test(e.hash)) return { reason: 'stale' };
  return { key, hash: e.hash };
}

// The timing file, checked against the caption it claims to voice.
async function timing(line, key, hash) {
  let j = null;
  try { const r = await fetch(`${V.base}${key}.json?h=${hash}`); j = r.ok ? await r.json() : null; } catch { j = null; }
  if (!isObj(j) || j.text !== line.text || !Array.isArray(j.words) || !(Number(j.duration) > 0)) return null;
  return j;
}

// ---- Preloading: the next line of the same node, and only that one ----
function dropPreload() {
  const p = V.pre;
  V.pre = null;
  if (p) p.p.then((x) => { if (x?.url && !x.used) URL.revokeObjectURL(x.url); });
}
function preload(line) {
  if (!line || V.muted || V.locked || V.mode === 'off' || navigator.connection?.saveData) return;
  const p = (async () => {
    const at = await locate(line);
    if (!at.key) return null;
    const json = await timing(line, at.key, at.hash);
    if (!json) return null;
    let url = null;
    if (V.mode === 'audio') {
      try { const r = await fetch(`${V.base}${at.key}.mp3?h=${at.hash}`); if (r.ok) url = URL.createObjectURL(await r.blob()); } catch { url = null; }
    }
    return { key: at.key, hash: at.hash, json, url, used: false };
  })().catch(() => null);
  dropPreload();
  V.pre = { line: line.id, text: line.text, door: line.door || null, p };
}
function takePreload(line) {
  const p = V.pre;
  if (!p || p.line !== line.id || p.text !== line.text || p.door !== (line.door || null)) return null;
  V.pre = null;
  return p.p;
}

// ---- Speaking ----
// line: {id, text, say, door}; opts: {channel: 'tour'|'ask', wait: Promise (the scene settling),
// next: the line after it in the same node, to preload}.
export function speak(line, { channel = 'tour', wait = null, next = null } = {}) {
  cancel(channel);
  let setReady, setDone;
  const ready = new Promise((r) => { setReady = r; });
  const done = new Promise((r) => { setDone = r; });
  if (!voiceOn() || !line?.id || !line.text) { setReady({ voiced: false, reason: 'off' }); setDone('cancelled'); return { ready, done }; }
  const pb = { channel, line, el: V.mode === 'audio' ? els[channel] : null, word: -1, token: -1, state: 'loading', ready: setReady, finish: null, cancelled: false };
  V.ch[channel] = pb;
  let settled = false;
  pb.finish = (how) => { if (settled) return; settled = true; stopClock(pb); if (V.ch[channel] === pb) V.ch[channel] = null; if (pb.state !== 'loading') signal('stop'); pb.state = 'ended'; setReady({ voiced: false, reason: how }); setDone(how); };
  (async () => {
    const pre = channel === 'tour' ? takePreload(line) : null;
    let got = pre ? await pre : null;
    if (!got) {
      const at = await locate(line);
      if (pb.cancelled) return;
      if (!at.key) { pb.finish(at.reason); return; }
      const json = await timing(line, at.key, at.hash);
      if (pb.cancelled) return;
      if (!json) { pb.finish('stale'); return; }
      got = { key: at.key, hash: at.hash, json, url: null };
    }
    if (pb.cancelled) { if (got.url) URL.revokeObjectURL(got.url); return; }
    pb.key = got.key; pb.hash = got.hash; pb.json = got.json; pb.blob = got.url || null;
    if (pb.blob) got.used = true;
    pb.duration = Number(got.json.duration);
    pb.words = wordsOf(line, got.json);
    setReady({ voiced: true, reason: null });
    if (wait) await Promise.race([wait, new Promise((r) => setTimeout(r, WAIT_MAX))]);
    if (pb.cancelled) return;
    if (channel === 'tour' && next) preload(next);
    pb.state = 'ready';
    if (!V.paused[channel]) start(pb);
  })().catch(() => pb.finish('error'));
  return { ready, done };
}

function cancel(channel) {
  const pb = V.ch[channel];
  if (!pb) return;
  pb.cancelled = true;
  pb.ac?.abort();
  if (pb.el) { try { pb.el.pause(); } catch { /* nothing to pause */ } }
  if (pb.blob) { const u = pb.blob; pb.blob = null; setTimeout(() => URL.revokeObjectURL(u), 0); }
  if (channel === 'tour') highlight(pb, null);
  pb.finish('cancelled');
}
export function cancelVoice() { cancel('tour'); }

// Pause reasons live in js/tour.js; this only follows them, per element (Ask speaks while the tour
// is held for it).
export function pauseVoice(channel = 'tour') {
  V.paused[channel] = true;
  const pb = V.ch[channel];
  if (!pb || pb.state !== 'playing') return;
  if (pb.sim) pb.sim.acc += performance.now() - pb.sim.t0;
  pb.state = 'paused';
  stopClock(pb);
  if (pb.el) pb.el.pause();
  signal('stop');
}
export function resumeVoice(channel = 'tour') {
  V.paused[channel] = false;
  const pb = V.ch[channel];
  if (pb && (pb.state === 'paused' || pb.state === 'ready')) start(pb);
}

// The caption words each timing lights: token indexes whose characters overlap [charStart, charEnd).
function wordsOf(line, json) {
  const toks = tokens(line.text);
  const out = [];
  for (const w of json.words) {
    if (!Array.isArray(w) || !Number.isFinite(+w[0])) continue;
    const cs = w[3], ce = w[4];
    const spans = Number.isInteger(cs) && Number.isInteger(ce) ? toks.map((t, i) => (t.start < ce && t.end > cs ? i : -1)).filter((i) => i >= 0) : [];
    out.push({ s: +w[0], d: Math.max(0, +w[1] || 0), n: String(w[2] ?? '').length, t: String(w[2] ?? ''), spans });
  }
  return out.sort((a, b) => a.s - b.s);
}

// ---- Playback: the audio element, or the simulated clock ----
function start(pb) {
  if (pb.cancelled || pb.state === 'playing' || pb.state === 'ended') return;
  const first = pb.state === 'ready';
  pb.state = 'playing';
  if (V.mode === 'sim') {
    if (first) pb.sim = { acc: 0, t0: performance.now() };
    else pb.sim.t0 = performance.now();
    const left = Math.max(0, pb.duration - time(pb)) / V.rate;
    pb.endT = setTimeout(() => done(pb, 'done'), left * 1000);
    began(pb, first);
    return;
  }
  const el = pb.el;
  if (first) {
    pb.src = new URL(pb.blob || `${V.base}${pb.key}.mp3?h=${pb.hash}`, location.href).href;
    pb.ac = new AbortController();
    const sig = { signal: pb.ac.signal };
    const mine = () => el.src === pb.src;   // an event from the clip this element held before is not ours
    el.addEventListener('ended', () => { if (mine()) done(pb, 'done'); }, sig);
    el.addEventListener('error', () => { if (mine()) done(pb, 'error'); }, sig);
    el.addEventListener('timeupdate', () => { if (mine()) tick(pb); }, sig);
    el.src = pb.src;
  }
  const p = el.play();
  const ok = () => { if (pb.state === 'playing') { began(pb, first); watchdog(pb); } };
  if (p?.then) p.then(ok, (e) => { if (pb.cancelled || pb.state !== 'playing') return; done(pb, e?.name === 'NotAllowedError' ? 'blocked' : 'error'); });
  else ok();
}
function began(pb, first) {
  if (first) V.spoken++;
  signal('play');
  const loop = () => { if (pb.state !== 'playing') return; tick(pb); pb.raf = requestAnimationFrame(loop); };
  pb.raf = requestAnimationFrame(loop);
}
function watchdog(pb) {
  clearTimeout(pb.dogT);
  const left = Math.max(0, pb.duration - (pb.el?.currentTime || 0)) + WATCHDOG;
  pb.dogT = setTimeout(() => { if (pb.state === 'playing') done(pb, 'done'); }, left * 1000);
}
function stopClock(pb) { cancelAnimationFrame(pb.raf); clearTimeout(pb.endT); clearTimeout(pb.dogT); }
function time(pb) {
  if (V.mode === 'sim') { if (!pb.sim) return 0; const run = pb.state === 'playing' ? performance.now() - pb.sim.t0 : 0; return ((pb.sim.acc + run) / 1000) * V.rate; }
  return pb.el?.currentTime || 0;
}
function done(pb, how) {
  if (pb.state === 'ended' || pb.cancelled) return;
  if (how === 'blocked') { V.locked = true; dropPreload(); }
  pb.ac?.abort();
  if (pb.blob) { const u = pb.blob; pb.blob = null; setTimeout(() => URL.revokeObjectURL(u), 0); }
  if (pb.channel === 'tour') highlight(pb, null);
  pb.finish(how);
}

// The word being said: the last one whose start (less the lead) has passed.
function tick(pb) {
  if (pb.state !== 'playing' || !pb.words?.length) return;
  const t = time(pb) + LEAD;
  let lo = 0, hi = pb.words.length - 1, at = -1;
  while (lo <= hi) { const mid = (lo + hi) >> 1; if (pb.words[mid].s <= t) { at = mid; lo = mid + 1; } else hi = mid - 1; }
  if (at === pb.word || at < 0) return;
  pb.word = at;
  const w = pb.words[at];
  if (pb.channel === 'tour' && w.spans.length) highlight(pb, w.spans);
  signal('word', Math.min(1, 0.45 + Math.min(0.35, w.d * 0.9) + Math.min(0.2, w.n / 40)), { line: pb.line.id ?? null, index: w.spans.length ? w.spans[0] : -1, word: w.t });
}

// Light the tokens of the word being said, in the caption this line is on; nothing else changes.
function highlight(pb, spans) {
  const cap = document.getElementById('tour-caption');
  const mine = cap && cap.dataset.line === (pb.line.id || '');
  for (const e of cap ? cap.querySelectorAll('.tour-words .w.now') : []) e.classList.remove('now');
  pb.token = -1;
  if (!mine || !spans) return;
  for (const i of spans) { const e = cap.querySelector(`.tour-words .w[data-i="${i}"]`); if (e) e.classList.add('now'); }
  pb.token = spans[0];
}

function signal(type, strength, more = null) {
  document.dispatchEvent(new CustomEvent('lobby:voice', { detail: strength == null ? { type } : { type, strength, ...more } }));
}

// ---- Ask: its own element, so an answer never loses the tour's place ----
// lines: [{id, text, say}] in order. Resolves {voiced} once it knows whether the first line has
// audio. onMiss(rest): called with the lines not heard, from the one that could not be said on
// (the voice is off, a line has no usable audio, its MP3 would not load, play() was refused), so
// the caller reads them out instead; never for an answer cut short by a newer one or by hushAsk().
let askRun = 0;
export function speakAsk(lines, { onMiss = null } = {}) {
  hushAsk();
  const run = ++askRun;
  const list = (lines || []).filter((l) => l?.id && l.text);
  if (!list.length) return Promise.resolve({ voiced: false });
  if (!voiceOn()) { onMiss?.(list); return Promise.resolve({ voiced: false }); }
  let i = 0;
  const say = () => {
    const h = speak(list[i], { channel: 'ask' });
    h.done.then((how) => {
      if (run !== askRun) return;
      if (how === 'done') { if (++i < list.length && V.ch.ask === null) say(); return; }
      if (how !== 'cancelled' && V.ch.ask === null) onMiss?.(list.slice(i));
    });
    return h.ready;
  };
  return say().then(({ voiced }) => ({ voiced }));
}
export function hushAsk() { cancel('ask'); }

// ---- For js/tour.js and the checks ----
export function voiceStats() {
  const pb = V.ch.tour;
  return {
    backend: V.mode, on: voiceOn(), muted: V.muted, locked: V.locked, failed: V.failed, loaded: !!V.manifest, paused: V.paused.tour, rate: V.rate,
    line: pb?.line.id ?? null, key: pb?.key ?? null, state: pb?.state ?? null, word: pb?.word ?? -1, token: pb?.token ?? -1,
    time: pb ? Math.round(time(pb) * 1000) / 1000 : null, duration: pb?.duration ?? null,
    preloaded: V.pre?.line ?? null, spoken: V.spoken, asking: !!V.ch.ask,
  };
}
