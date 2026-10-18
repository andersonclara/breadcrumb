-- Optional: apply BOTH migrations and enable pg_cron before running this file.
-- Scheduling is separate so the initial migration works without hosted extensions.
select cron.schedule('expire-crumbs','* * * * *',$$
  update public.crumbs set status = 'expired' where status = 'active'
    and (expires_at <= now() or (category = 'sighting' and last_confirmed_at <= now() - interval '30 minutes'))
$$);
select cron.schedule('club-reminders','*/5 * * * *',$$
  insert into public.notifications(user_id,event_id,title,body)
  select distinct s.user_id,e.id,'Club event: ' || coalesce(e.club || ': ','') || e.title,
    'Starts ' || to_char(e.starts_at at time zone 'America/New_York','HH12:MI AM')
  from public.club_events e join public.subscriptions s on s.kind = 'club' and s.club = e.club
  join public.profiles p on p.id = s.user_id and not p.banned
  where e.ingestion_status='published' and not e.all_day
    and e.starts_at between now() and now() + interval '30 minutes'
  on conflict(user_id,event_id) do nothing
$$);
-- Feed syncing uses the separate protected endpoint/GitHub workflow; Instagram remains manual.
-- Run after the pixel-world migration. Queries hide stale positions immediately;
-- this job also removes expired rows when no clients are sharing.
select cron.schedule('expire-avatar-presence','* * * * *',$$
  delete from public.avatar_presence where expires_at<=now()
$$);
