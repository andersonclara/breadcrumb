import { load } from 'cheerio';
import { get, metadata } from '../lib/http.mjs';
import { clean, summarize, parseIcal, parseJsonLd } from '../lib/parse.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
const endpoints = {
  'student-engagement-cards': ['https://studentengagement.ufl.edu/', 'season'],
  'gator-market-dates': ['https://union.ufl.edu/gatormarket/', 'market'],
  'careers-cards': ['https://careerhub.ufl.edu/events/', 'careers'],
  'careers-page2': ['https://careerhub.ufl.edu/events/page/2/', 'careers'],
  'heartwood-live-cards': ['https://www.heartwoodsoundstage.com/shows', 'heartwood'],
  'heartwood-detail': ['https://www.heartwoodsoundstage.com/shows/butcher-babies-17-oct', 'heartwood-detail'],
  'engineering-current-calendar': ['https://www.eng.ufl.edu/undergraduate/news-events/events-calendar/', 'engineering'],
  'engineering-robotics-ical': ['https://www.eng.ufl.edu/undergraduate/news-events/events/gator-robotics-gbm-5/ical/', 'ical'],
};
function dateFromText(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function parse(body, format, url) {
  if (format === 'ical') return parseIcal(body);
  const $ = load(body);
  if (format === 'season') {
    const year = $('h2').text().match(/Upcoming[^\d]*(\d{4}) Events/)?.[1];
    if (!year) throw new Error('SEASON_YEAR_NOT_FOUND');
    return $('.inner-txt').toArray().filter(e => $(e).find('h3,.date').length >= 2).map(e => {
      const el = $(e); const dateText = clean(el.find('.date').text()); const timeText = clean(el.find('.time').text());
      const date = dateText.match(/^([A-Za-z]+)\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?$/);
      const month = months[date?.[1]?.toLowerCase().slice(0, 3)];
      const day = month && date ? `${year}-${month}-${date[2].padStart(2, '0')}` : null;
      const subtext = clean(el.find('.event-subtext').text());
      return { name: el.find('h3').text().trim(), start: day, location: subtext.includes('|') ? subtext.split('|')[0].trim() : null, description: subtext, url, schedule: `${dateText}; ${timeText}`, multiDay: Boolean(date?.[3]) };
    });
  }
  if (format === 'market') {
    const text = $('main').length ? $('main').text() : $('body').text();
    const section = text.match(/Fall\s+(\d{4}) Market Dates:([\s\S]{0,500}?)Time:/i);
    if (!section) throw new Error('FALL_MARKET_DATES_NOT_FOUND');
    return [...section[2].matchAll(/Wednesday,\s+([A-Za-z]+)\s+(\d{1,2})/g)].map(match => ({ name: 'Gator Market', start: `${section[1]}-${months[match[1].toLowerCase().slice(0, 3)]}-${match[2].padStart(2, '0')}`, location: 'Reitz Union North Lawn', url, schedule: text.match(/Time:\s*([\s\S]{0,70}?)Location:/i)?.[1]?.replace(/\s+/g, ' ').trim() }));
  }
  if (format === 'careers') {
    return $('.event_item').toArray().map(e => {
      const el = $(e); const dateText = clean(el.find('.event-date').text());
      const startText = dateText.split(' - ')[0]; const link = el.find('a[href]').first().attr('href');
      return { name: clean(el.find('h3').text()).replace(/^Event:\s*/, ''), start: dateFromText(startText), end: dateText.includes(' - ') ? dateFromText(dateText.split(' - ')[1]) : null, location: clean(el.find('.event-location').text()), schedule: clean(el.find('.event-time').text()), url: link };
    }).filter(r => r.name);
  }
  if (format === 'heartwood') {
    return $('.uui-layout88_item').toArray().filter(e => $(e).find('.event-time-new').length).map(e => {
      const el = $(e); const href = el.find('a[href]').first().attr('href');
      return { name: clean(el.find('h3').text()), location: 'Heartwood Soundstage (source context)', url: new URL(href, url).href, start: null, schedule: `${clean(el.find('.event-month').text())} ${clean(el.find('.event-day').text())}; ${clean(el.find('.event-time-new').text())}; year not present in card`, soldOutBadgeVisible: el.find('.event-tag:not(.w-condition-invisible)').length > 0 };
    });
  }
  if (format === 'heartwood-detail') {
    const jsonld = parseJsonLd(body); if (jsonld.length) return jsonld;
    const dates = $('[class*="date"],[class*="time"]').toArray().map(e => clean($(e).text())).filter(v => v && v.length < 80);
    return [{ name: $('h1').first().text().trim(), location: 'Heartwood Soundstage (source context)', url, schedule: [...new Set(dates)].slice(0, 4).join('; ') }];
  }
  if (format === 'engineering') {
    return $('.em-event.em-item').toArray().map(e => {
      const el = $(e); const date = clean(el.find('.em-event-date').first().text()); const dateMatch = date.match(/(\d{2})\/(\d{2})\/(\d{4})/); const url = el.find('.em-item-read-more').attr('href');
      const titleFromCalendar = url ? $(`a[href="${url}"]`).toArray().map(e => clean($(e).text())).find(t => t.length > 3 && t !== 'More Info') : null;
      return { name: titleFromCalendar, start: dateMatch ? `${dateMatch[3]}-${dateMatch[1]}-${dateMatch[2]}` : null, location: clean(el.find('.em-event-location').text()), category: el.find('.event-categories a').map((_, a) => $(a).text()).get(), description: clean(el.find('.em-item-desc').text()), schedule: clean(el.find('.em-event-time').text()), url };
    }).filter(r => r.url);
  }
  return [];
}
const selected = process.argv.slice(2).filter(arg => !arg.startsWith('--'));
const results = [];
for (const [id, [url, format]] of Object.entries(endpoints)) {
  if (selected.length && !selected.includes(id)) continue;
  const response = await get(url); const result = { id, format, authentication: 'none', ...metadata(response) };
  if (response.body) {
    try {
      const records = parse(response.body, format, url);
      Object.assign(result, summarize(records)); result.usefulRecordsParsed = records.length > 0;
      result.multidayCards = records.filter(r => r.multiDay).length;
      result.soldOutBadges = records.filter(r => r.soldOutBadgeVisible).length;
      if (format === 'careers') {
        const $ = load(response.body);
        result.paginationLinks = $('a').toArray().map(e => $(e).attr('href')).filter(href => /\/events\/page\/\d+/.test(href ?? '')).filter((v, i, a) => a.indexOf(v) === i).slice(0, 6);
      } else result.paginationLinks = [];
    } catch (error) { result.parseError = error.message.slice(0, 120); }
  }
  results.push(result);
  console.log(JSON.stringify(process.argv.includes('--compact') ? { id, status: result.status, error: result.error ?? result.parseError, count: result.count, samples: result.samples?.slice(0, 1) } : result, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  const file = new URL('./evidence/additional.json', import.meta.url);
  const previous = JSON.parse(await readFile(file, 'utf8').catch(() => '[]'));
  await writeFile(file, JSON.stringify([...previous.filter(p => !results.some(n => n.id === p.id)), ...results], null, 2) + '\n');
}
