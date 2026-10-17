-- Imported scheduled events remain separate from student Crumbs and votes.
begin;

alter table public.club_events
  add column ingestion_status text not null default 'published'
    check (ingestion_status in ('published','needs_review','cancelled')),
  add column event_date date,
  add column all_day boolean not null default false,
  add column price_text text,
  add column tags text[] not null default '{}',
  add column review_reasons text[] not null default '{}';
create index club_events_published_time on public.club_events(starts_at,id)
  where ingestion_status='published';
drop policy public_events on public.club_events;
create policy public_events on public.club_events for select to anon,authenticated
  using (ingestion_status='published');

-- Service-only staging. Captions/media URLs never appear in public event queries.
create table public.event_source_records (
  source text not null,
  source_id text not null,
  source_url text not null,
  account_handle text,
  posted_at timestamptz,
  content_hash text not null,
  payload jsonb not null default '{}',
  extraction jsonb,
  processing_status text not null default 'pending'
    check(processing_status in ('pending','processed','needs_review','rejected')),
  fetched_at timestamptz not null default now(),
  primary key(source,source_id)
);
create index event_source_records_pending on public.event_source_records(source,fetched_at)
  where processing_status='pending';

create table public.event_source_state (
  source text primary key,
  etag text,
  last_modified text,
  next_sync_at timestamptz not null default now(),
  last_success_at timestamptz,
  lease_token uuid,
  lease_expires_at timestamptz
);
create table public.event_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check(status in ('running','succeeded','partial','failed','not_modified')),
  fetched integer not null default 0 check(fetched>=0),
  saved integer not null default 0 check(saved>=0),
  review integer not null default 0 check(review>=0),
  error_code text,
  details jsonb not null default '{}'
);
create index event_ingestion_runs_source_time on public.event_ingestion_runs(source,started_at desc);

alter table public.event_source_records enable row level security;
alter table public.event_source_state enable row level security;
alter table public.event_ingestion_runs enable row level security;
revoke all on public.event_source_records,public.event_source_state,public.event_ingestion_runs from public,anon,authenticated;
grant all on public.event_source_records,public.event_source_state,public.event_ingestion_runs to service_role;

-- Atomic leases protect against overlapping cron/manual jobs across app instances.
-- Invoker rights and explicit grants: these are never client-callable write RPCs.
create function public.claim_event_sync(p_source text,p_force boolean default false) returns uuid
language plpgsql security invoker set search_path='' as $$
declare token uuid:=gen_random_uuid(); claimed uuid;
begin
  insert into public.event_source_state(source,lease_token,lease_expires_at)
  values(p_source,token,now()+interval '15 minutes')
  on conflict(source) do update set lease_token=excluded.lease_token,lease_expires_at=excluded.lease_expires_at
  where (public.event_source_state.lease_expires_at is null or public.event_source_state.lease_expires_at<=now())
    and (p_force or public.event_source_state.next_sync_at<=now())
  returning lease_token into claimed;
  return claimed;
end $$;
create function public.release_event_sync(p_source text,p_token uuid,p_delay_seconds integer,
  p_success boolean default false,p_etag text default null,p_modified text default null) returns boolean
language plpgsql security invoker set search_path='' as $$
begin
  update public.event_source_state set lease_token=null,lease_expires_at=null,
    next_sync_at=now()+make_interval(secs=>greatest(60,least(p_delay_seconds,604800))),
    last_success_at=case when p_success then now() else last_success_at end,
    etag=case when p_success then p_etag else etag end,
    last_modified=case when p_success then p_modified else last_modified end
  where source=p_source and lease_token=p_token;
  return found;
end $$;
revoke all on function public.claim_event_sync(text,boolean),public.release_event_sync(text,uuid,integer,boolean,text,text) from public,anon,authenticated;
grant execute on function public.claim_event_sync(text,boolean),public.release_event_sync(text,uuid,integer,boolean,text,text) to service_role;

commit;
