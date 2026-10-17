// Print field names and types, never raw payloads or identifying values.
import { XMLParser } from 'fast-xml-parser';
import { get, metadata } from './lib/http.mjs';
for (const url of process.argv.slice(2)) {
  const response = await get(url);
  console.log(JSON.stringify(metadata(response)));
  if (!response.body) continue;
  try {
    const data = response.contentType?.includes('json') ? JSON.parse(response.body) : new XMLParser({ ignoreAttributes: false }).parse(response.body);
    const rows = Array.isArray(data) ? data : data.rss?.channel?.item ?? data.data ?? data.events ?? data.results ?? data.items ?? [];
    const row = Array.isArray(rows) ? rows[0] : rows;
    console.log(JSON.stringify({ topLevelFields: Object.keys(data), rowShape: Object.fromEntries(Object.entries(row ?? {}).map(([key, value]) => [key, Array.isArray(value) ? 'array' : value === null ? 'null' : typeof value])), locationShape: row?.location && typeof row.location === 'object' ? Object.keys(row.location) : null, venueShape: row?.venue && typeof row.venue === 'object' ? Object.keys(row.venue) : null, libcalTemporalSample: row?.['libcal:date'] ? { date: row['libcal:date'], start: row['libcal:start'], end: row['libcal:end'] } : undefined }, null, 2));
  } catch { console.error('Not parseable as the expected public JSON/XML; raw body omitted.'); }
}
