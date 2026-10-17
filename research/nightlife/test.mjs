import { get, metadata } from '../lib/http.mjs';
import { parseJson, parseIcal, summarize } from '../lib/parse.mjs';
import { parseNightlife } from './parse.mjs';
import { localDay, addDays } from '../phase2/time.mjs';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const day = localDay(new Date()); const end = addDays(day, 30);
const sources = {
  'glory-gainesville': ['https://glorydayspresents.com/', 'glory'],
  'magnitude-events-food': ['https://www.fmbrewing.com/', 'magnitude-home'],
  'magnitude-pride-detail': ['https://www.fmbrewing.com/event-calendar/pride-party', 'magnitude-detail'],
  'magnitude-festival-detail': ['https://www.fmbrewing.com/event-calendar/florida-forever-festival', 'magnitude-detail'],
  'looseys-trivia': ['https://www.looseys.com/events/monday-trivia/', 'looseys-detail'],
  'looseys-karaoke': ['https://www.looseys.com/events/karaoke-party/', 'looseys-detail'],
  'salty-weekly': ['https://saltydogsaloon.com/', 'salty-weekly'],
  'swamp-head-json': [`https://swamphead.com/wp-json/tribe/events/v1/events?per_page=20&start_date=${day}&end_date=${end}`, 'json'],
  'swamp-head-ical': ['https://swamphead.com/events/?ical=1', 'ical'],
  'bull-calendar-lead': ['https://www.thebull-gnv.com/calendar', 'google-embed'],
  'cypress-calendar-lead': ['https://www.cypressandgrove.com/calendar', 'google-embed'],
};
const selected = process.argv.slice(2).filter(a => !a.startsWith('--'));
const results = [];
for (const [id, [url, format]] of Object.entries(sources)) {
  if (selected.length && !selected.includes(id)) continue;
  const response = await get(url); const result = { id, format, authentication: 'none', ...metadata(response) };
  if (response.body) {
    try {
      let records;
      if (format === 'json') { const parsed = parseJson(response.body); records = parsed.records; result.pagination = parsed.pagination; }
      else if (format === 'ical') records = parseIcal(response.body);
      else records = parseNightlife(response.body, format, url);
      result.rowsBeforeCityFilter = records.length;
      if (format === 'glory') { result.excludedNonGainesville = records.filter(r => r.city !== 'Gainesville').length; records = records.filter(r => r.city === 'Gainesville'); }
      Object.assign(result, summarize(records));
      result.dataKind = format === 'google-embed' ? 'calendar-discovery-only' : format === 'salty-weekly' ? 'recurring-offer-not-dated-confirmation' : 'scheduled-venue-activity';
      result.usefulEventRecordsParsed = records.length > 0 && format !== 'google-embed';
      result.explicitYearRecords = records.filter(r => r.start && /^\d{4}-/.test(r.start)).length;
      result.startIsDateOnly = records.filter(r => /^\d{4}-\d{2}-\d{2}$/.test(r.start ?? '')).length;
      result.scheduleRecords = records.filter(r => r.schedule).length;
      if (format === 'glory') result.note = 'Schedule is doors time, not performance start; first published page only, explicitly city-filtered.';
      if (format === 'magnitude-home') result.note = 'Six event cards omit the full date/year; two food-truck cards have printed full dates. No year guessed from current date.';
      if (format === 'salty-weekly') result.offerExamples = records.slice(0, 2).map(r => ({ day: r.schedule, offerFact: r.offerFact, monetaryTokens: r.monetaryTokens, note: 'Amounts can be discounts or item prices, not admission. Read the original conditions.', lastConfirmedForSpecificDate: null }));
      result.eligibilityMentions = records.filter(r => /\b(?:18|21)\s*\+|members only|rsvp|registration|while supplies last|donat/i.test(r.description ?? '')).length;
    } catch (error) { result.parseError = error.message.slice(0, 140); }
  }
  results.push(result); console.log(JSON.stringify(process.argv.includes('--compact') ? { id, status: result.status, error: result.error ?? result.parseError, count: result.count, excluded: result.excludedNonGainesville, samples: result.samples, offers: result.offerExamples } : result, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  const file = new URL('./evidence/records.json', import.meta.url);
  const previous = JSON.parse(await readFile(file, 'utf8').catch(() => '[]'));
  await writeFile(file, JSON.stringify([...previous.filter(p => !results.some(r => r.id === p.id)), ...results], null, 2) + '\n');
}
