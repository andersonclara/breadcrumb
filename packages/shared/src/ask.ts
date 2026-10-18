import type { AskContext, AskResult, DiscoveryRecord } from './discovery';
import { discoveryTime, isCurrentRecord } from './discovery';

export const ASK_TURN_LIMIT = 30;
export const askPrompts = ['Free food today', 'Events near Reitz this week', 'Something creative this week'];

export function safeDiscoveryUrl(value: string | null) {
  try {
    const url = new URL(value ?? '');
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

// Conservative evidence matching on published summaries, never a claim about
// admission. Conditional/negated offers do not satisfy a free-food constraint.
export function advertisedFreeFood(r: Pick<DiscoveryRecord, 'title' | 'description'>) {
  const text = `${r.title}. ${r.description ?? ''}`;
  const food = '(?:food|pizza|snacks?|cookies?|refreshments?|lunch|dinner|breakfast|meals?|donuts?|doughnuts?|bagels?|ice cream|coffee|tacos?|sandwiches|cupcakes?)';
  const offer = new RegExp(`\\b(?:free|complimentary)\\s+${food}\\b|\\b${food}\\s+(?:is |are |will be )?(?:free|provided at no charge)\\b`, 'i');
  return text.split(/[.!?;\n]+/).some(sentence => offer.test(sentence) &&
    !/\b(?:not|no|isn't|aren't|isn’t|aren’t|without|buy|purchase|pay|paid|ticket|members? only|while supplies|first \d+)\b/i.test(sentence));
}

export function discoveryProvenance(r: DiscoveryRecord) {
  if (r.source === 'demo') return 'Demo · simulated report';
  if (r.kind === 'crumb') return r.state === 'full_loaf' ? 'Full Loaf · community corroborated' : 'Community report · unverified';
  const sources:Record<string,string>={'uf-calendar':'UF Calendar listing',libraries:'UF Libraries listing',arts:'UF College of the Arts listing',gatornights:'UF GatorNights listing','performing-arts':'UF Performing Arts listing',harn:'Harn Museum listing','florida-museum':'Florida Museum listing'};
  if(sources[r.source])return sources[r.source];
  if (r.source === 'gatorconnect') return 'GatorConnect listing';
  if (r.source === 'instagram') return 'Instagram announcement';
  return `Event listing · ${r.source}`;
}

export function askFilterLabels(c: AskContext['constraints']) {
  const times: Record<string, string> = { now: 'Happening now', today: 'Today', tonight: 'Tonight', tomorrow: 'Tomorrow', weekend: 'This weekend', next7days: 'Next 7 days' };
  const categories:Record<string,string>={event:'Campus events',freebie:'Freebies',crowd:'Crowd reports',construction:'Construction',hazard:'Hazards'};
  return [times[c.time.period] ?? c.time.date ?? 'Selected date',
    c.kind === 'events' ? 'Scheduled events' : c.kind === 'crumbs' ? 'Campus reports' : 'Events + reports',
    c.nearPlace ? `Near ${c.nearPlace}` : c.useUserLocation ? 'Near your approximate location' : 'Across campus',
    ...(c.nearPlace || c.useUserLocation ? [`Within ${c.radiusMeters >= 1000 ? `${c.radiusMeters / 1000} km` : `${c.radiusMeters} m`}`] : []),
    ...(c.freeOnly ? ['Free admission / reported free'] : []), ...(c.freeFoodOnly ? ['Advertised free food'] : []),
    ...c.categories.map(category=>categories[category]??category),...c.terms];
}

export function discoveryMatch(r: DiscoveryRecord, c: AskContext['constraints']) {
  const text=`${r.title} ${r.description??''}`.toLowerCase();
  const matched=c.terms.filter(term=>text.includes(term.toLowerCase())).slice(0,2);
  return [c.freeFoodOnly && advertisedFreeFood(r) ? 'Advertises free food; admission may differ' : null,
    c.freeOnly && r.priceType === 'free' ? (r.kind === 'crumb' ? 'Reported free by a student' : 'Lists free admission') : null,
    r.distanceMeters !== null ? `About ${Math.round(r.distanceMeters)} m away · straight line` : null,
    matched.length ? `Matches ${matched.join(', ')}` : null,
    r.kind === 'crumb' ? discoveryTime(r) : 'In your selected time window'].filter(Boolean).join(' · ');
}

export function askRecordAvailable(r: DiscoveryRecord, now = Date.now()) {
  return isCurrentRecord(r, now);
}

const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const nullableText = (v: unknown, max = 4000) => v === null || text(v, max);
const uuid = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
function validConstraints(v: unknown): v is AskContext['constraints'] {
  return object(v) && ['all', 'events', 'crumbs'].includes(v.kind as string) && object(v.time) &&
    ['now', 'today', 'tonight', 'tomorrow', 'weekend', 'next7days', 'date'].includes(v.time.period as string) && nullableText(v.time.date, 10) &&
    nullableText(v.nearPlace, 100) && typeof v.useUserLocation === 'boolean' && finite(v.radiusMeters) && v.radiusMeters >= 100 && v.radiusMeters <= 5000 &&
    typeof v.freeOnly === 'boolean' && (v.freeFoodOnly === undefined || typeof v.freeFoodOnly === 'boolean') &&
    Array.isArray(v.categories) && v.categories.length <= 5 && v.categories.every(c => ['event', 'freebie', 'crowd', 'construction', 'hazard'].includes(c)) &&
    Array.isArray(v.terms) && v.terms.length <= 6 && v.terms.every(t => text(t, 60));
}
export function parseAskResult(value: unknown): AskResult {
  const invalid = () => { throw new Error('Could not read that answer. Please retry.'); };
  if (!object(value) || !text(value.answer, 1000) || !value.answer || !['results', 'no_results', 'clarification', 'unsupported'].includes(value.status as string) ||
      !Array.isArray(value.cards) || value.cards.length > 4 || !object(value.context) || !validConstraints(value.context.constraints) ||
      !validConstraints(value.appliedConstraints) || !nullableText(value.context.referencePlace, 100) ||
      !Array.isArray(value.context.results) || value.context.results.length > 4 || !value.context.results.every(r => object(r) && ['event', 'crumb'].includes(r.kind as string) && uuid(r.id)) ||
      !Array.isArray(value.suggestedFollowUps) || value.suggestedFollowUps.length > 4 || !value.suggestedFollowUps.every(t => text(t, 300)) || !text(value.dataFreshnessNote, 2000)) return invalid();
  if (value.context.pending !== undefined && (!object(value.context.pending) || !['search', 'compare', 'details'].includes(value.context.pending.action as string) ||
      !(value.context.pending.resultIndex === null || Number.isInteger(value.context.pending.resultIndex) && Number(value.context.pending.resultIndex) >= 1 && Number(value.context.pending.resultIndex) <= 4))) return invalid();
  for (const r of value.cards) {
    if (!object(r) || !uuid(r.id) || !['event', 'crumb'].includes(r.kind as string) || !text(r.title, 500) || !nullableText(r.description) || !nullableText(r.venue, 500) || !nullableText(r.category, 50) ||
      ![r.latitude, r.longitude, r.distanceMeters].every(v => v === null || finite(v)) ||
      !['startsAt', 'endsAt', 'createdAt', 'expiresAt', 'lastSyncedAt'].every(k => r[k] === null || typeof r[k] === 'string' && Number.isFinite(Date.parse(r[k] as string))) ||
      !nullableText(r.eventDate, 10) || typeof r.allDay !== 'boolean' || !finite(r.confirmCount) || !finite(r.disputeCount) || !(r.state===null||['crumb','rising','full_loaf','stale','burnt'].includes(r.state as string)) ||
      !text(r.source, 100) || !nullableText(r.sourceUrl, 4000) || !nullableText(r.priceText, 1000) || !['free', 'unknown'].includes(r.priceType as string)) return invalid();
    // All clients render links from this checked boundary, never generated prose.
    if (r.sourceUrl !== null && !safeDiscoveryUrl(r.sourceUrl as string)) return invalid();
  }
  const result = value as unknown as AskResult;
  if (result.status!=='results'&&result.cards.length>0 || new Set(result.cards.map(r => `${r.kind}:${r.id}`)).size !== result.cards.length ||
      result.status === 'results' && (result.cards.length === 0 || result.cards.length !== result.context.results.length ||
        result.cards.some((r, i) => result.context.results[i].id !== r.id || result.context.results[i].kind !== r.kind))) return invalid();
  return result;
}

export class AskServiceError extends Error {
  constructor(message: string, public readonly retryAt = 0) { super(message); }
}
export async function readAskResponse(response: Response) {
  let value: unknown;
  try { value = await response.json(); } catch {
    if(response.ok)throw new Error('Could not read that answer. Please retry.');
  }
  if (!response.ok) {
    const retry = response.headers.get('Retry-After');
    const seconds = retry && /^\d+$/.test(retry) ? Number(retry) : retry ? Math.ceil((Date.parse(retry) - Date.now()) / 1000) : 0;
    throw new AskServiceError(object(value) && text(value.error, 500) ? value.error as string : 'Could not search campus. Please retry.',
      Number.isFinite(seconds) && seconds > 0 ? Date.now() + Math.min(seconds, 3600) * 1000 : 0);
  }
  return parseAskResult(value);
}
