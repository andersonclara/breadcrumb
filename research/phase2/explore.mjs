// Bounded page discovery: no private feeds, people, contact forms or account data.
import { load } from 'cheerio';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { get, metadata } from '../lib/http.mjs';
const pages = {
  wicse: 'https://ufwicse.com/events',
  closures: 'https://campusclosures.ufl.edu/',
  'closures-list': 'https://campusclosures.ufl.edu/closures',
  'gator-market': 'https://union.ufl.edu/gatormarket/',
  'student-engagement': 'https://studentengagement.ufl.edu/',
  careers: 'https://careerhub.ufl.edu/events/',
  engineering: 'https://www.eng.ufl.edu/undergraduate/news-events/events/',
  robotics: 'https://mae.ufl.edu/students/organizations/gator-robotics/',
  taps: 'https://taps.ufl.edu/',
  'swe-events': 'https://uf.swe.org/',
  'glory-days': 'https://glorydayspresents.com/',
  heartwood: 'https://www.heartwoodsoundstage.com/shows',
  fest: 'https://thefestfl.com/schedule/',
  'city-library': 'https://www.aclib.us/events',
  'start-gg': 'https://www.start.gg/tournament/gatorlan-fall-2026/details',
};
const selected = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const results = [];
for (const [id, url] of Object.entries(pages)) {
  if (selected.length && !selected.includes(id)) continue;
  const response = await get(url);
  const result = { id, ...metadata(response) };
  if (response.body) {
    const $ = load(response.body);
    result.title = $('title').text().trim().slice(0, 120);
    result.feeds = [...new Set($('a[href],link[rel="alternate"]').toArray().map(e => $(e).attr('href')).filter(href => /\.ics|\/feed\b|rss|[?&]ical|calendar\/ical/.test(href)).map(href => new URL(href.replace(/^webcal:/, 'https:'), response.url).href))].slice(0, 12);
    result.publicEmbeds = $('iframe[src]').toArray().map(e => $(e).attr('src')).filter(src => /calendar|events|arcgis|map/i.test(src)).slice(0, 6);
    result.relevantLinks = $('a[href]').toArray().map(e => ({ text: $(e).text().replace(/\s+/g, ' ').trim().slice(0, 65), url: new URL($(e).attr('href'), response.url).href })).filter(link => /^https:/.test(link.url) && !/[?&](?:token|secret|key)=|private-/.test(link.url) && /event|calendar|alert|closure|schedule|special|deal|api|json|terms|copyright/i.test(link.url)).slice(0, 15);
    result.scripts = $('script[src]').toArray().map(e => $(e).attr('src')).filter(src => /main\.|runtime|calendar|event|opendate|bundle|app\./i.test(src)).slice(-6);
    result.jsonLdTypes = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const walk = v => { if (!v || typeof v !== 'object') return; if (v['@type']) result.jsonLdTypes.push(...[v['@type']].flat()); Object.values(v).forEach(c => Array.isArray(c) ? c.forEach(walk) : walk(c)); };
        walk(JSON.parse($(el).text()));
      } catch { result.jsonLdParseError = true; }
    });
    result.jsonLdTypes = [...new Set(result.jsonLdTypes)];
    // Terminal-only, source-specific selector aid; not included in evidence files.
    if (process.env.RESEARCH_SELECTOR) console.log(JSON.stringify({ id, markup: $(process.env.RESEARCH_SELECTOR).slice(0, 2).map((_, e) => $.html(e).slice(0, 2400)).get() }));
  }
  results.push(result);
  console.log(JSON.stringify(process.argv.includes('--compact') ? { id, status: result.status, error: result.error, title: result.title, feeds: result.feeds, embeds: result.publicEmbeds } : result, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  const file = new URL('./evidence/exploration.json', import.meta.url);
  const previous = JSON.parse(await readFile(file, 'utf8').catch(() => '[]'));
  await writeFile(file, JSON.stringify([...previous.filter(p => !results.some(n => n.id === p.id)), ...results], null, 2) + '\n');
}
