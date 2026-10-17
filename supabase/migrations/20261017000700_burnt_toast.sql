-- Apply after 006. Conflicting events remain visible as burnt toast.
begin;
alter table public.crumbs add column negative_count integer not null default 0 check (negative_count>=0);
create function private.negative_signals(cid uuid) returns integer
language sql stable security definer set search_path='' as $$
 select count(*)::integer from (
  select v.user_id from public.votes v join public.profiles p on p.id=v.user_id where v.crumb_id=cid and v.value=-1 and not p.banned
  union
  select r.user_id from public.crumb_reports r join public.profiles p on p.id=r.user_id where r.crumb_id=cid and r.reason in ('spam','other') and not p.banned
 ) actors
$$;
revoke all on function private.negative_signals(uuid) from public,anon,authenticated;

update public.crumbs c set negative_count=private.negative_signals(c.id);
create or replace function public.loaf_state(c public.crumbs) returns text
language sql stable set search_path='' as $$
 select case when c.status<>'active' or c.expires_at<=now() then 'toast'
 when c.negative_count>=3 then 'burnt'
 when now()-c.last_confirmed_at>=public.category_ttl(c.category)/2 then 'stale'
 when c.confirm_count>=3 and c.confirm_count>c.dispute_count then 'full_loaf'
 when c.confirm_count>=1 then 'rising' else 'crumb' end
$$;
create or replace function private.evaluate_crumb() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  c public.crumbs; confirms integer; disputes integer; reports integer; strikes_count integer;
  confirming boolean := false; was_full boolean; why text; latest timestamptz;
begin
  select * into c from public.crumbs where id = new.crumb_id for update;
  if c.status <> 'active' then return new; end if;
  if tg_table_name = 'votes' then
    if tg_op = 'INSERT' then confirming := new.value = 1;
    else confirming := new.value = 1 and old.value <> 1; end if;
  end if;
  was_full := public.loaf_state(c) = 'full_loaf';
  select count(*) filter(where v.value = 1),count(*) filter(where v.value = -1),max(v.created_at) filter(where v.value = 1)
    into confirms,disputes,latest from public.votes v join public.profiles p on p.id = v.user_id
    where v.crumb_id = c.id and not p.banned;
  select count(*) into reports from public.crumb_reports r join public.profiles p on p.id = r.user_id
    where r.crumb_id = c.id and r.reason in ('harassment','privacy') and not p.banned;
  update public.crumbs set confirm_count = confirms,dispute_count = disputes,negative_count = private.negative_signals(c.id),
    last_confirmed_at = coalesce(latest,c.created_at),
    expires_at = case when confirming and category <> 'crowd' then greatest(expires_at,now() + public.category_ttl(category)) else expires_at end
    where id = c.id returning * into c;
  if reports >= 2 then why := 'harassment_or_privacy'; end if;
  if why is not null then
    update public.crumbs set status = 'removed',removed_reason = why,title = '[removed]',description = null,embedding = null where id = c.id;
    delete from public.notifications where crumb_id = c.id;
    insert into public.strikes(user_id,crumb_id,reason) values(c.user_id,c.id,why) on conflict(crumb_id) do nothing;
    -- Serialize strike counting across different crumbs by the same author.
    perform 1 from public.profiles where id = c.user_id for update;
    select count(*) into strikes_count from public.strikes where user_id = c.user_id and created_at > now() - interval '30 days';
    if strikes_count >= 3 then update public.profiles set banned = true where id = c.user_id;
    elsif strikes_count = 2 then update public.profiles set suspended_until = now() + interval '24 hours' where id = c.user_id; end if;
  elsif public.loaf_state(c) = 'burnt' then delete from public.notifications where crumb_id=c.id;
  elsif not was_full and public.loaf_state(c) = 'full_loaf' then perform private.notify_crumb(c,true);
  end if;
  return new;
end $$;

create or replace function private.on_profile_banned() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.banned is distinct from old.banned then
    update public.crumbs c set
      negative_count = private.negative_signals(c.id),
      confirm_count = (select count(*) from public.votes v join public.profiles p on p.id = v.user_id where v.crumb_id = c.id and v.value = 1 and not p.banned),
      dispute_count = (select count(*) from public.votes v join public.profiles p on p.id = v.user_id where v.crumb_id = c.id and v.value = -1 and not p.banned),
      last_confirmed_at = coalesce((select max(v.created_at) from public.votes v join public.profiles p on p.id = v.user_id where v.crumb_id = c.id and v.value = 1 and not p.banned),c.created_at)
    where c.id in (select v.crumb_id from public.votes v where v.user_id = new.id union select r.crumb_id from public.crumb_reports r where r.user_id=new.id);
  end if;
  return new;
end $$;

delete from public.notifications n using public.crumbs c where n.crumb_id=c.id and public.loaf_state(c)='burnt';
commit;
