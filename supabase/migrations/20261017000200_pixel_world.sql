-- Apply AFTER the initial schema. Existing users and crumbs are preserved.
begin;
alter table public.profiles add column avatar jsonb not null default '{"skin":1,"hair":0,"shirt":0,"pants":0,"hairstyle":0,"top":0,"accessory":0}',
  add column avatar_completed boolean not null default false,
  add column friend_code text not null unique default upper(substr(md5(gen_random_uuid()::text),1,8));
create function private.valid_avatar(a jsonb) returns boolean language sql immutable set search_path='' as $$
 select case when jsonb_typeof(a)='object' then
   (select count(*) from jsonb_object_keys(a))=7 and not exists(select 1 from jsonb_each(a) e where jsonb_typeof(e.value)<>'number')
   and coalesce(a->>'skin' ~ '^[0-4]$',false) and coalesce(a->>'hair' ~ '^[0-5]$',false)
   and coalesce(a->>'shirt' ~ '^[0-5]$',false) and coalesce(a->>'pants' ~ '^[0-3]$',false)
   and coalesce(a->>'hairstyle' ~ '^[0-3]$',false) and coalesce(a->>'top' ~ '^[0-2]$',false)
   and coalesce(a->>'accessory' ~ '^[0-3]$',false) else false end
$$;
alter table public.profiles add constraint profiles_avatar_valid check(private.valid_avatar(avatar));

create table public.friendships (
 id uuid primary key default gen_random_uuid(),
 requester_id uuid not null references public.profiles on delete cascade,
 addressee_id uuid not null references public.profiles on delete cascade,
 accepted boolean not null default false,
 created_at timestamptz not null default now(),
 check(requester_id<>addressee_id)
);
create unique index friendship_pair on public.friendships(least(requester_id,addressee_id),greatest(requester_id,addressee_id));
create index friendship_addressee on public.friendships(addressee_id);
create table public.avatar_presence (
 user_id uuid primary key references public.profiles on delete cascade,
 latitude double precision not null,
 longitude double precision not null,
 updated_at timestamptz not null default now(),
 expires_at timestamptz not null default now()+interval '90 seconds'
);
create table public.crumb_mentions (
 crumb_id uuid not null references public.crumbs on delete cascade,
 user_id uuid not null references public.profiles on delete cascade,
 title text not null check(length(title) between 3 and 180),
 created_at timestamptz not null default now(),
 primary key(crumb_id,user_id)
);
create table private.action_limits (
 user_id uuid not null references public.profiles on delete cascade,
 action text not null,
 bucket bigint not null,
 hits integer not null default 1,
 primary key(user_id,action)
);
create function private.limit_action(uid uuid,action_name text,max_hits integer,window_seconds integer) returns void
language plpgsql security definer set search_path='' as $$
declare b bigint:=floor(extract(epoch from now())/window_seconds); n integer;
begin
 insert into private.action_limits(user_id,action,bucket) values(uid,action_name,b)
 on conflict(user_id,action) do update set bucket=b,hits=case when action_limits.bucket=b then action_limits.hits+1 else 1 end returning hits into n;
 if n>max_hits then raise exception 'Please wait before trying again' using errcode='P0001'; end if;
end $$;
create function private.topic_key(title text) returns text language sql immutable set search_path='' as $$
 select string_agg(word,' ' order by word) from (select distinct word from regexp_split_to_table(lower(title),'[^a-z0-9]+') word
 where (length(word)>1 or word ~ '^[0-9]+$') and word not in ('the','at','in','on','near','outside','now','and','is','an','there')) tokens
$$;

alter table public.friendships enable row level security;
alter table public.avatar_presence enable row level security;
alter table public.crumb_mentions enable row level security;
revoke all on public.friendships,public.avatar_presence,public.crumb_mentions from public,anon,authenticated;
grant select on public.friendships,public.avatar_presence to authenticated;
grant all on public.friendships,public.avatar_presence,public.crumb_mentions to service_role;
create policy participants on public.friendships for select to authenticated using((select auth.uid()) in (requester_id,addressee_id));
create policy friends_presence on public.avatar_presence for select to authenticated using(expires_at>now() and
 (user_id=(select auth.uid()) or exists(select 1 from public.friendships f where f.accepted and
 ((f.requester_id=(select auth.uid()) and f.addressee_id=user_id) or (f.addressee_id=(select auth.uid()) and f.requester_id=user_id)))));

-- No location history table: one replaceable, rounded, short-lived position.
create function public.pixel_world() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'profile',(select jsonb_build_object('id',p.id,'handle',p.handle,'avatar',p.avatar,'avatar_completed',p.avatar_completed,'friend_code',p.friend_code) from public.profiles p where p.id=auth.uid()),
  'crumbs',coalesce((select jsonb_agg(t) from (select c.id,c.title,c.description,c.category,c.created_at,c.expires_at,c.confirm_count,c.dispute_count,public.loaf_state(c) as state,
    extensions.st_y(c.location::extensions.geometry) as latitude,extensions.st_x(c.location::extensions.geometry) as longitude,
    (select count(*) from public.crumb_mentions m where m.crumb_id=c.id) as related_posts,
    (select v.value from public.votes v where v.crumb_id=c.id and v.user_id=auth.uid()) as my_vote,
    c.user_id=auth.uid() as is_author
   from public.crumbs c where c.status='active' and c.expires_at>now()
    and not exists(select 1 from public.crumb_reports r where r.crumb_id=c.id and r.user_id=auth.uid())
    and extensions.st_y(c.location::extensions.geometry) between 29.631 and 29.657 and extensions.st_x(c.location::extensions.geometry) between -82.370 and -82.338
   order by c.created_at desc limit 200) t),'[]'::jsonb),
  'friends',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'accepted',f.accepted,'incoming',f.addressee_id=auth.uid(),'handle',p.handle,'avatar',p.avatar))
   from public.friendships f join public.profiles p on p.id=case when f.requester_id=auth.uid() then f.addressee_id else f.requester_id end
   where auth.uid() in (f.requester_id,f.addressee_id)),'[]'::jsonb),
  'presence',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'handle',p.handle,'avatar',p.avatar,'latitude',l.latitude,'longitude',l.longitude,'updated_at',l.updated_at,'expires_at',l.expires_at))
   from public.avatar_presence l join public.profiles p on p.id=l.user_id where l.expires_at>now() and not p.banned and
   (l.user_id=auth.uid() or exists(select 1 from public.friendships f where f.accepted and
    ((f.requester_id=auth.uid() and f.addressee_id=l.user_id) or (f.addressee_id=auth.uid() and f.requester_id=l.user_id))))),'[]'::jsonb))
$$;

-- Request-scoped RPC: identity always comes from the verified Supabase JWT.
create function public.pixel_action(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); target uuid; c public.crumbs; lat double precision; lon double precision;
 cat public.crumb_category; post_title text; grouped boolean:=false; point extensions.geography; own_profile public.profiles;
begin
 if uid is null then raise exception 'UF login required'; end if;
 -- Serialize actions by account, including rate-limit checks.
 select * into own_profile from public.profiles where id=uid for update;
 perform private.assert_actor(uid);
 if p_action='avatar' then
  if not private.valid_avatar(p_data) then raise exception 'Invalid avatar'; end if;
  perform private.limit_action(uid,'avatar',30,600);
  update public.profiles set avatar=p_data,avatar_completed=true where id=uid;
 elsif p_action='friend_request' then
  perform private.limit_action(uid,'friends',20,600);
  select id into target from public.profiles where friend_code=upper(trim(p_data->>'code')) and not banned;
  if target is null or target=uid then raise exception 'Friend code not found'; end if;
  insert into public.friendships(requester_id,addressee_id) values(uid,target) on conflict do nothing;
 elsif p_action='friend_accept' then
  update public.friendships set accepted=true where id=(p_data->>'id')::uuid and addressee_id=uid;
  if not found then raise exception 'Friend request not found'; end if;
 elsif p_action='friend_remove' then
  delete from public.friendships where id=(p_data->>'id')::uuid and uid in (requester_id,addressee_id);
 elsif p_action='presence_stop' then
  delete from public.avatar_presence where user_id=uid;
 elsif p_action='presence' then
  if not own_profile.avatar_completed then raise exception 'Create your avatar first'; end if;
  perform private.limit_action(uid,'presence',30,60);
  lat:=(p_data->>'latitude')::double precision; lon:=(p_data->>'longitude')::double precision;
  if lat is null or lon is null or not(lat between 29.631 and 29.657 and lon between -82.370 and -82.338) then raise exception 'Sharing is limited to the UF campus map'; end if;
  lat:=round((lat*111320/100)::numeric)*100/111320; lon:=round((lon*96750/100)::numeric)*100/96750;
  delete from public.avatar_presence where expires_at<now();
  insert into public.avatar_presence(user_id,latitude,longitude) values(uid,lat,lon)
    on conflict(user_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now(),expires_at=now()+interval '90 seconds';
 elsif p_action='create' then
  if not own_profile.avatar_completed then raise exception 'Create your avatar first'; end if;
  perform private.limit_action(uid,'posts',5,600);
  post_title:=trim(p_data->>'title'); cat:=(p_data->>'category')::public.crumb_category;
  lat:=(p_data->>'latitude')::double precision; lon:=(p_data->>'longitude')::double precision;
  if post_title is null or length(post_title) not between 3 and 180 or cat is null then raise exception 'Choose a category and a title of 3–180 characters'; end if;
  if lat is null or lon is null or not(lat between 29.631 and 29.657 and lon between -82.370 and -82.338) then raise exception 'Choose a point on the UF map'; end if;
  point:=extensions.st_setsrid(extensions.st_makepoint(lon,lat),4326)::extensions.geography;
  -- Serializing grouping prevents simultaneous matching posts becoming duplicates.
  perform pg_advisory_xact_lock(730017);
  if p_data->>'join_id' is not null then
   select * into c from public.crumbs where id=(p_data->>'join_id')::uuid and category=cat and status='active' and expires_at>now() and extensions.st_dwithin(location,point,100) for update;
   if not found then raise exception 'That breadcrumb is no longer nearby and active'; end if;
  else
   select * into c from public.crumbs where category=cat and status='active' and expires_at>now() and extensions.st_dwithin(location,point,100)
    and private.topic_key(post_title)=private.topic_key(crumbs.title) order by created_at desc limit 1 for update;
  end if;
  if c.id is not null then
   if c.user_id=uid then raise exception 'You already posted this breadcrumb'; end if;
   insert into public.crumb_mentions(crumb_id,user_id,title) values(c.id,uid,post_title) on conflict do nothing;
   insert into public.votes(crumb_id,user_id,value) values(c.id,uid,1) on conflict(crumb_id,user_id) do update set value=1;
   target:=c.id; grouped:=true;
  else
   insert into public.crumbs(user_id,category,title,description,location) values(uid,cat,post_title,nullif(trim(p_data->>'description'),''),point) returning id into target;
  end if;
 elsif p_action='vote' then
  perform private.limit_action(uid,'votes',30,600);
  if p_data->>'value' not in ('1','-1') then raise exception 'Invalid vote'; end if;
  insert into public.votes(crumb_id,user_id,value) values((p_data->>'id')::uuid,uid,(p_data->>'value')::smallint)
   on conflict(crumb_id,user_id) do update set value=excluded.value;
 elsif p_action='report' then
  perform private.limit_action(uid,'reports',20,600);
  insert into public.crumb_reports(crumb_id,user_id,reason) values((p_data->>'id')::uuid,uid,p_data->>'reason') on conflict do nothing;
 else raise exception 'Unknown action'; end if;
 return jsonb_build_object('ok',true,'id',target,'grouped',grouped);
end $$;
create function private.hide_restricted_presence() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if new.banned or new.suspended_until>now() then delete from public.avatar_presence where user_id=new.id; end if;
 return new;
end $$;
create trigger profiles_hide_presence after update of banned,suspended_until on public.profiles for each row execute function private.hide_restricted_presence();
revoke all on all functions in schema private from public,anon,authenticated;
revoke all on function public.pixel_world(),public.pixel_action(text,jsonb) from public,anon,authenticated;
grant execute on function public.pixel_world() to anon,authenticated;
grant execute on function public.pixel_action(text,jsonb) to authenticated;
commit;
