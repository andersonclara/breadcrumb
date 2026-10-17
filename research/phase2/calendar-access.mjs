// Supported Google Calendar API route, only for an organizer-approved public calendar.
// No private iCal URLs, session cookies, sign-in automation or alternate-host fallback.
import { get, metadata, safeUrl } from '../lib/http.mjs';
const env = process.env;
const missing = ['GOOGLE_CALENDAR_API_KEY'].filter(key => !env[key]);
if (env.PUBLIC_CALENDAR_ORGANIZER_AUTHORIZED !== '1') missing.push('PUBLIC_CALENDAR_ORGANIZER_AUTHORIZED=1');
if (missing.length) {
  console.log(JSON.stringify({ source: 'wicse-public-calendar-api', testedAt: new Date().toISOString(), status: 'NEEDS ACCESS', requestSent: false, httpStatus: null, missing }, null, 2));
  process.exit(2);
}
const calendar = '291pbpr99guo0kl6md2g0nghk8@group.calendar.google.com';
const now = new Date(); const until = new Date(now.getTime() + 30 * 86400000);
const url = new URL(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar)}/events`);
url.search = new URLSearchParams({ key: env.GOOGLE_CALENDAR_API_KEY, timeMin: now.toISOString(), timeMax: until.toISOString(), singleEvents: 'true', orderBy: 'startTime', maxResults: '5', fields: 'items(summary,start,end,location,htmlLink,status),nextPageToken,timeZone' });
const response = await get(url.href, { authenticated: true });
const result = { ...metadata(response), source: 'wicse-public-calendar-api' };
if (response.body) {
  try {
    const data = JSON.parse(response.body);
    if (!Array.isArray(data.items)) throw new Error('NO_ITEMS');
    result.count = data.items.length; result.hasNext = Boolean(data.nextPageToken);
    result.samples = data.items.slice(0, 2).map(row => ({ name: row.summary, start: row.start?.dateTime ?? row.start?.date, end: row.end?.dateTime ?? row.end?.date, timezone: row.start?.timeZone ?? data.timeZone, location: row.location, url: row.htmlLink ? safeUrl(row.htmlLink) : null, status: row.status }));
  } catch { result.parseError = 'Unexpected API schema; raw credentialed response omitted.'; process.exitCode = 1; }
} else process.exitCode = 1;
console.log(JSON.stringify(result, null, 2));
