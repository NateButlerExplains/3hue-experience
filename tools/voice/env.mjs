// Credentials for the voice build (O10): the Azure AI Speech key and region.
//
// They come from the environment first, then from ~/.env. Only the lines that set these two names
// are parsed from that file, so nothing else in it (other services' keys) is ever loaded. Values
// are never printed: messages name the variable and where it came from, and any error text from
// the service passes through redact() before it reaches the terminal.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseEnv } from 'node:util';

export const KEY = 'AZURE_SPEECH_KEY';
export const REGION = 'AZURE_SPEECH_REGION';
export const NAMES = [KEY, REGION];

export const envFile = (home = os.homedir()) => path.join(home, '.env');
const shown = (file) => (file === envFile() ? '~/.env' : file);

// The two names from a dotenv file, or {} when it is missing or unreadable.
export function readEnvFile(file) {
  let text;
  try { text = fs.readFileSync(file, 'utf8'); } catch { return {}; }
  const ours = new RegExp(`^\\s*(?:export\\s+)?(?:${NAMES.join('|')})\\s*=`);
  const lines = text.split(/\r?\n/).filter((l) => ours.test(l)).map((l) => l.replace(/^\s*export\s+/, ''));
  let parsed = {};
  try { parsed = parseEnv(lines.join('\n')); } catch { return {}; }
  const out = {};
  for (const n of NAMES) if (typeof parsed[n] === 'string' && parsed[n].trim()) out[n] = parsed[n].trim();
  return out;
}

// {key, region, from: {NAME: 'the environment' | '~/.env' | null}, missing: [NAME], file}
export function loadCredentials({ env = process.env, file = envFile() } = {}) {
  const fromFile = readEnvFile(file);
  const vals = {}, from = {};
  for (const n of NAMES) {
    const e = typeof env[n] === 'string' ? env[n].trim() : '';
    if (e) { vals[n] = e; from[n] = 'the environment'; }
    else if (fromFile[n]) { vals[n] = fromFile[n]; from[n] = shown(file); }
    else from[n] = null;
  }
  return { key: vals[KEY] ?? null, region: vals[REGION] ?? null, from, missing: NAMES.filter((n) => !vals[n]), file: shown(file) };
}

// One line per variable, never with its value.
export function describe(creds) {
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

// Replace every occurrence of a secret (and any subscription-key header value) in a message.
export function redact(text, secrets = []) {
  let s = String(text ?? '');
  for (const v of secrets) if (typeof v === 'string' && v.length >= 4) s = s.split(v).join('[redacted]');
  return s.replace(/(Ocp-Apim-Subscription-Key["']?\s*[:=]\s*["']?)[^\s"',;]+/gi, '$1[redacted]');
}
