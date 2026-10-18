import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

// Palette/lighting study from the actual generated map. This does not modify app assets.
const campus = JSON.parse(await fs.readFile('packages/shared/src/campus-map.json', 'utf8'));
const catalog = JSON.parse(await fs.readFile('apps/mobile/src/generated/map-catalog.json', 'utf8'));
const crop = { left: 187, top: 30, span: 70 }, edge = 720;
const folder = path.resolve('apps/mobile/assets/campus');
const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
const point = (x, y) => ({ x: (x - crop.left) / crop.span * edge, y: (y - crop.top) / crop.span * edge });
const palette = {
  lawn: ['#B4C8A3', '#304642'], forest: ['#587E68', '#1D3432'],
  water: ['#69A8BC', '#284D68'], road: ['#87979E', '#788DA0'],
  path: ['#F7EEDD', '#A5ABA7'], brick: ['#B87C65', '#6C5B65'],
  roof: ['#B96F52', '#756371'], outline: ['#75634E', '#293543'],
};
const anchors = [
  ['lawn', '#A7CF7B'], ['lawn', '#B1D58A'], ['lawn', '#79BA62'], ['lawn', '#93BA6D'],
  ['forest', '#548B60'], ['forest', '#658D60'], ['forest', '#567C53'],
  ['water', '#66B9D1'], ['water', '#72B5CC'], ['water', '#93CBD7'],
  ['road', '#C4B594'], ['road', '#999B96'], ['road', '#8E908B'],
  ['path', '#FFE7B1'], ['path', '#F3E4B8'], ['path', '#D8CDA5'], ['path', '#F4DFAB'],
  ['brick', '#BC8064'], ['brick', '#E0B696'], ['outline', '#9F896C'],
].map(([role, color]) => ({ role, color: rgb(color) }));

async function mapImage() {
  const span = 10, scale = 512 / span;
  const x0 = Math.floor(crop.left / span), y0 = Math.floor(crop.top / span);
  const x1 = Math.floor((crop.left + crop.span) / span), y1 = Math.floor((crop.top + crop.span) / span);
  const images = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    images.push({ input: await sharp(path.join(folder, `5-${x}-${y}.png`))
      .extract({ left: 2, top: 2, width: 512, height: 512 }).toBuffer(), left: (x - x0) * 512, top: (y - y0) * 512 });
  }
  const mosaic = await sharp({ create: { width: (x1 - x0 + 1) * 512, height: (y1 - y0 + 1) * 512, channels: 3, background: '#A7CF7B' } })
    .composite(images).png().toBuffer();
  return sharp(mosaic).extract({ left: Math.round((crop.left - x0 * span) * scale), top: Math.round((crop.top - y0 * span) * scale),
    width: Math.round(crop.span * scale), height: Math.round(crop.span * scale) })
    .resize(edge, edge, { kernel: 'nearest' }).removeAlpha().raw().toBuffer();
}

function colors(source) {
  const [r, g, b] = source;
  let closest, distance = Infinity;
  for (const anchor of anchors) {
    const d = anchor.color.reduce((sum, value, i) => sum + (value - source[i]) ** 2, 0);
    if (d < distance) { distance = d; closest = anchor; }
  }
  let role = distance < 180 ? closest.role : null;
  if (!role && g > r * 1.12 && g > b * 1.1) role = r < 110 ? 'forest' : 'lawn';
  if (role) {
    const offset = Math.max(-10, Math.min(10, (r + g + b - closest.color.reduce((a, b) => a + b, 0)) / 12));
    return palette[role].map(hex => rgb(hex).map(v => Math.max(0, Math.min(255, Math.round(v + offset)))));
  }
  // Retain architectural colors and pixel shading in daylight; use cooler ambient
  // light at night with enough local contrast to keep individual buildings readable.
  const luma = r * .2126 + g * .7152 + b * .0722;
  const day = [Math.min(255, r * 1.025), g, b].map(Math.round);
  const night = [22 + luma * .38 + r * .07, 30 + luma * .37 + g * .06, 44 + luma * .38 + b * .05].map(Math.round);
  return [day, night];
}

const litBuildings = campus.buildings.flatMap((b, i) => {
  if (!['Library West', 'Marston Science Library', 'Century Tower'].includes(b.name)) return [];
  const meta = catalog.buildings.find(m => m.index === i);
  return [{ ...b, ...meta, alpha: catalog.masks[meta.mask] }];
});
function isSelectedWindow(x, y, source) {
  if (!(source[1] > source[0] + 15 && source[2] > source[0] + 18)) return false;
  const wx = crop.left + x / edge * crop.span, wy = crop.top + y / edge * crop.span;
  return litBuildings.some(b => {
    const bx = (wx - b.x + b.width / 2) / b.width * b.alpha.width;
    const by = (wy - b.y + b.artHeight) / b.artHeight * b.alpha.height;
    if ((Math.floor(bx / 7) + Math.floor(by / 9)) % 3 === 0) return false;
    return b.alpha.rows.some(row => by >= row[0] && by <= row[1] && row.slice(2).some((left, i, spans) => i % 2 === 0 && bx >= left && bx <= spans[i + 1]));
  });
}

const street = campus.roads.map(r => {
  const values = r.path.match(/-?\d*\.?\d+/g).map(Number);
  return values.flatMap((v, i) => i % 2 === 0 ? [[v, values[i + 1]]] : [])
    .filter(([x, y]) => x > 190 && x < 250 && y > 34 && y < 39);
}).find(points => points.length > 3 && Math.max(...points.map(p => p[0])) - Math.min(...points.map(p => p[0])) > 30);
const fixtures = [];
if (street) {
  let spacing = 0;
  for (let i = 1; i < street.length; i++) {
    const a = street[i - 1], b = street[i], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    for (; spacing < length; spacing += 3.4) fixtures.push({ ...point(a[0] + (b[0] - a[0]) * spacing / length, a[1] + (b[1] - a[1]) * spacing / length + .55), radius: 16 });
    spacing -= length;
  }
}
// Exterior lighting study only; the playing field is not floodlit.
for (const [x, y] of [[190.2, 53], [190.2, 60], [190.2, 67], [207.7, 52], [207.7, 59], [207.7, 66], [195, 72.4], [202, 72.4],
  [233.8, 82.1], [238.2, 82.1], [242, 53], [246, 53], [241.1, 73.2], [235.2, 74.5]])
  fixtures.push({ ...point(x, y), radius: 17 });

function overlay(mode) {
  const intensity = mode === 'day' ? 0 : mode === 'dusk' ? .48 : 1;
  const lights = fixtures.map(p => `<ellipse cx="${p.x}" cy="${p.y + 4}" rx="${p.radius}" ry="${p.radius * .58}" fill="url(#light)" opacity="${intensity}"/><path d="M${p.x} ${p.y + 3}v-5" stroke="#273343" stroke-width="1.4"/><rect x="${p.x - 1.3}" y="${p.y - 3}" width="2.6" height="2.6" rx=".5" fill="${mode === 'day' ? '#D5CAB3' : '#FFE4A0'}" opacity="${mode === 'day' ? .5 : 1}"/>`).join('');
  const names = [
    { text: 'THE SWAMP', x: 199.3, y: 76.8 }, { text: 'LIBRARY WEST', x: 245.1, y: 55.6 }, { text: 'MARSTON', x: 236.5, y: 86.2 },
  ].map(l => { const p = point(l.x, l.y), width = l.text.length * 6.1 + 14; return `<g transform="translate(${p.x} ${p.y})"><rect x="${-width / 2}" y="-11" width="${width}" height="21" rx="5" fill="${mode === 'day' ? '#FFF9EB' : '#1D2A38'}" fill-opacity=".92"/><text y="3" text-anchor="middle" font-family="Arial" font-size="10" font-weight="700" letter-spacing=".5" fill="${mode === 'day' ? '#49382C' : '#F3E6CF'}">${l.text}</text></g>`; }).join('');
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${edge}" height="${edge}"><defs><radialGradient id="light"><stop offset="0" stop-color="#FFE1A0" stop-opacity=".65"/><stop offset=".4" stop-color="#FFD588" stop-opacity=".26"/><stop offset="1" stop-color="#FFC775" stop-opacity="0"/></radialGradient></defs>${lights}${names}</svg>`);
}

const original = await mapImage(), images = [], modes = ['day', 'dusk', 'night'];
for (const mode of modes) {
  const target = Buffer.alloc(original.length), dusk = mode === 'dusk' ? .32 : mode === 'night' ? 1 : 0;
  const cache = new Map();
  for (let i = 0; i < original.length; i += 3) {
    const source = [original[i], original[i + 1], original[i + 2]], key = source.join(',');
    if (!cache.has(key)) cache.set(key, colors(source));
    const [day, night] = cache.get(key);
    let color = mix(day, night, dusk);
    if (mode === 'dusk') color = [Math.min(255, color[0] + 15), color[1] + 3, Math.max(0, color[2] - 3)];
    const x = (i / 3) % edge, y = Math.floor(i / 3 / edge);
    if (dusk && isSelectedWindow(x, y, source)) color = mix(color, rgb('#F3D39A'), dusk * .85);
    for (let c = 0; c < 3; c++) target[i + c] = color[c];
  }
  const image = await sharp(target, { raw: { width: edge, height: edge, channels: 3 } }).composite([{ input: overlay(mode) }]).png().toBuffer();
  await fs.writeFile(`.work/map-lighting-${mode}.png`, image); images.push(image);
}
const notes = ['Cooler greens / distinct gray roads', 'Warmer ambient light / lights coming on', 'Readable roads / selective warm lighting'];
const frame = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="2220" height="870"><rect width="2220" height="870" fill="#F5EBDD"/>${modes.map((mode, i) => `<text x="${i * 740 + 20}" y="36" font-family="Arial" font-size="23" font-weight="700" letter-spacing="2" fill="#49382C">${mode.toUpperCase()}</text><text x="${i * 740 + 20}" y="61" font-family="Arial" font-size="15" fill="#746352">${notes[i]}</text>`).join('')}<text x="20" y="835" font-family="Arial" font-size="16" fill="#746352">Palette and lighting concepts using the same map artwork. Light placements are illustrative, not live observations.</text></svg>`);
await sharp(frame).composite(images.map((input, i) => ({ input, left: i * 740 + 10, top: 82 }))).png().toFile('.work/map-lighting-preview.png');
await sharp(original, { raw: { width: edge, height: edge, channels: 3 } }).png().toFile('.work/map-lighting-original.png');
console.log('Saved day, dusk, night, and comparison previews in .work/');
