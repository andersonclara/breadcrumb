-- Email-first signup, editable usernames, and a private server-side login lookup.
-- Apply after existing migrations. Passwords remain managed by Supabase Auth.
begin;
alter table public.profiles add column account_completed boolean not null default false;
create function private.default_username(email text,uid uuid) returns text language plpgsql security definer set search_path='' as $$
declare candidate text;
begin
 candidate:=left(regexp_replace(lower(split_part(email,'@',1)),'[^a-z0-9_.-]','_','g'),30);
 if candidate !~ '^[a-z0-9]' then candidate:='u'||left(candidate,29); end if;
 if length(candidate)<3 then candidate:=candidate||left(replace(uid::text,'-',''),3); end if;
 if exists(select 1 from public.profiles where lower(handle)=candidate and id<>uid) then candidate:=left(candidate,23)||'-'||left(replace(uid::text,'-',''),6); end if;
 return candidate;
end $$;
do $$ declare p record; begin
 for p in select profile.id,u.email,profile.handle from public.profiles profile join auth.users u on u.id=profile.id order by profile.created_at,profile.id loop
  if p.handle ~ '^crumb-[0-9a-f]{32}$' or lower(p.handle) !~ '^[a-z0-9][a-z0-9_.-]{2,29}$' then
   update public.profiles set handle=private.default_username(p.email,p.id) where id=p.id;
  else update public.profiles set handle=lower(p.handle) where id=p.id; end if;
 end loop;
end $$;
create unique index profiles_username_case_insensitive on public.profiles(lower(handle));
alter table public.profiles add constraint valid_username check(handle ~ '^[a-z0-9][a-z0-9_.-]{2,29}$');
create or replace function private.handle_auth_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.email is null or lower(new.email) !~ '^[^@[:space:]]+@ufl[.]edu$' then raise exception 'A UF email address is required'; end if;
 if tg_op='INSERT' then insert into public.profiles(id,handle) values(new.id,private.default_username(new.email,new.id)); end if;
 return new;
end $$;
create function public.complete_account(p_username text) returns void language plpgsql security definer set search_path='' as $$
declare uid uuid:=auth.uid(); chosen text:=lower(trim(p_username));
begin
 if uid is null then raise exception 'Sign in with your verified UF email'; end if;
 perform 1 from public.profiles where id=uid for update;
 perform private.assert_actor(uid);
 if chosen is null or chosen !~ '^[a-z0-9][a-z0-9_.-]{2,29}$' then raise exception 'Use 3-30 letters, numbers, dots, underscores, or hyphens'; end if;
 if not exists(select 1 from auth.users where id=uid and email_confirmed_at is not null and coalesce(encrypted_password,'')<>'') then raise exception 'Set a password before completing your account'; end if;
 perform private.limit_action(uid,'username',10,3600);
 begin
  update public.profiles set handle=chosen,account_completed=true where id=uid;
 exception when unique_violation then raise exception 'This username is already taken'; end;
end $$;
-- Only the server may resolve usernames to private email addresses.
create function public.login_email_for_username(p_username text) returns text language sql stable security definer set search_path='' as $$
 select u.email from public.profiles p join auth.users u on u.id=p.id where lower(p.handle)=lower(trim(p_username)) and u.email_confirmed_at is not null
$$;
revoke all on function private.default_username(text,uuid) from public,anon,authenticated;
revoke all on function public.complete_account(text),public.login_email_for_username(text) from public,anon,authenticated;
grant execute on function public.complete_account(text) to authenticated,service_role;
grant execute on function public.login_email_for_username(text) to service_role;
commit;
