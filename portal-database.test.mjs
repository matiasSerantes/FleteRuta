import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('portal usa solo licencias de la cuenta actual, respeta vencimiento, suspensión y MFA',async()=>{
 const db=new PGlite(),a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002',tenant='20000000-0000-0000-0000-000000000001';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create schema private;grant usage on schema auth,private to authenticated;create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create function auth.jwt() returns jsonb language sql stable as $$select coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb$$;create table auth.mfa_factors(user_id uuid,factor_type text,status text);create table public.fleteruta_members(user_id uuid,enabled boolean);create table public.tenant_members(tenant_id uuid,user_id uuid,active boolean);create table public.licenses(tenant_id uuid,status text,kind text,expires_at timestamptz);create function private.is_admin() returns boolean language sql stable as $$select false$$;insert into public.fleteruta_members values('${a}',true);insert into public.tenant_members values('${tenant}','${a}',true);insert into public.licenses values('${tenant}','active','permanent',null);`);
  await db.exec(await readFile(new URL('./supabase/migrations/20261109010000_fleteruta_portal.sql',import.meta.url),'utf8'));
  const apps=async()=>(await db.query('select public.fleteruta_portal_apps() as apps')).rows[0].apps;
  await db.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${a}',false)`);assert.deepEqual(await apps(),{fleteruta:true,hidrotrack:true});
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`);assert.deepEqual(await apps(),{fleteruta:false,hidrotrack:false});
  await db.exec(`reset role;update public.licenses set kind='monthly',expires_at=now()-interval '1 day';set role authenticated;select set_config('request.jwt.claim.sub','${a}',false)`);assert.equal((await apps()).hidrotrack,false);
  await db.exec(`reset role;update public.licenses set expires_at=now()+interval '1 day';set role authenticated`);assert.equal((await apps()).hidrotrack,true);
  await db.exec(`reset role;update public.licenses set status='suspended';insert into auth.mfa_factors values('${a}','totp','verified');set role authenticated`);await assert.rejects(apps,/verificación/);
  await db.exec(`select set_config('request.jwt.claims','{"aal":"aal2"}',false)`);assert.deepEqual(await apps(),{fleteruta:true,hidrotrack:false});
  await db.exec('reset role;set role anon');await assert.rejects(apps,/permission denied/);
 }finally{await db.close();}
});
