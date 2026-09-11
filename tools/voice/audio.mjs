// Audio for the voice build (O10, O13): WAV in, loudness-normalised MP3 out, and the checks on it.
//
// Azure returns lossless WAV (24 kHz, 16-bit mono); ElevenLabs returns raw PCM (pcm_24000: 24 kHz,
// 16-bit little-endian mono, no header), which pcmToWav() wraps in the same WAV. When a plan tier
// refuses PCM, the ElevenLabs adapter asks for mp3_44100_128 instead and decodeToWav() turns it
// into that WAV with ffmpeg (a lossy source, so the adapter says so). ffmpeg measures its loudness,
// then applies the measured values in a single linear gain (loudnorm, two passes, I -18 LUFS,
// TP -1.5 dBTP by default) and encodes one MP3 at 24 kHz mono 48 kbps with no tags, so the same
// input always gives the same bytes. Silence is never trimmed, so word timings stay valid; the
// check compares where speech starts in the WAV and in the MP3 (within 20 ms).
//
// parseMp3() reads MPEG audio frame headers and the Xing/Info + LAME tag in plain JS, so the voice
// lint needs no ffprobe: layer, sample rate, channels, bitrate, frame count, encoder delay and
// padding, and the gapless duration the browser plays.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const pexec = promisify(execFile);
const round1 = (x) => (Number.isFinite(x) ? Math.round(x * 10) / 10 : x);

export function findTool(name, envVar) {
  if (process.env[envVar]) return process.env[envVar];
  for (const dir of ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin']) {
    const p = path.join(dir, name);
    if (fs.existsSync(p)) return p;
  }
  return name;
}
export const ffmpeg = () => findTool('ffmpeg', 'FFMPEG');
export const ffprobe = () => findTool('ffprobe', 'FFPROBE');

export async function toolVersion(bin) {
  try { const { stdout } = await pexec(bin, ['-version']); return stdout.split('\n')[0].trim(); } catch { return null; }
}

async function run(bin, args) {
  try { return await pexec(bin, args, { maxBuffer: 64 * 1024 * 1024 }); } catch (e) {
    const tail = String(e.stderr || e.message || '').trim().split('\n').slice(-3).join(' | ');
    throw new Error(`${path.basename(bin)} failed: ${tail}`);
  }
}

// ---- WAV ----
export function wavInfo(buf) {
  if (!buf || buf.length < 12 || buf.toString('latin1', 0, 4) !== 'RIFF' || buf.toString('latin1', 8, 12) !== 'WAVE') return null;
  let off = 12, fmt = null, data = null;
  while (off + 8 <= buf.length) {
    const id = buf.toString('latin1', off, off + 4);
    let size = buf.readUInt32LE(off + 4);
    if (id === 'fmt ') fmt = { audioFormat: buf.readUInt16LE(off + 8), channels: buf.readUInt16LE(off + 10), sampleRate: buf.readUInt32LE(off + 12), bitsPerSample: buf.readUInt16LE(off + 22) };
    else if (id === 'data') {
      if (off + 8 + size > buf.length) size = buf.length - off - 8;   // streamed WAVs may leave the size open
      data = { offset: off + 8, bytes: size };
      break;
    }
    off += 8 + size + (size & 1);
  }
  if (!fmt || !data || !fmt.channels || !fmt.bitsPerSample) return null;
  const frame = (fmt.channels * fmt.bitsPerSample) / 8;
  return { ...fmt, dataOffset: data.offset, dataBytes: data.bytes, samples: Math.floor(data.bytes / frame), duration: data.bytes / frame / fmt.sampleRate };
}

// A 16-bit PCM mono WAV from samples in [-1, 1] (tests and the fake synthesiser).
export function makeWav(samples, sampleRate = 24000) {
  const n = samples.length;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write('RIFF', 0, 'latin1'); buf.writeUInt32LE(36 + n * 2, 4); buf.write('WAVE', 8, 'latin1');
  buf.write('fmt ', 12, 'latin1'); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34);
  buf.write('data', 36, 'latin1'); buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) buf.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))), 44 + i * 2);
  return buf;
}

// Raw little-endian PCM (ElevenLabs pcm_24000) → a canonical 44-byte-header WAV around the same
// bytes. A trailing odd byte (a half sample) is dropped so the data holds whole frames.
export function pcmToWav(pcm, { sampleRate = 24000, channels = 1, bitsPerSample = 16 } = {}) {
  const src = Buffer.isBuffer(pcm) ? pcm : Buffer.from(pcm ?? []);
  const frame = (channels * bitsPerSample) / 8;
  const bytes = src.length - (src.length % frame);
  const buf = Buffer.alloc(44 + bytes);
  buf.write('RIFF', 0, 'latin1'); buf.writeUInt32LE(36 + bytes, 4); buf.write('WAVE', 8, 'latin1');
  buf.write('fmt ', 12, 'latin1'); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(channels, 22);
  buf.writeUInt32LE(sampleRate, 24); buf.writeUInt32LE(sampleRate * frame, 28); buf.writeUInt16LE(frame, 32); buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36, 'latin1'); buf.writeUInt32LE(bytes, 40);
  src.copy(buf, 44, 0, bytes);
  return buf;
}

// Any audio ffmpeg reads (the MP3 fallback) → 16-bit mono WAV at `sampleRate`, as a Buffer.
export async function decodeToWav(audio, { sampleRate = 24000, tmpDir } = {}) {
  fs.mkdirSync(tmpDir, { recursive: true });
  const stem = path.join(tmpDir, `decode.${process.pid}.${Math.random().toString(36).slice(2)}`);
  try {
    fs.writeFileSync(`${stem}.in`, audio);
    await run(ffmpeg(), ['-hide_banner', '-nostats', '-y', '-i', `${stem}.in`, '-ar', String(sampleRate), '-ac', '1', '-c:a', 'pcm_s16le', '-map_metadata', '-1', '-fflags', '+bitexact', '-f', 'wav', `${stem}.wav`]);
    return fs.readFileSync(`${stem}.wav`);
  } finally {
    for (const f of [`${stem}.in`, `${stem}.wav`]) fs.rmSync(f, { force: true });
  }
}

// ---- ffmpeg ----
const num = (s) => (s === '-inf' ? -Infinity : s === 'inf' ? Infinity : Number(s));
const lastJson = (s) => JSON.parse(s.slice(s.lastIndexOf('{'), s.lastIndexOf('}') + 1));
const loudnormArgs = ({ I, TP, LRA }) => `loudnorm=I=${I}:TP=${TP}:LRA=${LRA}`;

export async function measureLoudness(file, loudness) {
  const { stderr } = await run(ffmpeg(), ['-hide_banner', '-nostats', '-i', file, '-af', `${loudnormArgs(loudness)}:print_format=json`, '-f', 'null', '-']);
  const j = lastJson(stderr);
  return { I: num(j.input_i), TP: num(j.input_tp), LRA: num(j.input_lra), thresh: num(j.input_thresh), offset: num(j.target_offset) };
}

export async function encodeMp3(inFile, outFile, { loudness, mp3, measured }) {
  const apply = measured && [measured.I, measured.TP, measured.LRA, measured.thresh, measured.offset].every(Number.isFinite);
  const af = apply ? ['-af', `${loudnormArgs(loudness)}:measured_I=${measured.I}:measured_TP=${measured.TP}:measured_LRA=${measured.LRA}:measured_thresh=${measured.thresh}:offset=${measured.offset}:linear=true:print_format=json`] : [];
  const { stderr } = await run(ffmpeg(), [
    '-hide_banner', '-nostats', '-y', '-i', inFile, ...af,
    '-ar', String(mp3.sampleRate), '-ac', String(mp3.channels), '-c:a', 'libmp3lame', '-b:a', `${mp3.bitrate}k`,
    '-map_metadata', '-1', '-id3v2_version', '0', '-fflags', '+bitexact', '-flags:a', '+bitexact', '-f', 'mp3', outFile,
  ]);
  let normalization = 'none';
  if (apply) { try { normalization = lastJson(stderr).normalization_type || 'linear'; } catch { normalization = 'linear'; } }
  return { normalization };
}

// Seconds of leading silence (0 when the audio starts with sound).
export async function speechStart(file, { noise = -45, min = 0.02 } = {}) {
  const { stderr } = await run(ffmpeg(), ['-hide_banner', '-nostats', '-i', file, '-af', `silencedetect=n=${noise}dB:d=${min}`, '-f', 'null', '-']);
  const start = stderr.match(/silence_start: (-?[\d.e+-]+)/);
  if (!start || Number(start[1]) > 0.005) return 0;
  const end = stderr.match(/silence_end: ([\d.e+-]+)/);
  return end ? Number(end[1]) : Infinity;
}

export async function probe(file) {
  const { stdout } = await run(ffprobe(), ['-v', 'error', '-select_streams', 'a:0', '-show_entries', 'stream=codec_name,sample_rate,channels,bit_rate', '-of', 'json', file]);
  const s = JSON.parse(stdout).streams?.[0] || {};
  return { codec: s.codec_name, sampleRate: Number(s.sample_rate), channels: Number(s.channels), bitrate: Math.round(Number(s.bit_rate) / 1000) };
}

// WAV file → MP3 file, then every check on the result. `problems` fail the line; `warnings` don't.
// Loudness is only held to the target for lines of 3 s or more: integrated loudness over a word or
// two is not a stable measure, so a short line out of range is a warning.
export async function processAudio({ wavFile, outFile, loudness, mp3 }) {
  const measured = await measureLoudness(wavFile, loudness);
  const { normalization } = await encodeMp3(wavFile, outFile, { loudness, mp3, measured });
  const buf = fs.readFileSync(outFile);
  const info = parseMp3(buf);
  const problems = [], warnings = [];
  if (!info) problems.push('the encoded file is not a readable MP3');
  else {
    if (info.layer !== 3) problems.push(`MPEG layer ${info.layer}, not layer III`);
    if (info.sampleRate !== mp3.sampleRate) problems.push(`${info.sampleRate} Hz, not ${mp3.sampleRate} Hz`);
    if (info.channels !== mp3.channels) problems.push(`${info.channels} channels, not ${mp3.channels}`);
    if (info.bitrate !== mp3.bitrate || !info.cbr) problems.push(`${info.bitrate} kbps${info.cbr ? '' : ' (variable)'}, not a constant ${mp3.bitrate} kbps`);
  }
  const p = await probe(outFile);
  if (p.codec !== 'mp3' || p.sampleRate !== mp3.sampleRate || p.channels !== mp3.channels) problems.push(`ffprobe reads ${p.codec} ${p.sampleRate} Hz ${p.channels} ch`);
  const after = await measureLoudness(outFile, loudness);
  const lufs = round1(after.I), tp = round1(after.TP);
  const raw = await speechStart(wavFile), enc = await speechStart(outFile);
  if (Number.isFinite(raw) && Number.isFinite(enc) && Math.abs(enc - raw) > 0.02) problems.push(`speech starts at ${enc.toFixed(3)} s in the MP3 but ${raw.toFixed(3)} s in the raw audio, so the word timings would drift`);
  const duration = info ? info.duration : null;
  const off = [];
  if (!(Math.abs(lufs - loudness.I) <= 1)) off.push(`${lufs} LUFS (target ${loudness.I} ±1)`);
  if (!(tp <= loudness.TP + 0.5)) off.push(`true peak ${tp} dBTP (at most ${loudness.TP + 0.5})`);
  if (off.length) (duration >= 3 ? problems : warnings).push(`loudness ${off.join(', ')}`);
  return { bytes: buf.length, duration, lufs, tp, normalization, measured, start: { raw, mp3: enc }, mp3: info, problems, warnings };
}

// ---- MP3 frame headers ----
const BITRATES = {
  1: { 1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448], 2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384], 3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320] },
  2: { 1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256], 2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160], 3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160] },
};
const RATES = { 1: [44100, 48000, 32000], 2: [22050, 24000, 16000], 2.5: [11025, 12000, 8000] };

export function frameAt(buf, off) {
  if (off < 0 || off + 4 > buf.length) return null;
  const [b1, b2, b3, b4] = [buf[off], buf[off + 1], buf[off + 2], buf[off + 3]];
  if (b1 !== 0xff || (b2 & 0xe0) !== 0xe0) return null;
  const vbits = (b2 >> 3) & 3, lbits = (b2 >> 1) & 3;
  const bri = b3 >> 4, sri = (b3 >> 2) & 3;
  if (vbits === 1 || lbits === 0 || bri === 0 || bri === 15 || sri === 3) return null;
  const version = vbits === 3 ? 1 : vbits === 2 ? 2 : 2.5;
  const layer = 4 - lbits;
  const bitrate = BITRATES[version === 1 ? 1 : 2][layer][bri];
  const sampleRate = RATES[version][sri];
  const padding = (b3 >> 1) & 1;
  const channels = b4 >> 6 === 3 ? 1 : 2;
  const spf = layer === 1 ? 384 : layer === 2 || version === 1 ? 1152 : 576;
  const length = layer === 1 ? (Math.floor((12 * bitrate * 1000) / sampleRate) + padding) * 4 : Math.floor(((spf / 8) * bitrate * 1000) / sampleRate) + padding;
  return { offset: off, version, layer, crc: !(b2 & 1), bitrate, sampleRate, padding, channels, spf, length };
}

function id3Size(buf) {
  if (buf.length < 10 || buf.toString('latin1', 0, 3) !== 'ID3') return 0;
  const size = ((buf[6] & 0x7f) << 21) | ((buf[7] & 0x7f) << 14) | ((buf[8] & 0x7f) << 7) | (buf[9] & 0x7f);
  return 10 + size + (buf[5] & 0x10 ? 10 : 0);
}

// Xing/Info (and LAME) tag in a frame, or null.
function infoTag(buf, f) {
  const side = f.version === 1 ? (f.channels === 1 ? 17 : 32) : (f.channels === 1 ? 9 : 17);
  const x = f.offset + 4 + (f.crc ? 2 : 0) + side;
  if (x + 8 > buf.length) return null;
  const tag = buf.toString('latin1', x, x + 4);
  if (tag !== 'Xing' && tag !== 'Info') return null;
  const flags = buf.readUInt32BE(x + 4);
  let p = x + 8;
  const out = { tag, frames: null, bytes: null, encoder: null, delay: null, padding: null };
  if (flags & 1) { out.frames = buf.readUInt32BE(p); p += 4; }
  if (flags & 2) { out.bytes = buf.readUInt32BE(p); p += 4; }
  if (flags & 4) p += 100;
  if (flags & 8) p += 4;
  // LAME extension: a 9-byte encoder name, then the 12-bit encoder delay and padding at +21.
  if (p + 24 <= f.offset + f.length && /^[\x20-\x7e]{4}/.test(buf.toString('latin1', p, p + 4))) {
    out.encoder = buf.toString('latin1', p, p + 9).replace(/\0+$/, '').trim();
    out.delay = (buf[p + 21] << 4) | (buf[p + 22] >> 4);
    out.padding = ((buf[p + 22] & 0x0f) << 8) | buf[p + 23];
  }
  return out;
}

export function parseMp3(buf) {
  if (!buf || !buf.length) return null;
  const start = id3Size(buf);
  let first = null;
  for (let o = start; o + 4 <= buf.length && o < start + 65536; o++) {
    const f = frameAt(buf, o);
    if (!f) continue;
    const next = o + f.length;
    const g = next === buf.length ? f : frameAt(buf, next);
    if (g && g.sampleRate === f.sampleRate && g.layer === f.layer) { first = f; break; }
  }
  if (!first) return null;
  const tag = infoTag(buf, first);
  const rates = new Map(), chans = new Set();
  let frames = 0, audioBytes = 0;
  for (let o = tag ? first.offset + first.length : first.offset; o + 4 <= buf.length;) {
    const f = frameAt(buf, o);
    if (!f || f.sampleRate !== first.sampleRate || f.layer !== first.layer || o + f.length > buf.length) break;
    frames++; audioBytes += f.length; rates.set(f.bitrate, (rates.get(f.bitrate) || 0) + 1); chans.add(f.channels);
    o += f.length;
  }
  if (!frames) return null;
  const samples = frames * first.spf;
  const gapless = tag && tag.delay != null ? samples - tag.delay - tag.padding : samples;
  const cbr = rates.size === 1;
  return {
    version: first.version, layer: first.layer, sampleRate: first.sampleRate,
    channels: chans.size === 1 ? [...chans][0] : Math.max(...chans),
    bitrate: cbr ? [...rates.keys()][0] : Math.round((audioBytes * 8) / (samples / first.sampleRate) / 1000),
    cbr, frames, samplesPerFrame: first.spf,
    tag: tag ? tag.tag : null, encoder: tag?.encoder ?? null, delay: tag?.delay ?? null, padding: tag?.padding ?? null,
    duration: Math.max(0, gapless) / first.sampleRate, bytes: buf.length,
  };
}
