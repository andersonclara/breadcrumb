-- Self-selected communities. Apply after migrations 001, 002, and 003.
begin;
create table public.communities(id text primary key,name text not null,accent text not null,background text not null,description text not null,position integer not null);
insert into public.communities values
 ('campus','Campus','#D78636','#FFF2D5','Everyday discoveries across UF.',0),
 ('girls','Girls Only','#BD4B83','#FDE4EF','A self-selected space for the girls of UF.',1),
 ('gaming','Gaming','#7454B3','#EEE5FF','Find your party, game nights, and campus players.',2),
 ('sports','Sports','#307D69','#DCF1DE','Pickup games, watch parties, and Gator energy.',3),
 ('study','Study Buddies','#3B7FAD','#E2F1FD','Study sessions, library spots, and accountability.',4);
create table public.community_memberships(community_id text not null references public.communities,user_id uuid not null references public.profiles on delete cascade,joined_at timestamptz not null default now(),primary key(community_id,user_id));
alter table public.crumbs add column community_id text not null default 'campus' references public.communities;
create index crumbs_community on public.crumbs(community_id,status,created_at desc);
create function private.can_access_community(cid text,uid uuid) returns boolean language sql stable security definer set search_path='' as $$select cid='campus' or exists(select 1 from public.community_memberships where community_id=cid and user_id=uid)$$;
revoke all on function private.can_access_community(text,uuid) from public,anon,authenticated;
create function public.can_read_community(cid text) returns boolean language sql stable security definer set search_path='' as $$select private.can_access_community(cid,auth.uid())$$;
revoke all on function public.can_read_community(text) from public;
grant execute on function public.can_read_community(text) to anon,authenticated,service_role;
alter table public.communities enable row level security;
alter table public.community_memberships enable row level security;
revoke all on public.communities,public.community_memberships from anon,authenticated;
grant select on public.communities to anon,authenticated;
grant select on public.community_memberships to authenticated;
grant all on public.communities,public.community_memberships to service_role;
create policy community_directory on public.communities for select to anon,authenticated using(true);
create policy own_memberships on public.community_memberships for select to authenticated using(user_id=(select auth.uid()));
drop policy recent_crumbs on public.crumbs;
create policy recent_crumbs on public.crumbs for select to anon,authenticated using(public.can_read_community(community_id) and (status='active' or expires_at>now()-interval '2 days'));
create or replace function public.pixel_world() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object(
  'communities',(select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'accent',g.accent,'background',g.background,'description',g.description,'joined',private.can_access_community(g.id,auth.uid()),'member_count',(select count(*) from public.community_memberships m where m.community_id=g.id)) order by g.position) from public.communities g),
  'profile',(select jsonb_build_object('id',p.id,'handle',p.handle,'avatar',p.avatar,'avatar_completed',p.avatar_completed,'friend_code',p.friend_code) from public.profiles p where p.id=auth.uid()),
  'crumbs',coalesce((select jsonb_agg(t) from (select c.id,c.community_id,c.title,c.description,c.category,c.created_at,c.expires_at,c.confirm_count,c.dispute_count,public.loaf_state(c) as state,
    extensions.st_y(c.location::extensions.geometry) as latitude,extensions.st_x(c.location::extensions.geometry) as longitude,
    (select count(*) from public.crumb_mentions m where m.crumb_id=c.id) as related_posts,
    (select v.value from public.votes v where v.crumb_id=c.id and v.user_id=auth.uid()) as my_vote,
    c.user_id=auth.uid() as is_author
   from public.crumbs c where private.can_access_community(c.community_id,auth.uid()) and c.status='active' and c.expires_at>now()
    and not exists(select 1 from public.crumb_reports r where r.crumb_id=c.id and r.user_id=auth.uid())
    and extensions.st_y(c.location::extensions.geometry) between 29.6205 and 29.657 and extensions.st_x(c.location::extensions.geometry) between -82.375 and -82.333
   order by c.created_at desc limit 200) t),'[]'::jsonb),
  'friends',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'accepted',f.accepted,'incoming',f.addressee_id=auth.uid(),'handle',p.handle,'avatar',p.avatar))
   from public.friendships f join public.profiles p on p.id=case when f.requester_id=auth.uid() then f.addressee_id else f.requester_id end
   where auth.uid() in (f.requester_id,f.addressee_id)),'[]'::jsonb),
  'presence',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'handle',p.handle,'avatar',p.avatar,'latitude',l.latitude,'longitude',l.longitude,'updated_at',l.updated_at,'expires_at',l.expires_at))
   from public.avatar_presence l join public.profiles p on p.id=l.user_id where l.expires_at>now() and not p.banned and
   (l.user_id=auth.uid() or exists(select 1 from public.friendships f where f.accepted and
    ((f.requester_id=auth.uid() and f.addressee_id=l.user_id) or (f.addressee_id=auth.uid() and f.requester_id=l.user_id))))),'[]'::jsonb))
$$;

create or replace function public.pixel_action(p_action text,p_data jsonb default '{}') returns jsonb
language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); target uuid; c public.crumbs; lat double precision; lon double precision;
 cat public.crumb_category; post_title text; grouped boolean:=false; point extensions.geography; own_profile public.profiles; community text:=coalesce(p_data->>'community_id','campus');
begin
 if uid is null then raise exception 'UF login required'; end if;
 -- Serialize actions by account, including rate-limit checks.
 select * into own_profile from public.profiles where id=uid for update;
 perform private.assert_actor(uid);
 if p_action in ('community_join','community_leave') then
  perform private.limit_action(uid,'communities',30,600);
  if not exists(select 1 from public.communities where id=community) then raise exception 'Community not found'; end if;
  if p_action='community_join' and community<>'campus' then insert into public.community_memberships(community_id,user_id) values(community,uid) on conflict do nothing;
  elsif p_action='community_leave' and community<>'campus' then
   delete from public.community_memberships where community_id=community and user_id=uid;
   delete from public.notifications n using public.crumbs posted where n.crumb_id=posted.id and n.user_id=uid and posted.community_id=community;
  end if;
 elsif p_action='avatar' then
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
  if lat is null or lon is null or not(lat between 29.6205 and 29.657 and lon between -82.375 and -82.333) then raise exception 'Sharing is limited to the UF campus map'; end if;
  lat:=round((lat*111320/100)::numeric)*100/111320; lon:=round((lon*96750/100)::numeric)*100/96750;
  delete from public.avatar_presence where expires_at<now();
  insert into public.avatar_presence(user_id,latitude,longitude) values(uid,lat,lon)
    on conflict(user_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,updated_at=now(),expires_at=now()+interval '90 seconds';
 elsif p_action='create' then
  if not own_profile.avatar_completed then raise exception 'Create your avatar first'; end if;
  if not private.can_access_community(community,uid) then raise exception 'Join this community before posting'; end if;
  perform private.limit_action(uid,'posts',5,600);
  post_title:=trim(p_data->>'title'); cat:=(p_data->>'category')::public.crumb_category;
  lat:=(p_data->>'latitude')::double precision; lon:=(p_data->>'longitude')::double precision;
  if post_title is null or length(post_title) not between 3 and 180 or cat is null then raise exception 'Choose a category and a title of 3–180 characters'; end if;
  if lat is null or lon is null or not(lat between 29.6205 and 29.657 and lon between -82.375 and -82.333) then raise exception 'Choose a point on the UF map'; end if;
  point:=extensions.st_setsrid(extensions.st_makepoint(lon,lat),4326)::extensions.geography;
  -- Serializing grouping prevents simultaneous matching posts becoming duplicates.
  perform pg_advisory_xact_lock(730017);
  if p_data->>'join_id' is not null then
   select * into c from public.crumbs where id=(p_data->>'join_id')::uuid and community_id=community and category=cat and status='active' and expires_at>now() and extensions.st_dwithin(location,point,100) for update;
   if not found then raise exception 'That breadcrumb is no longer nearby and active'; end if;
  else
   select * into c from public.crumbs where community_id=community and category=cat and status='active' and expires_at>now() and extensions.st_dwithin(location,point,100)
    and private.topic_key(post_title)=private.topic_key(crumbs.title) order by created_at desc limit 1 for update;
  end if;
  if c.id is not null then
   if c.user_id=uid then raise exception 'You already posted this breadcrumb'; end if;
   insert into public.crumb_mentions(crumb_id,user_id,title) values(c.id,uid,post_title) on conflict do nothing;
   insert into public.votes(crumb_id,user_id,value) values(c.id,uid,1) on conflict(crumb_id,user_id) do update set value=1;
   target:=c.id; grouped:=true;
  else
   insert into public.crumbs(user_id,category,title,description,location,community_id) values(uid,cat,post_title,nullif(trim(p_data->>'description'),''),point,community) returning id into target;
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

create or replace function private.prepare_interaction() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c public.crumbs;
begin
  -- Every interaction locks the parent first, serializing moderation per crumb.
  select * into c from public.crumbs where id = new.crumb_id for update;
  if not found or c.status <> 'active' or c.expires_at <= now() then raise exception 'Crumb is no longer active'; end if;
  perform private.assert_actor(new.user_id);
  if not private.can_access_community(c.community_id,new.user_id) then raise exception 'Join this community to interact'; end if;
  if tg_op = 'UPDATE' and (new.crumb_id <> old.crumb_id or new.user_id <> old.user_id) then
    raise exception 'Interaction identity cannot change';
  end if;
  if tg_table_name = 'votes' then
    if c.user_id = new.user_id then raise exception 'Cannot vote on your own crumb'; end if;
    if tg_op = 'INSERT' then new.created_at := now();
    elsif new.value is distinct from old.value then new.created_at := now();
    else new.created_at := old.created_at; end if;
  end if;
  return new;
end $$;

create or replace function private.notify_crumb(c public.crumbs,is_full boolean) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications(user_id,crumb_id,title,body)
  select distinct s.user_id,c.id,
    case when is_full then 'Full Loaf: ' else 'Community crumb: ' end || c.title,
    coalesce(p.name,'On campus')
  from public.subscriptions s join public.profiles recipient on recipient.id = s.user_id
  left join public.places p on p.id = c.place_id
  where private.can_access_community(c.community_id,s.user_id) and s.user_id <> c.user_id and not recipient.banned
    and (cardinality(s.categories) = 0 or c.category = any(s.categories))
    and (is_full or not s.full_loaf_only) and (c.category <> 'sighting' or is_full)
    and (s.kind = 'campus' or (s.kind = 'place' and s.place_id = c.place_id))
  on conflict (user_id,crumb_id) do nothing
$$;
commit;
