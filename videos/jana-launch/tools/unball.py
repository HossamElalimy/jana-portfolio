"""Paint a ball out of a painting by mirroring the strokes above and below it into the hole."""
import sys, cv2, numpy as np
src, out, cx, cy, r = sys.argv[1], sys.argv[2], *map(float, sys.argv[3:6])
grow = float(sys.argv[6]) if len(sys.argv) > 6 else 1.1   # hole radius / ball radius
gap = int(sys.argv[7]) if len(sys.argv) > 7 else 0        # skip this many px of halo before sampling
im = cv2.imread(src).astype(np.float32); H, W = im.shape[:2]
R = r * grow
fill = im.copy()
for x in range(max(0, int(cx - R)), min(W, int(cx + R) + 1)):
    dx = x - cx
    if abs(dx) >= R: continue
    half = np.sqrt(R * R - dx * dx); y0, y1 = int(cy - half), int(cy + half)
    for y in range(max(0, y0), min(H, y1 + 1)):
        a = min(H - 1, max(0, 2 * (y0 - gap) - y))          # reflect above the hole
        b = min(H - 1, max(0, 2 * (y1 + gap) - y))          # reflect below the hole
        w = (y - y0) / max(1, y1 - y0)
        fill[y, x] = im[a, x] * (1 - w) + im[b, x] * w
yy, xx = np.mgrid[0:H, 0:W]
d = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2)
m = np.clip((R - d) / (r * 0.12), 0, 1)[..., None]
cv2.imwrite(out, (im * (1 - m) + fill * m).clip(0, 255).astype(np.uint8), [cv2.IMWRITE_JPEG_QUALITY, 92])
