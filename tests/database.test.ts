import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

// Runs the real PL/pgSQL, constraints, triggers, and RLS in embedded PostgreSQL.
// PGlite lacks hosted PostGIS/pgvector/Realtime. Substitute only those surfaces;
// a fresh hosted Supabase migration is still required to verify the full schema.
let db: PGlite;
let users: string[];
beforeAll(async () => {
  db = new PGlite();
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create schema auth;
    create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid
    $$;
    grant usage on schema auth to anon,authenticated;
    grant execute on function auth.uid() to anon,authenticated;
  `);
  const migration = readFileSync(new URL("../supabase/migrations/20261017000100_initial_schema.sql", import.meta.url), "utf8")
    .replace(/^create extension .*;$/gm, "")
    .replaceAll("extensions.geography(point,4326)", "point")
    .replaceAll("extensions.vector(768)", "text")
    .replace(/^create index places_name_search .*;$/gm, "")
    .replace(/^alter publication .*;$/gm, "");
  await db.exec(migration);
  await db.exec(`
    create function extensions.st_makepoint(double precision,double precision) returns point language sql immutable as $$select point($1,$2)$$;
    create function extensions.st_setsrid(point,integer) returns point language sql immutable as $$select $1$$;
    create function extensions.st_x(point) returns double precision language sql immutable as $$select $1[0]$$;
    create function extensions.st_y(point) returns double precision language sql immutable as $$select $1[1]$$;
    create function extensions.st_dwithin(point,point,double precision) returns boolean language sql immutable as $$select sqrt(power(($1[0]-$2[0])*96750,2)+power(($1[1]-$2[1])*111320,2))<=$3$$;
  `);
  const pixelMigration=readFileSync(new URL('../supabase/migrations/20261017000200_pixel_world.sql',import.meta.url),'utf8')
    .replaceAll('extensions.geography','point').replaceAll('extensions.geometry','point');
  await db.exec(pixelMigration);
  const expanded=readFileSync(new URL('../supabase/migrations/20261017000300_expanded_campus.sql',import.meta.url),'utf8').replaceAll('extensions.geography','point').replaceAll('extensions.geometry','point');
  await db.exec(expanded);
  await db.exec(readFileSync(new URL('../supabase/migrations/20261017000400_communities.sql',import.meta.url),'utf8').replaceAll('extensions.geography','point').replaceAll('extensions.geometry','point'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20261017000500_custom_communities.sql',import.meta.url),'utf8').replaceAll('extensions.geography','point').replaceAll('extensions.geometry','point'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20261017183922_event_ingestion.sql',import.meta.url),'utf8'));
  await db.exec('alter role service_role bypassrls');
  await db.exec('alter table auth.users add column encrypted_password text');
  await db.exec(readFileSync(new URL('../supabase/migrations/20261017000600_username_accounts.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20261017000700_burnt_toast.sql',import.meta.url),'utf8'));
  await db.exec(readFileSync(new URL('../supabase/migrations/20261017000800_dispute_removal.sql',import.meta.url),'utf8'));



});
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("select set_config('request.jwt.claim.sub','',false)");
  const seeds=(await db.query<{id:string;name:string;accent:string;background:string;description:string;position:number;featured:boolean}>("select * from public.communities where created_by is null and id not like 'community-%'" )).rows;
  await db.exec("truncate auth.users, public.places, public.sync_runs cascade");
  await db.exec('truncate public.event_source_records,public.event_source_state,public.event_ingestion_runs');
  for(const c of seeds)await db.query("insert into public.communities(id,name,accent,background,description,position,featured) values($1,$2,$3,$4,$5,$6,$7)",[c.id,c.name,c.accent,c.background,c.description,c.position,c.featured]);
  await db.exec("delete from public.communities where id like 'community-%'");
  users = Array.from({ length: 8 }, () => randomUUID());
  for (const id of users) await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,$2,now())", [id, `${id}@ufl.edu`]);
});

async function action(user:string,name:string,data:unknown={}){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user]);
 return (await db.query<{result:{ok:boolean;id:string;grouped:boolean}}>('select public.pixel_action($1,$2::jsonb) as result',[name,JSON.stringify(data)])).rows[0].result;
}
async function world(user:string|null){
 await db.query("select set_config('request.jwt.claim.sub',$1,false)",[user??'']);
 return (await db.query<{result:{presence:{id:string;latitude:number;longitude:number}[];friends:{id:string;accepted:boolean}[];crumbs:{id:string;related_posts:number}[]}}>('select public.pixel_world() as result')).rows[0].result;
}
const outfit={skin:1,hair:0,shirt:0,pants:0,hairstyle:0,top:0,accessory:0};
describe('event ingestion isolation',()=>{
 it('only serves published listings and keeps staging records private',async()=>{
  for(const status of ['published','needs_review','cancelled'])await db.query("insert into public.club_events(source,source_id,title,starts_at,ingestion_status) values('test',$1,$1,now(),$1)",[status]);
  await db.exec('set role anon');
  try {
   expect((await db.query<{title:string}>('select title from public.club_events')).rows).toEqual([{title:'published'}]);
   for(const table of ['event_source_records','event_source_state','event_ingestion_runs'])await expect(db.query(`select * from public.${table}`)).rejects.toThrow('permission denied');
   await expect(db.query("select public.claim_event_sync('test')")).rejects.toThrow('permission denied');
  }finally{await db.exec('reset role');}
  await db.exec('set role authenticated');
  try{await expect(db.query("select public.release_event_sync('test',gen_random_uuid(),60)")).rejects.toThrow('permission denied');}
  finally{await db.exec('reset role');}
 });
 it('leases jobs atomically, rejects stale releases, and respects cooldown',async()=>{
  await db.exec('set role service_role');
  try{
   const first=(await db.query<{token:string}>("select public.claim_event_sync('test') as token")).rows[0].token;expect(first).toBeTruthy();
   expect((await db.query<{token:string|null}>("select public.claim_event_sync('test',true) as token")).rows[0].token).toBeNull();
   expect((await db.query<{ok:boolean}>("select public.release_event_sync('test',gen_random_uuid(),60,true) as ok")).rows[0].ok).toBe(false);
   expect((await db.query<{ok:boolean}>("select public.release_event_sync('test',$1,1800,true) as ok",[first])).rows[0].ok).toBe(true);
   expect((await db.query<{token:string|null}>("select public.claim_event_sync('test') as token")).rows[0].token).toBeNull();
   expect((await db.query<{token:string}>("select public.claim_event_sync('test',true) as token")).rows[0].token).toBeTruthy();
  }finally{await db.exec('reset role');}
 });
 it('deduplicates imports without turning listings into student confirmations',async()=>{
  await db.query("insert into public.club_events(source,source_id,title,starts_at) values('test','1','First',now())");
  await db.query("insert into public.club_events(source,source_id,title,starts_at) values('test','1','Updated',now()) on conflict(source,source_id) do update set title=excluded.title");
  expect((await db.query('select title from public.club_events')).rows).toEqual([{title:'Updated'}]);
  expect((await db.query('select * from public.crumbs')).rows).toHaveLength(0);
  expect((await db.query('select * from public.votes')).rows).toHaveLength(0);
 });
});
describe('avatars, friends, and related breadcrumbs',()=>{
 it('defaults usernames from UF email, allows verified changes, and protects login email resolution',async()=>{
  const id=randomUUID();await db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'albert@ufl.edu',now())",[id]);
  expect((await db.query<{handle:string}>('select handle from public.profiles where id=$1',[id])).rows[0].handle).toBe('albert');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);
  await expect(db.query("select public.complete_account('cool_albert')")).rejects.toThrow('Set a password');
  await db.query("update auth.users set encrypted_password='managed-by-auth' where id=$1",[id]);
  await db.query("select public.complete_account('Cool_Albert')");
  expect((await db.query<{handle:string;account_completed:boolean}>('select handle,account_completed from public.profiles where id=$1',[id])).rows[0]).toEqual({handle:'cool_albert',account_completed:true});
  await db.exec('set role anon');try{await expect(db.query("select public.login_email_for_username('cool_albert')")).rejects.toThrow('permission');}finally{await db.exec('reset role');}
  await db.exec('set role authenticated');try{await expect(db.query("select public.login_email_for_username('cool_albert')")).rejects.toThrow('permission');}finally{await db.exec('reset role');}
  await db.exec('set role service_role');try{expect((await db.query<{email:string}>("select public.login_email_for_username('COOL_ALBERT') as email")).rows[0].email).toBe('albert@ufl.edu');}finally{await db.exec('reset role');}
  await db.query("update auth.users set encrypted_password='managed-by-auth' where id=$1",[users[0]]);await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[0]]);
  await expect(db.query("select public.complete_account('cool_albert')")).rejects.toThrow('already taken');
 });
 it('enforces self-selected community access for reads, confirmations, and direct browser queries',async()=>{
  await action(users[0],'avatar',outfit);await action(users[1],'avatar',outfit);
  const post={latitude:29.6465,longitude:-82.347,title:'Girls study meetup',category:'event',community_id:'girls'};
  await expect(action(users[0],'create',post)).rejects.toThrow('Join');
  await action(users[0],'community_join',{community_id:'girls'});
  const created=await action(users[0],'create',post);
  expect((await world(users[0])).crumbs.some(c=>c.id===created.id)).toBe(true);
  expect((await world(users[1])).crumbs.some(c=>c.id===created.id)).toBe(false);
  expect((await world(null)).crumbs.some(c=>c.id===created.id)).toBe(false);
  await expect(action(users[1],'vote',{id:created.id,value:1})).rejects.toThrow('Join');
  await db.exec('set role anon');try{expect((await db.query('select id from public.crumbs')).rows).toHaveLength(0);}finally{await db.exec('reset role');}
  await action(users[1],'community_join',{community_id:'girls'});await action(users[1],'vote',{id:created.id,value:1});
  await action(users[1],'community_leave',{community_id:'girls'});
  expect((await world(users[1])).crumbs.some(c=>c.id===created.id)).toBe(false);
 });
 it('keeps duplicate-topic grouping and subscriber notifications inside a community',async()=>{
  for(const uid of users.slice(0,3))await action(uid,'avatar',outfit);
  await action(users[0],'community_join',{community_id:'sports'});
  await db.query("insert into public.subscriptions(user_id,kind) values($1,'campus'),($2,'campus')",[users[1],users[2]]);
  await action(users[2],'community_join',{community_id:'sports'});
  const post={latitude:29.6465,longitude:-82.347,title:'Pickup soccer today',category:'event'};
  const sports=await action(users[0],'create',{...post,community_id:'sports'});
  expect((await db.query('select user_id from public.notifications where crumb_id=$1',[sports.id])).rows).toEqual([{user_id:users[2]}]);
  const campus=await action(users[1],'create',post);expect(campus.grouped).toBe(false);expect(campus.id).not.toBe(sports.id);
  await expect(action(users[1],'create',{...post,join_id:sports.id})).rejects.toThrow('no longer');
 });
 it('lets users create a named, themed community and join it automatically',async()=>{
  await action(users[0],'community_create',{name:'Computer Science',description:'Find your CS crew',accent:'#7454B3'});
  const row=(await db.query<{id:string;created_by:string}>("select id,created_by from public.communities where name='Computer Science'")).rows[0];
  expect(row.created_by).toBe(users[0]);
  expect((await db.query('select user_id from public.community_memberships where community_id=$1',[row.id])).rows).toEqual([{user_id:users[0]}]);
  await expect(action(users[1],'community_create',{name:'computer science',description:'duplicate',accent:'#7454B3'})).rejects.toThrow('already exists');
  await expect(action(users[1],'community_create',{name:'Bad color',description:'',accent:'url(secret)'})).rejects.toThrow('color');
 });
 it('supports medical and veterinary map areas while rejecting locations beyond campus bounds',async()=>{
  await action(users[0],'avatar',outfit);
  for(const latitude of [29.638,29.625]){
   const result=await action(users[0],'create',{latitude,longitude:-82.354,title:'Campus area '+latitude,category:'event'});
   expect((await world(users[0])).crumbs.some(c=>c.id===result.id)).toBe(true);
   await action(users[0],'presence',{latitude,longitude:-82.354});
  }
  await expect(action(users[0],'presence',{latitude:29.60,longitude:-82.354})).rejects.toThrow('campus');
 });
 it('requires valid avatars and stores per-account customization',async()=>{
  await expect(action(users[0],'avatar',{...outfit,skin:100})).rejects.toThrow('Invalid avatar');
  await expect(action(users[0],'avatar',{...outfit,skin:'1'})).rejects.toThrow('Invalid avatar');
  await action(users[0],'avatar',outfit);
  expect((await db.query<{avatar_completed:boolean}>('select avatar_completed from public.profiles where id=$1',[users[0]])).rows[0].avatar_completed).toBe(true);
 });
 it('never exposes locations to strangers or unaccepted requests, and revokes removed friends',async()=>{
  await action(users[0],'avatar',outfit);
  await action(users[0],'presence',{latitude:29.64651234,longitude:-82.34712345});
  expect((await world(null)).presence).toEqual([]);
  expect((await world(users[1])).presence).toEqual([]);
  const code=(await db.query<{friend_code:string}>('select friend_code from public.profiles where id=$1',[users[0]])).rows[0].friend_code;
  await action(users[1],'friend_request',{code});
  expect((await world(users[1])).presence).toEqual([]);
  const friendship=(await world(users[0])).friends[0].id;
  await expect(action(users[1],'friend_accept',{id:friendship})).rejects.toThrow('Friend request not found');
  await action(users[0],'friend_accept',{id:friendship});
  const p=(await world(users[1])).presence[0];expect(p.id).toBe(users[0]);expect(p.latitude).not.toBe(29.64651234);
  expect((await world(users[2])).presence).toEqual([]);
  await action(users[0],'friend_remove',{id:friendship});expect((await world(users[1])).presence).toEqual([]);
 });
 it('expires and withdraws presence, and blocks out-of-campus sharing',async()=>{
  await action(users[0],'avatar',outfit);
  await expect(action(users[0],'presence',{latitude:0,longitude:0})).rejects.toThrow('UF campus');
  await action(users[0],'presence',{latitude:29.6465,longitude:-82.347});
  await db.query("update public.avatar_presence set expires_at=now()-interval '1 second' where user_id=$1",[users[0]]);
  expect((await world(users[0])).presence).toEqual([]);
  await action(users[0],'presence',{latitude:29.6465,longitude:-82.347});await action(users[0],'presence_stop');
  expect((await db.query('select * from public.avatar_presence')).rows).toHaveLength(0);
 });
 it('groups matching nearby posts and deduplicates their authors against votes',async()=>{
  for(const u of users.slice(0,4))await action(u,'avatar',outfit);
  const post={title:'Free pizza at Turlington',category:'freebie',latitude:29.6465,longitude:-82.347};
  const first=await action(users[0],'create',post);
  const joined=await action(users[1],'create',{...post,title:'Turlington free pizza'});
  expect(joined.id).toBe(first.id);expect(joined.grouped).toBe(true);
  await action(users[1],'vote',{id:first.id,value:1});expect((await getCrumb(first.id)).confirm_count).toBe(1);
  await action(users[2],'create',{...post,title:'Still pizza here',join_id:first.id});
  await action(users[3],'vote',{id:first.id,value:1});expect((await getCrumb(first.id)).loaf).toBe('full_loaf');
  expect((await world(null)).crumbs[0].related_posts).toBe(2);
  await expect(action(users[0],'create',post)).rejects.toThrow('already posted');
 });
 it('keeps distinct topics and distant posts separate and limits posting',async()=>{
  await action(users[0],'avatar',outfit);const p={title:'Free pizza',category:'freebie',latitude:29.6465,longitude:-82.347};
  const first=await action(users[0],'create',p),far=await action(users[0],'create',{...p,latitude:29.65});expect(far.id).not.toBe(first.id);
  for(let i=0;i<3;i++)await action(users[0],'create',{...p,title:`Different topic ${i}`});
  await expect(action(users[0],'create',{...p,title:'One too many'})).rejects.toThrow('Please wait');
 });
 it('does not grant anonymous mutation access or access to raw location tables',async()=>{
  await db.exec('set role anon');
  try{await expect(db.query("select public.pixel_action('avatar',$1::jsonb)",[JSON.stringify(outfit)])).rejects.toThrow('permission denied');await expect(db.query('select * from public.avatar_presence')).rejects.toThrow('permission denied');}
  finally{await db.exec('reset role');}
 });
});

async function crumb(author = users[0], category = "freebie") {
  const result = await db.query<{ id: string }>(
    "insert into public.crumbs(user_id,category,title,location) values($1,$2,'Test crumb',point(0,0)) returning id", [author, category]);
  return result.rows[0].id;
}
async function vote(id: string, user: string, value = 1) {
  await db.query("insert into public.votes(crumb_id,user_id,value) values($1,$2,$3) on conflict(crumb_id,user_id) do update set value = excluded.value", [id,user,value]);
}
async function getCrumb(id: string) {
  return (await db.query<{ status: string; loaf: string; confirm_count: number; dispute_count: number; title: string; expires_at: Date; last_confirmed_at: Date }>(
    "select *,public.loaf_state(c) as loaf from public.crumbs c where id = $1", [id])).rows[0];
}
describe("initial database", () => {
  it("creates private profiles and blocks non-UF auth users", async () => {
    expect((await db.query("select * from public.profiles")).rows).toHaveLength(8);
    await expect(db.query("insert into auth.users(id,email,email_confirmed_at) values($1,'outsider@gmail.com',now())", [randomUUID()])).rejects.toThrow("UF email");
    await expect(db.query("update auth.users set email = 'outsider@gmail.com' where id = $1", [users[0]])).rejects.toThrow("UF email");
  });
  it("requires three independent confirmations and prevents self-votes", async () => {
    const id = await crumb();
    expect((await getCrumb(id)).loaf).toBe("crumb");
    await expect(vote(id,users[0])).rejects.toThrow("own crumb");
    await vote(id,users[1]);
    expect((await getCrumb(id)).loaf).toBe("rising");
    await vote(id,users[1]);
    expect((await getCrumb(id)).confirm_count).toBe(1);
    await vote(id,users[2]); await vote(id,users[3]);
    expect((await getCrumb(id)).loaf).toBe("full_loaf");
  });
  it("does not extend freshness for repeated identical votes", async () => {
    const id = await crumb(); await vote(id,users[1]);
    const before = await getCrumb(id);
    await vote(id,users[1]);
    expect((await getCrumb(id)).expires_at).toEqual(before.expires_at);
    expect((await getCrumb(id)).last_confirmed_at).toEqual(before.last_confirmed_at);
  });
  it("makes old Full Loaves stale and expired crumbs toast before cron runs", async () => {
    const id = await crumb();
    for (const user of users.slice(1,4)) await vote(id,user);
    await db.query("update public.crumbs set last_confirmed_at = now() - interval '31 minutes' where id = $1", [id]);
    expect((await getCrumb(id)).loaf).toBe("stale");
    await db.query("update public.crumbs set created_at = now() - interval '2 hours', expires_at = now() - interval '1 minute' where id = $1", [id]);
    expect((await getCrumb(id)).loaf).toBe("toast");
    await expect(vote(id,users[4])).rejects.toThrow("no longer active");
  });
  it("turns three denials into visible burnt toast without issuing a strike", async () => {
    const id = await crumb();
    for (const user of users.slice(1,4)) await vote(id,user,-1);
    expect((await getCrumb(id)).status).toBe("active");
    expect((await getCrumb(id)).loaf).toBe("burnt");
    expect((await getCrumb(id)).title).not.toBe("[removed]");
    expect((await db.query("select * from public.strikes")).rows).toHaveLength(0);
    await vote(id,users[1],1);
    expect((await getCrumb(id)).loaf).not.toBe("burnt");
  });
  it('keeps six disputes burnt and removes the event at seven independent disputes',async()=>{
    await db.query("insert into public.subscriptions(user_id,kind) values($1,'campus')",[users[7]]);
    const id=await crumb();
    for(const user of users.slice(1,7))await vote(id,user,-1);
    await vote(id,users[6],-1);
    expect((await getCrumb(id)).status).toBe('active');
    expect((await getCrumb(id)).loaf).toBe('burnt');
    await vote(id,users[7],-1);
    const removed=await getCrumb(id);
    expect(removed.status).toBe('removed');
    expect(removed.title).toBe('[removed]');
    expect((await db.query('select * from public.notifications where crumb_id=$1',[id])).rows).toHaveLength(0);
    await db.query("select set_config('request.jwt.claim.sub',$1,false)",[users[7]]);
    const result=await db.query<{world:{crumbs:{id:string}[]}}>('select public.pixel_world() as world');
    expect(result.rows[0].world.crumbs.some(c=>c.id===id)).toBe(false);
    await expect(vote(id,users[1],1)).rejects.toThrow('no longer active');
  });
  it("counts each conflicting reporter once, including overlapping denials, and excludes banned reporters", async()=>{
    const id=await crumb();
    await vote(id,users[1],-1);
    for(const user of users.slice(1,3))await db.query("insert into public.crumb_reports(crumb_id,user_id,reason) values($1,$2,'other')",[id,user]);
    expect((await getCrumb(id)).loaf).not.toBe('burnt');
    await db.query("insert into public.crumb_reports(crumb_id,user_id,reason) values($1,$2,'spam')",[id,users[3]]);
    expect((await getCrumb(id)).loaf).toBe('burnt');
    await db.query('update public.profiles set banned=true where id=$1',[users[3]]);
    expect((await getCrumb(id)).loaf).not.toBe('burnt');
  });
  it("marks a confirmed loaf burnt after three denials even when confirmations outnumber them",async()=>{
    const id=await crumb();
    for(const user of users.slice(1,5))await vote(id,user,1);
    for(const user of users.slice(5,8))await vote(id,user,-1);
    expect((await getCrumb(id)).loaf).toBe('burnt');
  });
  it("handles harassment reports independently of vote values", async () => {
    const id = await crumb();
    for (const user of users.slice(1,3)) await db.query("insert into public.crumb_reports(crumb_id,user_id,reason) values($1,$2,'privacy')", [id,user]);
    expect((await getCrumb(id)).status).toBe("removed");
    expect((await db.query("select * from public.strikes")).rows).toHaveLength(1);
  });
  it("suspends at two strikes, bans at three, and removes banned votes from counts", async () => {
    const ids = await Promise.all([crumb(),crumb(),crumb()]);
    const other = await crumb(users[7]);
    await vote(other,users[0]);
    for (let i = 0; i < ids.length; i++) {
      for (const user of users.slice(1,3)) await db.query("insert into public.crumb_reports(crumb_id,user_id,reason) values($1,$2,'privacy')",[ids[i],user]);
      if (i === 1) {
        await expect(crumb()).rejects.toThrow("active UF account");
        await expect(vote(other,users[0])).rejects.toThrow("active UF account");
      }
    }
    expect((await db.query<{ banned: boolean }>("select banned from public.profiles where id = $1", [users[0]])).rows[0].banned).toBe(true);
    expect((await getCrumb(other)).confirm_count).toBe(0);
  });
  it("only fans out sightings on Full Loaf and keeps notification deduplication", async () => {
    await db.query("insert into public.subscriptions(user_id,kind) values($1,'campus')", [users[7]]);
    const id = await crumb(users[0],"sighting");
    expect((await db.query("select * from public.notifications")).rows).toHaveLength(0);
    for (const user of users.slice(1,4)) await vote(id,user);
    await vote(id,users[3]);
    expect((await db.query("select * from public.notifications")).rows).toHaveLength(1);
  });
  it("allows anonymous public reads but blocks writes and private profile reads", async () => {
    await crumb();
    await db.exec("set role anon");
    try {
      expect((await db.query("select * from public.crumbs")).rows).toHaveLength(1);
      await expect(db.query("select * from public.profiles")).rejects.toThrow("permission denied");
      await expect(db.query("delete from public.crumbs")).rejects.toThrow("permission denied");
      await expect(db.query("select * from public.votes")).rejects.toThrow("permission denied");
    } finally { await db.exec("reset role"); }
  });
  it("isolates authenticated profiles and inboxes through RLS", async () => {
    await db.query("insert into public.subscriptions(user_id,kind) values($1,'campus')", [users[7]]);
    await crumb();
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [users[1]]);
    await db.exec("set role authenticated");
    try {
      const profiles = await db.query<{ id: string }>("select id from public.profiles");
      expect(profiles.rows.map(p => p.id)).toEqual([users[1]]);
      expect((await db.query("select * from public.notifications")).rows).toHaveLength(0);
    } finally { await db.exec("reset role"); }
  });
});
