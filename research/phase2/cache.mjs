// At most two manual GETs per source; no polling, scheduling or retained bodies.
import { createHash } from 'node:crypto';
import { get, metadata } from '../lib/http.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
const sources = {
  gatorconnect: 'https://gatorconnect.ufl.edu/events.rss',
  'uf-calendar': 'https://calendar.ufl.edu/live/json/events/paginate/5?page=1',
  libraries: 'https://libcal.uflib.ufl.edu/rss.php?iid=6&m=month&cid=22582',
  gainesvilleevents: 'https://gainesvilleevents.com/feed.ics',
};
const results = [];
for (const [source, url] of Object.entries(sources)) {
  const first = await get(url);
  const result = { source, first: metadata(first), bodyHash: first.body ? createHash('sha256').update(first.body).digest('hex') : null };
  if (first.status === 200 && (first.cache?.etag || first.cache?.lastModified)) {
    const extraHeaders = first.cache.etag ? { 'If-None-Match': first.cache.etag } : { 'If-Modified-Since': first.cache.lastModified };
    const second = await get(url, { extraHeaders });
    result.conditionalHeader = Object.keys(extraHeaders)[0];
    result.second = metadata(second);
    result.notModified = second.status === 304;
    result.sameBody = second.body ? createHash('sha256').update(second.body).digest('hex') === result.bodyHash : null;
    result.note = second.status === 304 ? '304 is successful conditional validation, not a failed content retrieval; body reuse was not persisted.' : 'Conditional request did not produce 304 at this execution; no polling interval inferred.';
  } else result.note = 'No conditional validator advertised; second request not sent.';
  results.push(result); console.log(JSON.stringify(result, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  await writeFile(new URL('./evidence/cache.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
}
