// Narrow source-shape diagnostics; omit author/contact values and raw descriptions.
import { get, metadata } from '../lib/http.mjs';
import { XMLParser } from 'fast-xml-parser';
import { load } from 'cheerio';
const jobs = {
  gatorconnect: 'https://gatorconnect.ufl.edu/events.rss',
  careers: 'https://careerhub.ufl.edu/events/feed/',
  engineering: 'https://www.eng.ufl.edu/undergraduate/news-events/events-calendar/feed/',
  heartwood: 'https://www.heartwoodsoundstage.com/shows',
  'gator-market': 'https://union.ufl.edu/gatormarket/',
  'student-engagement': 'https://studentengagement.ufl.edu/',
};
for (const id of process.argv.slice(2)) {
  if (!jobs[id]) continue;
  const r = await get(jobs[id]); console.log(JSON.stringify({ id, ...metadata(r) }));
  if (!r.body) continue;
  if (r.contentType?.includes('xml')) {
    const items = [new XMLParser({ ignoreAttributes: false }).parse(r.body).rss?.channel?.item].flat().filter(Boolean);
    const first = items[0];
    console.log(JSON.stringify({ keys: Object.keys(first ?? {}), hostShape: first?.host && typeof first.host === 'object' ? Object.fromEntries(Object.entries(first.host).map(([k, v]) => [k, typeof v])) : null, dateFieldValues: Object.fromEntries(Object.entries(first ?? {}).filter(([k]) => /^(?:ev:|event:|start$|end$|date$|time$)/.test(k) && !/description|contact/i.test(k)).map(([k, v]) => [k, typeof v === 'object' ? v['#text'] : v])), descriptionMarkupShape: first?.description ? (() => { const $ = load(first.description); return $('p,div,time,span,strong,dt,dd').slice(0, 8).toArray().map(e => ({ tag: e.tagName, class: $(e).attr('class'), itemprop: $(e).attr('itemprop') })); })() : null }, null, 2));
  } else {
    const $ = load(r.body);
    if (id === 'heartwood') {
      const el = $('.event-time-new').first();
      let parent = el;
      const card = el.closest('.uui-layout88_item');
      console.log(JSON.stringify({ ancestry: Array.from({ length: 5 }, () => { const result = { tag: parent[0]?.tagName, class: parent.attr('class'), data: Object.fromEntries(Object.entries(parent[0]?.attribs ?? {}).filter(([k]) => k.startsWith('data-'))) }; parent = parent.parent(); return result; }), cardText: card.text().replace(/\s+/g, ' ').trim().slice(0, 350), hrefs: card.find('a[href]').toArray().map(e => $(e).attr('href')).slice(0, 3), fields: card.find('div[class],h2,h3').slice(-8).toArray().map(e => ({ class: $(e).attr('class'), text: $(e).text().replace(/\s+/g, ' ').slice(0, 120) })) }, null, 2));
    } else {
      const heading = $('h1,h2,h3,h4,p,strong').toArray().find(e => /^(?:Fall 2026 Market Dates:|Market Dates|Upcoming Fall 2026 Events)$/.test($(e).text().trim()));
      console.log(JSON.stringify({ selected: heading ? $(heading).parent().text().replace(/\s+/g, ' ').slice(0, 800) : null, lists: $('ul').filter((_, e) => /Wednesday, October 21/.test($(e).text())).slice(0, 1).map((_, e) => $.html(e).slice(0, 1200)).get() }, null, 2));
    }
  }
}
