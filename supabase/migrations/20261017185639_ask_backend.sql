-- Apply AFTER event_ingestion, after reconciling hosted migration history.
-- Search runs as the caller under RLS. Quotas alone require the server role.
begin;

-- Existing pixel-map landmark anchors; never overwrite a curated place.
insert into public.places(name,aliases,location) values
 ('Reitz Union',array['Reitz','J. Wayne Reitz Union'],extensions.st_setsrid(extensions.st_makepoint(-82.347875048125,29.646223700078124),4326)),
 ('Marston Science Library',array['Marston','MSL'],extensions.st_setsrid(extensions.st_makepoint(-82.3439545975,29.647958100234376),4326)),
 ('Library West',array['Lib West','West Library'],extensions.st_setsrid(extensions.st_makepoint(-82.3429113503125,29.651401099609377),4326)),
 ('Century Tower',array['Century'],extensions.st_setsrid(extensions.st_makepoint(-82.3433212965625,29.648813797109376),4326))
on conflict(name) do nothing;

create function public.ask_places(p_query text) returns jsonb
language sql stable security invoker set search_path='' set statement_timeout='3s' as $$
 select coalesce(jsonb_agg(r),'[]'::jsonb) from (
  select p.name,p.aliases,extensions.st_y(p.location::extensions.geometry) as latitude,extensions.st_x(p.location::extensions.geometry) as longitude
  from public.places p where length(trim(p_query)) between 2 and 100 and
   (lower(p.name)=lower(trim(p_query)) or exists(select 1 from unnest(p.aliases) a where lower(a)=lower(trim(p_query)))
    or (length(trim(p_query))>=4 and position(lower(trim(p_query)) in lower(p.name))>0))
  order by (lower(p.name)=lower(trim(p_query)) or exists(select 1 from unnest(p.aliases) a where lower(a)=lower(trim(p_query)))) desc,p.name limit 5
 ) r
$$;

-- All exposed RPC inputs are bounded independently of the Next.js route.
create function public.ask_validate(p jsonb) returns void
language plpgsql stable security invoker set search_path='' as $$
begin
 if p is null or jsonb_typeof(p)<>'object' or pg_column_size(p)>8000
  or not(p ?& array['start','end','radius','terms','categories','latitude','longitude'])
  or (p->>'start')::timestamptz is null or (p->>'end')::timestamptz is null
  or (p->>'end')::timestamptz<=(p->>'start')::timestamptz
  or (p->>'end')::timestamptz-(p->>'start')::timestamptz>interval '8 days'
  or (p->>'radius')::integer not between 100 and 5000
  or jsonb_typeof(p->'terms') is distinct from 'array' or jsonb_array_length(p->'terms')>6
  or jsonb_typeof(p->'categories') is distinct from 'array' or jsonb_array_length(p->'categories')>5
  or (p->>'latitude' is null)<>(p->>'longitude' is null)
  or ((p->>'latitude')::double precision not between 29.60 and 29.70)
  or ((p->>'longitude')::double precision not between -82.42 and -82.28)
  or (p ? 'ids' and (jsonb_typeof(p->'ids') is distinct from 'array' or jsonb_array_length(p->'ids')>4))
 then raise exception 'Invalid discovery filters';end if;
 if exists(select 1 from jsonb_array_elements_text(p->'terms') t where length(t) not between 1 and 60)
  or exists(select 1 from jsonb_array_elements_text(p->'categories') t where t not in ('event','freebie','crowd','construction','hazard'))
 then raise exception 'Invalid discovery terms';end if;
end $$;

create function public.ask_search_events(p jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' set statement_timeout='3s' as $$
begin
 perform public.ask_validate(p);
 return (select coalesce(jsonb_agg(r),'[]'::jsonb) from (
  select 'event' as kind,e.id,e.title,e.description,null::text as category,e.venue_text as venue,
   extensions.st_y(loc.point::extensions.geometry) as latitude,extensions.st_x(loc.point::extensions.geometry) as longitude,
   e.starts_at as "startsAt",e.ends_at as "endsAt",e.event_date as "eventDate",e.all_day as "allDay",
   null::timestamptz as "createdAt",null::timestamptz as "expiresAt",null::text as state,0 as "confirmCount",0 as "disputeCount",
   e.source,e.url as "sourceUrl",e.last_synced_at as "lastSyncedAt",e.price_text as "priceText",
   case when lower(trim(e.price_text)) in ('free','free admission','free entry','no charge','0','$0','0.00','$0.00') then 'free' else 'unknown' end as "priceType",
   case when p->>'latitude' is not null then round(extensions.st_distance(loc.point,extensions.st_setsrid(extensions.st_makepoint((p->>'longitude')::double precision,(p->>'latitude')::double precision),4326)::extensions.geography)) end as "distanceMeters"
  from public.club_events e
  left join public.places known on known.id=e.place_id
  left join lateral (select v.location from public.places v where lower(trim(e.venue_text))=lower(v.name)
    or exists(select 1 from unnest(v.aliases) a where lower(trim(e.venue_text))=lower(a)) order by v.id limit 1) venue on true
  cross join lateral (select coalesce(e.location,known.location,venue.location) as point) loc
  where e.ingestion_status='published' and e.url ~ '^https?://' and e.starts_at<(p->>'end')::timestamptz
   and (e.ends_at>now() or e.starts_at>=now() or (e.all_day and coalesce(e.ends_at,((coalesce(e.event_date,(e.starts_at at time zone 'America/New_York')::date)+1)::timestamp at time zone 'America/New_York'))>now()))
   and case when e.all_day then
    not coalesce((p->>'nowOnly')::boolean,false) and coalesce(e.ends_at,((coalesce(e.event_date,(e.starts_at at time zone 'America/New_York')::date)+1)::timestamp at time zone 'America/New_York'))>(p->>'start')::timestamptz
   else (e.ends_at>(p->>'start')::timestamptz or e.starts_at>=(p->>'start')::timestamptz) end
   and (not coalesce((p->>'freeOnly')::boolean,false) or lower(trim(e.price_text)) in ('free','free admission','free entry','no charge','0','$0','0.00','$0.00'))
   and (jsonb_array_length(p->'terms')=0 or exists(select 1 from jsonb_array_elements_text(p->'terms') term
    where to_tsvector('english',concat_ws(' ',e.title,e.club,e.description,array_to_string(e.tags,' '))) @@ plainto_tsquery('english',term)))
   and (p->>'latitude' is null or extensions.st_dwithin(loc.point,extensions.st_setsrid(extensions.st_makepoint((p->>'longitude')::double precision,(p->>'latitude')::double precision),4326)::extensions.geography,(p->>'radius')::integer))
   and (not(p ? 'ids') or e.id::text in (select jsonb_array_elements_text(p->'ids')))
  order by "distanceMeters" nulls last,e.starts_at,e.id limit 20
 ) r);
end $$;

create function public.ask_search_crumbs(p jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' set statement_timeout='3s' as $$
begin
 perform public.ask_validate(p);
 return (select coalesce(jsonb_agg(r),'[]'::jsonb) from (
  select 'crumb' as kind,c.id,c.title,c.description,c.category::text,null::text as venue,
   extensions.st_y(c.location::extensions.geometry) as latitude,extensions.st_x(c.location::extensions.geometry) as longitude,
   null::timestamptz as "startsAt",null::timestamptz as "endsAt",null::date as "eventDate",false as "allDay",
   c.created_at as "createdAt",c.expires_at as "expiresAt",public.loaf_state(c) as state,c.confirm_count as "confirmCount",c.dispute_count as "disputeCount",
   'community' as source,null::text as "sourceUrl",null::timestamptz as "lastSyncedAt",null::text as "priceText",
   case when c.category='freebie' then 'free' else 'unknown' end as "priceType",
   case when p->>'latitude' is not null then round(extensions.st_distance(c.location,extensions.st_setsrid(extensions.st_makepoint((p->>'longitude')::double precision,(p->>'latitude')::double precision),4326)::extensions.geography)) end as "distanceMeters"
  from public.crumbs c
  where c.community_id='campus' and c.status='active' and c.expires_at>now() and c.created_at<=now()
   and public.loaf_state(c) not in ('stale','toast') and c.category<>'sighting'
   -- Live observations cannot be evidence for tomorrow or scheduled future activity.
   and (p->>'start')::timestamptz<=now()+interval '5 seconds'
   and (coalesce((p->>'nowOnly')::boolean,false) or (p->>'end')::timestamptz>now())
   and (jsonb_array_length(p->'categories')=0 or c.category::text in (select jsonb_array_elements_text(p->'categories')))
   and (not coalesce((p->>'freeOnly')::boolean,false) or c.category='freebie')
   and (jsonb_array_length(p->'terms')=0 or exists(select 1 from jsonb_array_elements_text(p->'terms') term
    where to_tsvector('english',concat_ws(' ',c.title,c.description)) @@ plainto_tsquery('english',term)))
   and (p->>'latitude' is null or extensions.st_dwithin(c.location,extensions.st_setsrid(extensions.st_makepoint((p->>'longitude')::double precision,(p->>'latitude')::double precision),4326)::extensions.geography,(p->>'radius')::integer))
   and (not(p ? 'ids') or c.id::text in (select jsonb_array_elements_text(p->'ids')))
  order by "distanceMeters" nulls last,c.created_at desc,c.id limit 20
 ) r);
end $$;

create table public.ask_quota (
 key text not null,bucket timestamptz not null,requests integer not null check(requests>0),primary key(key,bucket)
);
create index ask_quota_expiry on public.ask_quota(bucket);
alter table public.ask_quota enable row level security;
revoke all on public.ask_quota from public,anon,authenticated;
grant select,insert,update,delete on public.ask_quota to service_role;
create function public.ask_take_quota(p_key text) returns boolean
language plpgsql volatile security invoker set search_path='' set statement_timeout='3s' as $$
declare n integer; b timestamptz:=date_trunc('day',now());
begin
 if p_key !~ '^[a-f0-9]{64}$' or p_key is null then raise exception 'Invalid quota key';end if;
 delete from public.ask_quota where bucket<now()-interval '2 days';
 -- Same lock order in every transaction. Caps apply across server instances.
 insert into public.ask_quota values('global',b,1) on conflict(key,bucket) do update set requests=public.ask_quota.requests+1
  where public.ask_quota.requests<500 returning requests into n;
 if n is null then return false;end if;
 n:=null;
 insert into public.ask_quota values('day:'||p_key,b,1) on conflict(key,bucket) do update set requests=public.ask_quota.requests+1
  where public.ask_quota.requests<60 returning requests into n;
 if n is null then return false;end if;
 n:=null;
 insert into public.ask_quota values('minute:'||p_key,date_trunc('minute',now()),1) on conflict(key,bucket) do update set requests=public.ask_quota.requests+1
  where public.ask_quota.requests<6 returning requests into n;
 return n is not null;
end $$;

revoke all on function public.ask_places(text),public.ask_validate(jsonb),public.ask_search_events(jsonb),public.ask_search_crumbs(jsonb),public.ask_take_quota(text) from public;
grant execute on function public.ask_places(text),public.ask_validate(jsonb),public.ask_search_events(jsonb),public.ask_search_crumbs(jsonb) to anon,authenticated;
revoke all on function public.ask_take_quota(text) from anon,authenticated;
grant execute on function public.ask_take_quota(text) to service_role;
commit;
