import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = path.resolve(import.meta.dirname, '..');
const manifest = path.join(root, 'apps/mobile/src/generated/map-assets.ts');
const source = fs.readFileSync(path.join(root, 'packages/shared/src/campus-map.json'));
const hash = createHash('sha256').update(source)
  .update(fs.readFileSync(new URL('./build-mobile-map.mjs', import.meta.url)))
  .update(fs.readFileSync(new URL('./mobile-map-style.mjs', import.meta.url))).digest('hex');
const compiled = fs.existsSync(manifest) ? fs.readFileSync(manifest, 'utf8') : '';
const references = [...compiled.matchAll(/require\("(\.\.\/\.\.\/assets\/campus\/[^"]+)"\)/g)];
const ready = compiled.includes(hash) && references.length === 1365 &&
  references.every(([, name]) => fs.existsSync(path.resolve(path.dirname(manifest), name))) &&
  fs.existsSync(path.join(root, 'packages/shared/src/campus-mobile.json')) &&
  fs.existsSync(path.join(root, 'apps/mobile/src/generated/map-catalog.json'));
if (!ready) {
  console.log('Preparing campus map tiles before starting Expo. This is only needed when map assets change.');
  const result = spawnSync(process.execPath, ['scripts/build-mobile-map.mjs'], { cwd: root, stdio: 'inherit' });
  process.exit(result.status ?? 1);
}
