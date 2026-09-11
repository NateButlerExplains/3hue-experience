// The speech providers the voice build can use (O10, O13), chosen per guide by
// guide.guides.<id>.voice.provider (guide.voice.provider in the single-guide shape). Each one turns
// the spoken text into its request and counts what it bills (build), loads its own credentials
// (credentials), and returns lossless WAV plus word events in one shape, the Azure SDK's: offset
// and duration in 100 ns ticks, text, and textOffset into the request (synthesize). So
// tools/voice/ssml.mjs timingJson places words on the caption the same way for every provider.
//
//   elevenlabs  plain text with alias substitution (plain.mjs), /with-timestamps (elevenlabs.mjs)
//   azure       SSML with <sub alias> (ssml.mjs), the Speech SDK (azure.mjs); kept as an option
import { buildSsml } from './ssml.mjs';
import { buildPlain } from './plain.mjs';
import * as azure from './azure.mjs';
import * as eleven from './elevenlabs.mjs';
import { loadCredentials, loadElevenCredentials } from './env.mjs';

export const PROVIDERS = {
  azure: {
    id: 'azure', label: 'Azure AI Speech',
    build(text, s) { const b = buildSsml(text, { voice: s.voice, locale: s.locale, rate: s.rate, lexicon: s.lexicon }); return Object.assign(b, { request: b.ssml }); },
    credentials: (opts) => loadCredentials(opts),
    credits: () => null,
    // deps.synthesize stands in for the SDK in the specs.
    async synthesize({ item, creds, deps = {} }) {
      const res = await (deps.synthesize || azure.synthesize)({ ssml: item.built.request, key: creds.key, region: creds.region });
      return { audio: res.audio, events: res.events, meta: { durationTicks: res.durationTicks ?? null } };
    },
  },
  elevenlabs: {
    id: 'elevenlabs', label: 'ElevenLabs',
    build: (text, s) => buildPlain(text, { lexicon: s.lexicon }),
    credentials: (opts) => loadElevenCredentials(opts),
    credits: (chars, s) => eleven.creditsFor(chars, s.model),
    // deps.fetchImpl stands in for the network in the specs; model overrides s.model (the A/B test).
    async synthesize({ item, s, creds, deps = {}, tmpDir = null, model = null }) {
      const res = await eleven.synthesize({
        text: item.built.request, voiceId: s.voice, modelId: model || s.model, voiceSettings: s.voiceSettings, seed: s.seed,
        normalization: s.normalization, outputFormat: s.format, key: creds.key, fetchImpl: deps.fetchImpl || globalThis.fetch, tmpDir,
      });
      return {
        audio: res.audio, events: eleven.alignmentEvents(res.alignment, item.built),
        meta: { format: res.format, fellBack: res.fellBack, requestId: res.requestId, characterCost: res.characterCost, alignment: res.alignment, normalized: res.normalized },
      };
    },
  },
};

export function providerOf(name) {
  const p = Object.prototype.hasOwnProperty.call(PROVIDERS, name) ? PROVIDERS[name] : null;
  if (!p) throw new Error(`unknown voice provider ${JSON.stringify(name)} (known: ${Object.keys(PROVIDERS).join(', ')})`);
  return p;
}
