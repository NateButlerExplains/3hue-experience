#!/usr/bin/env bash
# Build the shipped derivatives for an approved room master:
#   bash tools/build-derivatives.sh <door> [NN]
# Reads art/rooms/<door>/candidate-NN.master-2560.png, writes media/rooms/<door>-{2560,2048,1280}.{avif,webp,jpg}.
# AVIF via ffmpeg libsvtav1 (falls back to WebP+JPEG only if the encoder is missing). Each file must be <= 600 KB.
set -euo pipefail
door="$1"; nn="${2:-01}"
src="art/rooms/$door/candidate-$nn.master-2560.png"
[ -f "$src" ] || { echo "missing $src"; exit 1; }
mkdir -p media/rooms
for w in 2560 2048 1280; do
  h=$(( w * 9 / 16 ))
  base="media/rooms/$door-$w"
  ffmpeg -v error -y -i "$src" -vf "scale=$w:$h:flags=lanczos" -q:v 4 "$base.jpg"
  ffmpeg -v error -y -i "$src" -vf "scale=$w:$h:flags=lanczos" "/tmp/room-$door-$w.png"
  cwebp -quiet -q 78 "/tmp/room-$door-$w.png" -o "$base.webp"
  if ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libsvtav1; then
    ffmpeg -v error -y -i "$src" -vf "scale=$w:$h:flags=lanczos,format=yuv420p" -c:v libsvtav1 -crf 34 -preset 4 -svtav1-params tune=0 -frames:v 1 "$base.avif" || rm -f "$base.avif"
  fi
  for f in "$base".*; do
    sz=$(stat -f %z "$f")
    if [ "$sz" -gt 614400 ]; then echo "TOO BIG $f $sz"; fi
    printf '%s %d KB\n' "$f" $(( sz / 1024 ))
  done
done
