// Research experiment, not an ingestion service. Records/descriptions remain in memory.
import { mkdir, writeFile } from 'node:fs/promises';
import { collect, sourceStats } from './sources.mjs';
import { clock, localDay, addDays, CAMPUS_ZONE, localParts } from './time.mjs';
import { clean } from '../lib/parse.mjs';

const now = new Date();
const run = await collect({ now, onResult: result => console.log(JSON.stringify(result)) });
const today = run.localDay;
const horizon = run.horizonEndDay;
const weekday = new Date(`${today}T12:00:00Z`).getUTCDay();
const saturday = addDays(today, weekday === 0 ? -1 : (6 - weekday + 7) % 7);
const monday = addDays(saturday, 2);
const textOf = r => clean([r.name, r.description, r.organizer, ...(r.category ?? []), ...(r.tags ?? [])].filter(Boolean).join(' ')).toLowerCase();
const normalized = s => clean(s ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
const rows = run.records.map((r, i) => ({ ...r, index: i, startClock: clock(r.start, { zone: r.timezone, allDay: r.allDay, inferredZone: r.inferredZone }), endClock: clock(r.end, { zone: r.timezone, allDay: r.allDay, inferredZone: r.inferredZone }), text: textOf(r) }));
const windowed = rows.filter(r => r.startClock.day && r.startClock.day >= today && r.startClock.day < horizon && !r.cancelled);
const grouped = new Map();
for (const r of windowed) {
  const key = `${normalized(r.name)}|${r.startClock.instant ?? r.startClock.day}|${normalized(r.location)}`;
  if (!grouped.has(key)) grouped.set(key, []);
  grouped.get(key).push(r);
}
const candidates = [...grouped.values()].map(group => group.find(r => r.source !== 'gainesvilleevents') ?? group[0]);
const duplicateGroups = [...grouped.values()].filter(group => group.length > 1);
const canonical = value => {
  try { const url = new URL(value); url.hash = ''; for (const key of [...url.searchParams.keys()]) if (/^utm_|^fbclid$|^gclid$/i.test(key)) url.searchParams.delete(key); return url.href.replace(/\/$/, ''); } catch { return null; }
};
const urlGroups = new Map();
for (const r of windowed) {
  if (!r.url) continue;
  const key = `${canonical(r.url)}|${r.startClock.day}`;
  if (!urlGroups.has(key)) urlGroups.set(key, []);
  urlGroups.get(key).push(r);
}
const sharedUrlGroups = [...urlGroups.values()].filter(g => new Set(g.map(r => r.source)).size > 1);
const titleDayGroups = new Map();
for (const r of windowed) {
  const key = `${normalized(r.name)}|${r.startClock.day}`;
  if (!titleDayGroups.has(key)) titleDayGroups.set(key, []);
  titleDayGroups.get(key).push(r);
}
const sharedTitleDays = [...titleDayGroups.values()].filter(g => new Set(g.map(r => r.source)).size > 1);
function facts(r) {
  return { name: String(r.name).slice(0, 130), source: r.source, start: r.start, end: r.end, timezone: r.timezone, precision: r.startClock.precision, location: r.location, price: r.price || undefined, url: r.url };
}
function summary(id, question, matches, rule, limitations, support = 'PARTIAL') {
  return { id, question, support: matches.length ? support : 'NO_MATCH_IN_TESTED_SNAPSHOT', candidateCount: matches.length, bySource: Object.fromEntries([...new Set(matches.map(r => r.source))].map(s => [s, matches.filter(r => r.source === s).length])), rule, limitations, examples: matches.sort((a, b) => String(a.startClock.day).localeCompare(String(b.startClock.day))).slice(0, 2).map(facts) };
}
const weekend = r => r.startClock.day >= saturday && r.startClock.day < monday;
const tonight = r => r.startClock.day === today && r.startClock.instant !== null && Number(localParts(r.startClock.instant).hour) >= 17 && !r.allDay;
const interestRules = {
  gaming: /\b(?:gaming|gatorlan|gator gaming|esports|e-sports|video games?|board games?|dungeons?\s*(?:and|&)\s*dragons|tabletop|pokemon|pokémon|smash bros)\b/i,
  robotics: /\b(?:robotics|robots?|battlebots?|gator vex|mechatronics)\b/i,
  womenStem: /\b(?:women in stem|women in (?:computer science|engineering|science)|society of women engineers|wicse|women engineers|women in technology)\b/i,
  freeFood: /\bfree\s+(?:food|pizza|snacks?|lunch|dinner|breakfast|coffee|refreshments?|donuts?|doughnuts?|cookies|bagels?)\b|\b(?:food|pizza|snacks?|refreshments?)\s+(?:will be\s+)?provided\b/i,
  foodMention: /\b(?:food|pizza|snacks?|refreshments?|coffee|lunch|dinner|breakfast)\b/i,
  giveaways: /\b(?:giveaways?|free merch|free t-shirts?|free shirts?|prizes|raffle)\b/i,
  workshops: /\b(?:workshop|hackathon|training|seminar|coding|programming)\b/i,
};
const nearName = candidates.filter(r => /\breitz\b|arredondo|arrendondo/i.test(r.location ?? ''));
const coordinateRows = rows.filter(r => /\breitz\b/i.test(r.location ?? '') && Number.isFinite(Number(r.latitude)) && Number.isFinite(Number(r.longitude)) && Number(r.latitude) > 29.5 && Number(r.latitude) < 29.8 && Number(r.longitude) > -82.5 && Number(r.longitude) < -82.1);
const median = values => values.sort((a, b) => a - b)[Math.floor(values.length / 2)];
const anchor = coordinateRows.length ? { latitude: median(coordinateRows.map(r => +r.latitude)), longitude: median(coordinateRows.map(r => +r.longitude)), method: 'Median of publisher-provided coordinates on explicitly Reitz-located event records; approximate research anchor', evidenceUrls: [...new Set(coordinateRows.map(r => r.url))].slice(0, 2) } : null;
const distance = (r, point) => {
  const lat = +r.latitude, lon = +r.longitude;
  if (r.latitude == null || r.longitude == null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const radians = v => v * Math.PI / 180;
  const a = Math.sin(radians(lat - point.latitude) / 2) ** 2 + Math.cos(radians(lat)) * Math.cos(radians(point.latitude)) * Math.sin(radians(lon - point.longitude) / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};
const spatial = anchor ? candidates.filter(r => !r.online && distance(r, anchor) !== null && distance(r, anchor) <= 1000) : [];
const scheduledNow = rows.filter(r => r.startClock.instant !== null && r.endClock.instant !== null && r.startClock.instant <= now.getTime() && now.getTime() < r.endClock.instant && r.endClock.instant - r.startClock.instant <= 24 * 3600000 && !r.cancelled && !r.online && !r.allDay && /\breitz\b/i.test(r.location ?? ''));
const freeFood = candidates.filter(r => interestRules.freeFood.test(r.text));
const exactNoCharge = r => /^(?:free|\$?0(?:\.00)?|no (?:cost|charge)|free admission)$/i.test(clean(String(r.price ?? '')).trim());
const questions = [
  summary('reitz-now', "What's happening near Reitz right now?", scheduledNow, 'Explicit start <= test instant < explicit end; duration <=24h; physical Reitz place; excludes date-only/online/cancelled.', ['Scheduled overlap is not an eyewitness confirmation, crowd estimate, cancellation check or food-stock check.'], 'SCHEDULE_ONLY'),
  summary('free-food-turlington', 'Any free food at Turlington?', freeFood.filter(r => /\bturlington\b/i.test(r.location ?? '') && r.startClock.day === today), 'Today + explicit Turlington location + free/provided-food phrase.', ['Candidate mention only; free-food regex is unvalidated and cannot establish stock, eligibility, portion availability or that an event is running.']),
  summary('women-stem-weekend', 'Any Women in STEM events this weekend?', candidates.filter(r => weekend(r) && interestRules.womenStem.test(r.text)), 'Explicit Women in STEM/WiCSE/SWE phrase + event starts this Saturday/Sunday.', ['Keyword candidates can miss acronyms; a general women-focused or STEM event alone does not satisfy this rule.']),
  summary('gaming-30-days', 'Are there any gaming events?', candidates.filter(r => interestRules.gaming.test(r.text)), 'Explicit gaming/esports/GatorLAN/tabletop terms in next 30 days.', ['Keyword hit can come from a secondary activity or host description; examples need human inspection.']),
  summary('robotics-30-days', 'Are there any robotics events?', candidates.filter(r => interestRules.robotics.test(r.text)), 'Explicit robotics/robot/battlebot/VEX terms in next 30 days.', ['No match is a coverage gap, not proof no robotics events exist.']),
  summary('gainesville-tonight', "I'm bored tonight. What's going on in Gainesville?", candidates.filter(tonight), 'Starts today at/after 17:00 America/New_York with a resolvable clock; 30-day combined source set.', ['Geographic validity not independently established for every aggregator venue. Includes scheduled/ticketed events; no inferred quality rating.']),
  summary('reitz-place-name', 'What is scheduled at or around Reitz?', nearName, 'Explicit Reitz/Arredondo place name in next 30 days.', ['Name match is not a distance estimate and can miss adjacent places.']),
  summary('walking-radius', 'Any events within walking distance of Reitz?', spatial, 'Physical event with published coordinates within 1km straight-line of publisher-derived Reitz anchor.', ['Straight-line distance is not a pedestrian route, walking time, access check or accessibility guarantee. Events without coordinates remain unknown.']),
  summary('free-admission', 'Which events have published free admission?', candidates.filter(exactNoCharge), 'Explicit cost field equals free/no-charge/zero; no inference from free food or blank costs.', ['Blank cost is unknown. Free admission does not guarantee free food or no registration.']),
  summary('food-and-giveaways', 'Where should we look for food, giveaways and free activities?', candidates.filter(r => interestRules.freeFood.test(r.text) || interestRules.giveaways.test(r.text)), 'Published free/provided-food or giveaway/prize terms in next 30 days.', ['A prize is not guaranteed for every attendee; food availability needs user/organizer confirmation.']),
  summary('bar-specials-tonight', 'Which bars have specials tonight?', candidates.filter(r => tonight(r) && /\b(?:happy hour|drink specials?|beer specials?|cocktail specials?)\b/i.test(r.text)), 'Resolvable evening start today plus explicit happy-hour/drink-special phrase.', ['Recurring merchant offers are tested separately; neither an old promo nor a generic bar event confirms a special tonight.']),
];
const foodWordOnly = candidates.filter(r => interestRules.foodMention.test(r.text) && !interestRules.freeFood.test(r.text));
const report = {
  schema: 'breadcrumb-research-coverage-v1', testedAt: run.now, timezone: CAMPUS_ZONE,
  windows: { today, saturday, mondayExclusive: monday, horizonExclusive: horizon }, requests: run.requests, sources: run.sources,
  totalReturned: rows.length, next30DaysBeforeGrouping: windowed.length, conservativeGroupedCandidates: candidates.length,
  candidateDuplicateGroups: duplicateGroups.length, duplicateExtraRecords: windowed.length - candidates.length,
  duplicateRule: 'Exact normalized title + exact start instant/date + normalized place. Candidate grouping only: can merge separate parallel activities or miss aliases; no production dedupe implemented.',
  crossSourceDuplicateGroups: duplicateGroups.filter(g => new Set(g.map(r => r.source)).size > 1).length,
  crossSourceSharedUrlAndDayGroups: sharedUrlGroups.length,
  crossSourceSharedTitleAndDayGroups: sharedTitleDays.length,
  sharedUrlClockDisagreementGroups: sharedUrlGroups.filter(g => new Set(g.map(r => r.startClock.instant).filter(v => v !== null)).size > 1).length,
  duplicateExamples: sharedTitleDays.slice(0, 2).map(g => ({ title: g[0].name, day: g[0].startClock.day, sources: [...new Set(g.map(r => r.source))], starts: [...new Set(g.map(r => r.start))].slice(0, 3), sourceUrls: [...new Set(g.map(r => r.url))].slice(0, 3) })),
  sourceMetrics: [...new Set(rows.map(r => r.source))].map(s => ({ ...sourceStats(rows, s), next30Days: windowed.filter(r => r.source === s).length, exactClocks: rows.filter(r => r.source === s && ['explicit-offset', 'named-zone'].includes(r.startClock.precision)).length, assumedCampusClocks: rows.filter(r => r.source === s && r.startClock.precision === 'assumed-campus-zone').length, dateOnly: rows.filter(r => r.source === s && r.startClock.precision === 'date-only').length, dateRange: { min: rows.filter(r => r.source === s && r.startClock.day).map(r => r.startClock.day).sort()[0] ?? null, max: rows.filter(r => r.source === s && r.startClock.day).map(r => r.startClock.day).sort().at(-1) ?? null } })),
  reitzAnchor: anchor, spatialMatches: spatial.length,
  coordinateCoverageInWindow: candidates.filter(r => r.latitude != null && r.longitude != null).length,
  explicitFoodCandidates: freeFood.length, foodMentionWithoutFreeEvidence: foodWordOnly.length,
  interestCounts30Days: Object.fromEntries(Object.entries(interestRules).map(([key, rule]) => [key, candidates.filter(r => rule.test(r.text)).length])),
  foodEvidenceAudit: freeFood.slice(0, 2).map(r => ({ ...facts(r), matchedFoodPhrase: r.text.match(interestRules.freeFood)?.[0], eligibilityWarningDetected: /members only|only (?:open|available) to|must be|registered|rsvp|first come|while supplies last|ticket required/i.test(r.text) })),
  acronymAmbiguityAudit: { sweAcronymCandidates: candidates.filter(r => /\bswe\b/i.test(r.text)).length, note: 'SWE alone can mean Society of Women Engineers or software engineering; not classified as Women in STEM without explicit context.' },
  questions,
  liveStockConfirmed: false,
  limitations: ['Bounded source snapshot, not a campus census.', 'No source content license inferred from successful retrieval.', 'Descriptions, editor/contact/attendee information and raw bodies were not retained.', 'No AI model or chatbot used to manufacture results; matching is transparent rules in this script.', 'No external geocoding or routing; no social data collected.'],
};
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  await writeFile(new URL('./evidence/coverage.json', import.meta.url), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({ testedAt: report.testedAt, totalReturned: rows.length, candidates: candidates.length, duplicateGroups: duplicateGroups.length, questions: questions.map(q => ({ id: q.id, candidates: q.candidateCount, support: q.support })) }, null, 2));
