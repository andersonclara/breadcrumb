-- Apply after 007. Seven independent disputes remove an event from the map/feed.
begin;
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
  elsif disputes >= 7 then
    update public.crumbs set status='removed',removed_reason='disputed',title='[removed]',description=null,embedding=null where id=c.id;
    delete from public.notifications where crumb_id=c.id;
  elsif public.loaf_state(c) = 'burnt' then delete from public.notifications where crumb_id=c.id;
  elsif not was_full and public.loaf_state(c) = 'full_loaf' then perform private.notify_crumb(c,true);
  end if;
  return new;
end $$;


update public.crumbs set status='removed',removed_reason='disputed',title='[removed]',description=null,embedding=null where status='active' and dispute_count>=7;
delete from public.notifications n using public.crumbs c where n.crumb_id=c.id and c.status='removed' and c.removed_reason='disputed';
commit;
