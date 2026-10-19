// Generates every icon from a single vector mark: a heavy "J" on court red.
// Usage: node scripts/generate-icons.mjs
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RED = "#ec3013";
const PAPER = "#f3f2f2";
// Heavy J built from geometry (no font dependency), on a 64-unit grid.
const J = "M33 9h13v29.5C46 49 39.6 55 30.4 55 21.8 55 15.6 50 14.5 41.2l11.6-2.1c.5 3.9 2.1 5.6 4.5 5.6c1.9 0 2.4-1.7 2.4-5.6V9Z";

const svg = ({ size = 64, scale = 1, radius = 0 } = {}) => {
  const t = 32 - 32 * scale; // keep the mark centred when scaled
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="${radius}" fill="${RED}"/>
  <path transform="translate(${t} ${t}) scale(${scale})" fill="${PAPER}" d="${J}"/>
</svg>`;
};

const png = (opts, size) => sharp(Buffer.from(svg({ ...opts, size }))).resize(size, size).png().toBuffer();

// ICO container holding PNG frames (supported by every modern browser).
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  const dir = Buffer.alloc(16 * frames.length);
  let offset = 6 + dir.length;
  frames.forEach(({ size, data }, i) => {
    const o = i * 16;
    dir.writeUInt8(size >= 256 ? 0 : size, o);
    dir.writeUInt8(size >= 256 ? 0 : size, o + 1);
    dir.writeUInt8(0, o + 2);
    dir.writeUInt8(0, o + 3);
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(data.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += data.length;
  });
  return Buffer.concat([header, dir, ...frames.map((f) => f.data)]);
}

const app = path.resolve("src/app");
const icons = path.resolve("public/icons");
fs.mkdirSync(icons, { recursive: true });

fs.writeFileSync(path.join(app, "icon.svg"), svg({ radius: 12 }));
fs.writeFileSync(
  path.join(app, "favicon.ico"),
  ico(await Promise.all([16, 32, 48].map(async (size) => ({ size, data: await png({ radius: 0 }, size) })))),
);
fs.writeFileSync(path.join(app, "apple-icon.png"), await png({ scale: 0.86 }, 180));
fs.writeFileSync(path.join(icons, "icon-192.png"), await png({ radius: 12 }, 192));
fs.writeFileSync(path.join(icons, "icon-512.png"), await png({ radius: 12 }, 512));
// Maskable icons keep the mark inside the central 80% safe zone.
fs.writeFileSync(path.join(icons, "maskable-512.png"), await png({ scale: 0.72 }, 512));
console.log("icons written");
