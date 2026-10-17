import { load } from 'cheerio';
import { clean } from './parse.mjs';

const months = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

export function parseHtml(body, kind, url) {
  const $ = load(body);
  if (kind === 'salty-specials') {
    const block = $('.elementor-widget-text-editor').filter((_, e) => /Happy Hour Open/.test($(e).text())).first();
    if (!block.length) throw new Error('SPECIALS_BLOCK_NOT_FOUND');
    // One recurring offer, with the publication's exact schedule. No fabricated event date.
    const schedule = clean(block.find('p').filter((_, e) => /Happy Hour Open/i.test($(e).text())).first().text());
    const offer = clean(block.find('p').filter((_, e) => /1\/2 Price Pizza/i.test($(e).text())).first().text());
    return offer ? [{ name: 'Published happy-hour offer', description: offer, schedule, price: offer.match(/1\/2 Price Pizza/i)?.[0] ?? null, location: 'Salty Dog Saloon (source context)', url, start: null, end: null }] : [];
  }
  if (kind === 'gatornights') {
    const year = $('h2').map((_, e) => $(e).text()).get().find(t => /\d{4} GatorNights Events/.test(t))?.match(/\d{4}/)?.[0];
    if (!year) throw new Error('GATORNIGHTS_SEASON_YEAR_NOT_FOUND');
    return $('.inner-txt').toArray().filter(e => $(e).find('h3').length && $(e).find('.date').length).map(e => {
      const el = $(e);
      const date = el.find('.date').text().trim().match(/(\w+)\s+(\d+)/);
      const localTime = el.find('.time').text().trim();
      const time = localTime.match(/(\d{1,2})(?::(\d{2}))?\s*(AM|PM)/i);
      const hour = time ? Number(time[1]) % 12 + (time[3].toUpperCase() === 'PM' ? 12 : 0) : null;
      const day = date && months[date[1].toLowerCase().slice(0, 3)] ? `${year}-${months[date[1].toLowerCase().slice(0, 3)]}-${date[2].padStart(2, '0')}` : null;
      const subtext = clean(el.find('.event-subtext').html() ?? '');
      return { name: el.find('h3').text().trim(), start: day && time ? `${day}T${String(hour).padStart(2, '0')}:${time[2] ?? '00'}:00` : day, timezone: 'America/New_York (inferred from UF campus; source gives local clock only)', location: subtext.includes('|') ? subtext.split('|')[0].trim() : null, description: subtext, url, price: null };
    });
  }
  if (kind === 'city') {
    return $('.list-item-block-date').toArray().map(e => $(e).closest('a')).filter(a => a.length).map(a => {
      const date = a.find('.list-item-block-date');
      const year = date.find('.part-year').text().trim();
      const month = months[date.find('.part-month').text().trim().toLowerCase().slice(0, 3)];
      const day = date.find('.part-date').text().trim().padStart(2, '0');
      return { name: clean(a.find('h3,h2,.list-item-name').first().text()), start: year && month && day ? `${year}-${month}-${day}` : null, location: clean(a.find('.list-item-address').text()), description: clean(a.find('.list-item-block-desc').text()), category: a.find('.tagged-as-list .text').text().split(',').map(s => s.trim()).filter(Boolean), url: new URL(a.attr('href'), url).href };
    }).filter(e => e.name);
  }
  if (kind === 'shows') {
    return $('article.Event').toArray().map(e => {
      const el = $(e);
      const link = el.find('a[href^="/event/"]').first();
      const label = clean(link.text());
      const date = el.attr('data-event-date') ?? label.match(/\d{4}-\d{2}-\d{2}/)?.[0] ?? link.attr('href')?.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      const artists = el.find('a[attribute="artist"],a[href^="/artist/"]').toArray().map(a => clean($(a).text()).replace(/,+$/, '')).filter(Boolean);
      const venue = clean(el.find('a[attribute="venue"],a[href^="/venue/"]').first().text());
      return { name: artists.length ? [...new Set(artists)].join(', ') : label.replace(/^View event:\s*/, ''), start: date, location: venue, category: ['Live music (source context)'], url: link.attr('href') ? new URL(link.attr('href'), url).href : null };
    }).filter(e => e.name && e.url);
  }
  if (kind === 'heartwood-archive') {
    return $('.ec-col-item').toArray().map(e => {
      const el = $(e);
      const link = el.find('a[href]').attr('href');
      const date = el.find('.start-date').text().trim();
      const parsed = new Date(date);
      return { name: el.find('.title').text().trim(), start: Number.isNaN(parsed.getTime()) ? null : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`, location: 'Heartwood Soundstage (source context)', url: link ? new URL(link, url).href : null };
    }).filter(e => e.name);
  }
  if (kind === 'swamp-venue') {
    // JSON-LD restaurant metadata, not an event or verified special.
    const rows = [];
    $('script[type="application/ld+json"]').each((_, e) => {
      const json = JSON.parse($(e).text());
      for (const item of Array.isArray(json) ? json : [json]) {
        if (item['@type'] === 'Restaurant') rows.push({ name: item.name, location: [item.address?.streetAddress, item.address?.addressLocality].filter(Boolean).join(', '), latitude: item.geo?.latitude, longitude: item.geo?.longitude, url: item.url ?? url });
      }
    });
    return rows;
  }
  throw new Error('UNKNOWN_HTML_PARSER');
}
