import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PGlite} from '@electric-sql/pglite';
import {readFile} from 'node:fs/promises';
test('Postgres real: aislamiento, autorización, validación y conflictos de edición',async()=>{
 const db=new PGlite();
 const a='10000000-0000-0000-0000-000000000001',b='10000000-0000-0000-0000-000000000002',c='10000000-0000-0000-0000-000000000003';
 try{
  await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema auth to authenticated;grant execute on function auth.uid() to authenticated;create table public.platform_admins(user_id uuid);insert into auth.users values('${a}'),('${b}'),('${c}');insert into public.platform_admins values('${a}');`);
  await db.exec(await readFile(new URL('./supabase/migrations/20261105031300_fleteruta_foundation.sql',import.meta.url),'utf8'));
  await db.exec(await readFile(new URL('./supabase/migrations/20261109020000_fleteruta_40_stops.sql',import.meta.url),'utf8'));
  await db.exec(`insert into public.fleteruta_members(user_id) values('${b}');set role authenticated;select set_config('request.jwt.claim.sub','${a}',false);`);
  const stops=[{id:'parada',lat:-34.6,lon:-58.4,address:'Prueba',done:false}];
  const save=(items,revision)=>db.query('select * from public.fleteruta_save_route($1::jsonb,false,true,$2)',[JSON.stringify(items),revision]);
  assert.equal((await save(stops,0)).rows[0].revision,1);
  await assert.rejects(()=>save(stops,0),/another device/);
  assert.equal((await save(stops,1)).rows[0].revision,2);
  const forty=Array.from({length:40},(_,i)=>({...stops[0],id:'stop-'+i}));assert.equal((await db.query('select public.fleteruta_valid_stops($1::jsonb) as valid',[JSON.stringify(forty)])).rows[0].valid,true);await assert.rejects(()=>save([...forty,{...stops[0],id:'extra'}],2),/Invalid route/);
  await assert.rejects(()=>save([{...stops[0],lat:200}],2),/Invalid route/);
  await db.exec(`select set_config('request.jwt.claim.sub','${b}',false)`);
  assert.equal((await db.query('select * from public.fleteruta_routes')).rows.length,0);
  assert.equal((await save(forty,0)).rows[0].stops.length,40);assert.equal((await save([],1)).rows[0].user_id,b);
  await assert.rejects(()=>db.exec(`update public.fleteruta_routes set user_id='${a}'`));
  await assert.rejects(()=>db.exec(`insert into public.fleteruta_members(user_id) values('${c}')`));
  await db.exec(`select set_config('request.jwt.claim.sub','${c}',false)`);
  assert.equal((await db.query('select * from public.fleteruta_routes')).rows.length,0);
  await assert.rejects(()=>save([],0),/access required/);
  await db.exec(`reset role;update public.fleteruta_members set enabled=false where user_id='${a}';set role authenticated;select set_config('request.jwt.claim.sub','${a}',false)`);
  assert.equal((await db.query('select * from public.fleteruta_routes')).rows.length,0);
  await assert.rejects(()=>save([],2),/access required/);
  await db.exec('reset role;set role anon');await assert.rejects(()=>db.query('select * from public.fleteruta_routes'));
 }finally{await db.close();}
});
