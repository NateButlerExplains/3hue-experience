// Voice hashes (O10). Three of them, each answering one question:
//
//   lineHash   Did the words change? hashLine(caption, say) from js/tourtext.js: SHA-256 of
//              NFC(text) + "\0" + NFC(say), 16 hex. The browser can compute it, so js/voice.js
//              knows a line is stale (script edited, audio not re-rendered) without fetching audio.
//   speechHash Would the speech service be asked for anything different? The provider, voice,
//              locale, rate, the pronunciation entries this text uses, the raw output format and the
//              NFC spoken text. Names the local cache (art/voice-cache/<speechHash>.wav), so a
//              change that only affects encoding re-encodes from the cache with no API call.
//   hash       Would the published file differ? speechHash plus the encoding settings (codec,
//              sample rate, bitrate, channels, loudness target, pipeline version), 12 hex. Written
//              in media/voice/manifest.json and in each <id>.json; the runtime requests
//              media/voice/<id>.mp3?h=<hash>, so the CDN never serves stale audio.
//
// Every input is canonical JSON (sorted keys), so the hashes do not depend on key order in the
// manifest, and an edit elsewhere in the manifest never re-renders a line it does not touch.
import { createHash } from 'node:crypto';
import { usedLexicon } from './ssml.mjs';
export { hashLine } from '../../js/tourtext.js';

export const HASH_VERSION = 1;
export const RAW_FORMAT = 'riff-24khz-16bit-mono-pcm';
export const AUDIO_PIPELINE = 1;

export function canonical(v) {
  if (Array.isArray(v)) return `[${v.map(canonical).join(',')}]`;
  if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${canonical(v[k])}`).join(',')}}`;
  return JSON.stringify(v ?? null);
}

export const sha256 = (s) => createHash('sha256').update(String(s), 'utf8').digest('hex');

// Only the pronunciation entries (guide.voice.say) a text uses count, so adding an entry
// re-renders just the lines that contain its term.
export function speechHash({ provider, voice, locale, rate = 0, lexicon = {}, text }) {
  const spoken = String(text ?? '').normalize('NFC');
  return sha256(canonical({
    v: HASH_VERSION, provider, voice, locale, rate: Number(rate) || 0,
    say: usedLexicon(spoken, lexicon), fmt: RAW_FORMAT, text: spoken,
  }));
}

export function audioHash(speech, { mp3 = {}, loudness = {} } = {}) {
  return sha256(`${speech}\n${canonical({
    codec: 'mp3', sampleRate: mp3.sampleRate, bitrate: mp3.bitrate, channels: mp3.channels,
    loudness: { I: loudness.I, TP: loudness.TP, LRA: loudness.LRA }, audioPipeline: AUDIO_PIPELINE,
  })}`).slice(0, 12);
}
