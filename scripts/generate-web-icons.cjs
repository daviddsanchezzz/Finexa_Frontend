const fs = require('node:fs/promises');
const path = require('node:path');
const { generateImageAsync } = require('@expo/image-utils');

const projectRoot = path.resolve(__dirname, '..');

async function generateWebIcons() {
  const src = path.join(projectRoot, 'assets', 'icon.png');
  await fs.mkdir(path.join(projectRoot, 'public', 'icons'), { recursive: true });
  for (const size of [180, 192, 512]) {
    const { source } = await generateImageAsync({ projectRoot, cacheType: 'finexa-web-icons' }, {
      src, width: size, height: size, resizeMode: 'contain', name: `icon-${size}.png`,
    });
    await fs.writeFile(path.join(projectRoot, 'public', 'icons', `icon-${size}.png`), source);
    if (size === 180) {
      await fs.writeFile(path.join(projectRoot, 'public', 'apple-touch-icon.png'), source);
      await fs.writeFile(path.join(projectRoot, 'public', 'apple-touch-icon-finexa.png'), source);
    }
  }
  console.log('Web icons generated from assets/icon.png (180, 192, 512 px).');
}

generateWebIcons().catch((error) => { console.error(error); process.exitCode = 1; });
