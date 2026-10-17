import { readdir, readFile, writeFile } from 'node:fs/promises';
const dir = new URL('./samples/', import.meta.url);
const files = (await readdir(dir)).filter(file => file.endsWith('.json') && file !== 'discovery.json').sort();
const evidence = [];
for (const file of files) evidence.push(JSON.parse(await readFile(new URL(file, dir), 'utf8')));
const cell = value => String(value ?? '—').replaceAll('|', '\\|').replaceAll('\n', ' ');
let markdown = '# Executed public retrieval evidence\n\nGenerated from retained metadata only. Each experiment is independent. No authenticated social data was collected. Counts are returned records, not necessarily unique events or expanded recurrence instances. `null` HTTP means no content request completed; inspect the error and robots metadata. Dates are UTC timestamps of requests. Field counts describe what the parser extracted, not guarantees for the source as a whole.\n\n';
markdown += '| Experiment / exact endpoint | Test start (UTC) | HTTP / response format | Parsed records | Location / start / end | Pagination |\n|---|---|---|---:|---|---|\n';
for (const result of evidence) {
  const coverage = result.fieldCoverage;
  const page = result.pagination;
  const pagination = page?.total ? `Reported total ${page.total}; pages ${page.totalPages ?? '?'}` : page?.next ? 'Next URL returned' : 'Not established / feed snapshot';
  markdown += `| [${cell(result.id)}](${result.requestedUrl ?? result.url}) ([metadata](samples/${result.id}.json)) | ${cell(result.startedAt)} | ${cell(result.status)} / ${cell(result.contentType ?? result.error)} | ${cell(result.count)} | ${coverage ? `${coverage.location} / ${coverage.start} / ${coverage.end}` : '—'} | ${cell(pagination)} |\n`;
}
markdown += '\n## Extracted field coverage\n\nEvery test above is anonymous; authentication is `none`. Social/API tests that require credentials are covered separately in [FINDINGS.md](FINDINGS.md) and [access/README.md](access/README.md). Full descriptions, contact values, and images are omitted from retained samples.\n\n| Experiment | Name | Description | Venue | Start | End | Organizer/host field | Price | Categories | Coordinates |\n|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|\n';
for (const result of evidence.filter(item => item.fieldCoverage)) {
  const c = result.fieldCoverage;
  markdown += `| ${result.id} | ${c.name} | ${c.description} | ${c.location} | ${c.start} | ${c.end} | ${c.organizer} | ${c.price} | ${c.category} | ${Math.min(c.latitude, c.longitude)} |\n`;
}
markdown += '\n## Discovery requests (not event validation)\n\n| Source | Exact page / intended endpoint | Request start (UTC) | HTTP | Robots HTTP | Finding |\n|---|---|---|---|---|---|\n';
const discovered = JSON.parse(await readFile(new URL('discovery.json', dir), 'utf8'));
for (const result of discovered) markdown += `| ${result.id} | ${result.requestedUrl ?? result.url} | ${result.startedAt} | ${cell(result.status)} | ${cell(result.robots?.status)} | ${cell(result.error ? `${result.error}; ${result.robots?.note ?? ''}` : result.title)} |\n`;
markdown += '\nRetest: `node research/test.mjs EXPERIMENT`; regenerate this document with `node research/report.mjs`. Use `--save` on public tests only when intentionally replacing the small metadata snapshot. Homepage discovery: `node research/discover.mjs SOURCE`. No scripts automatically follow pagination or fetch all event detail pages.\n';
await writeFile(new URL('./RESULTS.md', import.meta.url), markdown);
console.log(`Generated research/RESULTS.md from ${evidence.length} experiments and ${discovered.length} discovery records.`);
