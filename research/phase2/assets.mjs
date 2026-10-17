// Inspect only page-linked public assets for advertised calendars/data routes.
// Does not execute downloaded JS, extract credentials, or enumerate private endpoints.
import { load } from 'cheerio';
import { get, metadata, safeUrl } from '../lib/http.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const pages = {
  wicse: 'https://ufwicse.com/events',
  closures: 'https://campusclosures.ufl.edu/',
  heartwood: 'https://www.heartwoodsoundstage.com/shows',
};
const selected = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const results = [];
for (const [id, url] of Object.entries(pages)) {
  if (selected.length && !selected.includes(id)) continue;
  const page = await get(url); const entry = { id, page: metadata(page), assets: [] };
  if (page.body) {
    const $ = load(page.body);
    const linked = $('script[src]').toArray().map(e => new URL($(e).attr('src'), page.url).href);
    const selectedAssets = linked.filter(src => new URL(src).origin === new URL(page.url).origin && /\/(?:main(?:-es2015)?(?:\.|-)|main\.js)/i.test(new URL(src).pathname)).slice(0, 1);
    const bodies = [{ url: page.url, body: page.body }];
    for (const assetUrl of selectedAssets) {
      const asset = await get(assetUrl); entry.assets.push(metadata(asset));
      if (asset.body) bodies.push({ url: asset.url, body: asset.body });
    }
    entry.publicCalendars = []; entry.publicDataUrls = []; entry.routeLiterals = [];
    for (const { body } of bodies) {
      const decoded = body.replaceAll('\\u0026', '&').replaceAll('&amp;', '&').replaceAll('\\/', '/').replaceAll('\\"', '"');
      for (const match of decoded.matchAll(/https?:\/\/[^\s"'<>\\`]+/g)) {
        try {
          const candidate = new URL(match[0]);
          if (candidate.username || candidate.password || [...candidate.searchParams.keys()].some(key => /token|secret|key|code/i.test(key))) continue;
          if (/calendar\.google\.com|google\.com/.test(candidate.hostname) && /calendar\/embed|calendar\/ical/.test(candidate.pathname) && !/private-/.test(candidate.href)) entry.publicCalendars.push(candidate.href);
          else if (/ufl\.edu$|opendate\.io$/.test(candidate.hostname) && /api|closure|outage|events|mapserver|featureserver/i.test(candidate.pathname)) entry.publicDataUrls.push(safeUrl(candidate.href));
        } catch { /* Ignore non-URL strings. */ }
      }
      // Only bounded route string literals; do not print surrounding JS/configuration.
      entry.routeLiterals.push(...[...decoded.matchAll(/["']((?:\/?(?:api|closure|outage|request|event|maintenance)[a-z0-9/_?=.-]*))["']/gi)].map(m => m[1]).filter(v => !/admin|auth|login|token|user|employee|private/i.test(v)));
    }
    for (const field of ['publicCalendars', 'publicDataUrls', 'routeLiterals']) entry[field] = [...new Set(entry[field])].slice(0, 25);
  }
  results.push(entry); console.log(JSON.stringify(entry, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  const file = new URL('./evidence/assets.json', import.meta.url);
  const previous = JSON.parse(await readFile(file, 'utf8').catch(() => '[]'));
  await writeFile(file, JSON.stringify([...previous.filter(p => !results.some(n => n.id === p.id)), ...results], null, 2) + '\n');
}
