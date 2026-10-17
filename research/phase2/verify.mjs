// Offline regression checks. Synthetic fixtures below test behavior, not source access.
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { interpretPolicyBody, safeUrl, AGENT } from '../lib/http.mjs';
import { clock, localInstant, localDay, addDays } from './time.mjs';

const robotsUrl = 'https://example.invalid/robots.txt';
let rules = interpretPolicyBody(robotsUrl, '<!doctype html><title>Ordinary application</title>');
assert.equal(rules.allowed, true);
assert.notEqual(rules.parser.isAllowed('https://example.invalid/events', AGENT), false);
rules = interpretPolicyBody(robotsUrl, '<html>\nUser-agent: *\nDisallow: /private\n</html>');
assert.equal(rules.parser.isAllowed('https://example.invalid/private', AGENT), false);
rules = interpretPolicyBody(robotsUrl, 'User-agent: *\nDisallow: /\nAllow: /public/\n');
assert.equal(rules.parser.isAllowed('https://example.invalid/events', AGENT), false);
assert.equal(rules.parser.isAllowed('https://example.invalid/public/event', AGENT), true);
for (const text of ['<html>Just a moment</html>', '<html>Verify you are human</html>', '<html>Access denied</html>']) {
  assert.equal(interpretPolicyBody(robotsUrl, text).allowed, false);
}
assert(!safeUrl('https://example.invalid/api?key=synthetic-value&token=synthetic-value&page=2').includes('synthetic-value'));

assert.equal(localInstant('2026-10-17T18:00:00').instant, Date.parse('2026-10-17T22:00:00Z'));
assert.equal(localInstant('2026-11-02T18:00:00').instant, Date.parse('2026-11-02T23:00:00Z'));
assert.equal(localInstant('2026-03-08T02:30:00').error, 'NONEXISTENT_LOCAL_CLOCK');
assert.equal(localInstant('2026-11-01T01:30:00').error, 'AMBIGUOUS_DST_CLOCK');
assert.equal(localInstant('2026-02-30T12:00:00').instant, null);
assert.equal(clock('2026-10-17', { zone: 'America/New_York' }).instant, null);
assert.equal(clock('2026-10-17T00:00:00-04:00', { allDay: true }).instant, null);
assert.equal(clock('2026-10-17T18:00:00').precision, 'unresolved-local');
assert.equal(clock('2026-10-17T18:00:00', { zone: 'America/New_York', inferredZone: true }).precision, 'assumed-campus-zone');
assert.equal(localDay(Date.parse('2026-10-18T01:00:00Z')), '2026-10-17');
assert.equal(addDays('2026-10-31', 2), '2026-11-02');

const dir = new URL('./evidence/', import.meta.url);
const files = (await readdir(dir)).filter(n => n.endsWith('.json'));
const forbidden = /^(?:body|raw|headers|description|contact_info|registration_owner_email|editor|attendees|password|access_token|userToken|phone|email|cookies|authorization)$/i;
let boundedExamples = 0;
function retention(value, context = '') {
  if (!value || typeof value !== 'object') return;
  if (Array.isArray(value)) { value.forEach(v => retention(v, context)); return; }
  for (const [key, item] of Object.entries(value)) {
    // Coverage/schema field names and counts are not retained field values.
    if (['fieldCoverage', 'missingFromEveryRecord', 'responseFields', 'recordFieldNames'].includes(key)) continue;
    assert(!forbidden.test(key), `Raw/private field retained: ${context}/${key}`);
    if (['samples', 'examples', 'duplicateExamples', 'foodEvidenceAudit'].includes(key)) {
      assert(Array.isArray(item) && item.length <= 2, `Unbounded examples: ${context}/${key}`);
      boundedExamples += item.length;
    }
    if (typeof item === 'string') {
      assert(!/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(item.replace(/[\w.-]+@group\.calendar\.google\.com/g, 'public-calendar')), `Contact address retained: ${context}/${key}`);
    }
    retention(item, `${context}/${key}`);
  }
}
for (const file of files) retention(JSON.parse(await readFile(new URL(file, dir), 'utf8')), file);
const cov = JSON.parse(await readFile(new URL('coverage.json', dir), 'utf8'));
assert.equal(cov.sourceMetrics.reduce((n, s) => n + s.count, 0), cov.totalReturned);
assert.equal(cov.sourceMetrics.reduce((n, s) => n + s.next30Days, 0), cov.next30DaysBeforeGrouping);
assert.equal(cov.conservativeGroupedCandidates + cov.duplicateExtraRecords, cov.next30DaysBeforeGrouping);
assert(cov.next30DaysBeforeGrouping <= cov.totalReturned);
for (const q of cov.questions) {
  assert(q.candidateCount >= q.examples.length);
  if (q.candidateCount === 0) assert.equal(q.support, 'NO_MATCH_IN_TESTED_SNAPSHOT');
}
assert.equal(cov.liveStockConfirmed, false);
for (const source of cov.sourceMetrics) {
  for (const count of Object.values(source.fieldCoverage)) assert(Number.isInteger(count) && count >= 0 && count <= source.count);
}
const closures = JSON.parse(await readFile(new URL('closures.json', dir), 'utf8'));
for (const layer of closures) {
  assert(!layer.requestedFields.some(f => /editor|user|email|creator|attach/i.test(f)));
  for (const request of layer.requests) {
    const outFields = new URL(request.url).searchParams.get('outFields');
    if (outFields) assert(outFields.split(',').every(f => layer.requestedFields.includes(f)) && !outFields.includes('*'));
  }
}
const guard = spawnSync(process.execPath, [fileURLToPath(new URL('./calendar-access.mjs', import.meta.url))], {
  encoding: 'utf8', timeout: 5000,
  env: { ...process.env, GOOGLE_CALENDAR_API_KEY: '', PUBLIC_CALENDAR_ORGANIZER_AUTHORIZED: '' },
});
assert.equal(guard.status, 2);
assert.equal(JSON.parse(guard.stdout).requestSent, false);
console.log(`PASS: robots/DST/date precision regressions, ${files.length} minimal evidence files, ${boundedExamples} bounded example facts, coverage arithmetic, GIS field selection and Calendar missing-access guard. Offline only.`);
