-- Only FleteRuta objects. Existing HidroTrack policies, users and triggers stay intact.
create table public.fleteruta_members (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true,
 created_at timestamptz not null default now()
);
alter table public.fleteruta_members enable row level security;
revoke all on public.fleteruta_members from anon, authenticated;
grant select on public.fleteruta_members to authenticated;
create policy fleteruta_member_self on public.fleteruta_members for select to authenticated
 using (user_id=(select auth.uid()));

create function public.fleteruta_valid_stops(items jsonb) returns boolean
language plpgsql immutable set search_path='' as $$
declare item jsonb; ids text[]='{}'; ident text;
begin
 if jsonb_typeof(items) is distinct from 'array' then return false; end if;
 if jsonb_array_length(items)>30 then return false; end if;
 for item in select value from jsonb_array_elements(items) loop
  if jsonb_typeof(item) is distinct from 'object' then return false; end if;
  ident=item->>'id';
  if ident is null or length(ident) not between 1 and 80 or ident=any(ids) then return false; end if;
  ids=array_append(ids,ident);
  if jsonb_typeof(item->'address') is distinct from 'string' or length(item->>'address') not between 1 and 2500 then return false; end if;
  if jsonb_typeof(item->'lat') is distinct from 'number' or jsonb_typeof(item->'lon') is distinct from 'number' then return false; end if;
  if (item->>'lat')::numeric not between -90 and 90 or (item->>'lon')::numeric not between -180 and 180 then return false; end if;
  if jsonb_typeof(item->'done') is distinct from 'boolean' then return false; end if;
  if item ? 'recipient' and (jsonb_typeof(item->'recipient') is distinct from 'string' or length(item->>'recipient')>150) then return false; end if;
  if item ? 'notes' and (jsonb_typeof(item->'notes') is distinct from 'string' or length(item->>'notes')>300) then return false; end if;
 end loop;
 return true;
end $$;
revoke all on function public.fleteruta_valid_stops(jsonb) from public,anon;
grant execute on function public.fleteruta_valid_stops(jsonb) to authenticated;

-- One active saved route per authorized person. Its stop order is preserved in JSON.
create table public.fleteruta_routes (
 user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
 stops jsonb not null default '[]' check(public.fleteruta_valid_stops(stops)),
 round_trip boolean not null default false,
 manual_order boolean not null default false,
 revision integer not null default 1 check(revision>0),
 updated_at timestamptz not null default now()
);
alter table public.fleteruta_routes enable row level security;
revoke all on public.fleteruta_routes from anon,authenticated;
grant select,insert,update on public.fleteruta_routes to authenticated;
create policy fleteruta_route_select on public.fleteruta_routes for select to authenticated
 using (user_id=(select auth.uid()) and exists(select 1 from public.fleteruta_members m where m.user_id=(select auth.uid()) and m.enabled));
create policy fleteruta_route_insert on public.fleteruta_routes for insert to authenticated
 with check (user_id=(select auth.uid()) and exists(select 1 from public.fleteruta_members m where m.user_id=(select auth.uid()) and m.enabled));
create policy fleteruta_route_update on public.fleteruta_routes for update to authenticated
 using (user_id=(select auth.uid()) and exists(select 1 from public.fleteruta_members m where m.user_id=(select auth.uid()) and m.enabled))
 with check (user_id=(select auth.uid()) and exists(select 1 from public.fleteruta_members m where m.user_id=(select auth.uid()) and m.enabled));

create function public.fleteruta_save_route(p_stops jsonb,p_round_trip boolean,p_manual_order boolean,p_expected_revision integer)
returns setof public.fleteruta_routes language plpgsql security invoker set search_path='' as $$
declare saved public.fleteruta_routes;
begin
 if auth.uid() is null or not exists(select 1 from public.fleteruta_members where user_id=auth.uid() and enabled) then
  raise exception 'FleteRuta access required' using errcode='42501';
 end if;
 if not public.fleteruta_valid_stops(p_stops) or p_expected_revision<0 or p_expected_revision is null then
  raise exception 'Invalid route' using errcode='22023';
 end if;
 if p_expected_revision=0 then
  insert into public.fleteruta_routes(user_id,stops,round_trip,manual_order)
   values(auth.uid(),p_stops,p_round_trip,p_manual_order) on conflict(user_id) do nothing returning * into saved;
 else
  update public.fleteruta_routes set stops=p_stops,round_trip=p_round_trip,manual_order=p_manual_order,
   revision=revision+1,updated_at=now() where user_id=auth.uid() and revision=p_expected_revision returning * into saved;
 end if;
 if saved.user_id is null then raise exception 'Route changed on another device' using errcode='40001'; end if;
 return next saved;
end $$;
revoke all on function public.fleteruta_save_route(jsonb,boolean,boolean,integer) from public,anon;
grant execute on function public.fleteruta_save_route(jsonb,boolean,boolean,integer) to authenticated;

-- Bootstrap only current platform administrators, not all HidroTrack users.
insert into public.fleteruta_members(user_id) select user_id from public.platform_admins on conflict do nothing;
