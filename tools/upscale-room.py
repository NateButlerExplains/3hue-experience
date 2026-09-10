#!/usr/bin/env python3
"""Upscale a room candidate with Real-ESRGAN x4plus (spandrel + torch, MPS when available) and
write a 2560-wide 16:9 master beside it (O6). Usage:

    /Users/nateb/.venv-esrgan/bin/python tools/upscale-room.py art/rooms/<door>/candidate-01.png

Writes art/rooms/<door>/candidate-01.esrgan-4x.png (native x4) and candidate-01.master-2560.png
(Lanczos downsample to 2560x1440). The native GPT file is never modified.
"""
import os
import sys
import time

import numpy as np
import torch
from PIL import Image

WEIGHTS = os.path.expanduser('~/.cache/esrgan/RealESRGAN_x4plus.pth')
TILE = 512
PAD = 16


def load_model():
    from spandrel import ModelLoader
    model = ModelLoader().load_from_file(WEIGHTS)
    model = model.eval()
    device = 'mps' if torch.backends.mps.is_available() else 'cpu'
    return model.to(device), device


def upscale(img, model, device):
    arr = np.asarray(img.convert('RGB')).astype(np.float32) / 255.0
    h, w, _ = arr.shape
    out = np.zeros((h * 4, w * 4, 3), dtype=np.float32)
    with torch.no_grad():
        for y in range(0, h, TILE):
            for x in range(0, w, TILE):
                y0, x0 = max(0, y - PAD), max(0, x - PAD)
                y1, x1 = min(h, y + TILE + PAD), min(w, x + TILE + PAD)
                tile = torch.from_numpy(arr[y0:y1, x0:x1]).permute(2, 0, 1).unsqueeze(0).to(device)
                res = model(tile).squeeze(0).permute(1, 2, 0).clamp(0, 1).cpu().numpy()
                # crop the padding back out
                oy, ox = (y - y0) * 4, (x - x0) * 4
                th, tw = min(TILE, h - y) * 4, min(TILE, w - x) * 4
                out[y * 4:y * 4 + th, x * 4:x * 4 + tw] = res[oy:oy + th, ox:ox + tw]
    return Image.fromarray((out * 255.0 + 0.5).astype(np.uint8))


def main():
    src = sys.argv[1]
    base, _ = os.path.splitext(src)
    img = Image.open(src)
    print(f'{src}: {img.size[0]}x{img.size[1]}')
    t = time.time()
    model, device = load_model()
    big = upscale(img, model, device)
    big.save(base + '.esrgan-4x.png')
    print(f'x4 -> {big.size[0]}x{big.size[1]} on {device} in {time.time() - t:.0f}s')
    # 16:9 master at 2560x1440: scale so width is 2560, then centre-crop/pad height to 1440.
    w, h = big.size
    s = 2560 / w
    r = big.resize((2560, round(h * s)), Image.LANCZOS)
    if r.size[1] != 1440:
        top = max(0, (r.size[1] - 1440) // 2)
        canvas = Image.new('RGB', (2560, 1440), (11, 17, 24))
        canvas.paste(r.crop((0, top, 2560, top + min(1440, r.size[1]))), (0, max(0, (1440 - r.size[1]) // 2)))
        r = canvas
    r.save(base + '.master-2560.png')
    print(f'master -> {base}.master-2560.png ({r.size[0]}x{r.size[1]})')


if __name__ == '__main__':
    main()
