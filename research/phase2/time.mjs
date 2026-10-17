// Research-only temporal handling. Never guess clocks for all-day/date-only records.
export const CAMPUS_ZONE = 'America/New_York';
const formatters = new Map();
const offsetCache = new Map();
const formatter = zone => {
  if (!formatters.has(zone)) formatters.set(zone, new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }));
  return formatters.get(zone);
};
export function localParts(instant, zone = CAMPUS_ZONE) {
  return Object.fromEntries(formatter(zone).formatToParts(new Date(instant)).filter(p => p.type !== 'literal').map(p => [p.type, p.value]));
}
export function localDay(instant, zone = CAMPUS_ZONE) {
  const p = localParts(instant, zone); return `${p.year}-${p.month}-${p.day}`;
}
export function addDays(day, days) {
  const date = new Date(`${day}T12:00:00Z`); date.setUTCDate(date.getUTCDate() + days); return date.toISOString().slice(0, 10);
}
export function localInstant(value, zone = CAMPUS_ZONE) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/);
  if (!match) return { instant: null, error: 'UNRECOGNIZED_LOCAL_CLOCK' };
  const [, y, m, d, h, min, sec = '00'] = match;
  const nominal = Date.UTC(+y, +m - 1, +d, +h, +min, +sec);
  const cacheKey = `${zone}:${y}-${m}-${d}`;
  try {
    if (!offsetCache.has(cacheKey)) {
      const offsets = new Set();
      for (const hours of [-24, -12, 0, 12, 24]) {
        const sample = nominal + hours * 3600000;
        const p = localParts(sample, zone);
        offsets.add(Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second) - sample);
      }
      offsetCache.set(cacheKey, [...offsets]);
    }
    const matches = offsetCache.get(cacheKey).map(offset => nominal - offset).filter(candidate => {
      const p = localParts(candidate, zone);
      return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}` === `${y}-${m}-${d}T${h}:${min}:${sec}`;
    });
    return matches.length === 1 ? { instant: matches[0] } : { instant: null, error: matches.length ? 'AMBIGUOUS_DST_CLOCK' : 'NONEXISTENT_LOCAL_CLOCK' };
  } catch { return { instant: null, error: 'INVALID_TIMEZONE' }; }
}
export function clock(value, { zone, allDay = false, inferredZone = false } = {}) {
  if (!value) return { instant: null, day: null, precision: 'missing' };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value) || allDay) return { instant: null, day: value.slice(0, 10), precision: 'date-only' };
  if (/(?:Z|GMT|UTC|[+-]\d{2}:?\d{2})$/i.test(value)) {
    const instant = Date.parse(value);
    return Number.isFinite(instant) ? { instant, day: localDay(instant), precision: 'explicit-offset' } : { instant: null, day: null, precision: 'invalid' };
  }
  if (zone) {
    const parsed = localInstant(value, zone);
    return { ...parsed, day: value.slice(0, 10), precision: parsed.instant === null ? 'unresolved-local' : inferredZone ? 'assumed-campus-zone' : 'named-zone' };
  }
  return { instant: null, day: /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null, precision: 'unresolved-local' };
}
