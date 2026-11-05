import {test} from 'node:test';
import assert from 'node:assert/strict';
import {handle} from './worker.mjs';
const origin='https://fleteruta.example',id='10000000-0000-0000-0000-000000000001';
function fixture({member=true,expired=false}={}){
 const calls=[];let revision=0,stops=[];
 const env={SUPABASE_URL:'https://supabase.example',SUPABASE_PUBLISHABLE_KEY:'public-test-key',ASSETS:{fetch:async()=>new Response('asset')}};
 const upstream=async(url,options)=>{
  calls.push({url,options});const path=new URL(url).pathname;
  if(path==='/auth/v1/token')return Response.json({access_token:'access-test',refresh_token:'refresh-test',expires_in:3600,user:{id}});
  if(path==='/auth/v1/user')return expired&&options.headers.Authorization==='Bearer expired'?Response.json({error:'expired'},{status:401}):Response.json({id,email:'test@example.com'});
  if(path==='/rest/v1/fleteruta_members')return Response.json(member?[{user_id:id}]:[]);
  if(path==='/auth/v1/logout')return new Response(null,{status:204});
  if(path==='/rest/v1/fleteruta_routes')return Response.json(revision?[{stops,round_trip:false,manual_order:true,revision}]:[]);
  if(path==='/rest/v1/rpc/fleteruta_save_route'){const body=JSON.parse(options.body);if(body.p_expected_revision!==revision)return Response.json({code:'40001'},{status:409});stops=body.p_stops;revision++;return Response.json([{stops,round_trip:false,manual_order:true,revision}]);}
  throw Error('Unexpected upstream request');
 };
 const request=(path,{method='GET',body,cookie,requestOrigin=origin}={})=>handle(new Request(origin+path,{method,headers:{...(cookie?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json',Origin:requestOrigin}:{})},...(body?{body:JSON.stringify(body)}:{})}),env,upstream);
 return {request,calls};
}
test('Worker requiere sesión para la aplicación, y no expone fuentes privadas ni backup',async()=>{
 const {request}=fixture();const root=await request('/');assert.equal(root.status,303);assert.equal(root.headers.get('Location'),'/login');
 for(const path of ['/.private/auth.json','/.env','/server.mjs','/cloud/worker.mjs','/wrangler.jsonc','/app.test.mjs'])assert.equal((await request(path)).status,404);
 assert.equal((await request('/api/route')).status,401);assert.equal((await request('/login')).status,200);
});
test('cuenta habilitada recibe cookies privadas, sin tokens en JSON',async()=>{
 const {request}=fixture();const response=await request('/auth/login',{method:'POST',body:{username:'test@example.com',password:'fake-password'}});assert.equal(response.status,200);
 const cookies=response.headers.getSetCookie();assert.equal(cookies.length,2);assert.ok(cookies.every(c=>c.includes('HttpOnly')&&c.includes('Secure')&&c.includes('SameSite=Strict')));assert.deepEqual(await response.json(),{ok:true});
});
test('una cuenta de HidroTrack sin membresía no entra ni obtiene cookies',async()=>{
 const {request,calls}=fixture({member:false});const response=await request('/auth/login',{method:'POST',body:{username:'test@example.com',password:'fake-password'}});assert.equal(response.status,403);assert.equal(response.headers.get('Set-Cookie'),null);assert.ok(calls.some(c=>c.url.includes('logout?scope=local')));
});
test('Worker bloquea CSRF y valida reparto; RPC mantiene propiedad por JWT y detecta conflictos',async()=>{
 const {request,calls}=fixture(),cookie='fr_access=access-test';
 assert.equal((await request('/api/route',{method:'PUT',cookie,body:{},requestOrigin:'https://evil.example'})).status,403);
 assert.equal((await request('/api/route',{method:'PUT',cookie,body:{stops:[]}})).status,400);
 const body={stops:[{id:'a',lat:-34,lon:-58,address:'Prueba',done:false}],roundTrip:false,manualOrder:true,revision:0};
 assert.equal((await request('/api/route',{method:'PUT',cookie,body})).status,200);assert.equal((await request('/api/route',{method:'PUT',cookie,body})).status,409);
 const result=await request('/api/route',{cookie});assert.equal((await result.json()).route.revision,1);
 const rpc=calls.find(c=>c.url.includes('/rpc/'));assert.equal(rpc.options.headers.Authorization,'Bearer access-test');assert.equal('user_id' in JSON.parse(rpc.options.body),false);
});
test('renueva sesión vencida y logout revoca solo la sesión de FleteRuta',async()=>{
 const {request,calls}=fixture({expired:true}),cookie='fr_access=expired; fr_refresh=refresh-test';
 const status=await request('/auth/status',{cookie});assert.equal((await status.json()).authenticated,true);assert.equal(status.headers.getSetCookie().length,2);
 const logout=await request('/auth/logout',{method:'POST',body:{},cookie});assert.equal(logout.status,200);assert.ok(calls.some(c=>c.url.endsWith('logout?scope=local')));assert.ok(logout.headers.get('Set-Cookie').includes('Max-Age=0'));
});
