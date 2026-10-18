// Run after `expo export --platform ios --source-maps` to verify the actual
// Metro graph, not merely the imports visible in a component's source file.
import fs from 'node:fs/promises';
import path from 'node:path';
const directory = path.resolve(process.argv[2] ?? 'apps/mobile/dist');
async function files(root) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const result = await Promise.all(entries.map(e => e.isDirectory() ? files(path.join(root, e.name)) : path.join(root, e.name)));
  return result.flat();
}
const maps = (await files(directory)).filter(file => file.endsWith('.map'));
if (!maps.length) throw new Error('Export with --source-maps before verifying the mobile graph.');
const banned = /(?:^|\/)packages\/shared\/src\/(?:campus-map\.json|walking\.ts|building-art\.ts|campus-landmarks\.ts|landscape-art\.ts)$/;
const campus = JSON.parse(await fs.readFile(new URL('../packages/shared/src/campus-map.json', import.meta.url), 'utf8'));
// Metro omits JSON modules from its source maps. Probe the actual bytecode too:
// complete geometry strings must be stored contiguously in Hermes' string pool
// if the full JSON is accidentally bundled. Probe both supported encodings.
const probes = [campus.paths, campus.buildings.map(b => b.path), campus.surfaces.map(s => s.path),
  campus.walkways.map(w => w.path), campus.roads.map(r => r.path)]
  .flatMap(paths => [...paths].sort((a, b) => b.length - a.length).slice(0, 5))
  .filter(value => value.length >= 256).map(value => value.slice(0, 256));
for (const file of maps) {
  const map = JSON.parse(await fs.readFile(file, 'utf8'));
  const sources = map.sources.map(source => source.replaceAll('\\', '/'));
  const leaked = sources.filter(source => banned.test(source));
  if (leaked.length) throw new Error(`Full map geometry leaked into ${file}: ${leaked.join(', ')}`);
  if (!sources.some(source => source.endsWith('/shared/src/index.mobile.ts')))
    throw new Error(`The mobile shared entry was not found in ${file}.`);
  const bytecode = await fs.readFile(file.slice(0, -4));
  if (probes.some(probe => bytecode.includes(Buffer.from(probe)) || bytecode.includes(Buffer.from(probe, 'utf16le'))))
    throw new Error(`Raw campus geometry was found in ${file.slice(0, -4)}.`);
  console.log(`Verified ${path.relative(directory, file)}: ${sources.length} sources, ${(bytecode.length / 1048576).toFixed(2)} MiB bytecode; mobile shared entry selected, artwork generators and raw geometry probes excluded.`);
}
