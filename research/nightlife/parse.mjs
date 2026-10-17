import { load } from 'cheerio';
import { clean } from '../lib/parse.mjs';
const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
export function dateLabel(value) {
  const match = value?.match(/\b([A-Za-z]+)\s+(\d{1,2}),?\s+(20\d{2})\b/);
  return match && months[match[1].toLowerCase().slice(0, 3)] ? `${match[3]}-${months[match[1].toLowerCase().slice(0, 3)]}-${match[2].padStart(2, '0')}` : null;
}
export function parseNightlife(body, kind, url) {
  const $ = load(body);
  if (kind === 'glory') {
    return $('.information').toArray().filter(e => $(e).find('h2.title').length).map(e => {
      const el = $(e);
      return { name: clean(el.find('h2.title').text()), start: dateLabel(clean(el.find('.date-time .date').text())), end: null,
        location: `${clean(el.find('.location .venue').text())}, ${clean(el.find('.location .address').text())}`,
        city: el.find('[data-city]').attr('data-city'), organizer: clean(el.find('.before-title').text()),
        schedule: clean(el.find('.show-time').text()), url: el.find('a.ticket-button').attr('href') ?? url,
        timezone: 'America/New_York (inferred for Gainesville only)', description: null, price: null };
    });
  }
  if (kind === 'magnitude-detail') {
    const startDay = $('time.event-date').attr('datetime');
    const startTime = clean($('.event-time-localized-start').text());
    const endTime = clean($('.event-time-localized-end').text());
    return [{ name: clean($('h1.eventitem-title,h1.entry-title,h1').first().text()), start: startDay ?? null, end: null,
      schedule: `${startTime} - ${endTime}`, timezone: 'America/New_York (inferred from venue)',
      location: 'First Magnitude Brewing Co., Gainesville (publisher venue context)', url,
      description: clean($('.eventitem-column-content').text()), price: null }];
  }
  if (kind === 'magnitude-home') {
    return $('.summary-item').toArray().map(e => {
      const el = $(e); const link = el.find('.summary-title-link').first(); const href = link.attr('href');
      if (!href) return null;
      const date = dateLabel(clean(el.find('.summary-metadata-item--date').first().text()));
      return { name: clean(link.text()), start: date, end: null, schedule: clean(el.find('.event-time-12hr').first().text()),
        location: 'First Magnitude Brewing Co., Gainesville (publisher venue context)', url: new URL(href, url).href,
        category: href.includes('food-truck-cal') ? ['Food truck'] : ['Venue event'], description: clean(el.find('.summary-excerpt').text()) };
    }).filter(Boolean);
  }
  if (kind === 'looseys-detail') {
    const description = clean($('.mec-single-event-description').text());
    return [{ name: clean($('.mec-single-title').text()), start: dateLabel(clean($('.mec-start-date-label').first().text())), end: null,
      schedule: clean($('.mec-single-event-time abbr').text()),
      location: clean($('.mec-single-event-location .mec-events-address').text()),
      price: /\bfree\b/i.test(description ?? '') ? 'Free (description; verify conditions)' : null,
      description, url, timezone: 'America/New_York (inferred from venue)' }];
  }
  if (kind === 'salty-weekly') {
    const isDay = text => /^(Sunday|Monday|Tuesday|Wednesday|Thursday|Friday|Saturday)$/i.test(text ?? '');
    const headings = $('p').toArray().filter(e => isDay(clean($(e).text())));
    const seen = new Set();
    return headings.flatMap(e => {
      const day = clean($(e).text()); if (seen.has(day.toLowerCase())) return []; seen.add(day.toLowerCase());
      // Days share one widget: collect siblings only up to the next day heading.
      const parts = [];
      for (const sibling of $(e).nextAll('p').toArray()) {
        const value = clean($(sibling).text()); if (isDay(value)) break; parts.push(value);
      }
      const text = parts.join(' ');
      const windows = [...text.matchAll(/\b\d{1,2}\s*(?:am|pm)\s*[-–]\s*\d{1,2}\s*(?:am|pm)/gi)].map(m => m[0]);
      return [{ name: `${day} published special`, start: null, end: null, location: 'Salty Dog Saloon, Gainesville (publisher context)', url,
        schedule: day + (windows.length ? `; ${windows.join(' / ')}` : /open to close/i.test(text) ? '; open to close' : ''),
        price: null, monetaryTokens: text.match(/\$\d+(?:\.\d{2})?/g)?.slice(0, 2) ?? [],
        description: text, offerFact: text.slice(0, 64), recurring: true,
        lastConfirmedForSpecificDate: null }];
    });
  }
  if (kind === 'google-embed') {
    const sources = $('iframe[src]').toArray().map(e => $(e).attr('src')).filter(src => /calendar.google.com/.test(src));
    return sources.map(() => ({ name: 'Publisher-embedded public Google Calendar', location: 'Venue website context', url, start: null, end: null, schedule: null }));
  }
  throw new Error('UNKNOWN_NIGHTLIFE_PARSER');
}
