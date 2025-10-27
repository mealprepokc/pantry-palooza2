const fs = require('fs');
const path = require('path');
const { Jimp } = require('jimp');

const baseDir = path.resolve(__dirname, '..');
const assetsDir = path.join(baseDir, 'assets', 'images');
const storeAssetsDir = path.join(baseDir, 'store-assets');
const sourceIconPath = path.join(assetsDir, 'icon.png');

const appleIconPath = path.join(storeAssetsDir, 'apple-app-store', 'app-icon', 'AppIcon1024.png');
const playIconPath = path.join(storeAssetsDir, 'google-play-store', 'app-icon', 'PlayIcon512.png');
const featureGraphicPath = path.join(storeAssetsDir, 'google-play-store', 'feature-graphic', 'FeatureGraphic1024x500.png');
const adaptiveIconForegroundPath = path.join(assetsDir, 'adaptive-icon.png');

const ensureDir = async (targetPath) => {
  await fs.promises.mkdir(targetPath, { recursive: true });
};

async function generateAssets() {
  if (!fs.existsSync(sourceIconPath)) {
    throw new Error(`Source icon not found at ${sourceIconPath}`);
  }

  const icon = await Jimp.read(sourceIconPath);

  // Ensure directories exist
  await Promise.all([
    ensureDir(path.dirname(appleIconPath)),
    ensureDir(path.dirname(playIconPath)),
    ensureDir(path.dirname(featureGraphicPath)),
  ]);

  // Apple App Store icon (1024x1024)
  const appleIcon = icon.clone();
  await appleIcon.resize({ w: 1024, h: 1024, mode: Jimp.RESIZE_BICUBIC });
  await appleIcon.write(appleIconPath);

  // Google Play icon (512x512)
  const playIcon = icon.clone();
  await playIcon.resize({ w: 512, h: 512, mode: Jimp.RESIZE_BICUBIC });
  await playIcon.write(playIconPath);

  // Adaptive icon foreground (432x432 inside 1080 canvas for better Android padding)
  const adaptiveCanvasSize = 1080;
  const adaptiveForeground = await new Jimp({ width: adaptiveCanvasSize, height: adaptiveCanvasSize, color: 0xffffffff });
  const scaledAdaptive = icon.clone();
  await scaledAdaptive.contain({ w: 864, h: 864, mode: Jimp.RESIZE_BICUBIC });
  const ax = (adaptiveCanvasSize - scaledAdaptive.bitmap.width) / 2;
  const ay = (adaptiveCanvasSize - scaledAdaptive.bitmap.height) / 2;
  await adaptiveForeground.composite(scaledAdaptive, ax, ay);
  await adaptiveForeground.write(adaptiveIconForegroundPath);

  // Feature graphic 1024x500 with text overlay
  const featureWidth = 1024;
  const featureHeight = 500;
  const featureBackgroundColor = 0xf7f9fbff;
  const featureGraphic = await new Jimp({ width: featureWidth, height: featureHeight, color: featureBackgroundColor });

  const accentColorTop = 0x4ecdC4ff;
  const accentColorBottom = 0xff6b35ff;

  for (let y = 0; y < featureHeight; y += 1) {
    const t = y / (featureHeight - 1);
    const r = Math.round(((accentColorTop >> 24) & 0xff) * (1 - t) + ((accentColorBottom >> 24) & 0xff) * t);
    const g = Math.round(((accentColorTop >> 16) & 0xff) * (1 - t) + ((accentColorBottom >> 16) & 0xff) * t);
    const b = Math.round(((accentColorTop >> 8) & 0xff) * (1 - t) + ((accentColorBottom >> 8) & 0xff) * t);
    const a = 0xff;
    const color = (r << 24) | (g << 16) | (b << 8) | a;
    featureGraphic.scan(0, y, featureWidth, 1, function (x, yy, idx) {
      this.bitmap.data[idx + 0] = (color >> 24) & 0xff;
      this.bitmap.data[idx + 1] = (color >> 16) & 0xff;
      this.bitmap.data[idx + 2] = (color >> 8) & 0xff;
      this.bitmap.data[idx + 3] = color & 0xff;
    });
  }

  const iconForFeature = icon.clone();
  await iconForFeature.contain({ w: 420, h: 420, mode: Jimp.RESIZE_BICUBIC });
  const ix = featureWidth / 2 - iconForFeature.bitmap.width / 2;
  const iy = featureHeight / 2 - iconForFeature.bitmap.height / 2;
  await featureGraphic.composite(iconForFeature, ix, iy);

  await featureGraphic.write(featureGraphicPath);

  return {
    appleIconPath,
    playIconPath,
    featureGraphicPath,
    adaptiveIconForegroundPath,
  };
}

if (require.main === module) {
  generateAssets()
    .then((paths) => {
      console.log('Generated assets:', JSON.stringify(paths, null, 2));
    })
    .catch((error) => {
      console.error('Failed to generate store assets:', error);
      process.exit(1);
    });
}

module.exports = { generateAssets };
