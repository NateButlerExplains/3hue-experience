# Deploy

The site is the repo root, published by GitHub Pages from `main:/` (legacy build, no workflow).

```bash
npm run lint                            # must pass: tools/check-manifest.js (manifest + content/tour.json), then tools/voice/lint.mjs
python3 tools/stamp-version.py          # bumps ?v= on every css/js reference and module import (css/tour.css follows css/experience.css's stamp)
git add -A && git commit -m "..." && git push
gh api repos/NateButlerExplains/3hue-experience/pages/builds/latest --jq .status   # wait for "built"
CHECK_BASE=https://natebutlerexplains.github.io/3hue-experience/ npx playwright test
```

- Pages/CDN caches for hours; never publish without the stamp.
- Never name a served file `_*` or `.*` (Jekyll would hide it even with `.nojekyll` in some paths).
- Share cards bake absolute URLs from `site.url`; rebuild them (`node tools/build-shares.js`) if the origin ever changes.
- To lift `noindex`: set `site.robots` to `index` in the manifest and remove the meta tag from `index.html` and `s/*.html`; then regenerate the stubs.

## The guided tour: voice and go-live (O10/O11)

Until the copy gate signs `docs/copy-sheets-tour.md`, publishing changes nothing a visitor sees: `tour.gate` is `"pending"`, the walk button walks, and nothing under `content/tour.json` or `media/voice/` is fetched. `?tour=1` previews the tour on the published site.

1. **Voice render** (`docs/VOICE.md`), after the sign-off: `node tools/voice/build.mjs --check`, a three-line trial with `--report` and a listen through `?tour=1&voice=1`, then `npm run voice`. Commit `media/voice/` and set `guide.voice.required` to `true` in the same commit, so the voice lint fails on any missing or stale file from then on.
2. **Gate:** set `tour.gate` to `"approved"` and `strings.walk` to the tour's label.
3. **Specs:** add `?tour=0` to the walk entry points in `tests/walk.spec.mjs`, `tests/motion.spec.mjs` and `tests/axe.spec.mjs` (T-21; the walk stays reachable at `#/walk/<n>` and with `?tour=0`).
4. **Cards:** the resting lobby's header label changed, so rebuild the share cards (`npm run shares`, P6-D06's recapture rule).
5. `npm run lint`, `npm run stamp`, commit, push, wait for the build, then `npm run check:live`, `bash tools/bots.sh`, `bash tools/lighthouse.sh`, and fill the Published column (`node tools/fill-register.mjs published tests/results/live.json`), T rows included.

- `tools/serve.mjs` serves `.mp3` as `audio/mpeg` with byte ranges (206), as Pages does; restart a server started before that change, or WebKit will not play the voice locally.
