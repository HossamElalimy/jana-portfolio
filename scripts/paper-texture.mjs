// Generates a seamless drawing-paper tile (cold-press tooth, soft mottling, faint fibres)
// on the site's paper colour. Deterministic: the same seed always gives the same tile.
//
// Usage: node scripts/paper-texture.mjs [out=public/paper-texture.webp] [size=768]
import sharp from "sharp";

const OUT = process.argv[2] || "public/paper-texture.webp";
const N = Number(process.argv[3]) || 768;
const PAPER = [243, 242, 242]; // --paper

function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Value noise on a lattice that wraps at the tile edge, so the tile repeats without seams. */
function periodicNoise(cells, seed) {
  const r = rng(seed);
  const g = Float32Array.from({ length: cells * cells }, () => r() * 2 - 1);
  const s = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const out = new Float32Array(N * N);
  for (let y = 0; y < N; y++) {
    const fy = (y / N) * cells, y0 = Math.floor(fy), ty = s(fy - y0);
    const ya = y0 % cells, yb = (y0 + 1) % cells;
    for (let x = 0; x < N; x++) {
      const fx = (x / N) * cells, x0 = Math.floor(fx), tx = s(fx - x0);
      const xa = x0 % cells, xb = (x0 + 1) % cells;
      const top = g[ya * cells + xa] * (1 - tx) + g[ya * cells + xb] * tx;
      const bot = g[yb * cells + xa] * (1 - tx) + g[yb * cells + xb] * tx;
      out[y * N + x] = top * (1 - ty) + bot * ty;
    }
  }
  return out;
}

// Height of the paper surface: the tooth is a few octaves of small bumps.
const tooth = [periodicNoise(96, 11), periodicNoise(192, 12), periodicNoise(48, 13)];
const h = new Float32Array(N * N);
for (let i = 0; i < N * N; i++) h[i] = 0.55 * tooth[0][i] + 0.25 * tooth[1][i] + 0.3 * tooth[2][i];
const mottle = periodicNoise(6, 21), cloud = periodicNoise(16, 22);

// Light from the top left catches one side of each bump.
const at = (x, y) => h[((y + N) % N) * N + ((x + N) % N)];
const lum = new Float32Array(N * N);
for (let y = 0; y < N; y++) {
  for (let x = 0; x < N; x++) {
    const i = y * N + x;
    const relief = (at(x - 1, y - 1) - at(x + 1, y + 1)) * 26;
    lum[i] = relief + mottle[i] * 1.6 + cloud[i] * 0.9;
  }
}

// Fibres: short, faint, slightly curved strands pressed into the sheet.
const r = rng(31);
for (let k = 0; k < 220; k++) {
  let x = r() * N, y = r() * N, a = r() * Math.PI * 2;
  const len = 14 + r() * 40, tone = (r() < 0.5 ? -1 : 1) * (1.2 + r() * 1.6), bend = (r() - 0.5) * 0.08;
  for (let s = 0; s < len; s++) {
    const xi = ((Math.round(x) % N) + N) % N, yi = ((Math.round(y) % N) + N) % N;
    lum[yi * N + xi] += tone * Math.sin((s / len) * Math.PI);
    x += Math.cos(a); y += Math.sin(a); a += bend;
  }
}

const px = Buffer.alloc(N * N * 3);
for (let i = 0; i < N * N; i++) {
  const v = lum[i];
  px[i * 3] = Math.max(0, Math.min(255, Math.round(PAPER[0] + v + 0.4)));
  px[i * 3 + 1] = Math.max(0, Math.min(255, Math.round(PAPER[1] + v)));
  px[i * 3 + 2] = Math.max(0, Math.min(255, Math.round(PAPER[2] + v - 0.6)));
}

const img = sharp(px, { raw: { width: N, height: N, channels: 3 } });
await (OUT.endsWith(".png") ? img.png({ compressionLevel: 9 }) : img.webp({ quality: 82, effort: 6 })).toFile(OUT);
console.log(`${OUT}: ${N}×${N}`);
