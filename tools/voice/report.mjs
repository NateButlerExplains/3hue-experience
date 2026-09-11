// The listening reports (O10, O13), local pages under art/ (git-ignored).
//
// writeReport(): art/voice-report.html, every voiced line's audio in each guide's voice, its caption
// with the word being spoken underlined as it plays, and the numbers the lint holds it to. Lines that
// say a name the voice may get wrong (3HUE, AiVRIC, SOC 2, NIST CSF, vCISO, POA&M, BOD, TTX, M365,
// Avi) are listed first, for the pronunciation check before a full render.
//
// writeAbReport(): art/voice-ab/report.html from build.mjs --ab: each test line in both guides'
// voices on each model side by side, with its duration, characters, words placed and loudness, and
// the "Avi" strip for the pronunciation Nate confirms.
import fs from 'node:fs';
import path from 'node:path';

export const WATCH = ['3HUE', 'AiVRIC', 'SOC 2', 'NIST CSF', 'vCISO', 'POA&M', 'BOD', 'TTX', 'M365', 'Avi'];
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const readJson = (f) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return null; } };
const n0 = (x) => Math.round(Number(x) || 0).toLocaleString('en-US');

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

const STYLE = `
  :root { color-scheme: light dark; --ink:#1b1b1f; --muted:#5b5b66; --line:#d9d9e0; --hi:#fff1a8; --bg:#fbfbfc; --card:#fff; --bad:#a1260d; }
  @media (prefers-color-scheme: dark) { :root { --ink:#ececf1; --muted:#a3a3ad; --line:#34343c; --hi:#5a4b00; --bg:#15151a; --card:#1d1d23; --bad:#ff8a70; } }
  body { font: 15px/1.5 system-ui, sans-serif; color: var(--ink); background: var(--bg); max-width: 72rem; margin: 2rem auto; padding: 0 1rem; }
  h1 { font-size: 1.4rem; } h2 { font-size: 1.05rem; margin: 0 0 .25rem; } h3 { font-size: .95rem; margin: 0 0 .25rem; }
  .line { border-top: 1px solid var(--line); padding: 1rem 0; } .off { opacity: .8; }
  .where, .say, .kind, .meta { color: var(--muted); font-size: .85rem; } .watch { font-size: .8rem; border: 1px solid currentColor; border-radius: 1rem; padding: 0 .5rem; }
  .caption { font-size: 1.05rem; margin: .25rem 0; } .caption span.now { background: var(--hi); text-decoration: underline; }
  audio { width: 100%; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr)); gap: .75rem; }
  .take { background: var(--card); border: 1px solid var(--line); border-radius: .5rem; padding: .6rem .75rem; }
  .bad { color: var(--bad); } table { border-collapse: collapse; } td, th { border-bottom: 1px solid var(--line); padding: .25rem .6rem; text-align: left; font-size: .9rem; }
  .wrap { overflow-x: auto; }`;
const SCRIPT = `<script>
  for (const a of document.querySelectorAll('audio')) {
    const spans = [...a.closest('.take, section').querySelectorAll('.caption span')];
    const tick = () => { const t = a.currentTime; for (const s of spans) s.classList.toggle('now', t >= +s.dataset.t0 && t < +s.dataset.t1); };
    a.addEventListener('timeupdate', tick); a.addEventListener('seeked', tick); a.addEventListener('ended', () => spans.forEach((s) => s.classList.remove('now')));
  }
</script>`;

const voiceText = (s) => (s.provider === 'azure' ? `${esc(s.provider)} ${esc(s.voice)} (${esc(s.locale)}, rate ${s.rate >= 0 ? '+' : ''}${s.rate}%)` : `${esc(s.provider)} ${esc(s.voice)} on ${esc(s.model)}${s.seed != null ? `, seed ${s.seed}` : ''}`);

export function writeReport({ file, items, skipped = [], settings, guides = {}, voiceDir, voiceManifest }) {
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
  <h2><code>${esc(it.key)}</code> <span class="kind">${esc(it.kind)}${it.guide ? ` · ${esc(guides[it.guide]?.guideName || it.guide)}${it.who ? ' (pinned)' : ''}` : ''}</span>${w.length ? ` <span class="watch">says ${esc(w.join(', '))}</span>` : ''}</h2>
  <p class="where">${esc(it.where)} · ${esc(state)} · ${esc(stats)}</p>
  <p class="caption">${json && fresh ? captionHtml(json.text, json.words) : esc(it.text)}</p>
  ${it.spoken !== it.text || (it.request && it.request !== it.spoken) ? `<p class="say">Spoken as: ${esc(it.request || it.spoken)}</p>` : ''}
  ${fresh ? `<audio controls preload="none" src="${esc(rel(path.join(voiceDir, `${it.key}.mp3`)))}?h=${esc(it.hash)}"></audio>` : ''}
</section>`;
  }).join('\n');
  const skippedHtml = skipped.length ? `<h2>Captions only by design</h2><ul>${skipped.map((s) => `<li><code>${esc(s.id)}</code> ${esc(s.where)}: ${esc(s.reason)}</li>`).join('')}</ul>` : '';
  const voices = Object.keys(guides || {}).length ? Object.entries(guides).map(([g, s]) => `${esc(s.guideName || g)}: ${voiceText(s)}`).join(' · ') : voiceText(settings);
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tour voice report</title>
<style>${STYLE}</style></head><body>
<h1>Tour voice report</h1>
<p>${voices} · MP3 ${settings.mp3.sampleRate / 1000} kHz, ${settings.mp3.channels === 1 ? 'mono' : `${settings.mp3.channels} channels`}, ${settings.mp3.bitrate} kbps · loudness ${settings.loudness.I} LUFS, true peak ${settings.loudness.TP} dBTP.
${items.length} voice files; ${Object.keys(vm).length} rendered. Listen for: ${esc(WATCH.join(', '))}. Lines that say one of them come first.</p>
${body}
${skippedHtml}
${SCRIPT}
</body></html>
`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return file;
}

// takes: [{guide, name, voice, model, line, label, caption, request, chars, credits, duration,
// words, placed, coverage, lufs, tp, problems, warnings, format, fellBack, file} | {…, error}]
export function writeAbReport({ file, takes, lines, summary }) {
  const models = summary.models, guides = summary.guides;
  const find = (g, model, line) => takes.find((t) => t.guide === g && t.model === model && t.line === line);
  const cell = (t) => {
    if (!t) return '<div class="take"><p class="meta">not rendered</p></div>';
    if (t.error) return `<div class="take"><h3>${esc(t.name)} · ${esc(t.model)}</h3><p class="bad">${esc(t.error)}</p></div>`;
    const cov = `${t.placed}/${t.words.length} words placed (${Math.round(t.coverage * 100)}%)`;
    return `<div class="take"><h3>${esc(t.name)} · ${esc(t.model)}</h3>
    <audio controls preload="none" src="${esc(t.file)}"></audio>
    <p class="caption">${captionHtml(t.caption, t.words)}</p>
    <p class="meta">${t.duration.toFixed(2)} s · ${n0(t.chars)} characters (${n0(t.credits)} credits) · <span class="${t.coverage < 0.9 ? 'bad' : ''}">${cov}</span> · ${t.lufs} LUFS, ${t.tp} dBTP${t.fellBack ? ` · ${esc(t.format)} (PCM refused)` : ''}${[...(t.problems || []), ...(t.warnings || [])].length ? ` · <span class="bad">${esc([...t.problems, ...t.warnings].join('; '))}</span>` : ''}</p></div>`;
  };
  const section = (line) => {
    const any = takes.find((t) => t.line === line.id);
    const said = [...new Set(takes.filter((t) => t.line === line.id).map((t) => t.request))];
    return `<section class="line"><h2>${esc(line.id)}${line.label ? ` · ${esc(line.label)}` : ''}</h2>
  <p class="where">Caption: ${esc(line.text)}</p>${said.length ? `<p class="say">Sent as: ${said.map(esc).join(' / ')}</p>` : ''}
  <div class="grid">${guides.map((g) => models.map((mo) => cell(find(g.id, mo, line.id))).join('')).join('')}</div>${any ? '' : '<p class="meta">no takes</p>'}
</section>`;
  };
  const stats = (pred) => {
    const ts = takes.filter((t) => !t.error && pred(t));
    const d = ts.reduce((a, t) => a + t.duration, 0), c = ts.reduce((a, t) => a + t.chars, 0);
    const words = ts.reduce((a, t) => a + t.words.length, 0), placed = ts.reduce((a, t) => a + t.placed, 0);
    const l = ts.map((t) => t.lufs).sort((a, b) => a - b);
    return ts.length ? `<td>${ts.length}</td><td>${d.toFixed(1)} s</td><td>${d ? (c / d).toFixed(1) : '–'}</td><td>${words ? Math.round((placed / words) * 100) : 0}%</td><td>${l[Math.floor(l.length / 2)]} LUFS</td>` : '<td colspan="5">no takes</td>';
  };
  const table = `<div class="wrap"><table><thead><tr><th>Guide</th><th>Model</th><th>Takes</th><th>Total</th><th>Characters a second</th><th>Words placed</th><th>Median loudness</th></tr></thead><tbody>
${guides.map((g) => models.map((mo) => `<tr><td>${esc(g.name)}</td><td>${esc(mo)}</td>${stats((t) => t.guide === g.id && t.model === mo)}</tr>`).join('\n')).join('\n')}
</tbody></table></div>`;
  const lex = Object.entries(summary.lexicon || {}).map(([k, v]) => `<code>${esc(k)}</code> → “${esc(v)}”`).join(', ');
  const main = lines.filter((l) => !l.id.startsWith('avi-')), strip = lines.filter((l) => l.id.startsWith('avi-'));
  const html = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Avi and Huey A/B</title>
<style>${STYLE}</style></head><body>
<h1>Avi and Huey: ${models.map(esc).join(' vs ')}</h1>
<p>${guides.map((g) => `${esc(g.name)}: ElevenLabs voice <code>${esc(g.voice)}</code>, settings ${esc(JSON.stringify(g.settings || {}))}, seed ${esc(g.seed)}`).join(' · ')}. Every take went through the published pipeline (two-pass loudnorm to −18 LUFS, true peak −1.5 dBTP, MP3 24 kHz mono 48 kbps), and each caption lights its words from the ElevenLabs timings as it plays.</p>
<p>${n0(summary.requests)} requests this run, ${n0(summary.characters)} characters sent (${n0(summary.credits)} credits by the price list${summary.measuredCredits != null ? `; the plan's character count moved by ${n0(summary.measuredCredits)}` : ''})${summary.plan ? `. Plan: ${esc(summary.plan.tier)}, ${n0(summary.plan.used)} of ${n0(summary.plan.limit)} characters used${summary.plan.resetsAt ? `, resets ${esc(summary.plan.resetsAt)}` : ''}` : ''}.</p>
<p>Pronunciation list (guide.voice.say), sent as plain-text aliases: ${lex || 'none'}.</p>
<h2>To decide</h2>
<ul><li>Which model: ${models.map(esc).join(' or ')} (the manifest uses the model named in guide.guides.*.voice.model).</li>
<li>How "Avi" is said: the engine's own reading, "AH-vee" or "AY-vee" (the strip at the end, in both voices).</li>
<li>Whether the aliases land: 3HUE, AiVRIC ("av-RICK"), SOC 2, vCISO and NIST CSF in the last line.</li></ul>
${table}
${main.map(section).join('\n')}
<h2 style="margin-top:2rem">"This is Avi." three ways</h2>
${strip.map(section).join('\n')}
${SCRIPT}
</body></html>
`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  return file;
}
