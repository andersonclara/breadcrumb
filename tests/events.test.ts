import {describe,it,expect,vi,afterEach} from 'vitest';
import {instant,normalizeEvent} from '../src/lib/events/model';
import {parseFeed} from '../src/lib/events/parsers';
import {sources,instagramAccounts} from '../src/lib/events/sources';
import {instagramPlan,normalizePosts,apifyClient} from '../src/lib/events/instagram';
import {feedClient} from '../src/lib/events/http';
import {validCron} from '../src/lib/events/cron';
import {validateExtractionBatch} from '../src/lib/events/extract';

it('publishes only an explicitly supplied factual summary, never the raw caption',()=>{
 const input={id:'summary',title:'Campus workshop',url:'https://example.test/event',start:'2026-10-19T18:00:00Z',venue:'Reitz',description:'Long private publisher caption'};
 expect(normalizeEvent(input,'instagram').event?.description).toBeNull();
 expect(normalizeEvent({...input,summary:'<b>A hands-on workshop.</b>'},'instagram').event?.description).toBe('A hands-on workshop.');
});

const source=(id:string)=>sources.find(s=>s.id===id)!;
afterEach(()=>vi.unstubAllEnvs());
describe('event clocks and evidence',()=>{
 it('converts Eastern clocks and rejects DST gaps/ambiguity',()=>{
  expect(instant('2026-10-20T18:00:00','America/New_York')).toBe('2026-10-20T22:00:00.000Z');
  expect(instant('2026-03-08T02:30:00','America/New_York')).toBeNull();
  expect(instant('2026-11-01T01:30:00','America/New_York')).toBeNull();
  expect(instant('2026-02-30T18:00:00','America/New_York')).toBeNull();
  expect(instant('2026-02-30T18:00:00Z')).toBeNull();
  expect(instant('2026-10-20T18:00:00')).toBeNull();
 });
 it('preserves date-only precision without inventing an advertised time',()=>{
  const {event}=normalizeEvent({id:'1',title:'Exhibit',url:'https://example.org/event',start:'2026-10-20',timezone:'America/New_York',venue:'Museum'} ,'test');
  expect(event).toMatchObject({all_day:true,event_date:'2026-10-20',starts_at:'2026-10-20T04:00:00.000Z',ingestion_status:'published'});
 });
 it('quarantines bad end times and known timezone conflicts',()=>{
  const {event}=normalizeEvent({id:'1',title:'Meeting',url:'https://example.org/event',start:'2026-10-20T18:00Z',end:'2026-10-20T17:00Z',venue:'Union',issues:['publisher_timezone_conflict']},'test');
  expect(event?.ingestion_status).toBe('needs_review');expect(event?.ends_at).toBeNull();
  expect(event?.review_reasons).toContain('invalid_end');
 });
 it('reads namespaced RSS values and does not confuse publication with event time',()=>{
  const body='<rss><channel><item><title>Workshop</title><guid>1</guid><link>https://example.org/1</link><pubDate>Tue, 20 Oct 2026 01:00:00 GMT</pubDate><start xmlns="events">Tue, 20 Oct 2026 22:00:00 GMT</start><end xmlns="events">Tue, 20 Oct 2026 23:00:00 GMT</end><location xmlns="events">Reitz Union</location></item></channel></rss>';
  const input=parseFeed(body,source('gatorconnect')).events[0];
  expect(normalizeEvent(input,'test').event).toMatchObject({starts_at:'2026-10-20T22:00:00.000Z',venue_text:'Reitz Union'});
  const missing=parseFeed(body.replace(/<start[^>]*>.*?<\/start>/,''),source('gatorconnect')).events[0];
  expect(normalizeEvent(missing,'test').event).toBeNull();
 });
 it('flags recurring iCal records instead of pretending a series is one timed event',()=>{
  const body='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nBEGIN:VEVENT\r\nUID:test\r\nSUMMARY:Workshop\r\nDTSTART:20261020T220000Z\r\nDTEND:20261020T230000Z\r\nRRULE:FREQ=WEEKLY\r\nLOCATION:Union\r\nURL:https://example.org/1\r\nEND:VEVENT\r\nEND:VCALENDAR';
  const input=parseFeed(body,source('gainesvilleevents')).events[0];
  expect(normalizeEvent(input,'test').event?.review_reasons).toContain('recurrence_requires_expansion');
 });
 it('detects JSON pagination, cancellation and all-day flags',()=>{
  const parsed=parseFeed(JSON.stringify({page:1,total_pages:2,results:[{id:1,title:'Exhibit',url:'/event/1',date_iso:'2026-10-20',is_all_day:1,is_canceled:1,location:'Museum'}]}),source('uf-calendar'));
  expect(parsed.hasNext).toBe(true);expect(normalizeEvent(parsed.events[0],'test').event?.ingestion_status).toBe('cancelled');
 });
 it('preserves separate LiveWhale occurrences that share an event ID',()=>{
  const parsed=parseFeed(JSON.stringify({results:[{id:1,title:'Exhibit',date_iso:'2026-10-20T00:00:00-04:00'},{id:1,title:'Exhibit',date_iso:'2026-10-21T00:00:00-04:00'}]}),source('uf-calendar'));
  expect(parsed.events[0].id).not.toBe(parsed.events[1].id);
 });
});
describe('Instagram bootstrap cost and retention',()=>{
 it('requires exactly the requested post identities in each extraction batch',()=>{
  expect(validateExtractionBatch({posts:[{source_id:'2',events:[]},{source_id:'1',events:[]}]},['1','2']).size).toBe(2);
  expect(()=>validateExtractionBatch({posts:[{source_id:'1',events:[]},{source_id:'1',events:[]}]},['1','2'])).toThrow('gemini_post_identity_mismatch');
  expect(()=>validateExtractionBatch({posts:[{source_id:'3',events:[]}]},['1'])).toThrow('gemini_post_identity_mismatch');
  expect(validateExtractionBatch({posts:[{source_id:'1',events:[{title:'Incomplete candidate'}]}]},['1']).has('1')).toBe(true);
 });
 it('requests 150 posts across exactly the supplied 32 accounts with at most $5 combined',()=>{
  const batches=instagramPlan();expect(instagramAccounts).toHaveLength(32);
  expect(batches.flatMap(b=>b.accounts)).toEqual(instagramAccounts);
  expect(batches.reduce((sum,b)=>sum+b.accounts.length*b.perAccount,0)).toBe(150);
  expect(batches.reduce((sum,b)=>sum+b.maxUsd,0)).toBe(5);
 });
 it('deduplicates posts, rejects unrelated accounts, and drops comments and engagement',()=>{
  const post={id:'1',ownerUsername:'UFStudentEngagement',url:'https://www.instagram.com/p/one/',timestamp:'2026-10-17T12:00:00Z',caption:'Meeting October 20',comments:[{text:'private'}],likesCount:500};
  const normalized=normalizePosts([post,post,{...post,id:'2',ownerUsername:'some_student'}]);
  expect(normalized).toHaveLength(1);expect(normalized[0].payload).not.toHaveProperty('comments');expect(normalized[0].payload).not.toHaveProperty('likesCount');
 });
 it('retains reposts only when the provider traces them to a watchlisted profile',()=>{
  const post={id:'1',ownerUsername:'guest_performer',url:'https://www.instagram.com/p/one/',inputUrl:'https://www.instagram.com/floridagators/'};
  expect(normalizePosts([post])[0]).toMatchObject({account_handle:'floridagators',payload:{original_account_handle:'guest_performer'}});
  expect(normalizePosts([{...post,inputUrl:'https://example.org/floridagators/'}])).toHaveLength(0);
 });
 it('caps retained results at 150 and sorts by publication time',()=>{
  const items=Array.from({length:170},(_,i)=>({id:String(i),ownerUsername:'uflib',url:`https://www.instagram.com/p/${i}/`,timestamp:new Date(Date.UTC(2026,9,1,0,i)).toISOString()}));
  const posts=normalizePosts(items);expect(posts).toHaveLength(150);expect(posts[0].source_id).toBe('169');
 });
 it('does not retry a failed Apify call or put credentials in the URL',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('denied',{status:429}));
  await expect(apifyClient('test-token',fetcher)('/v2/actor-runs/1')).rejects.toThrow('apify_http_429');
  expect(fetcher).toHaveBeenCalledTimes(1);expect(fetcher.mock.calls[0][0]).not.toContain('test-token');
 });
});
describe('feed requests and cron protection',()=>{
 it('stops at robots exclusions before requesting the feed',async()=>{
  const fetcher=vi.fn().mockResolvedValue(new Response('User-agent: *\nDisallow: /feed'));
  const get=feedClient(['https://example.org'],fetcher);
  await expect(get('https://example.org/feed')).rejects.toThrow('robots_disallowed');expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('rejects unlisted origins without making a request',async()=>{
  const fetcher=vi.fn();await expect(feedClient(['https://example.org'],fetcher)('http://127.0.0.1/secret')).rejects.toThrow('source_url_not_allowed');expect(fetcher).not.toHaveBeenCalled();
 });
 it('sends conditional headers and handles 304 responses',async()=>{
  const fetcher=vi.fn().mockResolvedValueOnce(new Response('',{status:404})).mockResolvedValueOnce(new Response(null,{status:304,headers:{etag:'"v1"','cache-control':'max-age=7200'}}));
  const result=await feedClient(['https://example.org'],fetcher)('https://example.org/feed',{etag:'"v1"'});
  expect(result).toMatchObject({status:304,body:'',cacheSeconds:7200});expect(fetcher.mock.calls[1][1].headers['If-None-Match']).toBe('"v1"');
 });
 it('fails closed with missing/short cron secrets and accepts only the exact bearer secret',()=>{
  const request=(value:string)=>new Request('https://example.org/api/cron/events',{headers:{authorization:value}});
  vi.stubEnv('CRON_SECRET','');expect(validCron(request('Bearer '))).toBe(false);
  vi.stubEnv('CRON_SECRET','x'.repeat(40));expect(validCron(request(`Bearer ${'x'.repeat(40)}`))).toBe(true);expect(validCron(request('Bearer wrong'))).toBe(false);
 });
});
