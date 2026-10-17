// Credential-gated, single-page, read-only API experiments. Never writes payloads.
import { get, metadata, safeUrl } from '../lib/http.mjs';
import { parseJson, summarize } from '../lib/parse.mjs';

const id = process.argv[2];
const env = process.env;
const configs = {
  ticketmaster: { required: ['TICKETMASTER_API_KEY'] },
  eventbrite: { required: ['EVENTBRITE_TOKEN', 'EVENTBRITE_ORGANIZATION_ID'], permission: 'EVENTBRITE_ORGANIZER_AUTHORIZED' },
  reddit: { required: ['REDDIT_ACCESS_TOKEN', 'REDDIT_USER_AGENT'], permission: 'REDDIT_APPROVED' },
  discord: { required: ['DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID'], permission: 'DISCORD_CHANNEL_AUTHORIZED' },
  instagram: { required: ['INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_USER_ID', 'INSTAGRAM_API_VERSION'], permission: 'INSTAGRAM_ORGANIZER_AUTHORIZED' },
};
if (!configs[id]) { console.error(`Usage: node research/access/test.mjs <${Object.keys(configs).join('|')}>`); process.exit(1); }
const config = configs[id];
const missing = config.required.filter(key => !env[key]);
if (config.permission && env[config.permission] !== '1') missing.push(`${config.permission}=1 (only after actual authorization)`);
if (missing.length) {
  console.log(JSON.stringify({ id, testedAt: new Date().toISOString(), status: 'NEEDS ACCESS', httpStatus: null, requestSent: false, missing }, null, 2));
  process.exit(2);
}
for (const key of ['EVENTBRITE_ORGANIZATION_ID', 'DISCORD_CHANNEL_ID', 'INSTAGRAM_USER_ID']) {
  if (config.required.includes(key) && !/^\d+$/.test(env[key])) { console.error(`Invalid numeric ${key}; no request sent.`); process.exit(1); }
}
if (id === 'instagram' && !/^v\d+\.\d+$/.test(env.INSTAGRAM_API_VERSION)) { console.error('Set INSTAGRAM_API_VERSION to the version enabled for your approved app, such as vNN.0.'); process.exit(1); }
let url;
let extraHeaders = {};
if (id === 'ticketmaster') {
  const params = new URLSearchParams({ apikey: env.TICKETMASTER_API_KEY, latlong: '29.6516,-82.3248', radius: '15', unit: 'miles', countryCode: 'US', stateCode: 'FL', size: '3', sort: 'date,asc' });
  url = `https://app.ticketmaster.com/discovery/v2/events.json?${params}`;
} else if (id === 'eventbrite') {
  url = `https://www.eventbriteapi.com/v3/organizations/${env.EVENTBRITE_ORGANIZATION_ID}/events/?status=live&expand=venue&page_size=3`;
  extraHeaders.Authorization = `Bearer ${env.EVENTBRITE_TOKEN}`;
} else if (id === 'reddit') {
  const subreddit = env.REDDIT_SUBREDDIT ?? 'ufl';
  if (!['ufl', 'GNV'].includes(subreddit)) { console.error('Use only REDDIT_SUBREDDIT=ufl or GNV.'); process.exit(1); }
  url = `https://oauth.reddit.com/r/${subreddit}/new?limit=3&raw_json=1`;
  extraHeaders = { Authorization: `Bearer ${env.REDDIT_ACCESS_TOKEN}`, 'User-Agent': env.REDDIT_USER_AGENT };
} else if (id === 'discord') {
  url = `https://discord.com/api/v10/channels/${env.DISCORD_CHANNEL_ID}/messages?limit=3`;
  extraHeaders.Authorization = `Bot ${env.DISCORD_BOT_TOKEN}`;
} else {
  url = `https://graph.instagram.com/${env.INSTAGRAM_API_VERSION}/${env.INSTAGRAM_USER_ID}/media?fields=media_type,permalink,timestamp,caption&limit=3`;
  extraHeaders.Authorization = `Bearer ${env.INSTAGRAM_ACCESS_TOKEN}`;
}
const response = await get(url, { authenticated: true, extraHeaders });
const result = { id, ...metadata(response) };
if (response.body) {
  try {
    if (['ticketmaster', 'eventbrite'].includes(id)) {
      const parsed = parseJson(response.body);
      const summary = summarize(parsed.records);
      if (parsed.pagination.next) parsed.pagination.next = safeUrl(new URL(parsed.pagination.next, response.url).href);
      // No authenticated bodies or descriptions; only bounded event facts for these event APIs.
      Object.assign(result, summary, { pagination: parsed.pagination });
    } else {
      const json = JSON.parse(response.body);
      const rows = id === 'reddit' ? json.data?.children?.map(row => row.data) : id === 'discord' ? json : json.data;
      if (!Array.isArray(rows)) throw new Error('UNEXPECTED_ARRAY');
      result.count = rows.length;
      result.fieldNames = Object.keys(rows[0] ?? {});
      result.hasContentField = rows.some(row => Boolean(row.content ?? row.caption ?? row.selftext));
      result.hasPagination = Boolean(json.data?.after ?? json.paging?.next) || id === 'discord';
      result.note = 'No social text, authors, user IDs, account details, or raw authenticated payloads printed or saved. Post publication times are not event times.';
    }
  } catch { result.parseError = 'Unexpected API schema; authenticated body omitted.'; process.exitCode = 1; }
} else process.exitCode = 1;
console.log(JSON.stringify(result, null, 2));
