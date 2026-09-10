# Deploy

The site is the repo root, published by GitHub Pages from `main:/` (legacy build, no workflow).

```bash
node tools/check-manifest.js            # must pass
python3 tools/stamp-version.py          # bumps ?v= on every css/js reference and module import
git add -A && git commit -m "..." && git push
gh api repos/NateButlerExplains/3hue-experience/pages/builds/latest --jq .status   # wait for "built"
CHECK_BASE=https://natebutlerexplains.github.io/3hue-experience/ npx playwright test
```

- Pages/CDN caches for hours; never publish without the stamp.
- Never name a served file `_*` or `.*` (Jekyll would hide it even with `.nojekyll` in some paths).
- Share cards bake absolute URLs from `site.url`; rebuild them (`node tools/build-shares.js`) if the origin ever changes.
- To lift `noindex`: set `site.robots` to `index` in the manifest and remove the meta tag from `index.html` and `s/*.html`; then regenerate the stubs.
