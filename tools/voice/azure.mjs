// The Azure AI Speech adapter (O10): SSML in, lossless WAV and word events out.
//
// Uses the official SDK (microsoft-cognitiveservices-speech-sdk, a devDependency; the site never
// loads it). The synthesiser gets no audio output device (null), so the audio stays in memory.
// Every boundary event is recorded as {type, offset, duration, text, textOffset, wordLength}, with
// offset and duration in 100 ns ticks as the SDK reports them and textOffset the SDK's position of
// the word in the SSML string (-1 when it could not find it). tools/voice/ssml.mjs maps those back
// to the caption. The key never appears in a message: errors pass through redact().
import { redact } from './env.mjs';

export const RAW_OUTPUT = 'Riff24Khz16BitMonoPcm';
const RETRYABLE = new Set(['TooManyRequests', 'ConnectionFailure', 'ServiceTimeout', 'ServiceError', 'RuntimeError']);

let sdkPromise = null;
export function loadSdk() {
  sdkPromise ||= import('microsoft-cognitiveservices-speech-sdk').then((m) => m.default ?? m);
  return sdkPromise;
}

export class SpeechError extends Error {
  constructor(message, { code = 'Unknown', retryable = false } = {}) { super(message); this.code = code; this.retryable = retryable; }
}

export async function synthesize({ ssml, key, region }) {
  const sdk = await loadSdk();
  const cfg = sdk.SpeechConfig.fromSubscription(key, region);
  cfg.speechSynthesisOutputFormat = sdk.SpeechSynthesisOutputFormat[RAW_OUTPUT];
  const synth = new sdk.SpeechSynthesizer(cfg, null);
  const events = [];
  synth.wordBoundary = (_s, e) => events.push({ type: String(e.boundaryType), offset: e.audioOffset, duration: e.duration, text: e.text, textOffset: e.textOffset, wordLength: e.wordLength });
  try {
    const result = await new Promise((resolve, reject) => synth.speakSsmlAsync(ssml, resolve, (e) => reject(new SpeechError(redact(e, [key]), { code: 'ConnectionFailure', retryable: true }))));
    if (result.reason === sdk.ResultReason.SynthesizingAudioCompleted) {
      return { audio: Buffer.from(result.audioData), events, durationTicks: result.audioDuration };
    }
    const d = sdk.CancellationDetails.fromResult(result);
    const code = sdk.CancellationErrorCode[d.ErrorCode] ?? String(d.ErrorCode);
    throw new SpeechError(`speech service: ${code}: ${redact(d.errorDetails || result.errorDetails || 'no details', [key])}`, { code, retryable: RETRYABLE.has(code) });
  } finally {
    try { synth.close(); } catch { /* already closed */ }
  }
}

// Up to `retries` more attempts on throttling and transient service errors, backing off
// exponentially with jitter (1 s, 2 s, 4 s … by default).
export async function withRetries(fn, { retries = 3, baseMs = 1000, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), onRetry = () => {} } = {}) {
  for (let attempt = 0; ; attempt++) {
    try { return await fn(attempt); } catch (e) {
      if (!e?.retryable || attempt >= retries) throw e;
      const ms = baseMs * 2 ** attempt * (0.75 + Math.random() * 0.5);
      onRetry(e, attempt + 1, ms);
      await sleep(ms);
    }
  }
}

// Starts at most `perMinute` requests a minute (F0 allows 20 per 60 s; the default 18 stays under).
export function pacer(perMinute, now = () => Date.now(), sleep = (ms) => new Promise((r) => setTimeout(r, ms))) {
  const gap = 60000 / Math.max(0.1, perMinute);
  let next = 0;
  return async () => {
    const t = now();
    const at = Math.max(t, next);
    next = at + gap;
    if (at > t) await sleep(at - t);
  };
}
