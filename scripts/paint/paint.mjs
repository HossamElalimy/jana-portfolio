// Paints the concept/stand-in artworks and the social card at full resolution.
// None of these are Jana's paintings; they are labelled as stand-ins on the site.
// Usage: node scripts/paint/paint.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import sharp from "sharp";
import Engine from "./brush.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const ASSETS = path.join(root, "src/assets");
const OG = path.join(root, "public/og");
GlobalFonts.registerFromPath(path.join(here, "archivo-latin.woff2"), "Archivo");

const save = async (canvas, file, quality = 88) => {
  const png = await canvas.encode("png");
  await sharp(png).jpeg({ quality, progressive: true, mozjpeg: true }).toFile(file);
  console.log("painted", path.relative(root, file));
};

const pick = (e, list) => list[Math.floor(e.r() * list.length)];

/** A soft cast shadow on the ground below a ball. */
function shadow(e, cx, cy, R) {
  const x = e.x;
  x.save();
  x.translate(cx, cy);
  x.scale(1, 0.26);
  const g = x.createRadialGradient(0, 0, 0, 0, 0, R);
  g.addColorStop(0, "rgba(40, 12, 6, 0.55)");
  g.addColorStop(0.6, "rgba(40, 12, 6, 0.25)");
  g.addColorStop(1, "rgba(40, 12, 6, 0)");
  x.fillStyle = g;
  x.beginPath();
  x.arc(0, 0, R, 0, Math.PI * 2);
  x.fill();
  x.restore();
}

/** A painted ball: a smooth base disc, then impasto strokes kept inside the circle. */
function ball(e, cx, cy, R, k, light = "#dcec52", mid = "#b9d63a", dark = "#7fae2c") {
  const x = e.x;
  const base = x.createLinearGradient(cx, cy - R, cx, cy + R);
  base.addColorStop(0, light);
  base.addColorStop(0.55, mid);
  base.addColorStop(1, dark);
  x.fillStyle = base;
  x.beginPath();
  x.arc(cx, cy, R, 0, Math.PI * 2);
  x.fill();
  for (let y = -R * 0.9; y <= R * 0.9; y += 8 * k) {
    const hw = Math.sqrt(Math.max(0, R * R - y * y)) * 0.84;
    if (hw < 6 * k) continue;
    const t = (y + R) / (2 * R);
    const col = t < 0.45 ? light : t < 0.75 ? mid : dark;
    e.stroke(cx - hw, cy + y, cx + hw, cy + y + (e.r() - 0.5) * 4 * k, 12 * k, col, { alpha: 0.85, dry: 0.15, bend: 0.04, load: 1.4, jit: 30 });
  }
  const seam = (a, b, c) => e.path(e.bez(a, b, c, 60), 9 * k, "#f2f0e4", { alpha: 0.95, dry: 0.1, load: 1.6, jit: 10 });
  seam([cx - R * 0.92, cy - R * 0.3], [cx, cy + R * 0.25], [cx + R * 0.9, cy - R * 0.42]);
  seam([cx - R * 0.6, cy + R * 0.82], [cx + R * 0.05, cy + R * 0.32], [cx + R * 0.66, cy + R * 0.78]);
}

function courtLines(e, k, W, H, col, lines, width = 26) {
  for (const [x0, y0, x1, y1] of lines) e.stroke(x0 * W, y0 * H, x1 * W, y1 * H, width * k, col, { alpha: 0.95, dry: 0.12, bend: 0.02, load: 1.5, jit: 12 });
}

/* ── Stand-in paintings (square, so every frame on the site is the same size) ── */

async function clayLate() {
  const W = 1600, H = 1600, k = W / 1000, e = Engine(W, H, 303, createCanvas);
  e.ground("#c4602f", "#b5532a");
  for (let y = -20; y < H + 40; y += 34 * k)
    e.stroke(-60, y, W + 60, y + (e.r() - 0.5) * 30 * k, 58 * k, pick(e, ["#c86434", "#b9572b", "#d27443", "#c15a2c"]), { alpha: 0.55, dry: 0.4, bend: 0.04, jit: 18 });
  courtLines(e, k, W, H, "#efe9df", [
    [0.16, 0.97, 0.39, 0.12], [0.86, 0.97, 0.64, 0.12], [0.36, 0.24, 0.67, 0.24], [0.515, 0.24, 0.52, 0.66], [0.27, 0.66, 0.76, 0.66],
  ]);
  for (let i = 0; i < 9; i++) e.dab(W * (0.3 + e.r() * 0.16), H * (0.62 + e.r() * 0.16), 62 * k, pick(e, ["#8a7fd0", "#7d72c4", "#9a90da"]), { alpha: 0.85 });
  ball(e, W * 0.73, H * 0.17, 26 * k, k);
  await save(e.finish({ relief: 2.4 }), path.join(ASSETS, "preview-03.jpg"));
}

async function rally() {
  const W = 1600, H = 1600, k = W / 1000, e = Engine(W, H, 404, createCanvas);
  e.ground("#1d4e9a", "#1a3f80");
  for (let y = 0; y < H; y += 40 * k) e.stroke(-60, y, W + 60, y + (e.r() - 0.5) * 24 * k, 64 * k, pick(e, ["#1d4e9a", "#21579f", "#173f7f", "#285fae"]), { alpha: 0.5, dry: 0.4, bend: 0.03 });
  for (let i = 0; i < 30; i++) {
    const y = H * (0.18 + e.r() * 0.66), x0 = W * (-0.05 + e.r() * 0.18), x1 = W * (0.78 + e.r() * 0.3);
    e.stroke(x0, y + 60 * k, x1, y - 40 * k, (26 + e.r() * 46) * k, pick(e, ["#e6f07a", "#c8e04a", "#f2f0e6", "#d9ec60", "#e0703a"]), { alpha: 0.92, dry: 0.35, bend: 0.06, load: 1.3 });
  }
  ball(e, W * 0.8, H * 0.3, 40 * k, k);
  await save(e.finish({ relief: 2.4 }), path.join(ASSETS, "preview-04.jpg"));
}

async function net() {
  const W = 1600, H = 1600, k = W / 1000, e = Engine(W, H, 505, createCanvas);
  e.ground("#2f6b45", "#28603d");
  for (let y = 0; y < H; y += 40 * k) e.stroke(-60, y, W + 60, y + (e.r() - 0.5) * 20 * k, 60 * k, pick(e, ["#2f6b45", "#346f49", "#295f3e"]), { alpha: 0.5, dry: 0.45, bend: 0.03 });
  courtLines(e, k, W, H, "#eef0ea", [[0.04, 0.9, 0.96, 0.9], [0.5, 0.62, 0.5, 0.9]], 22);
  const top = H * 0.36, bottom = H * 0.6;
  for (let x = 0; x < W; x += 30 * k) e.knife(x, (top + bottom) / 2, 4 * k, bottom - top, (e.r() - 0.5) * 0.02, "#1f2a24", { alpha: 0.9, load: 0.6 });
  for (let x = 0; x < W; x += 30 * k) e.stroke(x, top, x + (e.r() - 0.5) * 6, bottom, 3 * k, "#e6e9e2", { alpha: 0.85, dry: 0.2, bend: 0.01, body: false });
  for (let y = top; y < bottom; y += 30 * k) e.stroke(-20, y, W + 20, y + (e.r() - 0.5) * 6, 3 * k, "#e6e9e2", { alpha: 0.8, dry: 0.2, bend: 0.01, body: false });
  e.stroke(-40, top, W + 40, top + 6 * k, 44 * k, "#f4f4ee", { alpha: 0.97, dry: 0.08, bend: 0.01, load: 1.8 });
  ball(e, W * 0.3, H * 0.76, 34 * k, k);
  await save(e.finish({ relief: 2.3 }), path.join(ASSETS, "preview-05.jpg"));
}

async function afterDark() {
  const W = 1600, H = 1600, k = W / 1000, e = Engine(W, H, 707, createCanvas);
  e.ground("#14203a", "#0f1a30");
  for (let y = H * 0.48; y < H + 40; y += 36 * k) e.stroke(-60, y, W + 60, y + (e.r() - 0.5) * 18 * k, 58 * k, pick(e, ["#1f3f73", "#1a3765", "#244880"]), { alpha: 0.7, dry: 0.35, bend: 0.03 });
  for (const lx of [0.14, 0.86]) {
    for (let i = 0; i < 14; i++) {
      const a = Math.PI / 2 + (lx < 0.5 ? -0.55 : 0.55) * e.r();
      e.stroke(W * lx, H * 0.1, W * lx + Math.cos(a) * H * 0.8, H * 0.1 + Math.sin(a) * H * 0.8, (30 + e.r() * 50) * k, "#f6e7a8", { alpha: 0.12, dry: 0.7, bend: 0.05, load: 0.4 });
    }
    e.dab(W * lx, H * 0.1, 58 * k, "#f3d36b", { alpha: 0.95, n: 9 });
    e.dab(W * lx, H * 0.1, 26 * k, "#fff6d6", { alpha: 0.95, n: 5 });
  }
  courtLines(e, k, W, H, "#e9ecf2", [[0.08, 0.96, 0.32, 0.5], [0.92, 0.96, 0.68, 0.5], [0.28, 0.58, 0.72, 0.58], [0.5, 0.58, 0.5, 0.82], [0.18, 0.82, 0.82, 0.82]], 20);
  ball(e, W * 0.56, H * 0.7, 30 * k, k);
  await save(e.finish({ relief: 2.2 }), path.join(ASSETS, "preview-07.jpg"));
}

/* ── Hero finale: shown full-bleed, so painted large ── */
async function heroCourt() {
  const W = 2880, H = 1800, k = H / 1000, e = Engine(W, H, 1212, createCanvas);
  e.ground("#ec3013", "#dc2a0f");
  for (let y = -20; y < H + 40; y += 38 * k)
    e.stroke(-80, y, W + 80, y + (e.r() - 0.5) * 40 * k, 70 * k, pick(e, ["#ec3013", "#f04a2a", "#d8290e", "#e33a1c", "#f2582f"]), { alpha: 0.6, dry: 0.42, bend: 0.03, jit: 16 });
  for (let i = 0; i < 22; i++) {
    const y = H * e.r(), x = W * e.r();
    // Keep palette-knife ridges clear of the ball so its surface stays clean.
    if (Math.hypot(x - W * 0.52, y - H * 0.47) < 420 * k) continue;
    e.knife(x, y, (60 + e.r() * 90) * k, (160 + e.r() * 260) * k, Math.PI / 2 + (e.r() - 0.5) * 0.2, pick(e, ["#f25a33", "#c9250c", "#f36b45"]), { alpha: 0.8, load: 0.9 });
  }
  // Court lines in paper white, sweeping through the frame.
  courtLines(e, k, W, H, "#f3f2f2", [[-0.02, 0.86, 1.02, 0.7], [0.18, 1.02, 0.36, 0.08]], 30);
  // Soft shadow on the court, then the ball itself near the centre.
  shadow(e, W * 0.535, H * 0.69, 170 * k);
  ball(e, W * 0.52, H * 0.47, 150 * k, k, "#e2f05a", "#c3dc3e", "#86b12f");
  await save(e.finish({ relief: 2.3 }), path.join(ASSETS, "hero-court.jpg"), 86);
}

/* ── Blue Hour: exhibition poster concept (3:4) ── */
async function blueHour() {
  const W = 1500, H = 2000, k = W / 1000, e = Engine(W, H, 909, createCanvas);
  e.ground("#1a3561", "#16305a");
  for (let i = 0; i < 90; i++)
    e.knife(W * e.r(), H * (0.05 + e.r() * 0.95), (34 + e.r() * 60) * k, (180 + e.r() * 300) * k, (e.r() - 0.5) * 0.06, pick(e, ["#2f63a3", "#3a75b8", "#24497f", "#1b3a6b", "#4a86c8", "#2a5791"]), { alpha: 0.92 });
  for (const col of ["#e0703a", "#e0703a", "#e0703a", "#d6e84a", "#d6e84a", "#d6e84a", "#e8e6e0", "#e8e6e0"])
    e.knife(W * (0.05 + e.r() * 0.9), H * (0.25 + e.r() * 0.55), (22 + e.r() * 26) * k, (160 + e.r() * 240) * k, (e.r() - 0.5) * 0.05, col, { alpha: 0.95, load: 1.2 });
  const c = e.finish({ relief: 2.6 });
  const x = c.getContext("2d");
  const m = W * 0.055;
  x.fillStyle = x.strokeStyle = "#ffffff";
  x.lineJoin = "round";
  x.font = `900 ${Math.round(W * 0.235)}px Archivo`;
  x.lineWidth = W * 0.012; // thickens the variable font to a poster weight
  for (const [word, base] of [["BLUE", 0.165], ["HOUR", 0.3]]) {
    x.fillText(word, m, H * base);
    x.strokeText(word, m, H * base);
  }
  // Footer block
  x.fillRect(m, H * 0.885, W - m * 2, 4 * k);
  x.font = `700 ${Math.round(26 * k)}px Archivo`;
  x.lineWidth = 0;
  x.fillText("AN EVENING OF PAINTINGS", m, H * 0.925);
  x.fillText("CONCEPT", m, H * 0.955);
  x.textAlign = "right";
  x.fillText("PAINTINGS BY JANA", W - m, H * 0.925);
  x.fillText("2026", W - m, H * 0.955);
  await save(c, path.join(ASSETS, "design-04-blue-hour.jpg"));
}

/* ── Social card (Open Graph / Twitter) ── */
async function ogCard() {
  const W = 1200, H = 630, c = createCanvas(W, H), x = c.getContext("2d");
  x.fillStyle = "#f3f2f2";
  x.fillRect(0, 0, W, H);
  const art = await loadImage(fs.readFileSync(path.join(ASSETS, "jana-painting-02.jpg")));
  const S = 470, ax = W - S - 64, ay = (H - S) / 2;
  x.drawImage(art, ax, ay, S, S);
  x.fillStyle = "#201e1d";
  x.strokeStyle = "#201e1d";
  x.lineJoin = "round";
  x.font = "900 196px Archivo";
  x.lineWidth = 7;
  x.fillText("JANA", 56, 300);
  x.strokeText("JANA", 56, 300);
  x.lineWidth = 0;
  x.font = "800 40px Archivo";
  x.fillText("Artist & Graphic Designer", 60, 372);
  x.fillStyle = "#ec3013";
  x.fillRect(60, 420, 120, 8);
  x.fillStyle = "#201e1d";
  x.font = "600 26px Archivo";
  x.fillText("Original paintings & graphic design", 60, 478);
  x.fillText("@paintingsbyjanaaa", 60, 518);
  fs.mkdirSync(OG, { recursive: true });
  await save(c, path.join(OG, "og.jpg"), 86);
}

const only = process.argv[2];
const jobs = { clayLate, rally, net, afterDark, heroCourt, blueHour, ogCard };
for (const [name, fn] of Object.entries(jobs)) if (!only || only === name) await fn();
