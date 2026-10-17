// Human-directed discovery aid; prints bounded public markup to terminal only.
import { load } from 'cheerio';
import { get, metadata } from './lib/http.mjs';
for (const url of process.argv.slice(2)) {
  const r = await get(url);
  console.log(JSON.stringify(metadata(r), null, 2));
  if (!r.body) continue;
  const $ = load(r.body);
  console.log(JSON.stringify({
    selectedMarkup: process.env.RESEARCH_SELECTOR ? $(process.env.RESEARCH_SELECTOR).slice(0, 2).map((_, e) => $.html(e).slice(0, 3500)).get() : undefined,
    scripts: $('script[src]').map((_, e) => $(e).attr('src')).get().slice(-8),
    feeds: $('link[rel="alternate"]').map((_, e) => $(e).attr('href')).get(),
    eventLinks: $('a[href]').toArray().filter(e => /event|show|ical|rss|special|happy.hour/i.test($(e).attr('href'))).slice(0, 12).map(e => ({ href: $(e).attr('href'), text: $(e).text().trim().slice(0, 80), parentClass: $(e).parent().attr('class') })),
    dates: $('time,[datetime],.event-date').slice(0, 3).map((_, e) => $.html(e).slice(0, 600)).get(),
    eventMarkup: $('h2,h3,h4').filter((_, e) => /Fall Festival|DIY Craft|Upcoming|Great Pumpkin|Cowboy|Watercolor/i.test($(e).text())).slice(0, 3).parent().map((_, e) => $.html(e).slice(0, 1800)).get(),
    jsonScriptIds: $('script:not([src])').toArray().map(e => ({ id: $(e).attr('id'), type: $(e).attr('type'), bytes: $(e).text().length })).filter(e => e.id || e.type),
  }, null, 2));
}
