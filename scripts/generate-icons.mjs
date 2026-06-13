import sharp from "sharp";
import { mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ICONS_DIR = join(ROOT, "public", "icons");

mkdirSync(ICONS_DIR, { recursive: true });

function makeSvg(size) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1e40af"/>
      <stop offset="100%" stop-color="#3b82f6"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="7" fill="url(#bg)"/>
  <rect x="8" y="7" width="16" height="7" rx="3" fill="white"/>
  <rect x="2" y="13" width="28" height="10" rx="2" fill="white"/>
  <circle cx="9" cy="24" r="4.5" fill="#1d4ed8" stroke="white" stroke-width="2"/>
  <circle cx="23" cy="24" r="4.5" fill="#1d4ed8" stroke="white" stroke-width="2"/>
</svg>`;
}

const icons = [
  { name: "icon-72x72.png", size: 72 },
  { name: "icon-96x96.png", size: 96 },
  { name: "icon-128x128.png", size: 128 },
  { name: "icon-144x144.png", size: 144 },
  { name: "icon-152x152.png", size: 152 },
  { name: "icon-192x192.png", size: 192 },
  { name: "icon-384x384.png", size: 384 },
  { name: "icon-512x512.png", size: 512 },
];

for (const { name, size } of icons) {
  await sharp(Buffer.from(makeSvg(size))).png().toFile(join(ICONS_DIR, name));
  console.log(`✓ ${name}`);
}

await sharp(Buffer.from(makeSvg(180)))
  .png()
  .toFile(join(ROOT, "public", "apple-touch-icon.png"));
console.log("✓ apple-touch-icon.png");
