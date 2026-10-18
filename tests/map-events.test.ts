import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { readMapEvents } from '../src/lib/events/map';

const row = { id:'event',source:'instagram',title:'Guest speaker',description:'A campus talk',
  venue_text:'Communicore (C1-007)',starts_at:'2026-10-19T22:00:00Z',ends_at:'2026-10-19T23:00:00Z',
  event_date:'2026-10-19',all_day:false,url:'https://www.instagram.com/p/example/',price_text:null,last_synced_at:'2026-10-18T00:00Z' };
function database(rows: typeof row[]) {
  const queries: ReturnType<typeof query>[]=[];
  function query() { return {
    select:vi.fn().mockReturnThis(),eq:vi.fn().mockReturnThis(),lt:vi.fn().mockReturnThis(),
    or:vi.fn().mockReturnThis(),order:vi.fn().mockReturnThis(),limit:vi.fn().mockReturnThis(),
    abortSignal:vi.fn().mockResolvedValue({data:rows,error:null}),
  }; }
  return {queries,db:{from:vi.fn(()=>{const q=query();queries.push(q);return q;})} as unknown as SupabaseClient};
}
const window={start:'2026-10-18T00:00:00Z',end:'2026-10-25T00:00:00Z'};
describe('map event retrieval',()=>{
  it('retains published provenance, room-resolved coordinates, unknown prices and deduplicated IDs',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-18T12:00Z'));
    try {
      const {db,queries}=database([row]);
      const results=await readMapEvents(db,window,false,new AbortController().signal);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({source:'instagram',sourceUrl:row.url,priceType:'unknown',latitude:expect.any(Number),longitude:expect.any(Number),confirmCount:0,state:null});
      for(const q of queries)expect(q.eq).toHaveBeenCalledWith('ingestion_status','published');
      expect(queries[1].eq).toHaveBeenCalledWith('source','instagram');
      expect(queries.map(q=>q.limit.mock.calls[0][0])).toEqual([180,20]);
    } finally {vi.useRealTimers();}
  });
  it('leaves vague venues unpinned and omits expired and unsafe-source events',async()=>{
    vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-18T12:00Z'));
    try {
      const {db}=database([{...row,venue_text:'Plaza'}, {...row,id:'expired',ends_at:'2026-10-17T20:00Z'}, {...row,id:'unsafe',url:'javascript:alert(1)'}]);
      const result=await readMapEvents(db,window,false,new AbortController().signal);
      expect(result).toHaveLength(1);
      expect(result[0].latitude).toBeNull();
    } finally {vi.useRealTimers();}
  });
  it('fails explicitly on storage errors instead of presenting an empty successful map',async()=>{
    const {db,queries}=database([]);
    const pending=readMapEvents(db,window,false,new AbortController().signal);
    // Set-up runs synchronously through both reads; they are independently bounded.
    expect(queries).toHaveLength(2);
    await pending;
    const broken={from:()=>{throw new Error('unavailable');}} as unknown as SupabaseClient;
    await expect(readMapEvents(broken,window,false,new AbortController().signal)).rejects.toThrow();
  });
});
