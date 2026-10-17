import robotsParser from 'robots-parser';

export const AGENT = 'BreadcrumbResearch';
const policies = new Map();
const lastRequest = new Map();
const stoppedOrigins = new Set();
const headers = { 'User-Agent': `${AGENT}/0.1 (read-only campus-source feasibility research)`, Accept: '*/*' };

// Pure policy interpretation; exported for offline regression checks.
export function interpretPolicyBody(url, body) {
  const html = /^\s*</.test(body);
  if (html && /just a moment|verify (?:you are|that you are) human|access denied|cf-chl-|captcha challenge/i.test(body)) {
    return { url, status: 200, allowed: false, note: 'Challenge/denial HTML at robots URL; stop without solving or bypassing.' };
  }
  // RFC 9309 sections 2.2.1 and 2.3.1.5: honor every parseable rule.
  return { url, status: 200, parser: robotsParser(url, body), allowed: true,
    note: html ? 'HTML fallback at robots URL; parseable directives still honored. No directives is not a reuse license. See RFC 9309.' : undefined };
}

export function safeUrl(input) {
  const url = new URL(input);
  for (const key of [...url.searchParams.keys()]) {
    if (/key|token|secret|code/i.test(key)) url.searchParams.set(key, '[REDACTED]');
  }
  return url.href;
}

async function boundedBody(response, binary = false) {
  const chunks = [];
  let size = 0;
  if (!response.body) return '';
  for await (const chunk of response.body) {
    size += chunk.length;
    if (size > 6_000_000) throw new Error('BODY_LIMIT');
    chunks.push(chunk);
  }
  const buffer = Buffer.concat(chunks);
  return binary ? buffer : buffer.toString('utf8');
}

async function policy(origin) {
  if (policies.has(origin)) return policies.get(origin);
  const pending = (async () => {
    const url = `${origin}/robots.txt`;
    try {
      // Ordinary robots redirects are not access-control bypasses.
      const response = await fetch(url, { headers, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (response.status === 404 || response.status === 410) return { url, status: response.status, allowed: true, note: 'No robots file; not a reuse license.' };
      if (response.status !== 200) return { url, status: response.status, allowed: false, note: 'Robots policy unavailable or redirected; conservative stop.' };
      const body = await boundedBody(response);
      return interpretPolicyBody(url, body);
    } catch (error) {
      return { url, status: null, allowed: false, note: `Robots fetch failed: ${error.cause?.code ?? error.name}` };
    }
  })();
  policies.set(origin, pending);
  return pending;
}

export async function get(input, { authenticated = false, extraHeaders = {}, binary = false } = {}) {
  const startedAt = new Date().toISOString();
  let current = input;
  const redirects = [];
  for (let hop = 0; hop < 5; hop++) {
    const url = new URL(current);
    if (url.protocol !== 'https:') return { startedAt, url: safeUrl(current), status: null, error: 'HTTPS_REQUIRED', redirects };
    if (stoppedOrigins.has(url.origin)) return { startedAt, url: safeUrl(current), status: null, error: 'ORIGIN_STOP_AFTER_DENIAL_OR_RATE_LIMIT', redirects };
    const rules = await policy(url.origin);
    const allowed = rules.allowed && rules.parser?.isAllowed(current, AGENT) !== false;
    const robots = { url: rules.url, status: rules.status, allowed, note: rules.note, crawlDelay: rules.parser?.getCrawlDelay(AGENT) ?? null };
    if (!allowed) return { startedAt, url: safeUrl(current), status: null, error: 'ROBOTS_STOP', robots, redirects };
    try {
      const delay = Math.max(1100, (robots.crawlDelay ?? 0) * 1000);
      const remaining = delay - (Date.now() - (lastRequest.get(url.origin) ?? 0));
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
      lastRequest.set(url.origin, Date.now());
      const response = await fetch(current, { headers: { ...headers, ...extraHeaders }, redirect: 'manual', signal: AbortSignal.timeout(25000) });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) throw new Error('REDIRECT_WITHOUT_LOCATION');
        const next = new URL(location, current).href;
        redirects.push({ url: safeUrl(current), status: response.status, to: safeUrl(next) });
        if (authenticated && new URL(next).origin !== url.origin) throw new Error('AUTH_CROSS_ORIGIN_REDIRECT_STOP');
        current = next;
        await response.body?.cancel();
        continue;
      }
      const result = { startedAt, completedAt: new Date().toISOString(), requestedUrl: safeUrl(input), url: safeUrl(current), status: response.status, contentType: response.headers.get('content-type'), cache: { etag: response.headers.get('etag'), lastModified: response.headers.get('last-modified'), cacheControl: response.headers.get('cache-control'), age: response.headers.get('age') }, robots, redirects };
      if (!response.ok) {
        if ([401, 403, 429].includes(response.status)) stoppedOrigins.add(url.origin);
        await response.body?.cancel();
        return { ...result, error: `HTTP_${response.status}`, retryAfter: response.headers.get('retry-after') };
      }
      return { ...result, body: await boundedBody(response, binary) };
    } catch (error) {
      return { startedAt, completedAt: new Date().toISOString(), requestedUrl: safeUrl(input), url: safeUrl(current), status: null, robots, redirects, error: error.cause?.code ?? error.name };
    }
  }
  return { startedAt, url: safeUrl(current), status: null, error: 'REDIRECT_LIMIT', redirects };
}

export function metadata(response) {
  const { body, ...rest } = response;
  return { ...rest, bytes: body ? Buffer.byteLength(body) : 0 };
}
