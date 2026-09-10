#!/usr/bin/env python3
"""Crop the '3' mark from the logo file onto navy (#071426) at 32x32 and 180x180. Crop and scale
only; never redraw. Usage: /Users/nateb/.venv-esrgan/bin/python tools/build-icons.py"""
import json, os
import numpy as np
from PIL import Image
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
logo = Image.open(os.path.join(ROOT, 'media/brand/3hue-logo.png')).convert('RGBA')
a = np.asarray(logo)
alpha = a[..., 3] > 40
# The mark is the leftmost glyph cluster: take columns up to the first fully transparent gap after the '3'.
cols = alpha.any(axis=0)
xs = np.nonzero(cols)[0]
x0 = xs[0]
gap = None
for x in range(x0 + 20, len(cols) - 1):
    if not cols[x] and not cols[x + 1]:
        gap = x; break
x1 = gap if gap else int(len(cols) * 0.28)
rows = alpha[:, x0:x1].any(axis=1); ys = np.nonzero(rows)[0]
box = (int(x0), int(ys[0]), int(x1), int(ys[-1]) + 1)
mark = logo.crop(box)
g = json.load(open(os.path.join(ROOT, 'content/geometry.json'))); g['logoMark'] = list(box)
json.dump(g, open(os.path.join(ROOT, 'content/geometry.json'), 'w'), indent=2); open(os.path.join(ROOT, 'content/geometry.json'), 'a').write('\n')
for size, name, pad in [(32, 'favicon-32.png', 0.12), (180, 'apple-touch-icon-180.png', 0.16)]:
    canvas = Image.new('RGBA', (size, size), (7, 20, 38, 255))
    inner = int(size * (1 - 2 * pad))
    w, h = mark.size; s = inner / max(w, h)
    m = mark.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)
    canvas.alpha_composite(m, ((size - m.size[0]) // 2, (size - m.size[1]) // 2))
    canvas.convert('RGB').save(os.path.join(ROOT, 'media/brand', name))
    print(name, size, 'mark box', box)
