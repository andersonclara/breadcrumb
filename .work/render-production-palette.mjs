import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import ts from 'typescript';
const require = createRequire(import.meta.url);
const initialize = require('canvaskit-wasm/bin/full/canvaskit.js');
const kit = await initialize({ locateFile: file => require.resolve(`canvaskit-wasm/bin/full/${file}`) });
const source = await fs.readFile('apps/mobile/src/lib/map-palette.ts', 'utf8');
const js = ts.transpile(source, { module: ts.ModuleKind.ESNext });
const { mapPaletteShader } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const effect = kit.RuntimeEffect.Make(mapPaletteShader);
if (!effect) throw new Error('Shader did not compile');
const input = kit.MakeImageFromEncoded(await fs.readFile('.work/map-lighting-original.png'));
const child = input.makeShaderOptions(kit.TileMode.Clamp, kit.TileMode.Clamp, kit.FilterMode.Nearest, kit.MipmapMode.None);
for (const [name, light] of [['day', [1, 0, 0]], ['dusk', [0, 1, 0]], ['night', [0, 0, 1]]]) {
  const surface = kit.MakeSurface(input.width(), input.height());
  const shader = effect.makeShaderWithChildren(light, [child]);
  const paint = new kit.Paint(); paint.setShader(shader);
  surface.getCanvas().drawPaint(paint); surface.flush();
  const image = surface.makeImageSnapshot();
  await fs.writeFile(`.work/map-production-${name}.png`, image.encodeToBytes());
  image.delete(); paint.delete(); shader.delete(); surface.delete();
}
child.delete(); input.delete(); effect.delete();
