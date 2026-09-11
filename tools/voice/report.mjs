// The listening report (O10): art/voice-report.html, a local page (art/ is git-ignored) with every
// voiced line's audio, its caption with the word being spoken underlined as it plays, and the
// numbers the lint holds it to. Lines that say a name the voice may get wrong (3HUE, AiVRIC,
// SOC 2, NIST CSF, vCISO) are listed first, for the pronunciation check before a full render.
import fs from 'node:fs';
import path from 'node:path';

export const WATCH = ['3HUE', 'AiVRIC', 'SOC 2', 'NIST CSF', 'vCISO'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };

// The caption as spans: each timed word range is one span carrying its start and end.
function captionHtml(text, words) {
  const ranges = (words || []).filter((w) => Number.isInteger(w[3]) && Number.isInteger(w[4])).map((w) => ({ s: w[3], e: w[4], t0: w[0], t1: w[0] + w[1] })).sort((a, b) => a.s - b.s);
  let out = '', at = 0;
  for (const r of ranges) {
    if (r.s < at) continue;
    out += esc(text.slice(at, r.s)) + `<span data-t0="${r.t0}" data-t1="${r.t1}">${esc(text.slice(r.s, r.e))}</span>`;
    at = r.e;
  }
  return out + esc(text.slice(at));
}

export function writeReport({ file, items, skipped = [], settings, voiceDir, voiceManifest }) {
  const vm = voiceManifest?.items || {};
  const rel = (p) => path.relative(path.dirname(file), p).split(path.sep).join('/');
  const watch = (it) => WATCH.filter((w) => it.text.includes(w) || it.spoken.includes(w));
  const rows = [...items].sort((a, b) => (watch(b).length > 0) - (watch(a).length > 0));
  const body = rows.map((it) => {
    const entry = vm[it.key];
    const json = entry ? readJson(path.join(voiceDir, `${it.key}.json`)) : null;
    const fresh = entry && entry.hash === it.hash && json && json.hash === it.hash;
    const state = !entry ? 'not rendered' : fresh ? 'current' : 'stale (text or settings changed since render)';
    const placed = json ? json.words.filter((w) => w[3] != null).length : 0;
    const stats = entry ? `${entry.duration} s · ${Math.round(entry.bytes / 100) / 10} KB · ${entry.lufs} LUFS · ${entry.tp} dBTP · ${placed}/${json?.words.length ?? 0} words timed` : `${it.spoken.length} characters`;
    const w = watch(it);
    return `<section class="line${fresh ? '' : ' off'}">
  <h2><code>${esc(it.key)}</code> <span class="kind">${esc(it.kind)}</span>${w.length ? ` <span class="watch">says ${esc(w.join(', '))}</span>` : ''}</h2>
  <p class="where">${esc(it.where)} · ${esc(state)} · ${esc(stats)}</p>
  <p class="caption">${json && fresh ? captionHtml(json.text, json.words) : esc(it.text)}</p>
  ${it.say ? `<p class="say">Spoken as: ${esc(it.spoken)}</p>` : ''}
  ${fresh ? `<audio controls preload="none" src="${esc(rel(path.join(voiceDir, `${it.key}.mp3`)))}?h=${esc(it.hash)}"></audio>` : ''}
</section>`;
  }).join('\n');
  const skippedHtml = skipped.length ? `<h2>Captions only by design</h2><ul>${skipped.map((s) => `<li><code>${esc(s.id)}</code> ${esc(s.where)}: ${esc(s.reason)}</li>`).join('')}</ul>` : '';
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>AiVRIC voice report</title>
<style>
  :root { color-scheme: light dark; --ink:#1b1b1f; --muted:#5b5b66; --line:#d9d9e0; --hi:#fff1a8; --bg:#fbfbfc; }
  @media (prefers-color-scheme: dark) { :root { --ink:#ececf1; --muted:#a3a3ad; --line:#34343c; --hi:#5a4b00; --bg:#15151a; } }
  body { font: 15px/1.5 system-ui, sans-serif; color: var(--ink); background: var(--bg); max-width: 60rem; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1rem; margin: 0 0 .25rem; }
  .line { border-top: 1px solid var(--line); padding: 1rem 0; } .off { opacity: .8; }
  .where, .say, .kind { color: var(--muted); font-size: .85rem; } .watch { font-size: .8rem; border: 1px solid currentColor; border-radius: 1rem; padding: 0 .5rem; }
  .caption { font-size: 1.1rem; } .caption span.now { background: var(--hi); text-decoration: underline; }
  audio { width: 100%; }
</style></head><body>
<h1>AiVRIC voice report</h1>
<p>${esc(settings.provider)} ${esc(settings.voice)} (${esc(settings.locale)}, rate ${settings.rate >= 0 ? '+' : ''}${settings.rate}%) · MP3 ${settings.mp3.sampleRate / 1000} kHz, ${settings.mp3.channels === 1 ? 'mono' : `${settings.mp3.channels} channels`}, ${settings.mp3.bitrate} kbps · loudness ${settings.loudness.I} LUFS, true peak ${settings.loudness.TP} dBTP.
${items.length} voiced lines; ${Object.keys(vm).length} rendered. Listen for: ${esc(WATCH.join(', '))}. Lines that say one of them come first.</p>
${body}
${skippedHtml}
<script>
  for (const a of document.querySelectorAll('audio')) {
    const spans = [...a.closest('section').querySelectorAll('.caption span')];
    const tick = () => { const t = a.currentTime; for (const s of spans) s.classList.toggle('now', t >= +s.dataset.t0 && t < +s.dataset.t1); };
    a.addEventListener('timeupdate', tick); a.addEventListener('seeked', tick); a.addEventListener('ended', () => spans.forEach((s) => s.classList.remove('now')));
  }
</script>
</body></html>
`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return file;
}
