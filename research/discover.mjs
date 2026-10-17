import { load } from 'cheerio';
import { writeFile } from 'node:fs/promises';
import { get, metadata } from './lib/http.mjs';

export const sources = {
  gatorconnect: 'https://gatorconnect.ufl.edu/events',
  'uf-calendar': 'https://calendar.ufl.edu/',
  'student-engagement': 'https://studentengagement.ufl.edu/',
  gatornights: 'https://studentengagement.ufl.edu/gatornights/',
  recsports: 'https://recsports.ufl.edu/',
  'uf-arts': 'https://arts.ufl.edu/news-events/events/',
  'uf-performing-arts': 'https://performingarts.ufl.edu/events/',
  athletics: 'https://floridagators.com/',
  'uf-closures': 'https://campusclosures.ufl.edu/',
  'gainesville-city': 'https://www.gainesvillefl.gov/Events-directory',
  gainesvilleshows: 'https://www.gainesvilleshows.com/',
  gainesvilleevents: 'https://gainesvilleevents.com/',
  'visit-gainesville': 'https://www.visitgainesville.com/events/',
  heartwood: 'https://www.heartwoodsoundstage.com/events',
  highdive: 'https://highdivegainesville.com/',
  wooly: 'https://thewooly.co/',
  'bo-diddley': 'https://www.gainesvillefl.gov/Parks/Bo-Diddley-Plaza',
  'swamp-restaurant': 'https://www.swamprestaurant.com/',
  'uf-dining': 'https://dineoncampus.com/uf',
  'uf-alerts': 'https://ufalert.ufl.edu/',
  'florida-museum': 'https://www.floridamuseum.ufl.edu/calendar/',
  'harn-museum': 'https://harn.ufl.edu/events/',
  'uf-libraries': 'https://libcal.uflib.ufl.edu/',
  'santa-fe': 'https://www.sfcollege.edu/calendar/',
  'acm-uf': 'https://uf-acm.com/',
  swamphacks: 'https://swamphacks.com/',
  'uf-swe': 'https://uf.swe.org/',
  fest: 'https://thefestfl.com/schedule/',
  'gator-perks': 'https://worklife.hr.ufl.edu/gatorperks/food-restaurants/',
  gatorbites: 'https://www.gatorbites.io/how-it-works',
  rts: 'https://go-rts.com/',
};

const selected = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const output = [];
for (const [id, url] of Object.entries(sources)) {
  if (selected.length && !selected.includes(id)) continue;
  const response = await get(url);
  const item = { id, ...metadata(response) };
  if (response.body) {
    const $ = load(response.body);
    item.title = $('title').text().trim().slice(0, 160);
    item.feeds = [...new Set($('link[rel="alternate"], a[href]').toArray().map(el => $(el).attr('href')).filter(href => /rss|(?:[?&]|\/)ical(?:[=?&/]|$)|\.ics(?:\?|$)|\/feed(?:[/?]|$)|^webcal:|format=json/i.test(href)).map(href => new URL(href, response.url).href))].slice(0, 15);
    item.terms = [...new Set($('a[href]').toArray().filter(el => /\bterms\b|copyright|privacy|^legal$/i.test($(el).text().trim())).map(el => new URL($(el).attr('href'), response.url).href))].slice(0, 8);
    item.jsonLdTypes = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const walk = value => {
          if (!value || typeof value !== 'object') return;
          if (value['@type']) item.jsonLdTypes.push(value['@type']);
          Object.values(value).forEach(child => Array.isArray(child) ? child.forEach(walk) : walk(child));
        };
        walk(JSON.parse($(el).text()));
      } catch { item.jsonLdParseError = true; }
    });
    item.jsonLdTypes = [...new Set(item.jsonLdTypes.flat())];
    item.platformHints = ['livewhale', 'tribe-events', 'wp-json', 'engage', 'sidearm', 'libcal', '__NEXT_DATA__', 'squarespace', 'wix', 'eventbrite', 'ticketmaster'].filter(hint => response.body.toLowerCase().includes(hint.toLowerCase()));
  }
  output.push(item);
  console.log(JSON.stringify(item, null, 2));
}
if (process.argv.includes('--save')) {
  const { readFile } = await import('node:fs/promises');
  const path = new URL('./samples/discovery.json', import.meta.url);
  const previous = selected.length ? JSON.parse(await readFile(path, 'utf8').catch(() => '[]')) : [];
  const combined = [...previous.filter(item => !output.some(next => next.id === item.id)), ...output];
  await writeFile(path, JSON.stringify(combined, null, 2) + '\n');
}
