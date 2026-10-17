// Additional read-only context, not event ingestion or an emergency alert system.
import { get, metadata } from '../lib/http.mjs';
import { parseJson, summarize } from '../lib/parse.mjs';
import { localDay, addDays } from './time.mjs';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
const results = [];
const evidence = JSON.parse(await readFile(new URL('./evidence/coverage.json', import.meta.url), 'utf8'));
const anchor = evidence.reitzAnchor;
if (!anchor) throw new Error('Run coverage.mjs --save first to establish a publisher-derived campus anchor.');
const point = `${anchor.latitude.toFixed(4)},${anchor.longitude.toFixed(4)}`;
async function request(id, url, parse) {
  const response = await get(url); const result = { id, authentication: 'none', ...metadata(response) };
  if (response.body) {
    try { Object.assign(result, parse(JSON.parse(response.body))); }
    catch (error) { result.parseError = error.message.slice(0, 120); }
  }
  results.push(result); console.log(JSON.stringify(result, null, 2));
  return result;
}
const points = await request('nws-point', `https://api.weather.gov/points/${point}`, data => ({
  gridId: data.properties?.gridId, timezone: data.properties?.timeZone,
  forecastUrl: data.properties?.forecast, hourlyForecastUrl: data.properties?.forecastHourly,
  coordinateSource: anchor.method, count: data.properties?.forecast ? 1 : 0,
}));
// Follow only NWS-advertised same-origin forecast URL. Do not invent grid identifiers.
if (points.forecastUrl && new URL(points.forecastUrl).origin === 'https://api.weather.gov') {
  await request('nws-forecast', points.forecastUrl, data => ({
    updated: data.properties?.updated, generatedAt: data.properties?.generatedAt,
    count: data.properties?.periods?.length ?? 0,
    samples: (data.properties?.periods ?? []).slice(0, 2).map(p => ({
      name: p.name, start: p.startTime, end: p.endTime, temperature: p.temperature,
      temperatureUnit: p.temperatureUnit, probabilityOfPrecipitation: p.probabilityOfPrecipitation?.value,
      windSpeed: p.windSpeed, shortForecast: p.shortForecast,
    })),
  }));
}
await request('nws-active-alerts', `https://api.weather.gov/alerts/active?point=${point}`, data => ({
  updated: data.updated, count: data.features?.length ?? 0,
  samples: (data.features ?? []).slice(0, 2).map(f => ({
    name: f.properties.event, headline: f.properties.headline, onset: f.properties.onset,
    expires: f.properties.expires, severity: f.properties.severity, status: f.properties.status,
  })),
  limitation: 'Zero alerts is not a safety guarantee. Delivery and completeness are not guaranteed; do not replace official warning channels.',
}));
const day = localDay(new Date());
await request('uf-calendar-server-search', `https://calendar.ufl.edu/live/json/events/search/gaming/start_date/${day}/end_date/${addDays(day, 30)}/paginate/5?page=1`, data => ({
  ...summarize(parseJson(JSON.stringify(data)).records),
  pagination: { page: data.page, totalPages: data.total_pages, totalResults: data.total_results },
  limitation: 'Publisher search semantics are not validated interest classification; compare with local multi-source matching.',
}));
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  await writeFile(new URL('./evidence/context.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
}
