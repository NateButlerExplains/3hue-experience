// The ElevenLabs adapter (O13): plain text in, lossless WAV and word events out.
//
// synthesize() calls POST /v1/text-to-speech/{voice_id}/with-timestamps?output_format=pcm_24000
// (header xi-api-key) and wraps the raw 24 kHz 16-bit mono PCM in a WAV (audio.mjs pcmToWav), so
// the rest of the build (two-pass loudnorm, MP3 24 kHz mono 48 kbps CBR, the checks) is the same as
// for Azure. If the plan tier refuses PCM it asks once more for mp3_44100_128 and decodes that with
// ffmpeg, and says so in `fellBack` (a lossy source; the loudness and timing checks still apply).
//
// alignmentEvents() turns the response's character `alignment` (each character of the text sent,
// with start and end seconds) into word events shaped like the Azure SDK's ({type: 'WordBoundary',
// offset, duration} in 100 ns ticks, `text`, and `textOffset` into the text sent), so ssml.mjs
// placeWords, captionMapper and timingJson place them on the caption unchanged: plain.mjs maps a
// range of the text sent back to the spoken text. A term replaced by its alias (guide.voice.say)
// is timed as one word carrying the term itself ("3HUE" for "three hue"), which lands on the term.
//
// getVoice() and getSubscription() read the voice's name and category and the plan's character
// count; both answer {ok: false, permitted: false} for a key limited to text-to-speech instead of
// failing. Errors are SpeechError (azure.mjs) with a code: TooManyRequests and ServiceError (5xx)
// retry through withRetries; QuotaExceeded stops a run; AuthenticationFailure and PermissionDenied
// mean the key; FormatNotAllowed triggers the MP3 fallback. The key never appears in a message:
// every error passes through redact(), which also blanks any xi-api-key header value.
import { SpeechError } from './azure.mjs';
import { redact } from './env.mjs';
import { pcmToWav, decodeToWav } from './audio.mjs';

export const API = 'https://api.elevenlabs.io/v1';
export const DEFAULT_FORMAT = 'pcm_24000';
export const FALLBACK_FORMAT = 'mp3_44100_128';
export const FATAL = new Set(['QuotaExceeded', 'AuthenticationFailure', 'PermissionDenied']);
// Credits per character by model (ElevenLabs pricing: Multilingual v2 and v3 one credit a
// character, Flash and Turbo half). Unknown models count one.
export const CREDITS_PER_CHAR = { eleven_multilingual_v2: 1, eleven_v3: 1, eleven_flash_v2_5: 0.5, eleven_turbo_v2_5: 0.5, eleven_flash_v2: 0.5, eleven_turbo_v2: 0.5 };
export const creditsFor = (chars, model) => Math.ceil(chars * (CREDITS_PER_CHAR[model] ?? 1));

const isObj = (v) => !!v && typeof v === 'object' && !Array.isArray(v);
const TICKS = 1e7;
const SPOKEN = /[\p{L}\p{N}&%$€£#@+]/u;   // characters a word keeps; other leading and trailing marks are punctuation
const SPACE = /^\s*$/;

// An HTTP error → SpeechError with a code, the service's own status and message, redacted.
export function httpError(status, bodyText, { key = null, what = 'request' } = {}) {
  let d = null;
  try { d = JSON.parse(bodyText)?.detail ?? null; } catch { d = null; }
  const st = isObj(d) ? String(d.status ?? d.code ?? '') : '';
  const msg = typeof d === 'string' ? d : Array.isArray(d) ? d.map((x) => [x?.loc?.join?.('.'), x?.msg].filter(Boolean).join(': ')).join('; ') : isObj(d) && d.message ? String(d.message) : String(bodyText ?? '').slice(0, 300);
  const both = `${st} ${msg}`;
  let code = 'BadRequest', retryable = false;
  if (/quota|insufficient[_ ]credits|credits? (?:remaining|exceeded)/i.test(both)) code = 'QuotaExceeded';
  else if (status >= 400 && status < 500 && status !== 429 && /output[_ ]format|\bpcm_|not available on your (?:plan|tier|subscription)|requires .*tier/i.test(both)) code = 'FormatNotAllowed';
  else if (status === 401 || status === 403) code = /permission/i.test(both) ? 'PermissionDenied' : 'AuthenticationFailure';
  else if (status === 429) { code = 'TooManyRequests'; retryable = true; }
  else if (status >= 500) { code = 'ServiceError'; retryable = true; }
  else if (status === 404) code = 'NotFound';
  const e = new SpeechError(`ElevenLabs ${what}: ${redact(`${status}${st ? ` ${st}` : ''}: ${msg}`, [key])}`, { code, retryable });
  e.status = status;
  return e;
}

async function call(method, path, { key, body = null, fetchImpl = globalThis.fetch, what = path } = {}) {
  let r;
  try {
    r = await fetchImpl(`${API}${path}`, {
      method,
      headers: { 'xi-api-key': key, Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new SpeechError(`ElevenLabs ${what}: ${redact(e?.cause?.message || e?.message || String(e), [key])}`, { code: 'ConnectionFailure', retryable: true });
  }
  const text = await r.text().catch(() => '');
  if (!r.ok) throw httpError(r.status, text, { key, what });
  let json;
  try { json = text ? JSON.parse(text) : {}; } catch { throw new SpeechError(`ElevenLabs ${what}: the response is not JSON`, { code: 'BadResponse', retryable: true }); }
  const h = (n) => r.headers?.get?.(n) ?? null;
  return { json, headers: { requestId: h('request-id'), characterCost: h('character-cost') } };
}

// The request body: only what is set, so the service's defaults apply to the rest.
export function requestBody({ text, modelId, voiceSettings = null, seed = null, normalization = null }) {
  return {
    text, model_id: modelId,
    ...(isObj(voiceSettings) && Object.keys(voiceSettings).length ? { voice_settings: voiceSettings } : {}),
    ...(Number.isInteger(seed) ? { seed } : {}),
    ...(normalization && normalization !== 'auto' ? { apply_text_normalization: normalization } : {}),
  };
}

// → {audio: WAV Buffer, alignment, normalized, format (as delivered), fellBack, requestId, characterCost}
export async function synthesize({ text, voiceId, modelId, voiceSettings = null, seed = null, normalization = null, outputFormat = DEFAULT_FORMAT, key, fetchImpl = globalThis.fetch, tmpDir = null, fallback = true }) {
  if (!key) throw new SpeechError('ElevenLabs: no key', { code: 'AuthenticationFailure' });
  if (!voiceId || !modelId) throw new SpeechError('ElevenLabs: a voice id and a model are needed', { code: 'BadRequest' });
  const body = requestBody({ text, modelId, voiceSettings, seed, normalization });
  const ask = (fmt) => call('POST', `/text-to-speech/${encodeURIComponent(voiceId)}/with-timestamps?output_format=${encodeURIComponent(fmt)}`, { key, body, fetchImpl, what: `text-to-speech (${modelId}, ${fmt})` });
  let format = outputFormat, fellBack = false, res;
  try { res = await ask(format); } catch (e) {
    if (!(fallback && e?.code === 'FormatNotAllowed' && format !== FALLBACK_FORMAT)) throw e;
    format = FALLBACK_FORMAT; fellBack = true;
    res = await ask(format);
  }
  const raw = Buffer.from(String(res.json.audio_base64 || ''), 'base64');
  if (!raw.length) throw new SpeechError('ElevenLabs: the response carried no audio', { code: 'BadResponse', retryable: true });
  const pcm = /^pcm_(\d+)$/.exec(format);
  let audio;
  if (pcm) audio = pcmToWav(raw, { sampleRate: Number(pcm[1]) });
  else {
    if (!tmpDir) throw new SpeechError(`ElevenLabs: ${format} needs decoding and no temporary folder was given`, { code: 'BadRequest' });
    audio = await decodeToWav(raw, { sampleRate: 24000, tmpDir });
  }
  return { audio, alignment: res.json.alignment ?? null, normalized: res.json.normalized_alignment ?? null, format, fellBack, ...res.headers };
}

// The voice's name and category (premade, cloned, generated, professional). → {ok, name, category}
// or {ok: false, permitted, message}. An invalid key throws AuthenticationFailure.
export async function getVoice(voiceId, { key, fetchImpl = globalThis.fetch } = {}) {
  try {
    const { json } = await call('GET', `/voices/${encodeURIComponent(voiceId)}`, { key, fetchImpl, what: 'voice lookup' });
    return { ok: true, id: json.voice_id ?? voiceId, name: json.name ?? null, category: json.category ?? null };
  } catch (e) {
    if (e?.code === 'PermissionDenied') return { ok: false, permitted: false, message: 'this key may not read voices (it is limited to text-to-speech, which is enough to render)' };
    if (e?.code === 'NotFound') return { ok: false, permitted: true, message: `no voice ${voiceId} on this account` };
    throw e;
  }
}

// The plan and its character count. → {ok, tier, used, limit, resetsAt (ISO date)} or {ok: false, …}.
export async function getSubscription({ key, fetchImpl = globalThis.fetch } = {}) {
  try {
    const { json } = await call('GET', '/user/subscription', { key, fetchImpl, what: 'subscription' });
    const reset = Number(json.next_character_count_reset_unix);
    return { ok: true, tier: json.tier ?? null, status: json.status ?? null, used: Number(json.character_count) || 0, limit: Number(json.character_limit) || 0, resetsAt: reset > 0 ? new Date(reset * 1000).toISOString().slice(0, 10) : null };
  } catch (e) {
    if (e?.code === 'PermissionDenied') return { ok: false, permitted: false, message: 'this key may not read the subscription (it is limited to text-to-speech); credits are counted from the characters sent instead' };
    throw e;
  }
}

// Character alignment → word events. `built` is buildPlain()'s result for the text sent; without
// it (or when the alignment's characters are not the text sent) words carry textOffset -1 and are
// placed by their letters.
export function alignmentEvents(alignment, built = null) {
  const ch = Array.isArray(alignment?.characters) ? alignment.characters.map((c) => String(c ?? '')) : [];
  const s0 = alignment?.character_start_times_seconds || [], e0 = alignment?.character_end_times_seconds || [];
  const n = Math.min(ch.length, s0.length, e0.length);
  const offs = [];
  let at = 0;
  for (let i = 0; i < n; i++) { offs.push(at); at += ch[i].length; }
  const joined = ch.slice(0, n).join('');
  const same = !!built && joined === built.request;
  const aliases = same ? built.aliases || [] : [];
  const regionOf = (i) => aliases.find((a) => offs[i] < a.end && offs[i] + ch[i].length > a.start) || null;
  const ev = (text, a, b, textOffset) => {
    const start = Number(s0[a]) || 0, end = Math.max(start, Number(e0[b]) || 0);
    return { type: 'WordBoundary', offset: Math.round(start * TICKS), duration: Math.round((end - start) * TICKS), text, textOffset, wordLength: text.length };
  };
  const out = [], done = new Set();
  for (let i = 0; i < n;) {
    if (SPACE.test(ch[i])) { i++; continue; }
    let j = i;
    while (j < n && !SPACE.test(ch[j])) j++;
    const hits = [];
    for (let k = i; k < j; k++) { const r = regionOf(k); if (r && !hits.includes(r)) hits.push(r); }
    if (hits.length) {
      // A replaced term: one word, the term itself, from its alias's first sound to its last.
      for (const r of hits) {
        if (done.has(r)) continue;
        done.add(r);
        const idx = [];
        for (let k = 0; k < n; k++) if (offs[k] >= r.start && offs[k] < r.end && !SPACE.test(ch[k])) idx.push(k);
        if (idx.length) out.push(ev(r.term, idx[0], idx[idx.length - 1], r.start));
      }
    } else {
      let a = i, b = j - 1;
      while (a <= b && !SPOKEN.test(ch[a])) a++;
      while (b >= a && !SPOKEN.test(ch[b])) b--;
      if (a <= b) out.push(ev(ch.slice(a, b + 1).join(''), a, b, same ? offs[a] : -1));
    }
    i = j;
  }
  return out.sort((x, y) => x.offset - y.offset);
}
