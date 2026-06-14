import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="bg" x1="0%" y1="100%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e3a5f"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="8" fill="url(#bg)"/>
  <path d="M 7.34 24 A 10 10 0 1 1 24.66 24" fill="none" stroke="rgba(255,255,255,0.18)" stroke-width="2.2" stroke-linecap="round"/>
  <path d="M 7.34 24 A 10 10 0 0 1 23.43 12.31" fill="none" stroke="#60a5fa" stroke-width="2.8" stroke-linecap="round"/>
  <line x1="16" y1="19" x2="21.2" y2="14.32" stroke="white" stroke-width="1.6" stroke-linecap="round"/>
  <circle cx="16" cy="19" r="2" fill="white"/>
</svg>`;

const buf = Buffer.from(svg);
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

for (const size of sizes) {
  await sharp(buf).resize(size, size).png().toFile(path.join(iconsDir, `icon-${size}x${size}.png`));
  console.log(`✓ icon-${size}x${size}.png`);
}

await sharp(buf).resize(180, 180).png().toFile(path.join(__dirname, '..', 'public', 'apple-touch-icon.png'));
console.log('✓ apple-touch-icon.png (180x180)');
