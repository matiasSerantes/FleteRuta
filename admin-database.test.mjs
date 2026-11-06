import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('accesos: admin con MFA, tres aplicaciones, protección de titulares y atomicidad',async()=>{
 const db=new PGlite(),a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002',c='10000000-0000-0000-0000-000000000003',d='10000000-0000-0000-0000-000000000004',tenant='20000000-0000-0000-0000-000000000001';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;grant usage on schema auth,private to authenticated;create table auth.users(id uuid primary key,email text);create table auth.mfa_factors(user_id uuid,factor_type text,status text);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create table public.platform_admins(user_id uuid);create table public.user_profiles(user_id uuid,full_name text);create table public.tenant_members(tenant_id uuid,user_id uuid,role text,active boolean);create table public.licenses(tenant_id uuid,status text);insert into auth.users values('${a}','admin@example.com'),('${b}','driver@example.com'),('${c}','owner@example.com'),('${d}','flete@example.com');insert into public.platform_admins values('${a}');insert into auth.mfa_factors values('${a}','totp','verified');insert into public.tenant_members values('${tenant}','${b}','driver',true),('${tenant}','${c}','owner',true);insert into public.licenses values('${tenant}','active');create function private.is_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.platform_admins where user_id=auth.uid()) and (not exists(select 1 from auth.mfa_factors where user_id=auth.uid() and status='verified' and factor_type='totp') or auth.jwt()->>'aal'='aal2')$$;create function public.is_platform_admin() returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.platform_admins where user_id=auth.uid())$$;
  create function public.admin_set_driver_access(p_tenant uuid,p_user uuid,p_active boolean) returns boolean language plpgsql security definer set search_path='' as $$begin if not private.is_admin() then raise exception 'Acceso denegado' using errcode='42501';end if;if p_active and not exists(select 1 from public.licenses where tenant_id=p_tenant and status='active') then raise exception 'Licencia no vigente';end if;update public.tenant_members set active=p_active where tenant_id=p_tenant and user_id=p_user and role='driver';return p_active;end $$;`);
  for(const name of ['20261105031300_fleteruta_foundation.sql','20261106003901_fleteruta_admin_access.sql'])await db.exec(await readFile(new URL('./supabase/migrations/'+name,import.meta.url),'utf8'));
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);select set_config('request.jwt.claims','{"aal":"aal1"}',false)`);
  const list=()=>db.query("select public.fleteruta_admin_users('',0) as result"),set=(id,f,h)=>db.query('select public.fleteruta_set_access($1,$2,$3)',[id,f,h]);
  await assert.rejects(list,/Acceso denegado/);await assert.rejects(()=>set(b,true,true),/Acceso denegado/);
  await db.exec(`select set_config('request.jwt.claims','{"aal":"aal2"}',false)`);
  assert.equal((await list()).rows[0].result.total,4);
  await set(b,true,true);await set(d,true,false);
  let users=(await list()).rows[0].result.users;assert.ok(users.find(u=>u.user_id===b).fleteruta&&users.find(u=>u.user_id===b).hidrotrack);assert.ok(users.find(u=>u.user_id===d).fleteruta&&!users.find(u=>u.user_id===d).hidrotrack);
  await set(b,false,true);await set(b,true,false);users=(await list()).rows[0].result.users;assert.equal(users.find(u=>u.user_id===b).hidrotrack,false);
  await assert.rejects(()=>set(a,false,true),/protegido/);await assert.rejects(()=>set(c,true,false),/protegido/);await assert.rejects(()=>set(d,true,true),/empresa/);
  await db.exec(`reset role;update public.licenses set status='paused';set role authenticated`);
  await assert.rejects(()=>set(b,false,true),/Licencia/);
  assert.equal((await list()).rows[0].result.users.find(u=>u.user_id===b).fleteruta,true);
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`);await assert.rejects(list,/Acceso denegado/);await assert.rejects(()=>set(d,true,true),/Acceso denegado/);
  assert.equal((await db.query('select * from public.fleteruta_access_events')).rows.length,0);
 }finally{await db.close();}
});
