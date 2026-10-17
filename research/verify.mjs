// Offline checks. Credential values are explicitly cleared before subprocesses.
import assert from 'node:assert/strict';
import { readdir, readFile, access } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('.', import.meta.url));
async function files(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const result = [];
  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.env')) continue;
    const name = path.join(dir, entry.name);
    result.push(...(entry.isDirectory() ? await files(name) : [name]));
  }
  return result;
}
const names = await files(root);
const scripts = names.filter(name => name.endsWith('.mjs'));
for (const file of scripts) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  assert.equal(result.status, 0, `Syntax failure: ${path.relative(root, file)}`);
}
const sampleFiles = names.filter(name => name.endsWith('.json') && path.basename(path.dirname(name)) === 'samples' && path.basename(name) !== 'discovery.json');
const allowedSampleFields = new Set(['name', 'start', 'end', 'timezone', 'location', 'url', 'category', 'price', 'recurrence', 'allDay', 'publishedAt', 'schedule']);
let parsed = 0;
for (const file of sampleFiles) {
  const item = JSON.parse(await readFile(file, 'utf8'));
  assert(!Object.hasOwn(item, 'body') && !Object.hasOwn(item, 'headers'), 'Raw payload/headers retained');
  assert.equal(item.authentication, 'none', 'Authenticated sample retained');
  assert((item.samples?.length ?? 0) <= 2, 'Too many retained samples');
  for (const row of item.samples ?? []) for (const key of Object.keys(row)) assert(allowedSampleFields.has(key), `Disallowed sample field: ${key}`);
  for (const count of Object.values(item.fieldCoverage ?? {})) assert(Number.isInteger(count) && count >= 0 && count <= item.count, 'Invalid field count');
  if (item.usefulRecordsParsed) { assert(item.count > 0 && item.status === 200); parsed++; }
}
const secretNames = ['YIKYAK_PHONE', 'TICKETMASTER_API_KEY', 'EVENTBRITE_TOKEN', 'EVENTBRITE_ORGANIZATION_ID', 'EVENTBRITE_ORGANIZER_AUTHORIZED', 'REDDIT_ACCESS_TOKEN', 'REDDIT_USER_AGENT', 'REDDIT_APPROVED', 'DISCORD_BOT_TOKEN', 'DISCORD_CHANNEL_ID', 'DISCORD_CHANNEL_AUTHORIZED', 'INSTAGRAM_ACCESS_TOKEN', 'INSTAGRAM_USER_ID', 'INSTAGRAM_API_VERSION', 'INSTAGRAM_ORGANIZER_AUTHORIZED'];
const safeEnv = { ...process.env, ...Object.fromEntries(secretNames.map(name => [name, ''])) };
for (const source of ['ticketmaster', 'eventbrite', 'reddit', 'discord', 'instagram']) {
  const result = spawnSync(process.execPath, [path.join(root, 'access/test.mjs'), source], { encoding: 'utf8', env: safeEnv, timeout: 5000 });
  assert.equal(result.status, 2, `${source}: missing-access guard failed`);
  const json = JSON.parse(result.stdout);
  assert.equal(json.requestSent, false);
  assert.equal(json.httpStatus, null);
}
const yikyak = spawnSync(process.execPath, [path.join(root, 'yikyak/test.mjs')], { encoding: 'utf8', env: safeEnv, timeout: 5000 });
assert.equal(yikyak.status, 1, 'Yik Yak missing-phone guard failed');
assert(!yikyak.stdout.includes('Requesting SMS'), 'SMS attempted without phone');
const preserved = await readFile(path.join(root, 'yikyak/test.mjs'), 'utf8');
assert(preserved.includes('const PHONE = process.env.YIKYAK_PHONE;'));
assert(!/const PHONE\s*=\s*["']\d/.test(preserved), 'Hardcoded phone');
let links = 0;
for (const file of names.filter(name => name.endsWith('.md'))) {
  const markdown = await readFile(file, 'utf8');
  for (const match of markdown.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1];
    if (/^https?:|^#/.test(target)) continue;
    await access(path.resolve(path.dirname(file), target.split('#')[0]));
    links++;
  }
}
console.log(`PASS: ${scripts.length} scripts parse; ${sampleFiles.length} public evidence files (${parsed} with records); 6 missing-access guards; ${links} local documentation links. No network tests run by verify.mjs.`);
