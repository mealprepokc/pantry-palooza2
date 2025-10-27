const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const iconPath = path.resolve(__dirname, '..', 'assets', 'images', 'icon.png');

try {
  const buffer = fs.readFileSync(iconPath);
  const png = PNG.sync.read(buffer);
  console.log(JSON.stringify({ width: png.width, height: png.height, path: iconPath }));
} catch (error) {
  console.error('Failed to read icon:', error.message);
  process.exit(1);
}
