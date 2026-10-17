// Breadth-first public discovery. No Instagram scraping or raw page retention.
import { load } from 'cheerio';
import { get, metadata, safeUrl } from '../lib/http.mjs';
import { parseJsonLd, summarize } from '../lib/parse.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const pages = {
  'salty-dog': 'https://saltydogsaloon.com/',
  swamp: 'https://swamprestaurant.com/',
  jjs: 'https://www.jjstaverngnv.com/',
  wooly: 'https://www.thetopsecretevents.com/the-wooly',
  bull: 'https://www.thebull-gnv.com/',
  looseys: 'https://www.looseys.com/',
  'first-magnitude': 'https://www.fmbrewing.com/',
  'cypress-grove': 'https://www.cypressandgrove.com/calendar',
  blackadder: 'https://www.blackadderbrewing.com/',
  'swamp-head': 'https://swamphead.com/',
  'glory-days': 'https://glorydayspresents.com/',
  'top-tier': 'https://toptiermpe.com/',
  'g2-links': 'https://linktr.ee/G2_Ent',
};
const selected = process.argv.slice(2).filter(a => !a.startsWith('--'));
const results = [];
for (const [id, url] of Object.entries(pages)) {
  if (selected.length && !selected.includes(id)) continue;
  const r = await get(url); const result = { id, authentication: 'none', ...metadata(r) };
  if (r.body) {
    const $ = load(r.body); result.title = $('title').text().trim().slice(0, 120);
    const links = $('a[href],link[rel="alternate"]').toArray().map(e => ({ text: $(e).text().replace(/\s+/g, ' ').trim().slice(0, 60), href: $(e).attr('href') })).flatMap(l => {
      try { const href = new URL(l.href, r.url); return href.protocol === 'https:' ? [{ text: l.text, url: safeUrl(href.href) }] : []; } catch { return []; }
    });
    result.feeds = links.filter(l => /feed|\.ics|rss|ical|format=json/i.test(l.url)).slice(0, 6);
    result.eventLinks = links.filter(l => /event|calendar|special|happy|show|ticket|tixr|posh\.vip|dice\.fm|seetickets|prekindle|shotgun/i.test(l.url + ' ' + l.text)).filter((v, i, a) => a.findIndex(l => l.url === v.url) === i).slice(0, 12);
    result.socialLinks = [...new Set(links.filter(l => /instagram\.com|facebook\.com|linktr\.ee/i.test(l.url)).map(l => l.url))].slice(0, 6);
    result.embeds = $('iframe[src]').toArray().map(e => $(e).attr('src')).filter(src => /calendar|events|bandsintown|ticket|tockify/i.test(src)).slice(0, 4);
    result.imageLeads = $('img').toArray().map(e => ({ alt: $(e).attr('alt') ?? '', url: $(e).attr('data-src') ?? $(e).attr('src') })).filter(l => l.url && /event|flyer|poster|special|happy|trivia|music|2026|2025/i.test(l.alt + l.url)).slice(0, 6);
    try { Object.assign(result, summarize(parseJsonLd(r.body))); } catch (error) { result.parseError = error.message.slice(0, 100); }
    result.structuredEventsParsed = (result.count ?? 0) > 0;
  }
  results.push(result);
  console.log(JSON.stringify(process.argv.includes('--compact') ? { id, status: r.status, error: r.error, title: result.title, count: result.count, feeds: result.feeds, events: result.eventLinks, embeds: result.embeds, images: result.imageLeads?.slice(0, 1) } : result, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  const file = new URL('./evidence/discovery.json', import.meta.url);
  const previous = JSON.parse(await readFile(file, 'utf8').catch(() => '[]'));
  await writeFile(file, JSON.stringify([...previous.filter(p => !results.some(r => r.id === p.id)), ...results], null, 2) + '\n');
}
