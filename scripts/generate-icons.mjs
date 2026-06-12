/**
 * Generates solid-color PNG icons for the PWA manifest.
 * Pure Node.js — no external dependencies.
 * Run: node scripts/generate-icons.mjs
 */
import { deflateSync } from "zlib";
import { writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ICONS_DIR = join(ROOT, "public", "icons");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const BG = [59, 130, 246]; // #3b82f6

// CRC32
const CRC_TABLE = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  CRC_TABLE[i] = c;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return ((c ^ 0xffffffff) >>> 0);
}

function u32(n) {
  const b = Buffer.alloc(4);
  b.writeUInt32BE(n, 0);
  return b;
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const crcInput = Buffer.concat([typeBytes, data]);
  return Buffer.concat([u32(data.length), typeBytes, data, u32(crc32(crcInput))]);
}

function solidPNG(size, [r, g, b]) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.concat([
    u32(size), u32(size),
    Buffer.from([8, 2, 0, 0, 0]), // 8-bit RGB, no compression/filter/interlace
  ]);

  // Each scanline: filter byte (None=0) + RGB pixels
  const rowBuf = Buffer.alloc(1 + size * 3);
  rowBuf[0] = 0;
  for (let x = 0; x < size; x++) {
    rowBuf[1 + x * 3] = r;
    rowBuf[2 + x * 3] = g;
    rowBuf[3 + x * 3] = b;
  }

  const raw = Buffer.concat(Array.from({ length: size }, () => rowBuf));
  const compressed = deflateSync(raw);

  return Buffer.concat([
    sig,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", compressed),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync(ICONS_DIR, { recursive: true });

for (const size of SIZES) {
  const file = join(ICONS_DIR, `icon-${size}x${size}.png`);
  writeFileSync(file, solidPNG(size, BG));
  console.log(`✓  icon-${size}x${size}.png`);
}

writeFileSync(join(ROOT, "public", "apple-touch-icon.png"), solidPNG(180, BG));
console.log("✓  apple-touch-icon.png");

console.log("\nDone — replace with branded assets when ready.");
