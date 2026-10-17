// Fixed, public, read-only endpoints discovered in publisher pages/assets.
import { get, metadata } from '../lib/http.mjs';
import { parseIcal, parseRss, parseJsonLd, summarize } from '../lib/parse.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { XMLParser } from 'fast-xml-parser';
const endpoints = {
  'wicse-public-ical': ['https://calendar.google.com/calendar/ical/291pbpr99guo0kl6md2g0nghk8%40group.calendar.google.com/public/basic.ics', 'ical'],
  'closure-polygon-metadata': ['https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Polygon_view/FeatureServer/0?f=pjson', 'arcgis-metadata'],
  'closure-detour-metadata': ['https://gis.ufl.edu/Hosting/rest/services/Hosted/Closure_Detour_view/FeatureServer/0?f=pjson', 'arcgis-metadata'],
  'careers-rss': ['https://careerhub.ufl.edu/events/feed/', 'rss'],
  'engineering-rss': ['https://www.eng.ufl.edu/undergraduate/news-events/events-calendar/feed/', 'rss'],
  'taps-rss': ['https://taps.ufl.edu/feed/', 'rss'],
  'gatorlan-jsonld': ['https://www.start.gg/tournament/gatorlan-fall-2026/details', 'jsonld'],
  'hq-gainesville': ['https://api.joinhq.app/v1/public/shows?when=upcoming&city=Gainesville&country=United+States&limit=3', 'hq-json'],
};
const selected = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const results = [];
for (const [id, [url, format]] of Object.entries(endpoints)) {
  if (selected.length && !selected.includes(id)) continue;
  const response = await get(url); const result = { id, format, authentication: 'none', ...metadata(response) };
  if (response.body) {
    try {
      if (format === 'hq-json') {
        const json = JSON.parse(response.body);
        if (!Array.isArray(json.data)) throw new Error('NO_SHOW_ARRAY');
        result.count = json.data.length; result.hasNext = json.pagination?.has_next;
        result.samples = json.data.slice(0, 2).map(r => ({ name: r.title, start: r.startTime, end: r.endTime, timezone: r.timezone, location: r.locationName, city: r.locationCity, country: r.locationCountry, url: r.webUrl }));
        result.usefulRecordsParsed = result.count > 0;
      } else if (format === 'arcgis-metadata') {
        const json = JSON.parse(response.body);
        if (json.error) result.apiError = { code: json.error.code, message: json.error.message };
        else Object.assign(result, { name: json.name, geometryType: json.geometryType, capabilities: json.capabilities, maxRecordCount: json.maxRecordCount, fields: json.fields?.map(f => ({ name: f.name, type: f.type, alias: f.alias })), copyrightText: json.copyrightText, paginationSupported: json.advancedQueryCapabilities?.supportsPagination });
      } else {
        const records = { ical: parseIcal, rss: parseRss, jsonld: parseJsonLd }[format](response.body);
        Object.assign(result, summarize(records));
        result.usefulRecordsParsed = records.length > 0;
        if (format === 'rss') {
          const xml = new XMLParser({ ignoreAttributes: false }).parse(response.body);
          const first = [xml.rss?.channel?.item].flat()[0];
          result.recordFieldNames = Object.keys(first ?? {});
          result.publicationDates = records.map(r => r.publishedAt).filter(Boolean).slice(0, 2);
        }
      }
    } catch (error) { result.parseError = error.message.slice(0, 120); }
  }
  results.push(result);
  console.log(JSON.stringify(process.argv.includes('--compact') ? { id, status: result.status, error: result.error ?? result.parseError ?? result.apiError, count: result.count, fields: result.fields?.map(f => f.name) } : result, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  const file = new URL('./evidence/probes.json', import.meta.url);
  const previous = JSON.parse(await readFile(file, 'utf8').catch(() => '[]'));
  await writeFile(file, JSON.stringify([...previous.filter(p => !results.some(n => n.id === p.id)), ...results], null, 2) + '\n');
}
