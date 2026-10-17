import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import ts from 'typescript';
import sharp from 'sharp';
// Transpile only the animation helper for a standalone frame contact sheet.
const source=fs.readFileSync('packages/shared/src/crumb-drop.ts','utf8').replaceAll("'./landmarks'",JSON.stringify(pathToFileURL(path.resolve('packages/shared/src/landmarks.ts')).href)).replaceAll("'./pixel'",JSON.stringify(pathToFileURL(path.resolve('packages/shared/src/pixel.ts')).href));
const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {crumbDropPixels}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const times=[0,220,450,700,950,1150];
const frames=times.map((t,i)=>`<g transform="translate(${i*150+80} 150)"><path d="M-60 5h120" stroke="#6D9258"/>${crumbDropPixels(t).map(p=>`<rect x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" fill="${p.color}" opacity="${p.opacity}"/>`).join('')}</g>`).join('');
await sharp(Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="900" height="190" shape-rendering="crispEdges"><rect width="900" height="190" fill="#B1D58A"/>${frames}</svg>`)).png().toFile('public/crumb-drop-preview.png');
console.log('public/crumb-drop-preview.png');
