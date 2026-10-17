// Offline checks. Synthetic HTML below is a regression fixture, never real-source evidence.
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { parseNightlife, dateLabel } from './parse.mjs';
const html = '<div class="elementor-widget-text-editor"><p>Sunday</p><p>Open to close. $2 off pitchers.</p><p>Monday</p><p>7pm-12am $1.25 wings, dine in only.</p><p>7pm – 1am wine night.</p><p>Tuesday</p><p>7pm-1am $2.50 wells.</p></div>';
const rows = parseNightlife(html, 'salty-weekly', 'https://example.invalid/');
assert.equal(rows.length, 3);
assert(!rows[0].description.includes('wings'));
assert(rows[1].description.includes('dine in only'));
assert(!rows[1].description.includes('Tuesday') && !rows[1].description.includes('wells'));
assert.equal(rows[0].price, null, 'Discount must not become admission/item cost');
assert.equal(rows[1].start, null, 'Weekly offer must not become dated confirmation');
assert(rows[1].schedule.includes('12am') && rows[1].schedule.includes('1am'));
assert.equal(dateLabel('Oct 19 2026'), '2026-10-19');
assert.equal(dateLabel('October 19'), null, 'No invented year');
const dir = new URL('./evidence/', import.meta.url);
const names = (await readdir(dir)).filter(n => n.endsWith('.json'));
function retention(value, context = '') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach(v => retention(v, context)); return; }
  for (const [key, item] of Object.entries(value)) {
    if (key === 'fieldCoverage' || key === 'missingFromEveryRecord') continue;
    // Discovery stores bounded link labels, not recognized flyer text.
    if (key === 'text' && context.startsWith('discovery.json') && value.url && typeof item === 'string' && item.length <= 60) continue;
    assert(!/^(?:body|headers|raw|text|lines|words|caption|description|email|phone|attendees|cookies|access_token|authorization)$/i.test(key), `Raw/private/full OCR retained at ${context}/${key}`);
    if (['samples', 'offerExamples', 'datePhrases', 'timePhrases', 'timeRanges', 'prices', 'agePhrases'].includes(key)) assert(item.length <= 2, `Unbounded facts at ${context}/${key}`);
    if (typeof item === 'string') assert(!/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(item), `Contact address retained at ${context}/${key}`);
    retention(item, `${context}/${key}`);
  }
}
for (const file of names) retention(JSON.parse(await readFile(new URL(file, dir), 'utf8')), file);
const records = JSON.parse(await readFile(new URL('records.json', dir), 'utf8'));
const glory = records.find(r => r.id === 'glory-gainesville');
assert.equal(glory.count + glory.excludedNonGainesville, glory.rowsBeforeCityFilter);
assert(glory.samples.every(r => r.location.endsWith(', Gainesville')));
for (const r of records) {
  for (const count of Object.values(r.fieldCoverage ?? {})) assert(Number.isInteger(count) && count >= 0 && count <= r.count);
  if (r.dataKind === 'calendar-discovery-only') assert.equal(r.usefulEventRecordsParsed, false);
}
const flyers = JSON.parse(await readFile(new URL('flyers.json', dir), 'utf8'));
const review = JSON.parse(await readFile(new URL('manual-review.json', dir), 'utf8'));
let variants = 0;
for (const flyer of flyers) {
  const gold = review.records.find(r => r.id === flyer.id);
  assert.equal(gold.sha256, flyer.sha256, 'Manual annotations no longer match downloaded image');
  assert.equal(flyer.pageRequest.status, 200);
  assert.equal(flyer.imageRequest.status, 200);
  for (const record of Object.values(flyer.variants)) {
    assert(!record.error);
    assert.equal(record.fullTextRetained, false);
    assert(record.width > 0 && record.height > 0);
    variants++;
  }
}
const psFile = fileURLToPath(new URL('./ocr.ps1', import.meta.url));
const ps = spawnSync('powershell.exe', ['-NoProfile', '-Command', `$e=$null; $t=$null; $null=[System.Management.Automation.Language.Parser]::ParseFile('${psFile.replaceAll("'", "''")}',[ref]$t,[ref]$e); if($e.Count){exit 1}`], { encoding: 'utf8', timeout: 10000, windowsHide: true });
assert.equal(ps.status, 0, 'PowerShell parse failed or PowerShell unavailable');
const pyFile = fileURLToPath(new URL('./preprocess.py', import.meta.url));
const py = spawnSync('python', ['-c', 'import ast, pathlib, sys; ast.parse(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8"))', pyFile], { encoding: 'utf8', timeout: 10000, windowsHide: true });
assert.equal(py.status, 0, 'Python AST check failed or Python unavailable');
console.log(`PASS: day-boundary/price/date regressions, ${names.length} minimal evidence files, city/field counts, ${flyers.length} image hashes and ${variants} actual OCR variants, PowerShell/Python syntax. No network requests.`);
