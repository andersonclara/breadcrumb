import { load } from 'cheerio';
import { XMLParser } from 'fast-xml-parser';
import ICAL from 'ical.js';

export const clean = value => typeof value === 'string' ? load(value).text().replace(/\s+/g, ' ').trim() : value;
const array = value => value == null ? [] : Array.isArray(value) ? value : [value];
const text = value => typeof value === 'object' && value ? value['#text'] ?? value.name ?? null : value ?? null;

export function parseIcal(body) {
  if (!body.trimStart().startsWith('BEGIN:VCALENDAR')) throw new Error('NOT_ICALENDAR');
  const calendar = new ICAL.Component(ICAL.parse(body));
  for (const zone of calendar.getAllSubcomponents('vtimezone')) ICAL.TimezoneService.register(new ICAL.Timezone(zone));
  return calendar.getAllSubcomponents('vevent').map(component => {
    const event = new ICAL.Event(component);
    const start = event.startDate;
    const end = event.endDate;
    return {
      name: event.summary, description: event.description,
      start: start?.toString(), end: end?.toString(), timezone: start?.zone?.tzid,
      allDay: start?.isDate, location: event.location,
      url: text(component.getFirstPropertyValue('url')),
      category: component.getAllProperties('categories').flatMap(p => p.getValues()),
      organizer: component.hasProperty('organizer') ? '[present; contact omitted]' : null,
      recurrence: component.hasProperty('rrule'),
      price: null,
    };
  });
}

export function parseRss(body) {
  const xml = new XMLParser({ ignoreAttributes: false }).parse(body);
  const items = xml.rss?.channel?.item ?? xml.feed?.entry;
  if (items == null && !xml.rss && !xml.feed) throw new Error('NOT_RSS_OR_ATOM');
  return array(items).map(item => ({
    name: text(item.title), url: typeof item.link === 'object' ? array(item.link).find(l => l['@_rel'] === 'alternate')?.['@_href'] ?? array(item.link)[0]?.['@_href'] : item.link,
    description: text(item.description ?? item.summary ?? item.content),
    publishedAt: item.pubDate ?? item.published ?? item.updated,
    start: item['libcal:date'] && item['libcal:start'] ? `${item['libcal:date']}T${item['libcal:start']}` : text(item.start ?? item['event:startdate'] ?? item['ev:startdate'] ?? item['ev:startDate']),
    end: item['libcal:date'] && item['libcal:end'] ? `${item['libcal:date']}T${item['libcal:end']}` : text(item.end ?? item['event:enddate'] ?? item['ev:enddate'] ?? item['ev:endDate']),
    timezone: item['libcal:date'] ? 'Local clock; RSS omits timezone. Calendar UI says Eastern Time - US & Canada.' : undefined,
    location: text(item['libcal:location'] ?? item.location ?? item['event:location'] ?? item['ev:location']),
    organizer: item.host ? '[public host field present; value omitted]' : null,
    category: array(item.category).map(text),
  }));
}

function normalizeEvent(e) {
  const location = e.location ?? e.venue ?? e._embedded?.venues?.[0];
  const categories = e.categories ?? e.event_types ?? e.tags ?? e.classifications;
  return {
    name: clean(e.title ?? e.name?.text ?? e.name), description: e.description?.text ?? e.description ?? e.summary ?? e.info,
    start: e.startDate ?? e.date_iso ?? (e.utc_start_date ? e.utc_start_date.replace(' ', 'T') + 'Z' : null) ?? e.start_date ?? e.startsOn ?? e.start?.utc ?? (typeof e.start === 'string' ? e.start : null) ?? e.dates?.start?.dateTime ?? e.dates?.start?.localDate,
    end: e.endDate ?? e.date2_iso ?? (e.utc_end_date ? e.utc_end_date.replace(' ', 'T') + 'Z' : null) ?? e.end_date ?? e.endsOn ?? e.end?.utc ?? (typeof e.end === 'string' ? e.end : null),
    timezone: e.timezone ?? e.timezone_name ?? e.dates?.timezone,
    location: typeof location === 'string' ? clean(location) : location?.name ?? location?.title ?? location?.venue,
    latitude: e.location_latitude || location?.geo?.latitude || location?.location?.latitude || location?.geo_lat,
    longitude: e.location_longitude || location?.geo?.longitude || location?.location?.longitude || location?.geo_lng,
    organizer: e.organizationName ?? e.organization?.name ?? e.group_title ?? e.organizer?.name ?? array(e.organizer).map(o => o.organizer).filter(Boolean).join(', '),
    price: e.cost ?? e.price ?? e.offers?.price ?? (e.priceRanges ? e.priceRanges.map(p => `${p.min}-${p.max} ${p.currency}`).join('; ') : null),
    category: array(categories).map(c => typeof c === 'string' ? c : c.name ?? c.tag ?? c.slug ?? c.segment?.name).filter(Boolean).map(clean),
    url: e.url ?? e.permalink ?? e.link,
  };
}

export function parseJson(body) {
  const data = JSON.parse(body);
  const rows = Array.isArray(data) ? data : data.data ?? data.events ?? data.results ?? data.items ?? data.value ?? data._embedded?.events;
  if (!Array.isArray(rows)) throw new Error('NO_EVENT_ARRAY');
  return { records: rows.map(normalizeEvent), pagination: { meta: data.meta ?? null, total: data.totalItems ?? data.total ?? data.total_results ?? null, next: data.next_rest_url ?? data.links?.next ?? data._links?.next?.href ?? null, page: data.page ?? null, totalPages: data.total_pages ?? data.pagination?.page_count ?? null }, rawFieldNames: Object.keys(rows[0] ?? {}) };
}

export function parseJsonLd(body) {
  const $ = load(body);
  const rows = [];
  const walk = value => {
    if (!value || typeof value !== 'object') return;
    if (array(value['@type']).some(type => /Event$/.test(type))) rows.push(value);
    for (const child of Object.values(value)) Array.isArray(child) ? child.forEach(walk) : walk(child);
  };
  $('script[type="application/ld+json"]').each((_, e) => walk(JSON.parse($(e).text())));
  return rows.map(normalizeEvent);
}

export function summarize(records) {
  const fields = ['name', 'description', 'location', 'start', 'end', 'organizer', 'price', 'category', 'url', 'latitude', 'longitude'];
  const present = value => value !== undefined && value !== null && value !== '' && (!Array.isArray(value) || value.length > 0);
  const coverage = Object.fromEntries(fields.map(field => [field, records.filter(row => present(row[field])).length]));
  const dates = records.map(r => r.start).filter(Boolean);
  const valid = dates.filter(d => /^\d{4}-\d{2}-\d{2}$|(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})$/.test(d)).map(d => new Date(d)).filter(d => !Number.isNaN(d.getTime()));
  return {
    count: records.length, fieldCoverage: coverage,
    uniqueUrls: new Set(records.map(r => r.url).filter(Boolean)).size,
    sameStartAndEnd: records.filter(r => r.start && r.start === r.end).length,
    recurringRecords: records.filter(r => r.recurrence).length,
    missingFromEveryRecord: fields.filter(field => coverage[field] === 0),
    dateRange: valid.length ? { min: new Date(Math.min(...valid)).toISOString(), max: new Date(Math.max(...valid)).toISOString(), futureOrToday: valid.filter(d => d >= new Date(new Date().toISOString().slice(0, 10))).length, datesCompared: valid.length, note: 'Compared against current UTC day, not a live-now guarantee. Floating local times excluded; retain source timezone. RSS publication dates are not event times.' } : null,
    samples: records.slice(0, 2).map(({ name, start, end, timezone, location, url, category, price, recurrence, allDay, publishedAt, schedule }) => ({ name, start, end, timezone, location, url, category, price, recurrence, allDay, publishedAt, schedule })),
  };
}
