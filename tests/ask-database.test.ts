import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {afterAll,beforeAll,beforeEach,describe,expect,it} from 'vitest';

let db:PGlite;let author:string;
const migration=(name:string)=>readFileSync(new URL(`../supabase/migrations/${name}.sql`,import.meta.url),'utf8');
beforeAll(async()=>{
  db=new PGlite();
  await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;
   create schema auth;create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz,encrypted_password text);
   create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
   grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
  await db.exec(migration('20261017000100_initial_schema').replace(/^create extension .*;$/gm,'')
    .replaceAll('extensions.geography(point,4326)','point').replaceAll('extensions.vector(768)','text')
    .replace(/^create index places_name_search .*;$/gm,'').replace(/^alter publication .*;$/gm,''));
  await db.exec(`
   create function extensions.st_makepoint(double precision,double precision) returns point language sql immutable as $$select point($1,$2)$$;
   create function extensions.st_setsrid(point,integer) returns point language sql immutable as $$select $1$$;
   create function extensions.st_x(point) returns double precision language sql immutable as $$select $1[0]$$;
   create function extensions.st_y(point) returns double precision language sql immutable as $$select $1[1]$$;
   create function extensions.st_distance(point,point) returns double precision language sql immutable as $$select sqrt(power(($1[0]-$2[0])*96750,2)+power(($1[1]-$2[1])*111320,2))$$;
   create function extensions.st_dwithin(point,point,double precision) returns boolean language sql immutable as $$select extensions.st_distance($1,$2)<=$3$$;
   grant usage on schema extensions to anon,authenticated;
  `);
  for(const name of ['20261017000200_pixel_world','20261017000300_expanded_campus','20261017000400_communities','20261017000500_custom_communities','20261017000600_username_accounts','20261017000700_burnt_toast','20261017000800_dispute_removal','20261017183922_event_ingestion','20261017185639_ask_backend','20261018010000_ask_discovery_quality']) {
    await db.exec(migration(name).replaceAll('extensions.geography','point').replaceAll('extensions.geometry','point'));
  }
});
afterAll(async()=>{await db?.close();});
beforeEach(async()=>{
  await db.exec('reset role');await db.exec("select set_config('request.jwt.claim.sub','',false)");
  await db.exec('truncate public.club_events,public.crumbs,public.ask_quota cascade');
  author=randomUUID();await db.query('insert into auth.users values($1,$2,now())',[author,`${author}@ufl.edu`]);
});
const filters=(patch:Record<string,unknown>={})=>({start:new Date(Date.now()-1000).toISOString(),end:new Date(Date.now()+86400000).toISOString(),radius:1500,latitude:null,longitude:null,terms:[],categories:[],...patch});
async function search(kind:'events'|'crumbs',p=filters()) {
  await db.exec('set role anon');
  try{return (await db.query<{rows:Record<string,unknown>[]}>(`select public.ask_search_${kind}($1::jsonb) as rows`,[JSON.stringify(p)])).rows[0].rows;}
  finally{await db.exec('reset role');}
}
async function event(patch:Record<string,unknown>={}) {
  const values={id:randomUUID(),source:'test',source_id:randomUUID(),title:'Coding workshop',starts_at:new Date(Date.now()+3600000).toISOString(),url:'https://example.test/event',venue_text:'Reitz',...patch};
  const keys=Object.keys(values);await db.query(`insert into public.club_events(${keys.join(',')}) values(${keys.map((_,i)=>`$${i+1}`).join(',')})`,Object.values(values));return values.id;
}
async function crumb(patch:Record<string,unknown>={}) {
  const values={id:randomUUID(),user_id:author,title:'Free pizza',category:'freebie',location:'(-82.347875048125,29.646223700078124)',community_id:'campus',...patch};
  const keys=Object.keys(values);await db.query(`insert into public.crumbs(${keys.join(',')}) values(${keys.map((_,i)=>`$${i+1}`).join(',')})`,Object.values(values));return values.id;
}
describe('Ask SQL retrieval and isolation',()=>{
  it('ranks relevant titles before the retrieval limit rather than losing them to earlier events',async()=>{
    for(let i=0;i<22;i++)await event({title:'Campus event',tags:['music'],starts_at:new Date(Date.now()+100000+i*1000).toISOString()});
    const best=await event({title:'Music music music workshop',starts_at:new Date(Date.now()+8000000).toISOString()});
    const rows=await search('events',filters({terms:['music']}));
    expect(rows).toHaveLength(20);expect(rows[0].id).toBe(best);
  });
  it('resolves explicit room suffixes on known venues but leaves Plaza unknown',async()=>{
    const known=await event({venue_text:'Communicore (C1-007)'});
    const vague=await event({venue_text:'Plaza'});
    const rows=await search('events');
    expect(rows.find(r=>r.id===known)?.latitude).not.toBeNull();
    expect(rows.find(r=>r.id===vague)?.latitude).toBeNull();
  });
  it('resolves canonical aliases without giving the model guessed coordinates',async()=>{
    await db.exec('set role anon');
    try {const rows=(await db.query<{rows:{name:string;latitude:number}[]}>("select public.ask_places('Lib West') as rows")).rows[0].rows;expect(rows).toHaveLength(1);expect(rows[0].name).toBe('Library West');}
    finally{await db.exec('reset role');}
  });
  it('enforces explicit free pricing and publication status',async()=>{
    const free=await event({price_text:'Free'});await event({price_text:null});await event({price_text:'Buy one get one free'});await event({price_text:'Free',ingestion_status:'needs_review'});await event({price_text:'Free',ingestion_status:'cancelled'});
    expect((await search('events',filters({freeOnly:true}))).map(r=>r.id)).toEqual([free]);
  });
  it('enforces time windows, including unknown end times',async()=>{
    const upcoming=await event();await event({starts_at:new Date(Date.now()-3600000).toISOString()});
    await event({starts_at:new Date(Date.now()-7200000).toISOString(),ends_at:new Date(Date.now()-1000).toISOString()});
    expect((await search('events')).map(r=>r.id)).toEqual([upcoming]);
    expect(await search('events',filters({nowOnly:true,end:new Date().toISOString()}))).toEqual([]);
  });
  it('keeps date-only listings out of happening-now answers',async()=>{
    const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York'}).format(new Date());
    await event({all_day:true,event_date:today,starts_at:new Date(Date.now()-3600000).toISOString()});
    expect(await search('events',filters({nowOnly:true}))).toEqual([]);
  });
  it('uses exact venue aliases for radius filtering and excludes unresolved places',async()=>{
    const near=await event();await event({venue_text:'Unresolved venue'});await event({venue_text:'Library West'});
    const rows=await search('events',filters({latitude:29.646223700078124,longitude:-82.347875048125,radius:200}));
    expect(rows.map(r=>r.id)).toEqual([near]);expect(rows[0].distanceMeters).toBe(0);
    expect((await search('events')).find(r=>r.venue==='Unresolved venue')?.latitude).toBeNull();
  });
  it('supports keyword retrieval without raw SQL or private staging access',async()=>{
    const coding=await event();await event({title:'Music recital'});
    expect((await search('events',filters({terms:['coding']}))).map(r=>r.id)).toEqual([coding]);
    expect(await search('events',filters({terms:["'); drop table public.crumbs;--"]}))).toEqual([]);
  });
  it('excludes expired, resolved, removed, stale, private-community and person sightings',async()=>{
    const live=await crumb();
    const expired=await crumb({title:'Old pizza'});await db.query("update public.crumbs set created_at=now()-interval '2 hours',expires_at=now()-interval '1 hour' where id=$1",[expired]);
    for(const status of ['removed','resolved']){const id=await crumb({title:status});await db.query('update public.crumbs set status=$1 where id=$2',[status,id]);}
    const stale=await crumb({title:'Stale'});await db.query("update public.crumbs set last_confirmed_at=now()-interval '40 minutes' where id=$1",[stale]);
    await crumb({community_id:'girls',title:'Private gathering'});await crumb({category:'sighting',title:'Someone spotted'});
    const rows=await search('crumbs');expect(rows.map(r=>r.id)).toEqual([live]);
    expect(rows[0]).not.toHaveProperty('user_id');expect(rows[0]).not.toHaveProperty('profile');
  });
  it('does not use live Crumbs as evidence for tomorrow',async()=>{
    await crumb();expect(await search('crumbs',filters({start:new Date(Date.now()+3600000).toISOString()}))).toEqual([]);
  });
  it('returns current Crumbs even after the instantaneous now window has elapsed in transit',async()=>{
    const id=await crumb();
    const start=new Date(Date.now()-1000).toISOString();const end=new Date(Date.now()-999).toISOString();
    expect((await search('crumbs',filters({start,end,nowOnly:true}))).map(r=>r.id)).toEqual([id]);
  });
  it('requires the previous IDs to remain visible and active',async()=>{
    const id=await event();await event();expect((await search('events',filters({ids:[id]}))).map(r=>r.id)).toEqual([id]);
    await db.query("update public.club_events set ingestion_status='cancelled' where id=$1",[id]);expect(await search('events',filters({ids:[id]}))).toEqual([]);
  });
  it('bounds direct RPC requests, even when Next.js is bypassed',async()=>{
    for(const p of [filters({radius:500000}),filters({terms:Array(7).fill('test')}),filters({categories:['sighting']}),{},filters({latitude:0,longitude:0})])await expect(search('events',p as ReturnType<typeof filters>)).rejects.toThrow();
  });
});
describe('Ask durable quota authorization',()=>{
  it('denies all browser roles access to quota storage and charging RPC',async()=>{
    for(const role of ['anon','authenticated']) {
      await db.exec(`set role ${role}`);
      try {
        await expect(db.query('select * from public.ask_quota')).rejects.toThrow('permission denied');
        await expect(db.query('select public.ask_take_quota($1)',['a'.repeat(64)])).rejects.toThrow('permission denied');
      }finally{await db.exec('reset role');}
    }
  });
  it('enforces atomic minute and daily limits across callers',async()=>{
    const key='a'.repeat(64);await db.exec('set role service_role');
    try {
      for(let i=0;i<6;i++)expect((await db.query<{ok:boolean}>('select public.ask_take_quota($1) as ok',[key])).rows[0].ok).toBe(true);
      expect((await db.query<{ok:boolean}>('select public.ask_take_quota($1) as ok',[key])).rows[0].ok).toBe(false);
      await db.query("update public.ask_quota set requests=60 where key=$1",['day:'+key]);
      expect((await db.query<{ok:boolean}>('select public.ask_take_quota($1) as ok',[key])).rows[0].ok).toBe(false);
    }finally{await db.exec('reset role');}
  });
  it('caps aggregate model requests across all clients and removes old buckets',async()=>{
    await db.query("insert into public.ask_quota values('global',date_trunc('day',now()),500),('old',now()-interval '3 days',1)");
    await db.exec('set role service_role');
    try {expect((await db.query<{ok:boolean}>('select public.ask_take_quota($1) as ok',['b'.repeat(64)])).rows[0].ok).toBe(false);}
    finally{await db.exec('reset role');}
    expect((await db.query("select * from public.ask_quota where key='old'")).rows).toEqual([]);
  });
});
