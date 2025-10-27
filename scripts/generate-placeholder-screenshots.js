const fs = require('fs');
const path = require('path');
const { Jimp, rgbaToInt } = require('jimp');

const baseDir = path.resolve(__dirname, '..');
const assetsDir = path.join(baseDir, 'assets', 'images');
const storeAssetsDir = path.join(baseDir, 'store-assets');
const sourceIconPath = path.join(assetsDir, 'icon.png');

const scenes = [
  {
    name: 'library',
    gradient: ['#4ECDC4', '#1A535C'],
    cardColors: ['#FFFFFF', '#E8F8F6', '#D9F2EE'],
  },
  {
    name: 'generate',
    gradient: ['#FF6B35', '#F7B267'],
    cardColors: ['#FFFFFF', '#FFE6D8', '#FFD8BF'],
  },
  {
    name: 'saved',
    gradient: ['#2C3E50', '#4ECDC4'],
    cardColors: ['#FFFFFF', '#EAF6F8', '#D6EBEF'],
  },
];

const targets = [
  {
    dir: ['apple-app-store', 'screenshots', 'iphone-65'],
    width: 1284,
    height: 2778,
    iconScale: 540,
  },
  {
    dir: ['apple-app-store', 'screenshots', 'iphone-61'],
    width: 1170,
    height: 2532,
    iconScale: 500,
  },
  {
    dir: ['apple-app-store', 'screenshots', 'ipad-pro-3rd-gen'],
    width: 2048,
    height: 2732,
    iconScale: 720,
  },
  {
    dir: ['google-play-store', 'screenshots', 'phone'],
    width: 1080,
    height: 1920,
    iconScale: 520,
  },
  {
    dir: ['google-play-store', 'screenshots', 'tablet'],
    width: 1200,
    height: 1920,
    iconScale: 560,
  },
];

function hexToRGBA(hex, alpha = 255) {
  const normalized = hex.replace('#', '');
  const bigint = parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return { r, g, b, a: alpha };
}

function interpolateColor(colorA, colorB, t) {
  return {
    r: Math.round(colorA.r * (1 - t) + colorB.r * t),
    g: Math.round(colorA.g * (1 - t) + colorB.g * t),
    b: Math.round(colorA.b * (1 - t) + colorB.b * t),
    a: Math.round(colorA.a * (1 - t) + colorB.a * t),
  };
}

function fillGradient(image, colorTop, colorBottom) {
  const { width, height } = image.bitmap;
  for (let y = 0; y < height; y += 1) {
    const t = height === 1 ? 0 : y / (height - 1);
    const color = interpolateColor(colorTop, colorBottom, t);
    const colorInt = rgbaToInt(color.r, color.g, color.b, color.a);
    for (let x = 0; x < width; x += 1) {
      image.setPixelColor(colorInt, x, y);
    }
  }
}

function fillRect(image, x, y, w, h, rgba) {
  const colorInt = rgbaToInt(rgba.r, rgba.g, rgba.b, rgba.a ?? 255);
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) {
      if (xx >= 0 && xx < image.bitmap.width && yy >= 0 && yy < image.bitmap.height) {
        image.setPixelColor(colorInt, xx, yy);
      }
    }
  }
}

async function createScreenshot({ dir, width, height, iconScale }, scene, index, icon) {
  const outputDir = path.join(storeAssetsDir, ...dir);
  await fs.promises.mkdir(outputDir, { recursive: true });
  const outputPath = path.join(outputDir, `${String(index + 1).padStart(2, '0')}_${scene.name}.png`);

  const image = await new Jimp({ width, height, color: 0xffffffff });
  const [topHex, bottomHex] = scene.gradient;
  fillGradient(image, hexToRGBA(topHex), hexToRGBA(bottomHex));

  // Draw faux cards to mimic app UI
  const cardWidth = Math.round(width * 0.78);
  const cardHeight = Math.round(height * 0.12);
  const startX = Math.round((width - cardWidth) / 2);
  let currentY = Math.round(height * 0.45);
  const gap = Math.round(height * 0.03);

  scene.cardColors.forEach((hex, idx) => {
    const cardColor = hexToRGBA(hex);
    const shadowColor = hexToRGBA('#000000', 40);
    fillRect(image, startX + 8, currentY + 8, cardWidth, cardHeight, shadowColor);
    fillRect(image, startX, currentY, cardWidth, cardHeight, cardColor);
    currentY += cardHeight + gap;
  });

  // Add icon near top center
  const iconClone = icon.clone();
  await iconClone.contain({ w: iconScale, h: iconScale, mode: Jimp.RESIZE_BICUBIC });
  const iconX = Math.round((width - iconClone.bitmap.width) / 2);
  const iconY = Math.round(height * 0.18 - iconClone.bitmap.height / 2);
  await image.composite(iconClone, iconX, iconY);

  await image.write(outputPath);
  return outputPath;
}

async function generateScreenshots() {
  if (!fs.existsSync(sourceIconPath)) {
    throw new Error(`Missing source icon at ${sourceIconPath}`);
  }
  const baseIcon = await Jimp.read(sourceIconPath);

  const results = [];
  for (const target of targets) {
    const paths = [];
    for (let i = 0; i < scenes.length; i += 1) {
      const scene = scenes[i];
      const screenshotPath = await createScreenshot(target, scene, i, baseIcon);
      paths.push(screenshotPath);
    }
    results.push({ target: path.join(...target.dir), files: paths });
  }

  return results;
}

if (require.main === module) {
  generateScreenshots()
    .then((output) => {
      console.log('Generated placeholder screenshots:', JSON.stringify(output, null, 2));
    })
    .catch((error) => {
      console.error('Failed to generate placeholder screenshots:', error);
      process.exit(1);
    });
}

module.exports = { generateScreenshots };
