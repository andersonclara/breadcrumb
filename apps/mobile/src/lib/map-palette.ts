// Built-in per-image color filters avoid runtime shader compilation and the
// additional filtered offscreen surface when the campus map first mounts.
const day = [
  .83309, .09936, -.02509, 0, .03283,
  .06225, .85908, -.01376, 0, .04226,
  .09516, .23448, .62783, 0, .04338,
  0, 0, 0, 1, 0,
];
const night = [
  .9, -.7, .14, 0, .08,
  .6, -.35, .15, 0, .1,
  .5, -.4, .25, 0, .17,
  0, 0, 0, 1, 0,
];
export function mapColorMatrix(light: readonly number[]): number[] {
  'worklet';
  return day.map((value, index) => {
    if (index >= 15) return index === 18 ? 1 : 0;
    const warmth = index === 4 ? 15 / 255 : index === 9 ? 3 / 255 : index === 14 ? -3 / 255 : 0;
    const dusk = value * .68 + night[index] * .32 + warmth;
    return value * light[0] + dusk * light[1] + night[index] * light[2];
  });
}
