#!/usr/bin/env bash
# Master a rendered film's audio to -16 LUFS / -4 dBTP (two-pass loudnorm); video stream is copied untouched.
# Usage: bash tools/master.sh renders/in.mp4 renders/out.mp4
set -euo pipefail
in="$1"; out="$2"
stats=$(ffmpeg -hide_banner -i "$in" -af loudnorm=I=-16:TP=-4:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$stats" | python -c "import sys,json;print(json.load(sys.stdin)['$1'])"; }
ffmpeg -hide_banner -v error -y -i "$in" -c:v copy -c:a aac -b:a 192k -ar 48000 \
  -af "loudnorm=I=-16:TP=-4:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=true" \
  -movflags +faststart "$out"
echo "mastered -> $out"
