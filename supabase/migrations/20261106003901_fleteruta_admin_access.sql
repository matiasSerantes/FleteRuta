-- Narrow admin-only directory and atomic app access changes. No Auth account creation.
create table public.fleteruta_access_events (
 id bigint generated always as identity primary key,
 actor_id uuid not null references auth.users(id),
 user_id uuid not null references auth.users(id),
 before_fleteruta boolean not null,
 after_fleteruta boolean not null,
 before_hidrotrack boolean not null,
 after_hidrotrack boolean not null,
 created_at timestamptz not null default now()
);
create index fleteruta_access_events_user_idx on public.fleteruta_access_events(user_id,created_at desc);
create index fleteruta_access_events_actor_idx on public.fleteruta_access_events(actor_id);
alter table public.fleteruta_access_events enable row level security;
revoke all on public.fleteruta_access_events from anon,authenticated;
grant select on public.fleteruta_access_events to authenticated;
create policy fleteruta_access_events_admin on public.fleteruta_access_events for select to authenticated using ((select private.is_admin()));

create function private.fleteruta_admin_users(p_search text,p_offset integer) returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if not private.is_admin() then raise exception 'Acceso denegado' using errcode='42501'; end if;
 if p_offset is null or p_offset<0 or p_offset>100000 or p_search is null or length(p_search)>120 then raise exception 'Filtro inválido' using errcode='22023'; end if;
 return (with directory as (
  select u.id as user_id,u.email,coalesce(p.full_name,'') as full_name,
   exists(select 1 from public.platform_admins a where a.user_id=u.id) as is_admin,
   coalesce(f.enabled,false) as fleteruta,
   (exists(select 1 from public.platform_admins a where a.user_id=u.id) or exists(select 1 from public.tenant_members m where m.user_id=u.id and m.active)) as hidrotrack,
   (exists(select 1 from public.platform_admins a where a.user_id=u.id) or exists(select 1 from public.tenant_members m where m.user_id=u.id and m.role='owner')) as hidro_protected,
   (select count(*) from public.tenant_members m where m.user_id=u.id) as hidro_memberships
  from auth.users u left join public.user_profiles p on p.user_id=u.id left join public.fleteruta_members f on f.user_id=u.id
  where u.email is not null and (p_search='' or u.email ilike '%'||p_search||'%' or p.full_name ilike '%'||p_search||'%')
 ) select jsonb_build_object('users',coalesce((select jsonb_agg(to_jsonb(page)) from (select * from directory order by lower(email),user_id limit 50 offset p_offset) page),'[]'::jsonb),'total',(select count(*) from directory)));
end $$;
revoke all on function private.fleteruta_admin_users(text,integer) from public,anon,authenticated;
grant execute on function private.fleteruta_admin_users(text,integer) to authenticated;
create function public.fleteruta_admin_users(p_search text default '',p_offset integer default 0) returns jsonb
language sql stable security invoker set search_path='' as $$select private.fleteruta_admin_users(p_search,p_offset)$$;
revoke all on function public.fleteruta_admin_users(text,integer) from public,anon;
grant execute on function public.fleteruta_admin_users(text,integer) to authenticated;

create function private.fleteruta_set_access(p_user uuid,p_fleteruta boolean,p_hidrotrack boolean) returns jsonb
language plpgsql security definer set search_path='' as $$
declare old_f boolean; old_h boolean; protected_h boolean; admin_target boolean; memberships integer; m record;
begin
 if not private.is_admin() then raise exception 'Acceso denegado' using errcode='42501'; end if;
 if p_fleteruta is null or p_hidrotrack is null then raise exception 'Elegí las aplicaciones' using errcode='22023'; end if;
 -- Serialize all changes to this account, including initial FleteRuta membership creation.
 perform 1 from auth.users where id=p_user for update;
 if not found then raise exception 'La cuenta no existe' using errcode='22023'; end if;
 select exists(select 1 from public.platform_admins where user_id=p_user) into admin_target;
 select coalesce((select enabled from public.fleteruta_members where user_id=p_user),false) into old_f;
 select admin_target or exists(select 1 from public.tenant_members where user_id=p_user and active) into old_h;
 select admin_target or exists(select 1 from public.tenant_members where user_id=p_user and role='owner') into protected_h;
 if admin_target and not p_fleteruta then raise exception 'El acceso del administrador está protegido' using errcode='22023'; end if;
 if protected_h and old_h and not p_hidrotrack then raise exception 'El acceso de titulares y administradores de HidroTrack está protegido' using errcode='22023'; end if;
 if p_hidrotrack<>old_h then
  if p_hidrotrack then
   select count(*) into memberships from public.tenant_members where user_id=p_user;
   if memberships<>1 then raise exception 'Asigná o elegí la empresa de esta cuenta desde HidroTrack antes de habilitarla' using errcode='22023'; end if;
   select tenant_id,role into m from public.tenant_members where user_id=p_user;
   if m.role<>'driver' then raise exception 'Gestioná el acceso del titular desde HidroTrack' using errcode='22023'; end if;
   perform public.admin_set_driver_access(m.tenant_id,p_user,true);
  else
   for m in select tenant_id from public.tenant_members where user_id=p_user and role='driver' and active order by tenant_id loop
    perform public.admin_set_driver_access(m.tenant_id,p_user,false);
   end loop;
  end if;
 end if;
 insert into public.fleteruta_members(user_id,enabled) values(p_user,p_fleteruta)
 on conflict(user_id) do update set enabled=excluded.enabled;
 if old_f<>p_fleteruta or old_h<>p_hidrotrack then
  insert into public.fleteruta_access_events(actor_id,user_id,before_fleteruta,after_fleteruta,before_hidrotrack,after_hidrotrack)
  values(auth.uid(),p_user,old_f,p_fleteruta,old_h,p_hidrotrack);
 end if;
 return jsonb_build_object('ok',true);
end $$;
revoke all on function private.fleteruta_set_access(uuid,boolean,boolean) from public,anon,authenticated;
grant execute on function private.fleteruta_set_access(uuid,boolean,boolean) to authenticated;
create function public.fleteruta_set_access(p_user uuid,p_fleteruta boolean,p_hidrotrack boolean) returns jsonb
language sql security invoker set search_path='' as $$select private.fleteruta_set_access(p_user,p_fleteruta,p_hidrotrack)$$;
revoke all on function public.fleteruta_set_access(uuid,boolean,boolean) from public,anon;
grant execute on function public.fleteruta_set_access(uuid,boolean,boolean) to authenticated;

-- Preserve HidroTrack's existing MFA requirement; authorization never trusts editable metadata.
create function private.fleteruta_access_status() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('is_admin',private.is_admin(),'mfa_required',
  exists(select 1 from auth.mfa_factors where user_id=auth.uid() and factor_type='totp' and status='verified')
  and coalesce(auth.jwt()->>'aal','aal1')<>'aal2')
$$;
revoke all on function private.fleteruta_access_status() from public,anon,authenticated;
grant execute on function private.fleteruta_access_status() to authenticated;
create function public.fleteruta_access_status() returns jsonb
language sql stable security invoker set search_path='' as $$select private.fleteruta_access_status()$$;
revoke all on function public.fleteruta_access_status() from public,anon;
grant execute on function public.fleteruta_access_status() to authenticated;
