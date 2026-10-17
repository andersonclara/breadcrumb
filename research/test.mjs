import { writeFile } from 'node:fs/promises';
import { get, metadata } from './lib/http.mjs';
import { parseIcal, parseRss, parseJson, parseJsonLd, summarize } from './lib/parse.mjs';
import { parseHtml } from './lib/html.mjs';

export const experiments = {
  'gatorconnect-rss': ['https://gatorconnect.ufl.edu/events.rss', 'rss'],
  'gatorconnect-ical': ['https://gatorconnect.ufl.edu/events.ics', 'ical'],
  'uf-calendar-json': ['https://calendar.ufl.edu/live/json/events', 'json'],
  'uf-calendar-ical': ['https://calendar.ufl.edu/live/ical/events', 'ical'],
  'uf-calendar-rss': ['https://calendar.ufl.edu/live/rss/events', 'rss'],
  'uf-calendar-page': ['https://calendar.ufl.edu/live/json/events/paginate/5?page=1', 'json'],
  'student-engagement-rss': ['https://studentengagement.ufl.edu/feed/', 'rss'],
  'uf-performing-arts-ical': ['https://performingarts.ufl.edu/?ec3_ical', 'ical'],
  'gainesvilleevents-ical': ['https://gainesvilleevents.com/feed.ics', 'ical'],
  'visit-gainesville-json': ['https://www.visitgainesville.com/wp-json/tribe/events/v1/events?per_page=5', 'json'],
  'florida-museum-ical': ['https://www.floridamuseum.ufl.edu/calendar/list/?ical=1', 'ical'],
  'florida-museum-jsonld': ['https://www.floridamuseum.ufl.edu/calendar/', 'jsonld'],
  'harn-ical': ['https://harn.ufl.edu/calendar/?ical=1', 'ical'],
  'uf-alerts-rss': ['https://ufalert.ufl.edu/feed/', 'rss'],
  'uf-arts-json': ['https://arts.ufl.edu/wp-json/tribe/events/v1/events?per_page=5', 'json'],
  'harn-jsonld': ['https://harn.ufl.edu/calendar/', 'jsonld'],
  'gatornights-html': ['https://studentengagement.ufl.edu/gatornights/', 'gatornights'],
  'gainesville-city-html': ['https://www.gainesvillefl.gov/Events-directory', 'city'],
  'bo-diddley-html': ['https://www.gainesvillefl.gov/Venues/Bo-Diddley-Plaza', 'city'],
  'gainesvilleshows-html': ['https://www.gainesvilleshows.com/upcoming', 'shows'],
  'heartwood-archive-html': ['https://www.heartwoodsoundstage.com/shows', 'heartwood-archive'],
  'swamp-venue-jsonld': ['https://www.swamprestaurant.com/', 'swamp-venue'],
  'uf-libraries-rss': ['https://libcal.uflib.ufl.edu/rss.php?iid=6&m=month&cid=22582', 'rss'],
  'salty-dog-specials': ['https://saltydogsaloon.com/', 'salty-specials'],
  'uf-libraries-event-jsonld': ['https://libcal.uflib.ufl.edu/event/17620515', 'jsonld'],
  'uf-swe-rss': ['https://uf.swe.org/feed/', 'rss'],
};

const selected = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
if (!selected.length) {
  console.log('Usage: node research/test.mjs <experiment|all> [--save]');
  console.log(Object.keys(experiments).join('\n'));
  process.exit(0);
}
for (const id of selected.includes('all') ? Object.keys(experiments) : selected) {
  if (!experiments[id]) { console.error(`Unknown experiment: ${id}`); process.exitCode = 1; continue; }
  const [url, format] = experiments[id];
  const response = await get(url);
  const result = { id, format, authentication: 'none', ...metadata(response) };
  if (response.body) {
    try {
      let records;
      if (format === 'json') {
        const parsed = parseJson(response.body);
        records = parsed.records;
        result.pagination = parsed.pagination;
        result.rawFieldNames = parsed.rawFieldNames;
      } else if (['ical', 'rss', 'jsonld'].includes(format)) {
        records = { ical: parseIcal, rss: parseRss, jsonld: parseJsonLd }[format](response.body);
      } else records = parseHtml(response.body, format, response.url);
      Object.assign(result, summarize(records));
      result.usefulRecordsParsed = records.length > 0;
    } catch (error) {
      result.parseError = error.message.slice(0, 160);
      result.usefulRecordsParsed = false;
      process.exitCode = 1;
    }
  } else { result.usefulRecordsParsed = false; process.exitCode = 1; }
  console.log(JSON.stringify(process.argv.includes('--compact') ? { id, status: result.status, error: result.error ?? result.parseError, count: result.count, usefulRecordsParsed: result.usefulRecordsParsed } : result, null, 2));
  if (process.argv.includes('--save')) await writeFile(new URL(`./samples/${id}.json`, import.meta.url), JSON.stringify(result, null, 2) + '\n');
}
