import { Resvg } from '@resvg/resvg-js';
import fs from 'fs';
import path from 'path';

const svgPath = path.join(process.cwd(), 'public', 'og-image.svg');
const pngPath = path.join(process.cwd(), 'public', 'og-image.png');

const svg = fs.readFileSync(svgPath, 'utf8');

const resvg = new Resvg(svg, {
  fitTo: {
    mode: 'width',
    value: 1200,
  },
});

const pngData = resvg.render();
const pngBuffer = pngData.asPng();

fs.writeFileSync(pngPath, pngBuffer);

console.log('OG image converted: og-image.png (1200x630)');
