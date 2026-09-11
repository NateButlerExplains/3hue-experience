# The guides' voices

The guided tour has two guides, Avi and Huey (O12), and both speak with ElevenLabs voices (O13): Avi `PAdXflgOFROGTlJEdlSu`, Huey `d9DA0yC1x1RCfpwZPDMM`.

- **Rendered once, at build time.** The voices are rendered into static files. The browser never calls a speech service: it plays `media/voice/<guide>/<id>.mp3` and highlights each caption word from `media/voice/<guide>/<id>.json`.
- **Who says what.** A line pinned with `who` is rendered once, in that guide's voice. Every other line, and every Ask line, is rendered in both voices, because the lead says it and the visitor picks the lead.
- **Disclosure.** `guide.disclosure` says the voices are synthetic.
- **Azure stays an option.** The Azure AI Speech adapter (`en-US-AvaNeural`, the owner's voice) is still there. Any guide can use it by setting its `provider` to `azure`.

Tools: `tools/voice/*.mjs`. They need Node 22 and ffmpeg; Azure also needs the devDependency `microsoft-cognitiveservices-speech-sdk`. The site loads none of this.

## Credentials

**ElevenLabs** (the default). The build reads `ELEVENLABS_API_KEY`, or failing that `ELEVNLABS_API_KEY`, which is the misspelt name in Nate's `~/.env` today.

- It looks in the environment first, then in `~/.env`. From that file it parses only the lines that set those two names, so no other key in the file is ever loaded.
- Values are never printed. Messages say, for example, "ELEVENLABS_API_KEY: set (from ~/.env, as ELEVNLABS_API_KEY)" or "not set".
- Every service error passes through `redact()`, which also blanks any `xi-api-key` header value.
- Renaming the variable to the correct spelling needs no code change.

Nate's steps:

- Optionally rename `ELEVNLABS_API_KEY` to `ELEVENLABS_API_KEY` in `~/.env`.
- On the key's page in ElevenLabs, set a credit cap on the key and turn off usage-based billing, so a runaway render stops at the cap.
- A key limited to text-to-speech is enough. `--check` then says it could not read the voice names or the plan, and carries on.

**Azure** (optional). Azure needs two variables, `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`, read the same way. They are needed only when a guide's `provider` is `azure`. To set them up:

```bash
az cognitiveservices account create -n speech-3hue-voice -g rg-3hue-voice --kind SpeechServices --sku S0 -l eastus --yes
printf 'AZURE_SPEECH_KEY=%s\nAZURE_SPEECH_REGION=eastus\n' \
  "$(az cognitiveservices account keys list -n speech-3hue-voice -g rg-3hue-voice --query key1 -o tsv)" >> ~/.env
chmod 600 ~/.env
```

**What `.env` must never do.** `.env` is git-ignored. `tests/secrets.spec.mjs` fails if any file git tracks, or would pick up next, contains any of these:

- a literal key under any of the names above;
- an `xi-api-key` or `Ocp-Apim-Subscription-Key` header with a real-looking value;
- the value of any secret in `~/.env`.

## Commands

```bash
npm run voice:dry                          # = node tools/voice/build.mjs --dry-run: no key, no network
node tools/voice/build.mjs --check         # key, ffmpeg, the plan; per guide the voice and one live line
node tools/voice/build.mjs --ab eleven_v3,eleven_multilingual_v2   # the listening test → art/voice-ab/report.html
node tools/voice/build.mjs --only arrive-1,arrive-2 --report       # a trial of two lines in both voices, then listen
npm run voice                              # render everything that changed
npm run lint                               # manifest + tour lint, then tools/voice/lint.mjs
```

### `--check`

1. Names the key's variable, and finds ffmpeg and ffprobe.
2. Reads the ElevenLabs plan: its tier, and the characters used and allowed this period.
3. For each guide:
   - reads its voice's name and category (premade, cloned, generated or professional);
   - sends one short line through the whole pipeline: "I'm Avi. 3HUE runs on AiVRIC, and SOC 2 starts here.", with the guide's own name.
4. Checks what comes back: 24 kHz 16-bit mono audio, word times inside the audio, every word placed on the caption, and loudness after encoding.
5. Saves both guides' character alignments to `tests/fixtures/voice/eleven-alignment.json` (text and timings, no key, no audio) as the specs' real fixture. The raw takes go to `art/voice-cache/check-*`.
6. Re-reads the plan so you can see what the check cost. The plan's count lags a request by several seconds, and the tool waits for it.

A missing key exits 3, and so does a key the service refuses.

### `--ab <models>`

The listening test. It uses the five short lines from the first ElevenLabs test:

- the guide's own name in the first line;
- 3HUE, AiVRIC, SOC 2, vCISO and NIST CSF in the last line;
- plus "This is Avi." three ways: the engine's own reading, "AH-vee" and "AY-vee".

Each line is rendered in each guide's voice on each model given, and put through the published pipeline (loudness, MP3 48 kbps). The results go to `art/voice-ab/`:

- `report.html`: the takes side by side, each caption lighting its words as it plays, with duration, characters, credits, words placed and loudness per take;
- `ab.json`: the same numbers;
- `raw/`: the raw takes, so a second run asks for nothing. `--force` asks again.

`--ab-out <dir>` writes the report somewhere else.

### Flags

| Flag | Effect |
|---|---|
| `--dry-run` | Shows each voice file's state (up-to-date, new, changed-text, changed-settings, missing-file, orphan, captions-only). Per guide, it gives the files, billable characters and credits, then the totals against the plan's month (`guide.voice.budget.credits`). For an Azure guide it gives dollars on S0 instead. It also shows the estimated audio length and size, and the budget. Exits 2 when over budget; a render past the month's credits is a warning. |
| `--only <keys>` / `--kind tour\|ask\|faq` / `--guide <ids>` | Render a subset. `--only` takes keys or line ids, comma-separated; a line id matches that line in every voice. `--guide huey` renders one voice, for example to split a render across two months. |
| `--force` | Ask the service again for every line. Takes are not repeatable, so this replaces approved audio. |
| `--reencode` | Re-encode from the local cache only; never calls the service. |
| `--rate <n>` / `--concurrency <n>` | Requests started per minute (default 18) and lines in flight (default 2). ElevenLabs Starter allows 3 at once. Throttling (429) and server errors (5xx) retry 3 times with backoff. |
| `--no-prune` | Keep files whose line no longer exists. By default they are deleted. |
| `--report` | Write `art/voice-report.html`: every file's audio with the caption word underlined as it plays. Lines that say 3HUE, AiVRIC, SOC 2, NIST CSF, vCISO, POA&M, BOD, TTX, M365 or Avi come first. |
| `--json` | The dry-run plan as JSON. |
| `--manifest`, `--tour`, `--out`, `--cache`, `--fixture`, `--ab-out` | Other inputs and outputs. The specs use these. |

**Exit codes:**

| Code | Meaning |
|---|---|
| 0 | Done. |
| 1 | A line failed, or a tool is missing. |
| 2 | Over budget, or the ElevenLabs quota ran out. The run stops there and keeps what it rendered; nothing is asked for twice when you run it again. |
| 3 | Credentials are missing or refused. The run stops. |
| 64 | Bad arguments. |

A render needs the key only if something has to be requested. When the raw take for the exact same request is already in `art/voice-cache/` (git-ignored), the line is re-encoded instead, at no cost.

**Back up `art/voice-cache/`.** ElevenLabs is not deterministic, even with a seed, so the cache is the only copy of a take that was approved.

## What is voiced, and in whose voice

**What.** Every node line in `content/tour.json` (kind `tour`), Ask's own lines such as `ask.intro` (kind `ask`), and every answer line under `ask.questions` (kind `faq`). Summary lines are not voiced; they fill the mailto body.

**How the text is resolved.** A line is voiced as the runtime shows it (`resolveLine` in `js/tourtext.js`), with `ctx.guide` set to the guide saying it. So `{guide}` names that guide, and a door rename changes the text and the hash.

**Keys and files:**

| Line | Key | File |
|---|---|---|
| Pinned with `who: "huey"` | `huey/<id>` | `media/voice/huey/<id>.mp3` |
| Unpinned node line, `ask.intro`, every Ask answer | `avi/<id>` and `huey/<id>` | one file in each guide's folder |
| Uses `@` (the door whose scene is up) | one per door: `<guide>/<id>--<door>` | e.g. `avi/lens-1--win-trust` |

- Ask lines are never pinned: Ask speaks in the lead's voice, whoever that is.
- Line ids never contain `--`, and guide ids are `^[a-z0-9-]+$`, so keys cannot collide.
- A manifest without `guide.guides` is the single-guide shape. Its keys are flat (`<id>`, `<id>--<door>`) and its voice manifest is v1, as before.

**Captions only.** A line with a runtime token (`{answer:…}` or `{chapters:visited}`) cannot be rendered ahead of time and always runs captions-only.

**Pronunciation.**
- A line's `say` field replaces what is spoken for that line. The caption still shows `text`, and spoken words are aligned back to caption words.
- `guide.voice.say` lists whole-word terms and what to say instead. Both guides use it.
  - ElevenLabs gets them as plain-text aliases (`tools/voice/plain.mjs`). On `eleven_multilingual_v2` and `eleven_v3`, pronunciation dictionaries honour only alias rules anyway.
  - Azure gets them as SSML `<sub alias>`.
- The timing file puts each replaced term on the caption term. "three hue" lights "3HUE".
- Adding an entry re-renders only the lines that contain its term.

**Today's list** (proposed; confirm in the listening report):

| Term | Said as |
|---|---|
| AiVRIC | av-RICK (Nate, 2026-09-11) |
| 3HUE | three hue |
| SOC 2 | sock two |
| vCISO | vee-see-so |
| POA&M | P O A and M |
| BOD | board |
| TTX | tabletop exercise |
| M365 | Microsoft three sixty-five |
| NIST CSF | nist C S F |

"Avi" has no entry yet. The A/B report plays the engine's reading, "AH-vee" and "AY-vee" in both voices for Nate to choose; add `"Avi": "AH-vee"` (or `"AY-vee"`) once he does.

## Settings

**Per guide** (`guide.guides.<id>.voice` in `content/experience.json`):

| Field | Default | Meaning |
|---|---|---|
| `provider` | `azure` | `elevenlabs` or `azure`. |
| `name` | `en-US-AvaNeural` for Azure | The voice id. |
| `model` | `eleven_multilingual_v2` | ElevenLabs only. `eleven_v3` is the other candidate (see the A/B). |
| `settings` | the service's own | ElevenLabs `voice_settings`, sent as given: `stability`, `similarity_boost`, `style`, `use_speaker_boost`, `speed`. |
| `seed` | none | ElevenLabs `seed`. It makes a take more repeatable, not identical. |
| `format` | `pcm_24000` | The raw format asked for. If a plan refuses PCM, the adapter asks for `mp3_44100_128` instead, decodes it with ffmpeg, and says so. |
| `normalization` | `auto` | ElevenLabs `apply_text_normalization` (`auto`, `on`, `off`). |

**Shared** (`guide.voice`):

| Field | Default | Meaning |
|---|---|---|
| `locale`, `rate` | `en-US`, `0` | Azure only. 0 writes no `<prosody>`, like the owner's `+0%`. |
| `required` | `true` | While `false` (drafting), missing or stale audio is a lint warning and the line runs captions-only. Set it to `true` in the same commit as `media/voice/`. |
| `say` | `{}` | Pronunciation entries, as above. |
| `loudness` | `{"I": -18, "TP": -1.5, "LRA": 11}` | Two-pass loudnorm target. |
| `mp3` | `{"sampleRate": 24000, "bitrate": 48, "channels": 1}` | The encoding. |
| `budget` | `{"fileKB": 240, "totalMB": 16, "warnMB": 12, "warnChars": 300, "maxChars": 550, "credits": 40000}` | Limits. `totalMB` and `warnMB` apply to each guide's folder. `credits` is the ElevenLabs plan's month (Starter's 40,000; set 100000 on Creator). Sizes are decimal: 1 KB is 1000 bytes. |

Today the manifest sets, for each guide, `provider`, `name`, `model`, `settings` and `seed`, and shares `locale`, `rate`, `required` (false) and `say`.

## The pipeline

1. **Text.**
   - **ElevenLabs:** `plain.mjs` swaps each `say` term for its alias, and keeps, for every character sent, the range of the spoken text it came from. Every character of an alias maps to the whole term it replaced.
   - **Azure:** `ssml.mjs` escapes the text into `<speak><voice>…</voice></speak>`, with the same kind of map.
2. **Speech.**
   - **ElevenLabs:** `elevenlabs.mjs` calls `POST /v1/text-to-speech/{voice_id}/with-timestamps?output_format=pcm_24000` with header `xi-api-key`, and `{text, model_id, voice_settings, seed}` in the body. It wraps the raw 24 kHz 16-bit mono PCM in a WAV (`audio.mjs` `pcmToWav`).
   - **Azure:** `azure.mjs` asks for `Riff24Khz16BitMonoPcm` and records every boundary event.
   - **The cache.** The WAV goes to `art/voice-cache/<speechHash>.wav`. Next to it, `…events.json` holds the word events and, for ElevenLabs, the raw character alignment. Events are re-derived from that alignment on every re-encode, so a better conversion never needs a new take.
3. **Words.** Each provider produces word events in the same shape: `WordBoundary` events with offset and duration in 100 ns ticks, the word, and its offset in the text sent.
   - **ElevenLabs:** the character alignment is grouped into words at whitespace, with leading and trailing punctuation trimmed. A replaced term becomes one word carrying the term itself, timed from its alias's first sound to its last.
   - **Placing words on the caption.** `ssml.mjs` `placeWords`, `captionMapper` and `timingJson` place each word by, in order:
     - its pronunciation span;
     - its offset, mapped back through the map, when it lands on the same word at or after the cursor;
     - a forward search;
     - a token whose letters match.

   A line with fewer than 90% of its words placed fails.
4. **Audio.** `tools/voice/audio.mjs` runs ffmpeg in two passes. It measures, then applies the measured values as one linear gain (`linear=true`). It encodes MP3 with `-ar 24000 -ac 1 -b:a 48k`, no tags and bitexact flags, so the same input gives the same bytes. Silence is never trimmed.
5. **Checks.** Each file must pass all of these:
   - MP3 layer III, mono, 24 kHz, constant 48 kbps (read by the built-in header parser and ffprobe);
   - speech starting within 20 ms of where it starts in the WAV;
   - loudness within ±1 LU of target, with true peak at or below −1.0 dBTP (only a warning for lines under 3 s);
   - at most 240 KB;
   - no word ending after the audio.
6. **Files.** `media/voice/<guide>/<id>.mp3`, `media/voice/<guide>/<id>.json` and `media/voice/manifest.json`, written sorted with no timestamps, so an unchanged rebuild changes nothing.

## Formats

### `media/voice/<guide>/<id>.json`

An illustrative file:

```json
{"v":1,"id":"avi/arrive-1","hash":"cf246d029a18","voice":"PAdXflgOFROGTlJEdlSu",
 "text":"Welcome to the 3HUE lobby. I'm Avi, one of your two guides.","duration":3.912,
 "words":[[0.05,0.33,"Welcome",0,7],[0.41,0.12,"to",8,10],[0.55,0.1,"the",11,14],[0.7,0.52,"3HUE",15,19]]}
```

- `text` is the caption exactly as the script resolves it for that guide. The runtime refuses a file whose `text` differs.
- `duration` is the gapless play time of the MP3 in seconds.
- Each word is `[start s, duration s, spoken word, charStart, charEnd)`, sorted by start and rounded to milliseconds.
  - The positions are UTF-16 offsets into `text`, end excluded, and point at the caption word, not what was spoken. A term said through an alias is one word carrying the term ("3HUE").
  - `charStart` and `charEnd` are both `null` for a spoken word that could not be placed (at most 10%). Keep the previous highlight for its duration.
- The first three fields match the owner's format, so his player can read these files.

### `media/voice/manifest.json` (v2)

```json
{
  "v": 2,
  "guides": {
    "avi": {"format":"pcm_24000","model":"eleven_multilingual_v2","name":"Avi","provider":"elevenlabs","seed":7,"settings":{…},"voice":"PAdXflgOFROGTlJEdlSu"},
    "huey": {"format":"pcm_24000","model":"eleven_multilingual_v2","name":"Huey","provider":"elevenlabs","seed":7,"settings":{…},"voice":"d9DA0yC1x1RCfpwZPDMM"}
  },
  "locale": "en-US",
  "format": {"codec":"mp3","sampleRate":24000,"bitrate":48,"channels":1},
  "loudness": {"I":-18,"TP":-1.5,"LRA":11},
  "totals": {"items":276,"bytes":13150000,"seconds":2190.4,"chars":30400,"guides":{"avi":{…},"huey":{…}}},
  "items": {
    "avi/arrive-1": {"bytes":23544,"chars":58,"duration":3.912,"guide":"avi","hash":"cf246d029a18","kind":"tour","line":"arrive-1","lineHash":"3f6c0e1d2b9a8c71","lufs":-18.2,"tp":-2.9},
    "huey/lens-1--win-trust": {"bytes":…,"door":"win-trust","guide":"huey","hash":…}
  }
}
```

- The values above are illustrative.
- The file holds one item per line, so a re-render shows in a diff as the lines that changed.
- `door` appears only on a per-door key.
- The v1 file (single-guide shape) has `provider`, `voice` and `rate` at the top instead of `guides`, and flat keys. The runtime and the lint still read it.

### Hashes (`tools/voice/hash.mjs`)

| Hash | Over | Used for |
|---|---|---|
| `lineHash` | `hashLine(text, say)` from `js/tourtext.js`: SHA-256 of NFC(text) + "\0" + NFC(say), 16 hex | The runtime spots a stale line without fetching audio. |
| `speechHash` v2 (ElevenLabs) | provider, voice id, model, voice settings (canonical JSON), seed, output format, text normalisation, the pronunciation entries the text uses, and the NFC text sent | Names the local cache. Encoding-only changes re-encode from it. |
| `speechHash` v1 (Azure, unchanged) | provider, voice, locale, rate, the pronunciation entries the text uses, the raw format, NFC spoken text | The same, for Azure takes. |
| `hash` | `speechHash` plus codec, sample rate, bitrate, channels, loudness target and pipeline version, 12 hex | The `?h=` cache key on every request, so neither github.io's 10-minute nor 3hue.net's 4-hour CDN cache serves stale audio. |

## Runtime contract (`js/voice.js`)

1. After the tour's start gesture, fetch `media/voice/manifest.json` with `cache: 'no-cache'`, the first time a line is to be spoken (never while muted). Nothing under `media/voice/` is requested before that.
2. Every line and every Ask line passed to the voice carries `who`: the guide it is pinned to, or the current lead.
   - For line `L` while door `D` is up, the entry is `items["<who>/L--D"]`, falling back to `items["<who>/L"]`.
   - Without a `who`, the voice tries the manifest's lead, then the other guides, so a pinned line still finds its one voice.
   - A v1 manifest uses `items["L--D"]`, then `items["L"]`.
   - No entry means captions only.
3. Compute `hashLine(captionText, filledSay || '')`. If it differs from the entry's `lineHash`, the script changed after the render, so run that line captions-only and fetch nothing for it.
4. Request `media/voice/<key>.json?h=<hash>` and `media/voice/<key>.mp3?h=<hash>`, for example `media/voice/huey/arrive-5.mp3?h=…`. A 404, a decode error, or JSON whose `text` is not the caption means captions for that line only.
5. Highlight caption characters `[charStart, charEnd)` from each word's start, 50 ms early. A `null` range keeps the previous word highlighted. Every word keeps full contrast; the lit word gets a tint and an underline.

### Switches and state

| | Effect |
|---|---|
| `guide.voice.required` | The runtime switch. While `false` (today: no render committed), the tour is captions-only and never requests anything under `media/voice/`. Set it to `true` in the same commit as `media/voice/`: the voice is then on by default, and the voice lint fails on any missing or stale file. |
| `?voice=1` | The audio back end before `required` is `true`, to hear a trial render (`--only …`) in the real tour. |
| `?voice=sim&rate=N` | The simulated back end for the specs: the same fetches and checks, but a clock instead of sound, driven by each timing file. `rate` plays N times faster (0.1–100). |
| `?voice=0` | Always captions only: no Voice control, and no request under `media/voice/`. |
| `?voice-base=<dir>` | Another voice folder. The specs write theirs to `tests/results/voice/<name>/`. Same-origin relative paths only, like `?tour-manifest=`. |
| Mute | The Voice toggle (`aria-pressed`, described by `guide.disclosure`, which shows in the card while the voice is on). Turning it off writes `localStorage['3hue-experience:voice'] = 'off'`; turning it on removes the key. It is the only thing the tour keeps in `localStorage`, read and written in `try/catch`. |

- **Autoplay.** The start click plays a 0.12 s silent MP3 (the `data-unlock` data URI on `#tour-audio`) on both `<audio>` elements before anything awaits, which iOS requires.
  - A tour opened any other way (a deep link, a reload, Forward) starts locked: captions and Next until the visitor turns the voice on. Pressing Next never starts audio.
  - Turning the voice on unlocks only the tour it is turned on in.
  - A refused `play()` locks the voice again and reads that line as a caption.
- **Pacing.**
  - A voiced line hands over to the next 350 ms after it ends. The last line of a node continues to its next node the same way; a choice and a terminal node wait for the visitor.
  - Next skips what the voice is saying; Previous says the earlier line again.
  - The first line of a node waits up to 2.5 s for the camera to settle.
  - Pause, a hidden tab, the Tour map, Ask and the microphone hold the voice where it is. A hidden tab's hold and Pause lift only when the visitor moves the tour (Resume, Next, Previous, a pick, a jump from the map or Ask, Replay), so the new node's first line is heard from its start.
  - Asking Ask a question lifts a hidden tab's hold on Ask's element; the tour stays held until Ask closes.
- **Preloading.** Only the next line of the same node, while the current one plays: its timing file, plus, in the audio back end, its MP3 as a blob URL revoked after use. Nothing is preloaded at a choice, while muted or locked, or with Save-Data on.
- **Ask.** Ask speaks on its own element (`#ask-audio`), in the lead's voice, so an answer never loses the tour's place: its intro when it opens, then each answer's lines in order.
  - Whatever the voice does not actually play is read out in Ask's own live region instead, from that line on. That covers no audio for a line, an MP3 that will not load, a refused `play()`, or the voice being off.
  - Closing Ask, or showing a "Did you mean" or no-match view, stops it.
  - The no-match and "Did you mean" lines are interface strings (`strings.tourAskNone`, `strings.tourAskChoose`) and are not voiced.
- **Screen readers.** The tour's live region reads a line only when the voice does not say it. With the voice on, it announces the chapter, and a waiting choice once the voice has finished.
  - A new chapter's first voiced line starts 1.4 s after the chapter's announcement (within the 2.5 s scene wait), so a screen reader and the voice never talk at once.
  - A chapter the visitor steps past before the voice was ready is announced with the next line.

## The lint (`tools/voice/lint.mjs`, part of `npm run lint`)

It runs offline, with no key and no ffmpeg unless `--deep`.

**Missing or stale audio** (a line that would run captions-only) is a warning while `guide.voice.required` is `false`, and an error once it is `true`. The same rule covers orphan files (files that belong to no line) and a voice manifest written for the other shape (v1 for a two-guide script, or v2 for a single-guide one).

**Always an error:**
- `manifest.json` totals (overall and per guide) or sizes that disagree with the files, or an item filed under the wrong guide;
- a timing file of the wrong shape; with words out of order, outside the text or after the audio; or with fewer than 90% of words placed;
- an MP3 that is not layer III mono at the configured sample rate and constant bitrate;
- a file over 240 KB, or a guide's folder over 16 MB (12 MB is a warning);
- a line over 550 characters (over 300 is a warning);
- loudness off target on a line of 3 s or more.

**A warning:** the two guides' median loudness more than 1 LU apart. It uses lines of 3 s or more. A gap that size would make the voice jump in level at a hand-off.

`--deep` also re-measures loudness with ffmpeg.

## Budget and cost

**ElevenLabs.** The price list is 1 credit per character on `eleven_multilingual_v2` and `eleven_v3`, and half that on the Flash and Turbo models.

- **The script as it stands:** 276 voice files (138 lines in two voices) come to 31,041 billable characters as `npm run voice:dry` counts them, pronunciation aliases included. At the price list that is 31,041 credits.
- **The plan:** `--check` on 2026-09-11 found the account on **Starter: 40,000 characters a month**, resetting on the 11th (the tour plan assumed Creator's 100,000).
- **What was actually billed:** on 2026-09-11 the plan's count moved by **1,099** for 2,193 characters sent (the check plus the A/B). That is about half a credit per character on both models.
- **Consequences:**
  - Script v2's estimated ~39k credits would fit Starter only if that half rate holds.
  - Otherwise, render one guide per month (`--guide`), or move to Creator.
  - The dry run counts at the price list, so it overstates rather than understates.
- **Size:** about 18 minutes and 6.6 MB of audio per guide, estimated at 14 characters a second. The A/B measured 12–16 characters a second, depending on voice and model.

**Azure** bills everything inside `<voice>`, including markup and entities (`&amp;` is five characters), but not the `<speak>` and `<voice>` tags. On S0 that is $15 per 1M characters. The dry run counts it the same way.

## Tests

- **`tests/voice-eleven.spec.mjs`** covers the ElevenLabs path:
  - the real alignment fixture (`tests/fixtures/voice/eleven-alignment.json`) to timing files, with each alias on its term;
  - `buildPlain` and its map;
  - PCM to WAV;
  - HTTP errors, retries, the quota and key stops, the MP3 fallback and redaction;
  - items per guide: a pinned line once, the rest in both voices;
  - the v2 hash;
  - dry-run credits per guide;
  - a render through the adapter with an injected `fetch` that the voice lint then passes;
  - `--check` in process and as a command without a key;
  - the A/B report.
- **`tests/voice-tool.spec.mjs`** covers:
  - hashes (Azure v1 golden values), SSML escaping and mapping;
  - SDK-shaped events (`tests/fixtures/voice/boundaries.json`) to the timing file;
  - dry-run change detection, cost and budget;
  - credentials;
  - the MP3 parser (`tests/fixtures/voice/tiny.mp3`) and the ffmpeg pipeline;
  - a full render through a stand-in Azure synthesiser that the lint then passes;
  - the `required` rule.

  The Azure-specific specs run on the manifest in its single-guide Azure shape.
- **`tests/secrets.spec.mjs`:** no committed key, header or `~/.env` secret value, under any of the names above.
- **`tests/serve.spec.mjs`:** `tools/serve.mjs` serves `.mp3` as `audio/mpeg` and answers byte ranges with 206, as Pages does. Safari needs both to play audio. A server started before this change must be restarted.
- **The runtime specs:** `tests/tour-voice.spec.mjs` (T-14, T-15), `tests/tour-boot.spec.mjs` (T-22) and `tests/tour-rename.spec.mjs` (T-23) test the runtime above.
  - Their voice folders are written at test time by `tests/voice-fixture.mjs` (a v2 manifest, per-guide folders). They use stand-in timings from the caption's own tokens, and `tests/fixtures/voice/one-second.mp3` (1 s of ffmpeg silence in the published format) for the real audio back end, so their hashes always match the copy under test.
  - T-14 also drives `speak()` with an explicit `who`.

## When something goes wrong

- **"ELEVENLABS_API_KEY: not set".** Neither spelling is in the environment or `~/.env`. Exit 3.
- **401 invalid_api_key, or missing_permissions on text-to-speech.** The key is wrong, revoked, or not allowed to speak. The run stops with exit 3. Check it with `--check`.
- **quota_exceeded.** The plan's month, or the key's credit cap, ran out. The run stops with exit 2 and keeps what it rendered. Run it again after the reset or a top-up: nothing already rendered is asked for twice.
- **429 too_many_concurrent_requests / system_busy.** The build retries. On Starter, keep `--concurrency` at 2 or 3.
- **"came as mp3_44100_128 … decoded with ffmpeg".** The plan refused PCM. The audio is usable, but it came from a lossy source. Setting the guide's `format` to `mp3_44100_128` makes that explicit.
- **AuthenticationFailure or Forbidden (Azure).** The key and region don't match. Check both with `--check`.
- **"N of M word timings placed".** The service said words the text doesn't contain, for example an abbreviation it expanded. Add a `say` to the line or a `guide.voice.say` entry.
- **Loudness off target, or the guides more than 1 LU apart.** Listen in the report. A very short or very quiet line may need rewording rather than more gain.
- **"speech starts at … in the MP3".** The encoder or ffmpeg changed how it pads the start. Don't publish; word timings would drift.
