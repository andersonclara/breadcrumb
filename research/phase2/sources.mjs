import { XMLParser } from 'fast-xml-parser';
import { get, metadata } from '../lib/http.mjs';
import { parseRss, parseJson, parseIcal, clean } from '../lib/parse.mjs';
import { parseHtml } from '../lib/html.mjs';
import { CAMPUS_ZONE, localDay, addDays } from './time.mjs';

const array = v => v == null ? [] : Array.isArray(v) ? v : [v];
const publicText = v => typeof v === 'string' ? clean(v) : typeof v?.['#text'] === 'string' ? clean(v['#text']) : '';
const names = v => array(v).map(p => typeof p === 'string' ? clean(p) : clean(p?.name ?? p?.title ?? p?.tag ?? '')).filter(Boolean);

function enrich(record, source, raw = {}) {
  let zone = record.timezone;
  let inferredZone = false;
  if (source === 'libraries' || source === 'gatornights' || source === 'student-engagement') { zone = CAMPUS_ZONE; inferredZone = true; }
  return { ...record, source, timezone: zone, inferredZone,
    allDay: record.allDay ?? Boolean(Number(raw.is_all_day ?? raw.all_day ?? 0)),
    cancelled: /cancelled|canceled/i.test(String(raw.status?.['#text'] ?? raw.status ?? '')) || Boolean(Number(raw.is_canceled ?? 0)),
    online: Boolean(Number(raw.is_online ?? raw.is_virtual ?? 0)) || /^(?:online|zoom|virtual|https?:)/i.test(record.location ?? ''),
    organizer: record.organizer && !record.organizer.startsWith('[public host') ? record.organizer : publicText(raw.host),
    tags: names(raw.tags), audiences: names(raw.event_types_audience ?? raw['libcal:audience']),
    lastModified: raw.last_modified ? new Date(Number(raw.last_modified) * 1000).toISOString() : null,
    registrationRequired: Boolean(Number(raw.has_registration ?? 0)) || raw['libcal:registrations'] === true,
    sourceEventId: raw.id ?? raw['libcal:eventid'] ?? null,
  };
}

export async function collect({ now = new Date(), maxPages = 6, onResult = () => {}, only = null } = {}) {
  const day = localDay(now); const endDay = addDays(day, 30);
  const records = []; const requests = []; const sources = [];
  async function request(source, url, parser) {
    const response = await get(url);
    const item = { source, ...metadata(response) };
    let parsed = [];
    if (response.body) {
      try { parsed = parser(response.body, item); item.count = parsed.length; } catch (error) { item.parseError = error.message.slice(0, 120); }
    }
    requests.push(item); onResult({ source, status: item.status, count: item.count, error: item.error ?? item.parseError, url: item.url });
    records.push(...parsed.map(r => ({ ...r, retrievedAt: item.startedAt })));
    return item;
  }
  const wanted = source => !only || only.includes(source);
  if (wanted('gatorconnect')) {
    await request('gatorconnect', 'https://gatorconnect.ufl.edu/events.rss', body => {
      const raw = array(new XMLParser({ ignoreAttributes: false }).parse(body).rss?.channel?.item);
      return parseRss(body).map((record, i) => enrich(record, 'gatorconnect', raw[i]));
    });
    sources.push({ source: 'gatorconnect', completeness: 'Publisher feed snapshot; no paging established' });
  }
  if (wanted('uf-calendar')) {
    let reportedPages; let reportedTotal; let pagesFetched = 0;
    for (let page = 1; page <= maxPages; page++) {
      const item = await request('uf-calendar', `https://calendar.ufl.edu/live/json/events/start_date/${day}/end_date/${endDay}/paginate/100?page=${page}`, (body, meta) => {
        const raw = JSON.parse(body); const parsed = parseJson(body);
        reportedPages = raw.total_pages; reportedTotal = raw.total_results;
        meta.pagination = parsed.pagination;
        return parsed.records.map((r, i) => enrich(r, 'uf-calendar', raw.results[i]));
      });
      if (item.status !== 200 || item.parseError) break;
      pagesFetched++;
      if (page >= reportedPages || item.count === 0) break;
    }
    sources.push({ source: 'uf-calendar', requestedWindow: { day, endDay }, pagesFetched, reportedPages, reportedTotal, capReached: pagesFetched === maxPages && reportedPages > maxPages, completeForReportedPages: pagesFetched === reportedPages });
  }
  if (wanted('libraries')) {
    await request('libraries', 'https://libcal.uflib.ufl.edu/rss.php?iid=6&m=month&cid=22582', body => {
      const raw = array(new XMLParser({ ignoreAttributes: false }).parse(body).rss?.channel?.item);
      return parseRss(body).map((record, i) => enrich(record, 'libraries', raw[i]));
    });
    sources.push({ source: 'libraries', completeness: 'Advertised monthly RSS, no paging established' });
  }
  if (wanted('gatornights')) {
    await request('gatornights', 'https://studentengagement.ufl.edu/gatornights/', body => parseHtml(body, 'gatornights', 'https://studentengagement.ufl.edu/gatornights/').map(r => enrich(r, 'gatornights')));
    sources.push({ source: 'gatornights', completeness: 'Seasonal cards, no paging' });
  }
  if (wanted('gainesvilleevents')) {
    await request('gainesvilleevents', 'https://gainesvilleevents.com/feed.ics', body => parseIcal(body).map(r => enrich(r, 'gainesvilleevents')));
    sources.push({ source: 'gainesvilleevents', completeness: 'Advertised iCal snapshot, original-source authorization not inferred' });
  }
  if (wanted('arts')) {
    const item = await request('arts', `https://arts.ufl.edu/wp-json/tribe/events/v1/events?per_page=50&start_date=${day}&end_date=${endDay}`, (body, meta) => {
      const raw = JSON.parse(body); const parsed = parseJson(body); meta.pagination = parsed.pagination;
      return parsed.records.map((r, i) => enrich(r, 'arts', raw.events[i]));
    });
    sources.push({ source: 'arts', completeness: item.pagination?.next ? 'First page; additional pages exist' : 'Returned window, no next page advertised', reportedTotal: item.pagination?.total });
  }
  return { now: now.toISOString(), localDay: day, horizonEndDay: endDay, records, requests, sources };
}

export function sourceStats(records, source) {
  const rows = records.filter(r => r.source === source);
  const fields = ['name', 'description', 'start', 'end', 'location', 'organizer', 'price', 'tags', 'category', 'audiences', 'lastModified'];
  return { source, count: rows.length, fieldCoverage: Object.fromEntries(fields.map(key => [key, rows.filter(r => r[key] != null && r[key] !== '' && (!Array.isArray(r[key]) || r[key].length)).length])), online: rows.filter(r => r.online).length, cancelled: rows.filter(r => r.cancelled).length, registrationRequired: rows.filter(r => r.registrationRequired).length };
}
