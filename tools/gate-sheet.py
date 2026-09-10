#!/usr/bin/env python3
"""Contact sheet for the render gate: the candidate beside the lobby door crop, plus 2x crops of
five anchor areas (the four corners and the centre, where text or artefacts hide). Usage:

    python3 tools/gate-sheet.py <door> <NN>       # reads art/rooms/<door>/candidate-NN.master-2560.png (or the native file)

Writes art/rooms/<door>/gate-NN.jpg.
"""
import json
import os
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
door, nn = sys.argv[1], sys.argv[2]
folder = os.path.join(ROOT, 'art', 'rooms', door)
master = os.path.join(folder, f'candidate-{nn}.master-2560.png')
native = os.path.join(folder, f'candidate-{nn}.png')
src = master if os.path.exists(master) else native
img = Image.open(src).convert('RGB')
W, H = img.size

geo = json.load(open(os.path.join(ROOT, 'content', 'geometry.json')))
plate = Image.open(os.path.join(ROOT, 'media', 'plate', 'lobby-plate-2880.jpg')).convert('RGB')
l, t, r, b = geo['doorways'][door]['frame']
pad = 120
doorcrop = plate.crop((int(l - pad), int(t - pad), int(r + pad), int(b + pad)))

sheetW = 2400
cand = img.resize((1600, round(H * 1600 / W)), Image.LANCZOS)
dc = doorcrop.resize((760, round(doorcrop.size[1] * 760 / doorcrop.size[0])), Image.LANCZOS)
rowH = max(cand.size[1], dc.size[1])
# five 2x crops, 400x225 each from the master
cw, ch = 400, 225
anchors = [(0, 0), (W - cw, 0), (0, H - ch), (W - cw, H - ch), ((W - cw) // 2, (H - ch) // 2)]
crops = [img.crop((x, y, x + cw, y + ch)).resize((cw * 2, ch * 2), Image.NEAREST) for x, y in anchors]
sheet = Image.new('RGB', (sheetW, rowH + 40 + ch * 2 + 60), (11, 17, 24))
d = ImageDraw.Draw(sheet)
sheet.paste(cand, (20, 20))
sheet.paste(dc, (1640, 20))
d.text((20, rowH + 26), f'{door} candidate-{nn}  {src.split("/")[-1]}  {W}x{H}', fill=(226, 232, 240))
d.text((1640, rowH + 26), 'lobby door crop (plate)', fill=(226, 232, 240))
x = 20
for i, c in enumerate(crops):
    if x + cw * 2 > sheetW:
        break
    sheet.paste(c, (x, rowH + 50))
    d.text((x, rowH + 50 + ch * 2 + 4), ['top-left', 'top-right', 'bottom-left', 'bottom-right', 'centre'][i] + ' 2x', fill=(148, 163, 184))
    x += cw * 2 + 10
out = os.path.join(folder, f'gate-{nn}.jpg')
sheet.save(out, quality=88)
print(out, sheet.size)
