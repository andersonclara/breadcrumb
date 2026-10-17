// Regenerate timestamped evidence offline; never fetches source data.
import { readFile, writeFile } from 'node:fs/promises';
const read = async name => JSON.parse(await readFile(new URL(`./evidence/${name}.json`, import.meta.url), 'utf8'));
const [discovery, records, flyers] = await Promise.all(['discovery', 'records', 'flyers'].map(read));
const cell = v => String(v ?? '—').replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
const requestRow = (id, r) => `| ${cell(id)} | ${r.startedAt} | ${r.status ?? r.error} | ${cell(r.contentType)} | ${cell(r.url)} |`;
const lines = ['# Nightlife execution evidence', '',
  'Generated from the small public metadata/fact files in [evidence/](evidence/). UTC times. HTTP 200 alone is not event retrieval. Counts overlap across methods and are not a total of unique events. Full descriptions, raw pages, images and full OCR text are not retained here.', '',
  '## Event/offer experiments', '',
  '| Test | HTTP | Records | Location field | Date/start field | Cost field | Raw schedule | Evidence kind |', '|---|---:|---:|---:|---:|---:|---:|---|',
  ...records.map(r => `| ${r.id} | ${r.status ?? r.error} | ${r.count ?? 0} | ${r.fieldCoverage?.location ?? 0} | ${r.fieldCoverage?.start ?? 0} | ${r.fieldCoverage?.price ?? 0} | ${r.scheduleRecords ?? 0} | ${r.dataKind ?? 'failure'} |`), '',
  'All experiments are anonymous. Exact tested paging information, missing fields and at most two examples per experiment are in [records.json](evidence/records.json). Google embed counts are discovery leads, not retrieved calendar events. REST and iCal overlap; do not sum them.', '',
  '| Test | UTC start | HTTP/error | Format | Exact URL |', '|---|---|---|---|---|',
  ...records.map(r => requestRow(r.id, r)), '',
  '## Flyer OCR, local only', '',
  'Three actual publisher-linked images, checked visually against [manual-review.json](evidence/manual-review.json). Windows.Media.Ocr en-US plus installed OpenCV. Manual crops use explicitly chosen coordinates for one known layout; they are not automatic region detection. No external AI service was called.', '',
  '| Flyer | OCR UTC | Variant | Pixels | Words | Date candidates | Time/range candidates | Currency candidates | Age candidates |', '|---|---|---|---|---:|---|---|---|---|',
  ...flyers.flatMap(f => Object.entries(f.variants).map(([v, r]) => `| ${f.id} | ${f.testedAt} | ${v} | ${r.width ?? '?'}×${r.height ?? '?'} | ${r.wordCount ?? 0} | ${cell(r.datePhrases?.join('; '))} | ${cell(r.timeRanges?.join('; ') || r.timePhrases?.join('; '))} | ${cell(r.prices?.join('; '))} | ${cell(r.agePhrases?.join('; '))} |`)), '',
  '**A candidate is not a verified field.** The pride crop extracted `16-10 PM` from a flyer visibly saying `6-10 PM`; the $10 donation/wristband condition was not recovered. All three flyers omit year. Empty extraction is unknown, never free/all-ages. See [REPORT.md](REPORT.md).', '',
  '| Flyer request | UTC start | HTTP/error | Format | Exact URL |', '|---|---|---|---|---|',
  ...flyers.flatMap(f => [requestRow(`${f.id}: page`, f.pageRequest), ...(f.imageRequest ? [requestRow(`${f.id}: image`, f.imageRequest)] : [])]), '',
  'Full OCR is transient child-process output consumed in memory. Saved evidence includes hashes, dimensions, timing, counts and bounded factual tokens/signals only. Original images and OpenCV outputs remain in an ignored local workspace because automatic approval review rejected cleanup, including a narrower named-file attempt, with “blocked by policy.” They were not staged or committed. Publisher asset URLs/hashes provide provenance, not a republication license.', '',
  '## Breadth-first discovery', '',
  '| Source | UTC start | HTTP/error | Format | Exact URL |', '|---|---|---|---|---|',
  ...discovery.map(r => requestRow(r.id, r)), '',
  'Discovery details/feeds/business social links: [discovery.json](evidence/discovery.json). JJ’s failed DNS during robots lookup; Top Tier and Linktree had explicit exclusions. No content requests were sent for these stopped targets. Blackadder/Wooly/Swamp pages loaded but did not yield Event JSON-LD records. No unofficial Instagram requests, login attempts, guest lists or private event data.', '',
];
await writeFile(new URL('./EVIDENCE.md', import.meta.url), lines.join('\n'));
console.log(`Generated nightlife EVIDENCE.md: ${records.length} record/lead experiments, ${flyers.length} real flyers, ${discovery.length} discovery targets.`);
