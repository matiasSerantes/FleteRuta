-- Read only the signed-in user's application entitlements. No metadata-based grants.
create function private.fleteruta_portal_apps() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Iniciá sesión' using errcode='42501'; end if;
 if exists(select 1 from auth.mfa_factors where user_id=auth.uid() and factor_type='totp' and status='verified') and coalesce(auth.jwt()->>'aal','aal1')<>'aal2' then
  raise exception 'Completá la verificación' using errcode='42501';
 end if;
 return jsonb_build_object(
  'fleteruta',exists(select 1 from public.fleteruta_members where user_id=auth.uid() and enabled),
  'hidrotrack',private.is_admin() or exists(
   select 1 from public.tenant_members m join public.licenses l on l.tenant_id=m.tenant_id
   where m.user_id=auth.uid() and m.active and l.status='active' and (l.kind='permanent' or l.expires_at>now())
  )
 );
end $$;
revoke all on function private.fleteruta_portal_apps() from public,anon,authenticated;
grant execute on function private.fleteruta_portal_apps() to authenticated;
create function public.fleteruta_portal_apps() returns jsonb
language sql stable security invoker set search_path='' as $$select private.fleteruta_portal_apps()$$;
revoke all on function public.fleteruta_portal_apps() from public,anon;
grant execute on function public.fleteruta_portal_apps() to authenticated;
