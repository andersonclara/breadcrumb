-- Extend Ask with exact known venues and rank keyword matches before the SQL limit.
-- Existing reviewed places and all publication/privacy filters are preserved.
begin;
insert into public.places(name,aliases,location) values
 ('Emerson Alumni Hall','{}',extensions.st_setsrid(extensions.st_makepoint(-82.349071897187,29.652488925078),4326)),
 ('Communicore','{}',extensions.st_setsrid(extensions.st_makepoint(-82.344913693750,29.640887742266),4326))
on conflict(name) do nothing;

-- Strip only an explicit room suffix; vague labels such as Plaza remain unresolved.
create function public.ask_venue_key(value text) returns text
language sql immutable security invoker set search_path='' as $$
 select lower(trim(regexp_replace(trim(value),'[[:space:]]+(\([A-Za-z]*[0-9][[:alnum:]-]*\)|[Rr][Oo][Oo][Mm][[:space:]]+[A-Za-z]*[0-9][[:alnum:]-]*)$','','g')))
$$;
revoke all on function public.ask_venue_key(text) from public;
grant execute on function public.ask_venue_key(text) to anon,authenticated,service_role;

create or replace function public.ask_search_events(p jsonb) returns jsonb
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
  left join lateral (select v.location from public.places v where public.ask_venue_key(e.venue_text)=lower(v.name)
    or exists(select 1 from unnest(v.aliases) a where public.ask_venue_key(e.venue_text)=lower(a)) order by v.id limit 1) venue on true
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
  order by "distanceMeters" nulls last,
   (select coalesce(sum(ts_rank_cd(
     setweight(to_tsvector('english',coalesce(e.title,'')),'A') ||
     setweight(to_tsvector('english',concat_ws(' ',e.club,array_to_string(e.tags,' '))),'B') ||
     setweight(to_tsvector('english',coalesce(e.description,'')),'C'),plainto_tsquery('english',term))),0)
    from jsonb_array_elements_text(p->'terms') term) desc,e.starts_at,e.id limit 20
 ) r);
end $$;

commit;
