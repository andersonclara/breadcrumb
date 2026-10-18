import {createHash} from 'node:crypto';
import {load} from 'cheerio';

export type EventInput = {
  id: string; title: string; url: string; description?: string | null;
  summary?: string | null;
  start?: string | null; end?: string | null; timezone?: string | null;
  allDay?: boolean; cancelled?: boolean; recurring?: boolean; venue?: string | null;
  organizer?: string | null; price?: string | null; tags?: string[];
  latitude?: number | null; longitude?: number | null; issues?: string[];
};
export type EventRecord = {
  source: string; source_id: string; title: string; url: string;
  club: string | null; description: string | null; venue_text: string | null;
  starts_at: string; ends_at: string | null; event_date: string;
  all_day: boolean; price_text: string | null; tags: string[];
  ingestion_status: 'published' | 'needs_review' | 'cancelled';
  review_reasons: string[]; last_synced_at: string;
};
export const text = (value: unknown, max = 2000): string => typeof value === 'string'
  ? load(value).text().replace(/\s+/g, ' ').trim().slice(0, max) : '';
export const fingerprint = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function publicUrl(value: unknown, base?: string): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value, base);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) if (/^utm_|^(fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
    return url.href;
  } catch { return null; }
}

// Floating clocks are matched against Intl, including DST gaps and repeated hours.
// Never resolve a local clock using the machine's timezone.
function parts(instant: number, zone: string) {
  return Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
export function localDay(date: Date) {
  const p = parts(date.getTime(), 'America/New_York');
  return `${p.year}-${p.month}-${p.day}`;
}
export function instant(value: string | null | undefined, zone?: string | null): string | null {
  if (!value) return null;
  const calendar=value.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if(calendar) {
    const [,y,m,d,h='00',min='00',sec='00']=calendar;
    const check=new Date(Date.UTC(+y,+m-1,+d));
    if(check.getUTCFullYear()!==+y || check.getUTCMonth()!==+m-1 || check.getUTCDate()!==+d || +h>23 || +min>59 || +sec>59)return null;
  }
  if (/(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const time = Date.parse(value);
    return Number.isFinite(time) ? new Date(time).toISOString() : null;
  }
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match || !zone) return null;
  const [, y, m, d, h, min, sec = '00'] = match;
  const nominal = Date.UTC(+y, +m - 1, +d, +h, +min, +sec);
  try {
    const offsets = new Set<number>();
    for (const hours of [-24, -12, 0, 12, 24]) {
      const sample = nominal + hours * 3600000;
      const p = parts(sample, zone);
      offsets.add(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - sample);
    }
    const matches = [...offsets].map(offset => nominal - offset).filter(candidate => {
      const p = parts(candidate, zone);
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` === `${y}-${m}-${d}T${h}:${min}:${sec}`;
    });
    return matches.length === 1 ? new Date(matches[0]).toISOString() : null;
  } catch { return null; }
}

export function normalizeEvent(input: EventInput, source: string, now = new Date()): {
  event: EventRecord | null; issues: string[];
} {
  const issues = [...(input.issues ?? [])];
  const url = publicUrl(input.url);
  const title = text(input.title, 180);
  const allDay = Boolean(input.allDay || /^\d{4}-\d{2}-\d{2}$/.test(input.start ?? ''));
  const day = input.start?.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  // All-day boundaries are storage boundaries, never advertised as event clocks.
  const start = allDay && day ? instant(`${day}T00:00:00`, input.timezone) : instant(input.start, input.timezone);
  let end = input.end ? instant(/^\d{4}-\d{2}-\d{2}$/.test(input.end) ? `${input.end}T00:00:00` : input.end, input.timezone) : null;
  if (!title) issues.push('missing_title');
  if (!url) issues.push('missing_source_url');
  if (!start) issues.push('unresolved_start');
  if (input.recurring) issues.push('recurrence_requires_expansion');
  if (input.end && !end) issues.push('unresolved_end');
  if (end && start && end <= start) { end = null; issues.push('invalid_end'); }
  if (end && start && Date.parse(end) - Date.parse(start) > 7 * 86400000) issues.push('unusual_duration');
  if (!text(input.venue) && !/online|virtual|zoom/i.test(input.venue ?? '')) issues.push('missing_venue');
  if (!title || !url || !start) return {event: null, issues};
  return {issues, event: {
    source, source_id: input.id, title, url, club: text(input.organizer, 180) || null,
    description: text(input.summary,600) || null, // Only a reviewed factual summary; never a raw publisher description.
    venue_text: text(input.venue, 280) || null, starts_at: start, ends_at: end,
    event_date: allDay && day ? day : localDay(new Date(start)), all_day: allDay,
    price_text: text(input.price, 160) || null, tags: (input.tags ?? []).map(t => text(t, 80)).filter(Boolean).slice(0, 20),
    ingestion_status: input.cancelled ? 'cancelled' : issues.length ? 'needs_review' : 'published',
    review_reasons: [...new Set(issues)], last_synced_at: now.toISOString(),
  }};
}
