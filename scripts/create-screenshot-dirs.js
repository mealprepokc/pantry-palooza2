const fs = require('fs');
const path = require('path');

const dirs = [
  ['store-assets', 'apple-app-store', 'screenshots', 'iphone-65'],
  ['store-assets', 'apple-app-store', 'screenshots', 'iphone-61'],
  ['store-assets', 'apple-app-store', 'screenshots', 'ipad-pro-3rd-gen'],
  ['store-assets', 'google-play-store', 'screenshots', 'phone'],
  ['store-assets', 'google-play-store', 'screenshots', 'tablet'],
];

for (const parts of dirs) {
  const target = path.join(__dirname, '..', ...parts);
  fs.mkdirSync(target, { recursive: true });
}

console.log('Ensured screenshot directories exist.');
