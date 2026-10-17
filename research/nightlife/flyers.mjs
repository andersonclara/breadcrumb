// Public publisher-linked flyers only. Original images/full OCR remain ignored/local.
import { get, metadata } from '../lib/http.mjs';
import { load } from 'cheerio';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const work = new URL('./private/flyers/', import.meta.url);
const manifestFile = new URL('./private/flyers/manifest.json', import.meta.url);
const references = [
  { id: 'pride', page: 'https://www.fmbrewing.com/event-calendar/pride-party', imagePattern: /PRIDE-PARTY/i },
  { id: 'festival', page: 'https://www.fmbrewing.com/event-calendar/florida-forever-festival', imagePattern: /FNPS_FFF/i },
  { id: 'karaoke', page: 'https://www.looseys.com/events/karaoke-party/', imagePattern: /Karaoke/i },
];
const local = process.argv.includes('--local');
await mkdir(work, { recursive: true });
let manifest = local ? JSON.parse(await readFile(manifestFile, 'utf8')) : [];
if (!local) {
  for (const reference of references) {
    const page = await get(reference.page); const entry = { id: reference.id, pageRequest: metadata(page) };
    if (page.body) {
      const $ = load(page.body);
      const image = $('main img,article img,.mec-events-event-image img').toArray().map(e => $(e).attr('data-src') ?? $(e).attr('src')).find(src => reference.imagePattern.test(src ?? ''));
      if (image) {
        const url = new URL(image, page.url).href;
        const response = await get(url, { binary: true }); entry.imageRequest = metadata(response);
        if (response.body && /^image\/(?:png|jpeg|webp)/i.test(response.contentType ?? '')) {
          entry.sha256 = createHash('sha256').update(response.body).digest('hex');
          entry.localName = `${reference.id}.image`;
          await writeFile(new URL(entry.localName, work), response.body);
        } else entry.error = response.error ?? 'UNSUPPORTED_IMAGE_RESPONSE';
      } else entry.error = 'ADVERTISED_POSTER_NOT_FOUND';
    } else entry.error = page.error;
    manifest.push(entry); console.log(JSON.stringify({ id: entry.id, pageStatus: page.status, imageStatus: entry.imageRequest?.status, error: entry.error, localName: entry.localName }));
  }
  await writeFile(manifestFile, JSON.stringify(manifest, null, 2));
}
if (process.argv.includes('--prepare')) { console.log('Prepared ignored local images; run --local for OCR without new downloads.'); process.exit(0); }
function recognize(path) {
  const started = Date.now();
  const run = spawnSync('powershell.exe', ['-NoProfile', '-File', fileURLToPath(new URL('./ocr.ps1', import.meta.url)), '-ImagePath', path], { encoding: 'utf8', timeout: 60000, maxBuffer: 2e6, windowsHide: true });
  let data;
  try { data = JSON.parse(run.stdout.replace(/^\uFEFF/, '').trim()); } catch { return { error: 'OCR_PROCESS_NO_JSON', exitCode: run.status }; }
  if (run.status !== 0) return { error: data.error ?? 'OCR_FAILED', message: data.message, exitCode: run.status };
  const text = data.text.replace(/\s+/g, ' ');
  const matches = regex => [...new Set([...text.matchAll(regex)].map(m => m[0]))].slice(0, 2);
  return { engine: data.engine, language: data.language, elapsedMs: Date.now() - started, width: data.width, height: data.height, lineCount: data.lines.length, wordCount: data.lines.reduce((n, l) => n + l.words.length, 0),
    datePhrases: matches(/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+\d{1,2}(?:st|nd|rd|th)?\b/gi),
    timePhrases: matches(/\b\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/gi),
    timeRanges: matches(/\b\d{1,2}(?::\d{2})?\s*[-–]\s*\d{1,2}(?::\d{2})?\s*(?:AM|PM)\b/gi),
    prices: matches(/\$\s*\d+(?:\.\d{2})?/g),
    agePhrases: matches(/\b(?:18|21)\s*\+/g),
    // Small literal signals, not full transcription or a claimed event classifier.
    signals: Object.fromEntries(['pride', 'party', 'festival', 'karaoke', 'free', 'first magnitude', 'loosey'].map(term => [term, text.toLowerCase().includes(term)])),
    yearDetected: /\b20\d{2}\b/.test(text),
    fullTextRetained: false,
  };
}
const results = [];
for (const entry of manifest) {
  const { localName, ...publicEntry } = entry;
  const result = { ...publicEntry, testedAt: new Date().toISOString(), variants: {} };
  if (localName) {
    const imagePath = fileURLToPath(new URL(localName, work));
    result.variants.original = recognize(imagePath);
    const output = fileURLToPath(new URL(`${entry.id}/`, work));
    const cv = spawnSync('python', [fileURLToPath(new URL('./preprocess.py', import.meta.url)), imagePath, output, ...(entry.id === 'pride' ? ['--pride-regions'] : [])], { encoding: 'utf8', timeout: 60000, windowsHide: true });
    if (cv.status === 0) {
      const variants = JSON.parse(cv.stdout); result.opencv = variants.opencv; result.scale = variants.scale;
      for (const [name, path] of Object.entries(variants.outputs)) result.variants[name] = recognize(path);
    } else result.preprocessError = 'OPENCV_PREPROCESS_FAILED_OR_UNAVAILABLE';
  }
  results.push(result); console.log(JSON.stringify(result, null, 2));
}
if (process.argv.includes('--save')) {
  await mkdir(new URL('./evidence/', import.meta.url), { recursive: true });
  await writeFile(new URL('./evidence/flyers.json', import.meta.url), JSON.stringify(results, null, 2) + '\n');
}
// Only this fixed research workspace is eligible for cleanup; never delete user inputs.
if (process.argv.includes('--cleanup')) {
  const target = fileURLToPath(work);
  const expected = fileURLToPath(new URL('./private/', import.meta.url));
  if (!target.startsWith(expected) || target === expected) throw new Error('UNSAFE_CLEANUP_TARGET');
  await rm(work, { recursive: true, force: true });
  console.log('Removed the fixed ignored flyer workspace; evidence contains only metadata and bounded facts.');
}
