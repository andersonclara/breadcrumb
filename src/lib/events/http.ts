import robotsParser from 'robots-parser';

const AGENT = 'BreadcrumbEvents';
const headers = {'User-Agent':`${AGENT}/1.0 (UF public event feed importer)`,Accept:'application/json, application/rss+xml, text/calendar, text/html;q=0.9, */*;q=0.5'};
export async function boundedBytes(response: Response, max = 6_000_000) {
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const {done,value} = await reader.read(); if (done) break;
      size += value.length; if (size > max) throw new Error('response_too_large');
      chunks.push(value);
    }
  } finally { await reader.cancel().catch(()=>{}); }
  return Buffer.concat(chunks);
}
export async function boundedText(response: Response, max = 6_000_000) {return (await boundedBytes(response,max)).toString('utf8');}
export type FeedResponse = {body:string; status:number; etag:string|null; modified:string|null; cacheSeconds:number};
export function feedClient(allowedOrigins: string[], fetcher: typeof fetch = fetch, deadline=Date.now()+240000) {
  const policies = new Map<string,ReturnType<typeof robotsParser> | null>();
  const stopped = new Set<string>(); const last = new Map<string,number>();
  async function request(input: string, extra: Record<string,string> = {}) {
    const url = new URL(input);
    if(Date.now()+1000>=deadline)throw new Error('job_deadline');
    if (url.protocol !== 'https:' || url.username || url.password || !allowedOrigins.includes(url.origin)) throw new Error('source_url_not_allowed');
    if (stopped.has(url.origin)) throw new Error('origin_stopped');
    const response = await fetcher(url,{headers:{...headers,...extra},redirect:'manual',signal:AbortSignal.timeout(Math.max(1,Math.min(20000,deadline-Date.now())))});
    if ([401,403,429].includes(response.status)) stopped.add(url.origin);
    // No challenge solving, alternate hosts, or hidden API discovery.
    return response;
  }
  return async (url: string, conditional: {etag?:string|null;modified?:string|null} = {}): Promise<FeedResponse> => {
    const origin = new URL(url).origin;
    if (!policies.has(origin)) {
      const policyUrl = `${origin}/robots.txt`; const response = await request(policyUrl);
      if ([404,410].includes(response.status)) { await response.body?.cancel(); policies.set(origin,null); }
      else {
        if (response.status !== 200) { await response.body?.cancel(); throw new Error(`robots_http_${response.status}`); }
        const body = await boundedText(response,500000);
        if (/captcha|cf-chl-|verify (?:you are|that you are) human|access denied/i.test(body)) throw new Error('robots_challenge');
        policies.set(origin,robotsParser(policyUrl,body));
      }
    }
    const policy = policies.get(origin);
    if (policy?.isAllowed(url,AGENT) === false) throw new Error('robots_disallowed');
    const delay = Math.max(1100,(policy?.getCrawlDelay(AGENT) ?? 0)*1000);
    if (delay > 30000) throw new Error('crawl_delay_exceeds_job_window');
    const remaining = delay - (Date.now() - (last.get(origin) ?? 0));
    if(Date.now()+Math.max(remaining,0)+1000>=deadline)throw new Error('job_deadline');
    if (remaining > 0) await new Promise(resolve=>setTimeout(resolve,remaining));
    last.set(origin,Date.now());
    const extra: Record<string,string> = {};
    if (conditional.etag) extra['If-None-Match'] = conditional.etag;
    if (conditional.modified) extra['If-Modified-Since'] = conditional.modified;
    const response = await request(url,extra);
    if (response.status !== 304 && !response.ok) { await response.body?.cancel(); throw new Error(`source_http_${response.status}`); }
    const body = response.status === 304 ? '' : await boundedText(response);
    if (response.status === 304) await response.body?.cancel();
    const cache = response.headers.get('cache-control')?.match(/(?:s-maxage|max-age)=(\d+)/)?.[1];
    return {body,status:response.status,etag:response.headers.get('etag'),modified:response.headers.get('last-modified'),cacheSeconds:Math.min(Number(cache ?? 0),604800)};
  };
}
