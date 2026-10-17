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
});
afterAll(async () => { await db?.close(); });
beforeEach(async () => {
  await db.exec("truncate auth.users, public.places, public.sync_runs cascade");
  users = Array.from({ length: 8 }, () => randomUUID());
  for (const id of users) await db.query("insert into auth.users values($1,$2,now())", [id, `${id}@ufl.edu`]);
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
    await expect(db.query("insert into auth.users values($1,'outsider@gmail.com',now())", [randomUUID()])).rejects.toThrow("UF email");
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
  it("removes a disputed crumb, scrubs content, and strikes once", async () => {
    const id = await crumb();
    for (const user of users.slice(1,4)) await vote(id,user,-1);
    expect((await getCrumb(id)).status).toBe("removed");
    expect((await getCrumb(id)).title).toBe("[removed]");
    expect((await db.query("select * from public.strikes")).rows).toHaveLength(1);
    await expect(vote(id,users[4],-1)).rejects.toThrow("no longer active");
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
      for (const user of users.slice(1,4)) await vote(ids[i],user,-1);
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
