// Diagnostic reads of robots.txt only; no challenges are solved and no identity changes.
import { createHash } from 'node:crypto';
import { load } from 'cheerio';
import { mkdir, writeFile } from 'node:fs/promises';
const results = [];
for (const origin of process.argv.slice(2).filter(arg => !arg.startsWith('--'))) {
  const url = new URL('/robots.txt', origin).href;
  try {
    const response = await fetch(url, { headers: { 'User-Agent': 'BreadcrumbResearch/0.1 (read-only policy diagnosis)' }, signal: AbortSignal.timeout(20000) });
    const body = (await response.text()).slice(0, 100000);
    const html = /^\s*</.test(body);
    const result = { testedAt: new Date().toISOString(), url, finalUrl: response.url, status: response.status, contentType: response.headers.get('content-type'), html, title: html ? load(body)('title').text().slice(0, 100) : undefined, challengeIndicators: html && /just a moment|verify (?:you are|that you are) human|access denied|cf-chl-|captcha challenge/i.test(body), directives: body.split(/\r?\n/).filter(line => /^\s*(?:user-agent|allow|disallow|crawl-delay)\s*:/i.test(line)).slice(0, 30), hash: createHash('sha256').update(body).digest('hex') };
    results.push(result); console.log(JSON.stringify(result, null, 2));
  } catch (error) { const result = { url, status: null, error: error.cause?.code ?? error.name }; results.push(result); console.log(JSON.stringify(result)); }
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  await writeFile(new URL('./evidence/policy-diagnostics.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
}
