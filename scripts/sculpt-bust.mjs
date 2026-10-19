// Renders a clean, stylised stone bust — long wavy hair, closed eyes, head turned up
// and to the left — by ray-marching a signed-distance model. No photographic detail:
// only the big sculpted forms. Output is a wide image for the hero's dither veil.
//
// Usage: node scripts/sculpt-bust.mjs <out.jpg> [width] [height]
import sharp from "sharp";

const [, , output, outW = "1600", outH = "1000"] = process.argv;
if (!output) {
  console.error("Usage: node scripts/sculpt-bust.mjs <out.jpg> [width] [height]");
  process.exit(1);
}
const OW = Number(outW), OH = Number(outH);
const RW = Math.round(OW * 0.75), RH = Math.round(OH * 0.75); // render size (upscaled after)

/* ── Vector helpers ─────────────────────────────────────────────────────── */
const len = (x, y, z) => Math.hypot(x, y, z);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const mix = (a, b, t) => a + (b - a) * t;
const norm = ([x, y, z]) => { const l = len(x, y, z) || 1; return [x / l, y / l, z / l]; };

/* ── SDF primitives (Inigo Quilez) ──────────────────────────────────────── */
function ellipsoid(px, py, pz, cx, cy, cz, rx, ry, rz) {
  const x = px - cx, y = py - cy, z = pz - cz;
  const k0 = len(x / rx, y / ry, z / rz), k1 = len(x / (rx * rx), y / (ry * ry), z / (rz * rz));
  return (k0 * (k0 - 1)) / (k1 || 1e-9);
}
function capsule(px, py, pz, ax, ay, az, bx, by, bz, r) {
  const pax = px - ax, pay = py - ay, paz = pz - az, bax = bx - ax, bay = by - ay, baz = bz - az;
  const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
  return len(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}
/** Depth of the front of the face (the face-mass ellipsoid) at a given x, y in head space. */
const faceZ = (x, y) => 0.1 + 0.33 * Math.sqrt(Math.max(0, 1 - (x / 0.32) ** 2 - ((y - 0.44) / 0.39) ** 2));

/** A shallow arc across the face, centred on x = cx, half-width hw, at height y0 bending by
 *  "sag" (negative = down), lying on the face surface offset by dz. */
function arc(px, py, pz, cx, hw, y0, sag, dz, r) {
  let d = Infinity;
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const t0 = -1 + (i / steps) * 2, t1 = -1 + ((i + 1) / steps) * 2;
    const x0 = cx + t0 * hw, y0a = y0 + sag * (1 - t0 * t0), x1 = cx + t1 * hw, y1 = y0 + sag * (1 - t1 * t1);
    d = Math.min(d, capsule(px, py, pz, x0, y0a, faceZ(x0, y0a) + dz, x1, y1, faceZ(x1, y1) + dz, r));
  }
  return d;
}
const smin = (a, b, k) => { const h = clamp(0.5 + (0.5 * (b - a)) / k, 0, 1); return mix(b, a, h) - k * h * (1 - h); };
const smax = (a, b, k) => -smin(-a, -b, k);

/* ── Pose: head turned gently up and to the viewer's left ─────────────── */
// Classical proportions: the head is 1 unit from chin (y = 0) to crown (y ≈ 1.04).
const YAW = 0.58; // turn toward the viewer's left
const PITCH = -0.2; // chin lifted
const PIVOT = [0, 0.08, -0.04]; // top of the neck
const cy_ = Math.cos(YAW), sy_ = Math.sin(YAW), cp = Math.cos(PITCH), sp = Math.sin(PITCH);
/** World point → head-local point (inverse of the head's rotation about the neck). */
function toHead(x, y, z) {
  const ax = x - PIVOT[0], ay = y - PIVOT[1], az = z - PIVOT[2];
  const bx = ax * cy_ + az * sy_, bz = -ax * sy_ + az * cy_;
  const by = ay * cp + bz * sp, bz2 = -ay * sp + bz * cp;
  return [bx + PIVOT[0], by + PIVOT[1], bz2 + PIVOT[2]];
}

/* ── The model ──────────────────────────────────────────────────────────── */
function headSdf(x, y, z) {
  let d = ellipsoid(x, y, z, 0, 0.62, -0.07, 0.36, 0.43, 0.45); // cranium
  d = smin(d, ellipsoid(x, y, z, 0, 0.44, 0.1, 0.32, 0.39, 0.33), 0.12); // face mass
  d = smin(d, ellipsoid(x, y, z, 0, 0.22, 0.06, 0.25, 0.18, 0.26), 0.1); // jaw (slim)
  d = smin(d, ellipsoid(x, y, z, 0, 0.11, 0.19, 0.095, 0.075, 0.1), 0.09); // chin (soft)
  for (const s of [-1, 1]) d = smin(d, ellipsoid(x, y, z, s * 0.17, 0.42, 0.22, 0.12, 0.1, 0.13), 0.08); // cheekbones (high)
  d = smin(d, ellipsoid(x, y, z, 0, 0.57, 0.31, 0.26, 0.05, 0.07), 0.06); // brow
  d = smin(d, capsule(x, y, z, 0, 0.53, 0.37, 0, 0.35, 0.445, 0.03), 0.05); // nose bridge
  d = smin(d, ellipsoid(x, y, z, 0, 0.33, 0.43, 0.048, 0.034, 0.04), 0.035); // nose tip
  for (const s of [-1, 1]) d = smin(d, ellipsoid(x, y, z, s * 0.04, 0.31, 0.4, 0.03, 0.022, 0.03), 0.025); // nostrils
  // Closed eyes, carved the classical way: a smooth convex lid (no socket), one clean
  // incised lash line curving down, a raised lash ridge sweeping to the outer corner with a
  // few longer flicks, and softly arched, raised brows — all laid on the curve of the face.
  for (const s of [-1, 1]) {
    const ex = s * 0.13;
    const fz = faceZ(ex, 0.5);
    d = smin(d, ellipsoid(x, y, z, ex, 0.5, fz - 0.022, 0.07, 0.034, 0.03), 0.03); // convex lid
    d = smax(d, -arc(x, y, z, ex, 0.064, 0.474, -0.012, 0.006, 0.0035), 0.003); // lash line
    // Lash ridge: from the middle of the lid out past the outer corner, lifting at the end
    for (let k = 0; k < 6; k++) {
      const t0 = k / 6, t1 = (k + 1) / 6;
      const at = (t) => {
        const lx = ex + s * (t * 0.085), ly = 0.47 - 0.012 * (1 - t * t) - 0.006 * Math.sin(t * Math.PI) + (t > 0.75 ? (t - 0.75) * 0.05 : 0);
        return [lx, ly, faceZ(lx, ly) + 0.002];
      };
      const [ax, ay, az] = at(t0), [bx, by, bz] = at(t1);
      d = smin(d, capsule(x, y, z, ax, ay, az, bx, by, bz, 0.0045 + 0.002 * t1), 0.004);
    }
    // A few longer flicks at the outer corner
    for (let k = 0; k < 4; k++) {
      const t = 0.45 + k * 0.17;
      const lx = ex + s * t * 0.075, ly = 0.466 - 0.008 * (1 - t * t), lz = faceZ(lx, ly) + 0.002;
      const L = 0.022 + 0.012 * k;
      const dx = s * (0.55 + 0.12 * k), dy = -0.25 + 0.12 * k, dz = 0.5, n = Math.hypot(dx, dy, dz);
      d = smin(d, capsule(x, y, z, lx, ly, lz, lx + (dx / n) * L, ly + (dy / n) * L, lz + (dz / n) * L, 0.0034), 0.004);
    }
    d = smin(d, arc(x, y, z, ex + s * 0.012, 0.082, 0.566, 0.014, 0.004, 0.011), 0.014); // brow
  }
  // Lips, softly parted
  d = smin(d, ellipsoid(x, y, z, 0, 0.218, 0.348, 0.076, 0.02, 0.032), 0.025);
  d = smin(d, ellipsoid(x, y, z, 0, 0.183, 0.338, 0.066, 0.024, 0.032), 0.025);
  d = smax(d, -capsule(x, y, z, -0.068, 0.2, 0.372, 0.068, 0.2, 0.372, 0.0035), 0.005);
  return d;
}

function hairSdf(x, y, z, px, py, pz) {
  // Cap that frames the face, with a centre parting
  let h = ellipsoid(x, y, z, 0, 0.66, -0.08, 0.42, 0.5, 0.5);
  h = smax(h, -ellipsoid(x, y, z, 0, 0.38, 0.3, 0.33, 0.5, 0.33), 0.07);
  h = smax(h, -capsule(x, y, z, 0, 1.25, 0.15, 0, 0.98, 0.36, 0.01), 0.015);
  // Side waves sweep from the temples down over the ears
  for (const s of [-1, 1]) h = smin(h, ellipsoid(x, y, z, s * 0.33, 0.42, -0.02, 0.13, 0.3, 0.22), 0.1);
  // Long hair falls with gravity (world space), in soft waves over the shoulders
  for (const s of [-1, 1]) {
    const wave = Math.sin(py * 7 + s * 0.8) * 0.045;
    h = smin(h, ellipsoid(px - wave * s, py, pz, s * 0.36, -0.12, -0.08, 0.15, 0.58, 0.2), 0.14);
  }
  h = smin(h, ellipsoid(px, py, pz, 0, 0.1, -0.33, 0.44, 0.7, 0.24), 0.16); // back of the hair
  // Broad carved waves
  const theta = Math.atan2(x, z + 0.3);
  h += 0.01 * Math.sin(theta * 11 + y * 5) * clamp((1.0 - y) * 2.5, 0, 1) + 0.004;
  return smax(h, -0.82 - py, 0.05);
}

// Returns [distance, isHair]
function scene(px, py, pz) {
  const [x, y, z] = toHead(px, py, pz);
  const head = headSdf(x, y, z);

  // Neck (half the head's width), shoulders and chest stay in world space
  let body = capsule(px, py, pz, 0, -0.45, -0.05, 0, 0.22, -0.02, 0.165);
  body = smin(body, capsule(px, py, pz, -0.7, -0.56, -0.1, 0.7, -0.56, -0.1, 0.16), 0.26); // shoulders
  body = smin(body, ellipsoid(px, py, pz, 0, -0.8, -0.02, 0.74, 0.3, 0.3), 0.18); // chest
  body = smax(body, -0.98 - py, 0.04); // the bust's flat base
  const skin = smin(head, body, 0.1);

  const hair = hairSdf(x, y, z, px, py, pz);
  return [smin(skin, hair, 0.03), hair < skin ? 1 : 0];
}

/* ── Rendering ──────────────────────────────────────────────────────────── */
const EYE = [0, 0.06, 6]; // frames the whole bust; the site slides it so the face starts centred
const FOV = (21 * Math.PI) / 180;
const KEY = norm([0.6, 0.65, 0.55]); // key from the upper right: the turned face falls into soft shade
const RIM = norm([-0.9, 0.35, -0.3]);
const AMB = 0.22;

function march(o, dir) {
  // bounding sphere around the bust
  const bx = o[0], by = o[1] - 0.05, bz = o[2];
  const b = bx * dir[0] + by * dir[1] + bz * dir[2];
  const c = bx * bx + by * by + bz * bz - 1.6 * 1.6;
  if (b * b - c < 0) return -1;
  let t = Math.max(0, -b - Math.sqrt(b * b - c));
  for (let i = 0; i < 160; i++) {
    const [d] = scene(o[0] + dir[0] * t, o[1] + dir[1] * t, o[2] + dir[2] * t);
    if (d < 0.0008) return t;
    t += d * 0.9;
    if (t > 9) break;
  }
  return -1;
}

function normal(x, y, z) {
  const e = 0.0015;
  const a = scene(x + e, y - e, z - e)[0], b = scene(x - e, y - e, z + e)[0];
  const c = scene(x - e, y + e, z - e)[0], d = scene(x + e, y + e, z + e)[0];
  return norm([a - b - c + d, -a - b + c + d, -a + b - c + d]);
}

function softShadow(x, y, z, l) {
  let res = 1, t = 0.02;
  for (let i = 0; i < 32 && t < 3; i++) {
    const [h] = scene(x + l[0] * t, y + l[1] * t, z + l[2] * t);
    if (h < 0.0005) return 0;
    res = Math.min(res, (10 * h) / t);
    t += clamp(h, 0.01, 0.2);
  }
  return clamp(res, 0, 1);
}

function occlusion(x, y, z, n) {
  let occ = 0, w = 1;
  for (let i = 1; i <= 5; i++) {
    const h = 0.03 * i;
    occ += (h - scene(x + n[0] * h, y + n[1] * h, z + n[2] * h)[0]) * w;
    w *= 0.7;
  }
  return clamp(1 - 2.2 * occ, 0, 1);
}

const out = Buffer.alloc(RW * RH * 4);
const aspect = RW / RH, tanF = Math.tan(FOV / 2);
for (let j = 0; j < RH; j++) {
  for (let i = 0; i < RW; i++) {
    const u = ((i + 0.5) / RW) * 2 - 1, v = 1 - ((j + 0.5) / RH) * 2;
    const dir = norm([u * tanF * aspect, v * tanF, -1]);
    const t = march(EYE, dir);
    const o = (j * RW + i) * 4;
    if (t < 0) continue; // transparent background
    const x = EYE[0] + dir[0] * t, y = EYE[1] + dir[1] * t, z = EYE[2] + dir[2] * t;
    const n = normal(x, y, z);
    const hairy = scene(x, y, z)[1];
    const dif = Math.max(0, n[0] * KEY[0] + n[1] * KEY[1] + n[2] * KEY[2]) * softShadow(x, y, z, KEY);
    const rim = Math.pow(Math.max(0, n[0] * RIM[0] + n[1] * RIM[1] + n[2] * RIM[2]), 2);
    const h = norm([KEY[0] - dir[0], KEY[1] - dir[1], KEY[2] - dir[2]]);
    const spec = Math.pow(Math.max(0, n[0] * h[0] + n[1] * h[1] + n[2] * h[2]), 28) * 0.18;
    const ao = occlusion(x, y, z, n);
    const albedo = hairy ? 0.8 : 0.9; // carved hair sits a touch darker
    const lum = albedo * (AMB * ao + 0.85 * dif) + 0.2 * rim * ao + spec;
    const tint = [0.98, 0.95, 0.9];
    // Highlights are capped below paper white so even the brightest stone dithers into dots.
    const tone = 0.8 * Math.pow(Math.min(lum, 1.15), 0.92);
    for (let c = 0; c < 3; c++) out[o + c] = clamp(Math.round(tone * tint[c] * 255), 0, 255);
    out[o + 3] = 255;
  }
}

const bust = await sharp(out, { raw: { width: RW, height: RH, channels: 4 } }).resize(OW, OH, { kernel: "lanczos3" }).png().toBuffer();
const ground = Buffer.from(
  `<svg xmlns="http://www.w3.org/2000/svg" width="${OW}" height="${OH}"><defs><radialGradient id="g" cx="50%" cy="40%" r="60%"><stop offset="0" stop-color="#2e2b29"/><stop offset="1" stop-color="#1a1817"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`,
);
await sharp(ground).composite([{ input: bust }]).jpeg({ quality: 90, mozjpeg: true }).toFile(output);
console.log(`${output}: ${OW}×${OH}`);
