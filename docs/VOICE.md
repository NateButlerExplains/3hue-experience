# AiVRIC's voice

The guided tour (O10) speaks with Azure AI Speech `en-US-AvaNeural`, the same voice as the owner's tour. The voice is rendered once, at build time, into static files. The browser never calls a speech service; it plays `media/voice/<key>.mp3` and highlights each caption word from `media/voice/<key>.json`. The disclosure line in `guide.disclosure` says the voice is synthetic, as Microsoft's code of conduct requires.

Tools: `tools/voice/*.mjs` (Node 22, ffmpeg, and the devDependency `microsoft-cognitiveservices-speech-sdk`). None of this is loaded by the site.

## Credentials

The build needs two variables: `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`. It reads the environment first. Then it reads `~/.env`, and from that file it parses only the lines that set those two names, so no other key in the file is ever loaded. Values are never printed: messages say "set (from ~/.env)" or "not set", and service errors are redacted.

Set them up once (Nate's step):

```bash
az login
az group create -n rg-3hue-voice -l eastus
az cognitiveservices account create -n speech-3hue-voice -g rg-3hue-voice --kind SpeechServices --sku S0 -l eastus --yes
# append both to ~/.env without the key ever reaching the screen
printf 'AZURE_SPEECH_KEY=%s\nAZURE_SPEECH_REGION=eastus\n' \
  "$(az cognitiveservices account keys list -n speech-3hue-voice -g rg-3hue-voice --query key1 -o tsv)" >> ~/.env
chmod 600 ~/.env
node tools/voice/build.mjs --check
```

Portal alternative: Create a resource → Speech service → region East US → pricing tier Standard S0, then copy KEY 1 and the region from Keys and Endpoint into `~/.env` by hand.

`--check` lists which variables are set and where they came from, finds ffmpeg, ffprobe and the SDK, then synthesises "Test." and confirms the service returns 24 kHz 16-bit mono WAV with word events in 100 ns ticks. It saves the raw events to `art/voice-cache/check-events.json`. If a variable is missing, it names it and exits 3.

`.env` is git-ignored. `tests/secrets.spec.mjs` fails if any file git tracks, or would pick up next, contains a literal key, a subscription-key header or the value of any secret in `~/.env`.

## Commands

```bash
npm run voice:dry                          # = node tools/voice/build.mjs --dry-run: no key, no network
node tools/voice/build.mjs --check         # credentials, tools, one live test
node tools/voice/build.mjs --only arrive-1,arrive-2,wt-1 --report   # a three-line trial, then listen
npm run voice                              # render everything that changed
npm run lint                               # manifest + tour lint, then tools/voice/lint.mjs
```

| Flag | Effect |
|---|---|
| `--dry-run` | Shows each voice file's state (up-to-date, new, changed-text, changed-settings, missing-file, orphan, captions-only), the billable characters, the cost on S0 ($15 per 1M characters) and the share of F0's 500,000 free characters a month, the estimated audio length and size, and the budget. Exits 2 when over budget. |
| `--only <keys>` / `--kind tour\|ask\|faq` | Render a subset. Keys or line ids, comma-separated. |
| `--force` | Ask the service again for every line (for example, after Microsoft updates the voice). |
| `--reencode` | Re-encode from the local cache only; never calls the service. |
| `--rate <n>` / `--concurrency <n>` | Requests started per minute (default 18, which is safe on F0's 20 per minute) and lines in flight (default 2). Throttling and transient errors retry 3 times with backoff. |
| `--no-prune` | Keep files whose line no longer exists (by default they are deleted). |
| `--report` | Write `art/voice-report.html`: every line's audio, with the caption word underlined as it plays. Lines that say 3HUE, AiVRIC, SOC 2, NIST CSF or vCISO come first. |
| `--json` | The dry-run plan as JSON. |
| `--manifest`, `--tour`, `--out`, `--cache` | Other inputs and outputs. The specs use these; `--tour tests/fixtures/tour-min.json` prices the fixture. |

Exit codes: 0 done, 1 a line failed or a tool is missing, 2 over budget, 3 missing credentials, 64 bad arguments.

A render needs the key only if something has to be requested. When the raw audio for the exact same request is already in `art/voice-cache/` (git-ignored), the line is re-encoded instead, at no cost.

## What is voiced

- Every node line in `content/tour.json` (kind `tour`), Ask's own lines such as `ask.intro` (kind `ask`), and every answer line under `ask.questions` (kind `faq`).
- Summary lines are not voiced: they fill the mailto body.
- A line is voiced as the runtime shows it (`resolveLine` in `js/tourtext.js`), so a door rename changes the text and the hash, and the line re-renders on the next build.
- **Keys.** A line's key is its id. A line that uses `@` (the door whose scene is up) is rendered once per door, keyed `<id>--<door>`, for example `lens-1--win-trust`. Line ids never contain `--`.
- **Captions only.** A line with a runtime token (`{answer:…}` or `{chapters:visited}`) cannot be rendered ahead of time and always runs captions-only.
- **Pronunciation.**
  - A line's `say` field replaces what is spoken for that line; the caption still shows `text`, and spoken words are aligned back to caption words.
  - `guide.voice.say` is a list of whole-word entries applied to every line as SSML `<sub alias>`, for example `{"vCISO": "virtual C I S O"}`. Adding an entry re-renders only the lines that contain its term.
  - Leave 3HUE and AiVRIC at the engine's default unless the listening check says otherwise; that keeps them continuous with the owner's tour.

## Settings (`guide.voice` in `content/experience.json`)

| Field | Default | Meaning |
|---|---|---|
| `provider`, `name`, `locale` | `azure`, `en-US-AvaNeural`, `en-US` | The voice. |
| `rate` | `0` | Relative speed in percent. 0 writes no `<prosody>`, like the owner's `+0%`. |
| `required` | `true` | While `false` (drafting), missing or stale audio is a lint warning and the line runs captions-only. Set it to `true` once the render is committed. |
| `say` | `{}` | Pronunciation entries, as above. |
| `loudness` | `{"I": -18, "TP": -1.5, "LRA": 11}` | Two-pass loudnorm target. |
| `mp3` | `{"sampleRate": 24000, "bitrate": 48, "channels": 1}` | The encoding. |
| `budget` | `{"fileKB": 240, "totalMB": 16, "warnMB": 12, "warnChars": 300, "maxChars": 550}` | Limits. Sizes are decimal: 1 KB is 1000 bytes. |

Today the manifest sets `provider`, `name`, `locale`, `rate` and `required` (false); the other fields take these defaults until someone writes them.

## The pipeline

1. **SSML.** `tools/voice/ssml.mjs` escapes the spoken text into `<speak><voice name="en-US-AvaNeural">…</voice></speak>`. Text escapes `&`, `<` and `>`; attributes escape all five XML specials; control characters become spaces. It keeps a map from every SSML character back to the plain-text character it came from.
2. **Speech.** `tools/voice/azure.mjs` asks for lossless WAV (`Riff24Khz16BitMonoPcm`) and records every boundary event as `{type, offset, duration, text, textOffset, wordLength}`. Offset and duration are in 100 ns ticks; `textOffset` is the SDK's position in the SSML, or -1 when it could not find the word. The WAV and events are cached in `art/voice-cache/<speechHash>.{wav,events.json}`.
3. **Words.** Only `WordBoundary` events count. Each word is placed on the caption by, in order:
   - its pronunciation span;
   - the SDK offset, mapped back through the SSML map, when it lands on the same word at or after the cursor;
   - a forward search;
   - a token whose letters match (so "I’m" still finds "I'm").
   A line with fewer than 90% of its words placed fails.
4. **Audio.** `tools/voice/audio.mjs` runs ffmpeg in two passes: it measures, then applies the measured values as one linear gain (`linear=true`) and encodes MP3 with `-ar 24000 -ac 1 -b:a 48k`, no tags and bitexact flags, so the same input gives the same bytes. Silence is never trimmed.
5. **Checks.** Each line must pass all of these:
   - MP3 layer III, mono, 24 kHz, constant 48 kbps (read by the built-in header parser and ffprobe);
   - speech starting within 20 ms of where it starts in the WAV;
   - loudness within ±1 LU of target, with true peak at or below −1.0 dBTP (only a warning for lines under 3 s);
   - at most 240 KB;
   - no word ending after the audio.
6. **Files.** `media/voice/<key>.mp3`, `media/voice/<key>.json` and `media/voice/manifest.json`, written sorted with no timestamps, so an unchanged rebuild changes nothing.

## Formats

### `media/voice/<key>.json`

An illustrative file:

```json
{"v":1,"id":"arrive-1","hash":"a19255b770d4","voice":"en-US-AvaNeural",
 "text":"Welcome to 3HUE. I'm AiVRIC, your 3HUE guide.","duration":3.412,
 "words":[[0.05,0.375,"Welcome",0,7],[0.465,0.15,"to",8,10],[0.655,0.24,"3HUE",11,15]]}
```

- `text` is the caption exactly as the script resolves it. The runtime refuses a file whose `text` differs.
- `duration` is the gapless play time of the MP3 in seconds.
- Each word is `[start s, duration s, spoken word, charStart, charEnd)`, sorted by start and rounded to milliseconds.
  - The positions are UTF-16 offsets into `text`, end excluded, and point at the caption word, not what was spoken. For a `say` line, "Three" and "hue" both point at "3HUE".
  - `charStart` and `charEnd` are both `null` for a spoken word that could not be placed (at most 10%). Keep the previous highlight for its duration.
- The first three fields match the owner's format, so his player can read these files.

### `media/voice/manifest.json`

```json
{
  "v": 1, "provider": "azure", "voice": "en-US-AvaNeural", "locale": "en-US", "rate": 0,
  "format": {"codec":"mp3","sampleRate":24000,"bitrate":48,"channels":1},
  "loudness": {"I":-18,"TP":-1.5,"LRA":11},
  "totals": {"items":138,"bytes":6540000,"seconds":1090.2,"chars":15212},
  "items": {
    "arrive-1": {"bytes":20544,"chars":124,"duration":3.412,"hash":"a19255b770d4","kind":"tour","line":"arrive-1","lineHash":"3f6c0e1d2b9a8c71","lufs":-18.2,"tp":-2.9},
    "lens-1--win-trust": {"bytes":…,"door":"win-trust","hash":…,"kind":"tour","line":"lens-1","lineHash":…}
  }
}
```

The values above are illustrative. The file holds one item per line, so a re-render shows in a diff as the lines that changed. `door` appears only on a per-door key.

### Hashes (`tools/voice/hash.mjs`)

| Hash | Over | Used for |
|---|---|---|
| `lineHash` | `hashLine(text, say)` from `js/tourtext.js`: SHA-256 of NFC(text) + "\0" + NFC(say), 16 hex | The runtime spots a stale line without fetching audio. |
| `speechHash` | provider, voice, locale, rate, the pronunciation entries the text uses, the raw format, NFC spoken text | Names the local cache. Encoding-only changes re-encode from it. |
| `hash` | `speechHash` plus codec, sample rate, bitrate, channels, loudness target and pipeline version, 12 hex | The `?h=` cache key on every request, so neither github.io's 10-minute nor 3hue.net's 4-hour CDN cache serves stale audio. |

## Runtime contract (`js/voice.js`)

1. After the tour's start gesture, fetch `media/voice/manifest.json` with `cache: 'no-cache'`, the first time a line is to be spoken (never while muted). Nothing under `media/voice/` is requested before that.
2. For line `L` while door `D` is up, the entry is `items["L--D"]`, falling back to `items["L"]`. No entry means captions only.
3. Compute `hashLine(captionText, filledSay || '')`. If it differs from the entry's `lineHash`, the script changed after the render, so run that line captions-only and fetch nothing for it.
4. Request `media/voice/<key>.json?h=<hash>` and `media/voice/<key>.mp3?h=<hash>`. A 404, a decode error, or JSON whose `text` is not the caption means captions for that line only.
5. Highlight caption characters `[charStart, charEnd)` from each word's start, 50 ms early. A `null` range keeps the previous word highlighted. Every word keeps full contrast; the lit word gets a tint and an underline.

### Switches and state

| | Effect |
|---|---|
| `guide.voice.required` | The runtime switch. While `false` (today: no render committed) the tour is captions-only and never requests anything under `media/voice/`. Set it to `true` in the same commit as `media/voice/`: the voice is then on by default, and the voice lint fails on any missing or stale file. |
| `?voice=1` | The audio back end before `required` is `true`, to hear a trial render (`--only …`) in the real tour. |
| `?voice=sim&rate=N` | The simulated back end for the specs: the same fetches and checks, a clock instead of sound, driven by each timing file; `rate` plays N times faster (0.1–100). |
| `?voice=0` | Always captions only: no Voice control, no request under `media/voice/`. |
| `?voice-base=<dir>` | Another voice folder (the specs write theirs to `tests/results/voice/<name>/`). Same-origin relative paths only, like `?tour-manifest=`. |
| Mute | The Voice toggle (`aria-pressed`, described by `guide.disclosure`, which shows in the card while the voice is on). Turning it off writes `localStorage['3hue-experience:voice'] = 'off'`; turning it on removes the key. It is the only thing the tour keeps in `localStorage`, read and written in `try/catch`. |

- **Autoplay.** The start click plays a 0.12 s silent MP3 (the `data-unlock` data URI on `#tour-audio`) on both `<audio>` elements before anything awaits, which iOS requires. A tour opened any other way (a deep link, a reload, Forward) starts locked: captions and Next until the visitor turns the voice on, and pressing Next never starts audio. Turning the voice on unlocks only the tour it is turned on in. A refused `play()` locks the voice again and reads that line as a caption.
- **Pacing.** A voiced line hands over to the next 350 ms after it ends; the last line of a node continues to its next node the same way; a choice and a terminal node wait for the visitor. Next skips what the voice is saying; Previous says the earlier line again. The first line of a node waits up to 2.5 s for the camera to settle. Pause, a hidden tab, the Tour map, Ask and the microphone hold the voice where it is; a hidden tab and Pause lift only when the visitor moves the tour (Resume, Next, Previous, a pick, a jump from the map or Ask, Replay), so the new node's first line is heard from its start. Asking Ask a question lifts a hidden tab's hold on Ask's element; the tour stays held until Ask closes.
- **Preloading.** Only the next line of the same node, while the current one plays: its timing file, and in the audio back end its MP3 as a blob URL revoked after use. Nothing is preloaded at a choice, while muted or locked, or with Save-Data on.
- **Ask.** Ask speaks on its own element (`#ask-audio`), so an answer never loses the tour's place: its intro when it opens, then each answer's lines in order. Whatever the voice does not actually play (no audio for a line, an MP3 that will not load, a refused `play()`, the voice off) is read out in Ask's own live region instead, from that line on; closing Ask, or showing a "Did you mean" or no-match view, stops it. The no-match and "Did you mean" lines are interface strings (`strings.tourAskNone`, `strings.tourAskChoose`) and are not voiced.
- **Screen readers.** The tour's live region reads a line only when the voice does not say it; with the voice on it announces the chapter, and a waiting choice once the voice has finished. A new chapter's first voiced line starts 1.4 s after the chapter's announcement (within the 2.5 s scene wait), so a screen reader and the voice never talk at once; a chapter the visitor steps past before the voice was ready is announced with the next line.

## The lint (`tools/voice/lint.mjs`, part of `npm run lint`)

It runs offline, with no key and no ffmpeg unless `--deep`.

**Missing or stale audio** (a line that would run captions-only) is a warning while `guide.voice.required` is `false`, and an error once it is `true`. Orphan files, which belong to no line, follow the same rule.

**Always an error:**
- `manifest.json` totals or sizes that disagree with the files;
- a timing file of the wrong shape, or with words out of order, outside the text, or after the audio, or with fewer than 90% of words placed;
- an MP3 that is not layer III mono at the configured sample rate and constant bitrate;
- a file over 240 KB, or a total over 16 MB (12 MB is a warning);
- a line over 550 characters (over 300 is a warning);
- loudness off target on a line of 3 s or more.

`--deep` also re-measures loudness with ffmpeg.

## Budget and cost

Today's script (138 voice files) is 15,440 billable characters as `npm run voice:dry` counts them, about $0.23 per full render on S0 (F0 would cover it free). Estimated at 14 characters a second, that is about 18 minutes and 6.5 MB of audio; one path through the tour streams well under that, one line at a time. Azure bills everything inside `<voice>`, including markup and entities (`&amp;` is five characters), but not the `<speak>` and `<voice>` tags. The dry run counts it the same way.

## Tests

- `tests/voice-tool.spec.mjs`: hashes, SSML escaping and mapping, SDK-shaped events (`tests/fixtures/voice/boundaries.json`) to the timing file, dry-run change detection, cost and budget, credentials, the MP3 parser (`tests/fixtures/voice/tiny.mp3`), the ffmpeg pipeline, a full render through a stand-in synthesiser that the lint then passes, and the `required` rule.
- `tests/secrets.spec.mjs`: no committed key, header or `~/.env` secret value.
- `tests/serve.spec.mjs`: `tools/serve.mjs` serves `.mp3` as `audio/mpeg` and answers byte ranges with 206, as Pages does. Safari needs both to play audio. A server started before this change must be restarted.
- `tests/tour-voice.spec.mjs` (T-14, T-15), `tests/tour-boot.spec.mjs` (T-22) and `tests/tour-rename.spec.mjs` (T-23): the runtime above, with voice folders written at test time by `tests/voice-fixture.mjs` (stand-in timings from the caption's own tokens, and `tests/fixtures/voice/one-second.mp3`, 1 s of ffmpeg silence in the published format, for the real audio back end), so their hashes always match the copy under test.

## When something goes wrong

- **AuthenticationFailure or Forbidden.** The key and region don't match. Check both with `--check`.
- **TooManyRequests.** On F0, keep `--rate` at 18 or below. On S0, raise it.
- **"N of M word timings placed".** The service said words the text doesn't contain (an abbreviation it expanded, for example). Add a `say` to the line or a `guide.voice.say` entry.
- **Loudness off target.** Listen in the report. A very short or very quiet line may need rewording rather than more gain.
- **"speech starts at … in the MP3".** The encoder or ffmpeg changed how it pads the start. Don't publish; word timings would drift.
