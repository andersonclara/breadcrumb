// Offline report generation: reads only minimal evidence, never makes requests.
import { readdir, readFile, writeFile } from 'node:fs/promises';
const dir = new URL('./evidence/', import.meta.url);
const names = (await readdir(dir)).filter(n => n.endsWith('.json')).sort();
const cell = v => String(v ?? '—').replace(/\|/g, '\\|').replace(/[\r\n]/g, ' ');
const requests = [];
const inventories = [];
function walk(value, file, context = '') {
  if (!value || typeof value !== 'object') return;
  if (!Array.isArray(value)) {
    const label = value.id ?? value.source ?? context;
    if ((value.startedAt || value.testedAt) && value.url && Object.hasOwn(value, 'status')) {
      requests.push({ file, label: context || label, ...value });
    }
    if (Number.isInteger(value.count) && (value.fieldCoverage || value.usefulRecordsParsed != null)) {
      inventories.push({ file, label, value });
    }
    for (const [key, child] of Object.entries(value)) {
      if (['samples', 'examples', 'questions', 'robots', 'redirects'].includes(key)) continue;
      if (child && typeof child === 'object') walk(child, file, `${label}/${key}`);
    }
  } else value.forEach((v, i) => walk(v, file, `${context}[${i}]`));
}
for (const name of names) walk(JSON.parse(await readFile(new URL(name, dir), 'utf8')), name);
const cov = JSON.parse(await readFile(new URL('coverage.json', dir), 'utf8'));
const lines = [
  '# Second-pass execution evidence', '',
  'Generated offline from the minimal JSON files in [evidence/](evidence/). Dates/times are UTC. A 200 page or empty array is not working event retrieval. Null status means no content response: see the error and robots metadata. Requests here include discovery, policy and schema checks; do not count them as independent event sources.', '',
  'Every saved response was anonymous. Credentialed Calendar access was tested only through its local missing-access guard, with no request. Descriptions and contact/editor/attendee values were discarded. At most two factual samples per individual experiment/question are retained. A repeated source in two experiments is not additional coverage.', '',
  '## Main coverage snapshot', '',
  `Executed ${cov.testedAt}; timezone ${cov.timezone}. Window ${cov.windows.today} inclusive to ${cov.windows.horizonExclusive} exclusive. This counts starts, so ongoing multi-day events that started earlier may be omitted.`, '',
  '| Source | Returned | Starts in window | Location | Organizer | Price | Exact clocks | Assumed zone | Date only |',
  '|---|---:|---:|---:|---:|---:|---:|---:|---:|',
  ...cov.sourceMetrics.map(s => `| ${s.source} | ${s.count} | ${s.next30Days} | ${s.fieldCoverage.location} | ${s.fieldCoverage.organizer} | ${s.fieldCoverage.price} | ${s.exactClocks} | ${s.assumedCampusClocks} | ${s.dateOnly} |`), '',
  `${cov.totalReturned} rows; ${cov.next30DaysBeforeGrouping} starts in window; ${cov.conservativeGroupedCandidates} candidate groups after ${cov.duplicateExtraRecords} extra rows were grouped. This is neither a unique-event census nor a measure of independently corroborated events.`, '',
  '| Question | Candidates | Evidence support |', '|---|---:|---|',
  ...cov.questions.map(q => `| ${cell(q.question)} | ${q.candidateCount} | ${q.support} |`), '',
  'Full rule, missing-field, date-range, pagination, sample and limitation details: [coverage.json](evidence/coverage.json).', '',
  '## Parsed inventories outside the main snapshot', '',
  '| Test | Count | Relevant fields populated (count) | Evidence |', '|---|---:|---|---|',
  ...inventories.filter(i => i.file !== 'coverage.json').map(i => `| ${cell(i.label)} | ${i.value.count} | ${cell(Object.entries(i.value.fieldCoverage ?? {}).filter(([, n]) => n > 0).map(([k, n]) => `${k}: ${n}`).join(', ') || 'See evidence; count alone is not success')} | [${i.file}](evidence/${i.file}) |`), '',
  '## Exact executed requests', '',
  '| UTC start | Test/context | HTTP / error | Format | Exact URL | Evidence |', '|---|---|---|---|---|---|',
  ...requests.sort((a, b) => String(a.startedAt ?? a.testedAt).localeCompare(String(b.startedAt ?? b.testedAt))).map(r => `| ${r.startedAt ?? r.testedAt} | ${cell(r.id ?? r.source ?? r.label)} | ${cell(r.status ?? r.error ?? 'no request')} | ${cell(r.contentType)} | ${cell(r.url)} | [JSON](evidence/${r.file}) |`), '',
  '304 in the cache experiment is successful conditional validation. The generic HTTP helper labels non-2xx responses as errors; cache.mjs explicitly distinguishes 304. ArcGIS service errors can appear inside HTTP 200; closures.mjs also checks the JSON error field. Robots-policy metadata is retained with each request, and redirects are recorded in JSON.', '',
  '## Boundaries', '',
  'No raw payloads, social posts, authenticated data, cookies, secrets, recurring job, AI call, geocoder, routing service or production integration. The evidence files document retrieval, not redistribution permission. See [REPORT.md](REPORT.md) for source-specific interpretation and [OPPORTUNITIES.md](OPPORTUNITIES.md) for proposed experiments.', '',
];
await writeFile(new URL('./EVIDENCE.md', import.meta.url), lines.join('\n'));
console.log(`Generated EVIDENCE.md: ${requests.length} recorded request/policy outcomes, ${inventories.length} parsed inventory summaries.`);
