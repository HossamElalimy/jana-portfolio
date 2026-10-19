// Turns a phone photo of a canvas into a clean, straight scan-like image:
// perspective-corrects to the canvas corners, trims a hair inside the edge (drops
// easel/wall pixels), levels the exposure gently and sharpens lightly.
//
// Usage:
//   node scripts/straighten-painting.mjs <photo> <out.jpg> "<TLx,TLy TRx,TRy BRx,BRy BLx,BLy>" [maxSize]
// Corners are pixel positions of the canvas in the photo; one may lie slightly
// outside the frame (it is extrapolated from the edges and clamped when sampled).
import sharp from "sharp";

const [, , input, output, cornerArg, maxArg] = process.argv;
if (!input || !output || !cornerArg) {
  console.error('Usage: node scripts/straighten-painting.mjs <photo> <out.jpg> "<TL TR BR BL>" [maxSize]');
  process.exit(1);
}
const quad = cornerArg.trim().split(/\s+/).map((p) => p.split(",").map(Number));
const MAX = Number(maxArg) || 1400;
const INSET = 0.006; // fraction of the canvas trimmed from every side

/** Homography mapping the unit square to a quad (TL, TR, BR, BL). */
function homography(q) {
  const [[x0, y0], [x1, y1], [x2, y2], [x3, y3]] = q;
  const dx1 = x1 - x2, dx2 = x3 - x2, dy1 = y1 - y2, dy2 = y3 - y2;
  const sx = x0 - x1 + x2 - x3, sy = y0 - y1 + y2 - y3;
  const det = dx1 * dy2 - dx2 * dy1;
  const g = (sx * dy2 - dx2 * sy) / det;
  const h = (dx1 * sy - sx * dy1) / det;
  return [x1 - x0 + g * x1, x3 - x0 + h * x3, x0, y1 - y0 + g * y1, y3 - y0 + h * y3, y0, g, h];
}

const { data, info } = await sharp(input).rotate().removeAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

// Output size from the average edge lengths, capped at MAX on the long side.
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const [TL, TR, BR, BL] = quad;
let W = (dist(TL, TR) + dist(BL, BR)) / 2;
let H = (dist(TL, BL) + dist(TR, BR)) / 2;
const scale = Math.min(1, MAX / Math.max(W, H));
W = Math.round(W * scale * (1 - 2 * INSET));
H = Math.round(H * scale * (1 - 2 * INSET));

const [a, b, c, d, e, f, g, hh] = homography(quad);
const out = Buffer.alloc(W * H * 3);
for (let y = 0; y < H; y++) {
  const v = INSET + (1 - 2 * INSET) * ((y + 0.5) / H);
  for (let x = 0; x < W; x++) {
    const u = INSET + (1 - 2 * INSET) * ((x + 0.5) / W);
    const z = g * u + hh * v + 1;
    let sx = (a * u + b * v + c) / z;
    let sy = (d * u + e * v + f) / z;
    sx = Math.min(w - 1.001, Math.max(0, sx));
    sy = Math.min(h - 1.001, Math.max(0, sy));
    const xi = sx | 0, yi = sy | 0, fx = sx - xi, fy = sy - yi;
    const i00 = (yi * w + xi) * 3, i10 = i00 + 3, i01 = i00 + w * 3, i11 = i01 + 3;
    const o = (y * W + x) * 3;
    for (let ch = 0; ch < 3; ch++) {
      const top = data[i00 + ch] * (1 - fx) + data[i10 + ch] * fx;
      const bot = data[i01 + ch] * (1 - fx) + data[i11 + ch] * fx;
      out[o + ch] = Math.round(top * (1 - fy) + bot * fy);
    }
  }
}

await sharp(out, { raw: { width: W, height: H, channels: 3 } })
  .normalise({ lower: 0.5, upper: 99.5 }) // gentle levels on lightness; hue is preserved
  .modulate({ saturation: 1.04 })
  .sharpen({ sigma: 0.6 })
  .jpeg({ quality: 90, progressive: true, mozjpeg: true })
  .toFile(output);
console.log(`${output}: ${W}×${H}`);
