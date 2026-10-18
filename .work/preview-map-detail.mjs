import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const folder = path.resolve('apps/mobile/assets/campus');
const crop = { left: 226, top: 64, span: 24 };
async function panel(level) {
  const tileSpan = 320 / 2 ** level, scale = 512 / tileSpan;
  const x0 = Math.floor(crop.left / tileSpan), y0 = Math.floor(crop.top / tileSpan);
  const x1 = Math.floor((crop.left + crop.span) / tileSpan), y1 = Math.floor((crop.top + crop.span) / tileSpan);
  const images = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const input = await sharp(path.join(folder, `${level}-${x}-${y}.png`))
      .extract({ left: 2, top: 2, width: 512, height: 512 }).toBuffer();
    images.push({ input, left: (x - x0) * 512, top: (y - y0) * 512 });
  }
  const mosaic = await sharp({ create: { width: (x1 - x0 + 1) * 512, height: (y1 - y0 + 1) * 512, channels: 4, background: '#A7CF7B' } })
    .composite(images).png().toBuffer();
  return sharp(mosaic).extract({ left: Math.round((crop.left - x0 * tileSpan) * scale), top: Math.round((crop.top - y0 * tileSpan) * scale),
    width: Math.round(crop.span * scale), height: Math.round(crop.span * scale) })
    .resize(460, 460, { kernel: 'nearest' }).png().toBuffer();
}
const labels = ['ZOOMED OUT · OUTLINES', 'MEDIUM · BUILDING SHAPES', 'CLOSE UP · PIXEL DETAIL'];
const header = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="560"><rect width="1440" height="560" fill="#F5E9D5"/>${labels.map((text, i) => `<text x="${i * 480 + 20}" y="34" fill="#49382C" font-family="Arial" font-size="16" font-weight="700">${text}</text>`).join('')}<text x="20" y="542" fill="#746352" font-family="Arial" font-size="14">Same campus area, rendered at three levels of detail.</text></svg>`);
const inputs = [];
for (const [index, level] of [2, 4, 5].entries()) inputs.push({ input: await panel(level), left: index * 480 + 10, top: 52 });
await fs.mkdir('.work', { recursive: true });
await sharp(header).composite(inputs).png().toFile('.work/map-detail-preview.png');
console.log('Saved .work/map-detail-preview.png');
