// Terminal-only markup diagnostics for fixed public pages; no saved raw payloads.
import { get, metadata } from '../lib/http.mjs';
import { load } from 'cheerio';
const pages = {
  glory: 'https://glorydayspresents.com/',
  magnitude: 'https://www.fmbrewing.com/',
  pride: 'https://www.fmbrewing.com/event-calendar/pride-party',
  festival: 'https://www.fmbrewing.com/event-calendar/florida-forever-festival',
  food: 'https://www.fmbrewing.com/food-trucks',
  looseys: 'https://www.looseys.com/events/',
  trivia: 'https://www.looseys.com/events/monday-trivia/',
  bull: 'https://www.thebull-gnv.com/calendar',
  blackadder: 'https://www.blackadderbrewing.com/events',
  salty: 'https://saltydogsaloon.com/',
};
for (const id of process.argv.slice(2)) {
  if (!pages[id]) continue;
  const r = await get(pages[id]); console.log(JSON.stringify({ id, ...metadata(r) }));
  if (!r.body) continue;
  const $ = load(r.body);
  const selector = process.env.RESEARCH_SELECTOR ?? 'h2,time,[class*="event-title"],[class*="event-date"],iframe';
  console.log(JSON.stringify({ id, selected: $(selector).filter((_, e) => !process.env.RESEARCH_TEXT || new RegExp(process.env.RESEARCH_TEXT, 'i').test($(e).text().trim())).slice(0, 3).toArray().map(e => $.html(process.env.RESEARCH_PARENT === '1' ? $(e).parent() : process.env.RESEARCH_PARENT === '2' ? $(e).parent().parent() : e).slice(0, 4200)),
    images: $('main img,article img,.event-image img').slice(0, 8).toArray().map(e => ({ alt: $(e).attr('alt'), src: $(e).attr('data-src') ?? $(e).attr('src') })) }));
}
