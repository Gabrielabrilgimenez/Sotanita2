const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const src = path.resolve(__dirname, '..', 'assets', 'LOGO.png');
const outDir = path.resolve(__dirname, '..', 'assets', 'icons');
const splashOut = path.resolve(__dirname, '..', 'assets', 'splash');

// Splash sizes (width x height)
const splashSizes = [
  { w: 640, h: 1136 },
  { w: 750, h: 1334 },
  { w: 828, h: 1792 },
  { w: 1125, h: 2436 },
  { w: 1242, h: 2688 },
  { w: 1536, h: 2048 },
  { w: 1668, h: 2224 },
  { w: 1668, h: 2388 },
  { w: 2048, h: 2732 }
];

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function generate() {
  if (!fs.existsSync(src)) {
    console.error('Source logo not found at', src);
    process.exit(1);
  }

  await ensureDir(outDir);
  await ensureDir(splashOut);

  for (const size of sizes) {
    const outPath = path.join(outDir, `icon-${size}.png`);
    try {
      await sharp(src)
        .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png({ quality: 90 })
        .toFile(outPath);
      console.log('Generated', outPath);
    } catch (e) {
      console.error('Failed to generate', outPath, e);
    }
  }

  // create a maskable variant for 192 and 512 by adding padding to make it more maskable-friendly
  const maskSizes = [192, 512];
  for (const size of maskSizes) {
    const outPath = path.join(outDir, `icon-${size}-maskable.png`);
    try {
      await sharp(src)
        .resize(Math.round(size * 0.9), Math.round(size * 0.9), { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .extend({
          top: Math.round(size * 0.05),
          bottom: Math.round(size * 0.05),
          left: Math.round(size * 0.05),
          right: Math.round(size * 0.05),
          background: { r: 0, g: 0, b: 0, alpha: 0 }
        })
        .png({ quality: 90 })
        .toFile(outPath);
      console.log('Generated maskable', outPath);
    } catch (e) {
      console.error('Failed to generate maskable', outPath, e);
    }
  }

  console.log('Icon generation complete.');

  // Generate splash images with centered logo
  for (const s of splashSizes) {
    const outPath = path.join(splashOut, `splash-${s.w}x${s.h}.png`);
    try {
      // Create background and composite resized logo centered
      const logoSize = Math.round(Math.min(s.w, s.h) * 0.5);
      const logoBuffer = await sharp(src)
        .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();

      await sharp({
        create: {
          width: s.w,
          height: s.h,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        }
      })
        .composite([
          { input: logoBuffer, gravity: 'center' }
        ])
        .png({ quality: 90 })
        .toFile(outPath);
      console.log('Generated splash', outPath);
    } catch (e) {
      console.error('Failed to generate splash', outPath, e);
    }
  }

  console.log('Splash generation complete.');
}

generate();
