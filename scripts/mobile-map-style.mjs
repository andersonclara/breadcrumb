export const MAP_STYLE_VERSION = 3;
// Bake full artwork one tier earlier, without increasing runtime tile/cache budgets.
export const mapDetail = level => level >= 4 ? 'detail' : level >= 3 ? 'blocks' : 'overview';

// The outer alpha contour keeps the same anchor and silhouette as the close-up
// artwork, without shipping thousands of windows and roof pixels into overview tiles.
export function silhouettePath(rows) {
  const outline = [];
  for (const row of rows) {
    const next = { top: row[0], bottom: row[1], left: row[2], right: row.at(-1) };
    const last = outline.at(-1);
    if (last && last.bottom === next.top && last.left === next.left && last.right === next.right) last.bottom = next.bottom;
    else outline.push(next);
  }
  if (!outline.length) return '';
  const right = outline.flatMap(r => [[r.right, r.top], [r.right, r.bottom]]);
  const left = [...outline].reverse().flatMap(r => [[r.left, r.bottom], [r.left, r.top]]);
  return [...right, ...left].map(([x, y], i) => `${i ? 'L' : 'M'}${x} ${y}`).join('') + 'Z';
}

export function simpleSprite(path, landmark, level, tree = false) {
  const detail = mapDetail(level);
  const fill = tree ? '#72985F' : detail === 'overview' ? (landmark ? '#D9C6A5' : '#E7DBC5') : (landmark ? '#C7A77E' : '#D7BF9D');
  return `<path d="${path}" fill="${fill}"${tree ? '' : ' stroke="#9F896C" stroke-width="0.65" stroke-linejoin="round" vector-effect="non-scaling-stroke"'}/>`;
}
