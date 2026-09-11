// Credentials for the voice build (O10, O13): the ElevenLabs key (O13), and the Azure AI Speech
// key and region for the optional Azure adapter.
//
// They come from the environment first, then from ~/.env. Only the lines that set these names are
// parsed from that file, so nothing else in it (other services' keys) is ever loaded. Values are
// never printed: messages name the variable and where it came from, and any error text from a
// service passes through redact() before it reaches the terminal.
//
// ElevenLabs: ELEVENLABS_API_KEY, else ELEVNLABS_API_KEY (the spelling in Nate's ~/.env today; both
// are read, the correct one first, so renaming it later needs no change here).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEnv } from 'node:util';

export const KEY = 'AZURE_SPEECH_KEY';
export const REGION = 'AZURE_SPEECH_REGION';
export const NAMES = [KEY, REGION];
export const ELEVEN_KEY = 'ELEVENLABS_API_KEY';
export const ELEVEN_KEY_ALT = 'ELEVNLABS_API_KEY';
export const ELEVEN_NAMES = [ELEVEN_KEY, ELEVEN_KEY_ALT];

export const envFile = (home = os.homedir()) => path.join(home, '.env');
const shown = (file) => (file === envFile() ? '~/.env' : file);

// The given names from a dotenv file, or {} when it is missing or unreadable.
export function readEnvFile(file, names = NAMES) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return {}; }
  const ours = new RegExp(`^\\s*(?:export\\s+)?(?:${names.join('|')})\\s*=`);
  const lines = text.split(/\r?\n/).filter((l) => ours.test(l)).map((l) => l.replace(/^\s*export\s+/, ''));
  let parsed = {};
  try { parsed = parseEnv(lines.join('\n')); } catch { return {}; }
  const out = {};
  for (const n of names) if (typeof parsed[n] === 'string' && parsed[n].trim()) out[n] = parsed[n].trim();
  return out;
}

// Azure: {provider, key, region, from: {NAME: 'the environment' | '~/.env' | null}, missing: [NAME], file}
export function loadCredentials({ env = process.env, file = envFile() } = {}) {
  const fromFile = readEnvFile(file, NAMES);
  const vals = {}, from = {};
  for (const n of NAMES) {
    const e = typeof env[n] === 'string' ? env[n].trim() : '';
    if (e) { vals[n] = e; from[n] = 'the environment'; }
    else if (fromFile[n]) { vals[n] = fromFile[n]; from[n] = shown(file); }
    else from[n] = null;
  }
  return { provider: 'azure', names: NAMES, key: vals[KEY] ?? null, region: vals[REGION] ?? null, from, missing: NAMES.filter((n) => !vals[n]), file: shown(file) };
}

// ElevenLabs: one key under either name, the environment before ~/.env and the correct spelling
// before the other. `as` records which name supplied it. {provider, key, from, as, missing, file}
export function loadElevenCredentials({ env = process.env, file = envFile() } = {}) {
  const fromFile = readEnvFile(file, ELEVEN_NAMES);
  const out = { provider: 'elevenlabs', names: [ELEVEN_KEY], key: null, from: { [ELEVEN_KEY]: null }, as: null, missing: [ELEVEN_KEY], file: shown(file) };
  for (const [where, src] of [['the environment', env], [shown(file), fromFile]]) {
    for (const n of ELEVEN_NAMES) {
      const v = typeof src[n] === 'string' ? src[n].trim() : '';
      if (!v) continue;
      Object.assign(out, { key: v, as: n, missing: [] });
      out.from[ELEVEN_KEY] = where;
      return out;
    }
  }
  return out;
}

// One line per variable, never with its value.
export function describe(creds) {
  if (creds.provider === 'elevenlabs') {
    const w = creds.from[ELEVEN_KEY];
    return [w ? `${ELEVEN_KEY}: set (from ${w}${creds.as !== ELEVEN_KEY ? `, as ${creds.as}` : ''})` : `${ELEVEN_KEY}: not set (looked for ${ELEVEN_KEY} and ${ELEVEN_KEY_ALT} in the environment and ${creds.file})`];
  }
  return NAMES.map((n) => (creds.from[n] ? `${n}: set (from ${creds.from[n]})` : `${n}: not set (looked in the environment and ${creds.file})`));
}

export function missingMessage(creds) {
  const names = creds.missing.join(' and ');
  return [
    `Missing ${creds.missing.length === 1 ? 'credential' : 'credentials'}: ${names}.`,
    ...describe(creds).map((l) => `  ${l}`),
    `Add ${creds.missing.length === 1 ? 'it' : 'them'} to ~/.env (docs/VOICE.md, "Credentials"). The values are never printed.`,
  ].join('\n');
}

// Replace every occurrence of a secret, and any subscription-key or xi-api-key header value, in a
// message.
export function redact(text, secrets = []) {
  let s = String(text ?? '');
  for (const v of secrets) if (typeof v === 'string' && v.length >= 4) s = s.split(v).join('[redacted]');
  return s.replace(/((?:Ocp-Apim-Subscription-Key|xi-api-key)["']?\s*[:=,]\s*["']?)[^\s"',;}]+/gi, '$1[redacted]');
}
