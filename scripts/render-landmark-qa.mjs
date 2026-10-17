import sharp from 'sharp';
import {campusLandmarkSprites,landmarkNames} from '../packages/shared/src/campus-landmarks.ts';
const ids=Object.keys(campusLandmarkSprites);
const sprites=ids.map((id,i)=>{const art=campusLandmarkSprites[id],x=(i%4)*160+16+(128-art.width)/2,y=Math.floor(i/4)*154+16;return `<g transform="translate(${x} ${y})">${art.pixels.map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}"/>`).join('')}</g><text x="${(i%4)*160+80}" y="${Math.floor(i/4)*154+143}" text-anchor="middle" font-family="monospace" font-size="9" fill="#49382C">${landmarkNames[id]}</text>`;}).join('');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="308" shape-rendering="crispEdges"><rect width="640" height="308" fill="#E8F1CD"/>${sprites}</svg>`)).png().toBuffer().then(b=>sharp(b).resize(1280,616,{kernel:'nearest'}).toFile('public/landmark-preview.png'));
console.log('public/landmark-preview.png');
