// Follow only bounded, advertised public detail/export links; no full-site crawl.
import { load } from 'cheerio';
import { get, metadata } from '../lib/http.mjs';
import { parseRss, parseIcal, parseJson, summarize } from '../lib/parse.mjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { localDay } from './time.mjs';
const results = [];
if (!process.argv.includes('--uf-only')) {
const feed = await get('https://www.eng.ufl.edu/undergraduate/news-events/events-calendar/feed/');
const discovered = { id: 'engineering-feed-detail-discovery', ...metadata(feed) };
if (feed.body) {
  const links = parseRss(feed.body).slice(0, 2).map(r => r.url);
  for (const url of links) {
    const page = await get(url); const result = { id: 'engineering-advertised-detail-ical', detailPage: metadata(page) };
    if (page.body) {
      const $ = load(page.body);
      const href = $('a[href]').toArray().map(e => $(e).attr('href')).find(href => /\/ical\/$/.test(href));
      if (href) {
        const exportUrl = new URL(href, page.url).href;
        if (new URL(exportUrl).origin !== new URL(url).origin) { result.error = 'CROSS_ORIGIN_EXPORT_SKIPPED'; continue; }
        const response = await get(exportUrl); result.exportRequest = metadata(response);
        if (response.body) {
          try { Object.assign(result, summarize(parseIcal(response.body))); } catch (error) { result.parseError = error.message.slice(0, 120); }
        }
      } else result.error = 'NO_ADVERTISED_ICAL';
    }
    results.push(result); console.log(JSON.stringify(result, null, 2));
  }
}
results.push(discovered);
}
// These individual-event API forms are documented by LiveWhale; selected public IDs.
for (const id of ['58461', '57873']) {
  const response = await get(`https://calendar.ufl.edu/live/events/${id}@JSON`);
  const result = { id: 'uf-calendar-individual-json', ...metadata(response) };
  if (response.body) {
    try {
      const data = JSON.parse(response.body);
      const record = data.data ?? data;
      const rows = Array.isArray(record) ? record : [record];
      const normalized = parseJson(JSON.stringify(rows)).records;
      const timestamp = value => Number.isFinite(Number(value)) && Number(value) >= 1e9 && Number(value) < 4102444800 ? new Date(Number(value) * 1000).toISOString() : null;
      normalized.forEach((event, index) => {
        const raw = rows[index]; const start = timestamp(raw.date_ts); const end = timestamp(raw.date2_ts);
        event.allDay = Boolean(Number(raw.is_all_day ?? 0));
        event.start = event.allDay && start ? localDay(start, raw.timezone) : start;
        event.end = event.allDay && end ? localDay(end, raw.timezone) : end;
      });
      Object.assign(result, summarize(normalized));
      result.temporalMapping = 'Individual-event schema uses date_ts/date2_ts Unix seconds; date-only for is_all_day. List schema uses date_iso/date2_iso. No RSS publication-date inference.';
      result.responseFields = Object.keys(record);
    } catch (error) { result.parseError = error.message.slice(0, 120); }
  }
  results.push(result); console.log(JSON.stringify(result, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  const { readFile } = await import('node:fs/promises');
  const file = new URL('./evidence/details.json', import.meta.url);
  const previous = JSON.parse(await readFile(file, 'utf8').catch(() => '[]'));
  await writeFile(file, JSON.stringify([...previous.filter(p => !results.some(r => r.id === p.id)), ...results], null, 2) + '\n');
}
