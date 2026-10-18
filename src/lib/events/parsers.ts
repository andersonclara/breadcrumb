import {load} from 'cheerio';
import {XMLParser} from 'fast-xml-parser';
import ICAL from 'ical.js';
import {fingerprint, publicUrl, text, type EventInput} from './model.ts';
import type {Source} from './sources.ts';

type Row = Record<string, unknown>;
const row = (v: unknown): Row => v && typeof v === 'object' ? v as Row : {};
const list = (v: unknown): unknown[] => v == null ? [] : Array.isArray(v) ? v : [v];
const string = (v: unknown): string => typeof v === 'string' || typeof v === 'number' ? String(v) : '';
const xmlString = (v:unknown) => string(row(v)['#text'] ?? v);
const names = (v: unknown) => list(v).map(t => text(typeof t === 'string' ? t : row(t).name ?? row(t).tag,80)).filter(Boolean);
const flag = (v: unknown) => v === true || v === 1 || v === '1';
export type Parsed = {events: EventInput[]; hasNext: boolean};

function jsonEvent(e: Row, source: Source): EventInput {
  const loc = row(e.location ?? e.venue);
  const url = publicUrl(e.url ?? e.permalink ?? e.link, source.url) ?? '';
  const baseId = string(e.id) || url || fingerprint([e.title,e.startDate,e.start_date]);
  // LiveWhale reuses one event ID across explicitly expanded daily/session rows.
  const id = source.format==='livewhale' ? `${baseId}:${fingerprint(e.date_iso).slice(0,16)}` : baseId;
  return {
    id, title:text(e.title ?? e.name,180), url,description:text(e.description ?? e.summary,8000),
    start:string(e.date_iso ?? e.startDate ?? (e.utc_start_date ? `${string(e.utc_start_date).replace(' ','T')}Z` : e.start_date)) || null,
    end:string(e.date2_iso ?? e.endDate ?? (e.utc_end_date ? `${string(e.utc_end_date).replace(' ','T')}Z` : e.end_date)) || null,
    timezone:string(e.timezone ?? e.timezone_name) || source.timezone,
    allDay:flag(e.is_all_day ?? e.all_day), cancelled:flag(e.is_canceled) || /cancel/i.test(string(e.status ?? e.eventStatus)),
    venue:text(typeof e.location === 'string' ? e.location : loc.name ?? loc.venue ?? e.location_title,280),
    organizer:text(e.group_title ?? row(e.organizer).name,180), price:text(e.cost ?? e.price ?? row(e.offers).price,160),
    tags:names(e.tags ?? e.categories ?? e.event_types), issues:source.review ? [source.review] : [],
  };
}

export function parseFeed(body: string, source: Source): Parsed {
  if (source.format === 'livewhale' || source.format === 'tribe') {
    const data: unknown = JSON.parse(body); const root = row(data);
    const rows = Array.isArray(data) ? data : root.results ?? root.events ?? root.data;
    if (!Array.isArray(rows)) throw new Error('unexpected_json_schema');
    return {events:rows.map(e => jsonEvent(row(e),source)), hasNext:Boolean(root.next_rest_url) || Number(root.page ?? 1) < Number(root.total_pages ?? 1)};
  }
  if (source.format === 'rss') {
    const xml = new XMLParser({ignoreAttributes:false,processEntities:false}).parse(body);
    if (!xml.rss?.channel) throw new Error('unexpected_rss_schema');
    const events = list(xml.rss.channel.item).map(item => {
      const e = row(item); const url = publicUrl(e.link,source.url) ?? '';
      const libDate = string(e['libcal:date']);
      return {
        id:string(row(e.guid)['#text'] ?? e.guid ?? e['libcal:eventid']) || url || fingerprint([e.title,e.start]),
        title:text(e.title,180),url,description:text(xmlString(e.description),8000),
        start:libDate && e['libcal:start'] ? `${libDate}T${e['libcal:start']}` : xmlString(e.start ?? e['event:startdate'] ?? e['ev:startdate'] ?? e['ev:startDate']),
        end:libDate && e['libcal:end'] ? `${libDate}T${e['libcal:end']}` : xmlString(e.end ?? e['event:enddate'] ?? e['ev:enddate'] ?? e['ev:endDate']),
        timezone:source.timezone,venue:text(xmlString(e['libcal:location'] ?? e.location ?? e['event:location'] ?? e['ev:location']),280),
        organizer:text(xmlString(e.host),180),tags:list(e.category).map(c=>text(xmlString(c),80)).filter(Boolean),
        cancelled:/cancel/i.test(xmlString(e.status)),
      } satisfies EventInput;
    });
    return {events,hasNext:false};
  }
  if (source.format === 'ical') {
    if (!body.trimStart().startsWith('BEGIN:VCALENDAR')) throw new Error('unexpected_ical_schema');
    const calendar = new ICAL.Component(ICAL.parse(body));
    const events = calendar.getAllSubcomponents('vevent').map(c => {
      const e = new ICAL.Event(c);
      return {
        id:`${e.uid}:${e.startDate?.toString()}`,title:text(e.summary,180),description:text(e.description,8000),url:publicUrl(c.getFirstPropertyValue('url'),source.url) ?? source.url,
        start:e.startDate?.toString(),end:e.endDate?.toString(),timezone:e.startDate?.zone?.tzid === 'floating' ? source.timezone : e.startDate?.zone?.tzid,
        allDay:e.startDate?.isDate,recurring:c.hasProperty('rrule'),cancelled:c.getFirstPropertyValue('status') === 'CANCELLED',
        venue:text(e.location,280),tags:c.getAllProperties('categories').flatMap(p => p.getValues().map(v => text(v,80))),
        issues:source.review ? [source.review] : [],
      } satisfies EventInput;
    });
    return {events,hasNext:false};
  }
  const $ = load(body);
  if (source.format === 'jsonld') {
    const events: EventInput[] = [];
    const walk = (v:unknown) => {
      if (!v || typeof v !== 'object') return;
      const e = row(v);
      if (list(e['@type']).some(t => typeof t === 'string' && /Event$/.test(t))) events.push(jsonEvent(e,source));
      for (const child of Object.values(e)) if (Array.isArray(child)) child.forEach(walk); else if (child && typeof child === 'object') walk(child);
    };
    $('script[type="application/ld+json"]').each((_,el) => { walk(JSON.parse($(el).text())); });
    return {events,hasNext:false};
  }
  const months: Record<string,string> = {jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12'};
  if (source.format === 'gatornights') {
    const year = $('h2').toArray().map(el => $(el).text()).find(t => /\d{4} GatorNights Events/.test(t))?.match(/\d{4}/)?.[0];
    if (!year) throw new Error('season_year_missing');
    const events: EventInput[] = [];
    $('.inner-txt').each((_,el) => {
      const e = $(el); const title = text(e.find('h3').text(),180);
      const date = e.find('.date').text().match(/(\w+)\s+(\d+)/);
      if (!title || !date) return;
      const month = months[date[1].slice(0,3).toLowerCase()]; if (!month) return;
      const day = `${year}-${month}-${date[2].padStart(2,'0')}`;
      const time = e.find('.time').text().match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
      const hour = time ? +time[1] % 12 + (/pm/i.test(time[3]) ? 12 : 0) : null;
      const start = time ? `${day}T${String(hour).padStart(2,'0')}:${time[2] ?? '00'}:00` : day;
      const sub = text(e.find('.event-subtext').text(),280);
      events.push({id:fingerprint([title,day]),title,url:source.url,start,timezone:source.timezone,venue:sub.split('|')[0].trim()});
    });
    return {events,hasNext:false};
  }
  if (source.format === 'city') {
    const events = $('.list-item-block-date').toArray().map(el => {
      const a = $(el).closest('a'); const d = a.find('.list-item-block-date');
      const year = d.find('.part-year').text().trim(); const month = months[d.find('.part-month').text().trim().slice(0,3).toLowerCase()];
      const day = d.find('.part-date').text().trim().padStart(2,'0'); const url = publicUrl(a.attr('href'),source.url) ?? '';
      return {id:url,title:text(a.find('h3,h2,.list-item-name').first().text(),180),url,start:year && month ? `${year}-${month}-${day}` : null,
        timezone:source.timezone,allDay:true,venue:text(a.find('.list-item-address').text(),280)};
    }).filter(e => e.title);
    return {events,hasNext:false};
  }
  const events = $('article.Event').toArray().map(el => {
    const e = $(el); const link = e.find('a[href^="/event/"]').first();
    const url = publicUrl(link.attr('href'),source.url) ?? '';
    const artists = e.find('a[attribute="artist"],a[href^="/artist/"]').toArray().map(a => text($(a).text(),100));
    return {id:url,title:text(artists.length ? [...new Set(artists)].join(', ') : link.text(),180),url,
      start:e.attr('data-event-date') ?? link.attr('href')?.match(/\d{4}-\d{2}-\d{2}/)?.[0],allDay:true,timezone:source.timezone,
      venue:text(e.find('a[attribute="venue"],a[href^="/venue/"]').first().text(),280)};
  }).filter(e => e.title);
  return {events,hasNext:false};
}
