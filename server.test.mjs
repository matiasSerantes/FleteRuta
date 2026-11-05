import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createApp} from './server.mjs';
test('login protege recursos, configura solo una cuenta y revoca sesión',async t=>{
 const dir=await mkdtemp(path.join(tmpdir(),'fleteruta-auth-'));const authPath=path.join(dir,'auth.json');const {server}=await createApp({authPath,setupToken:'token-de-prueba-no-real'});
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;
 const post=(route,body,cookie,origin=base)=>fetch(base+route,{method:'POST',headers:{'Content-Type':'application/json',Origin:origin,...(cookie?{Cookie:cookie}:{})},body:JSON.stringify(body)});
 const account={username:'prueba',password:'clave-de-prueba-123456'};
 try{
  await t.test('no entrega app, módulos ni secretos sin login',async()=>{assert.equal((await fetch(base+'/',{redirect:'manual'})).status,303);for(const p of ['/app.js','/trip.js','/notifications-sw.js','/core.mjs','/vendor/leaflet/leaflet.js','/.private/auth.json','/server.mjs'])assert.equal((await fetch(base+p)).status,401);assert.equal((await fetch(base+'/login')).status,200);});
  await t.test('rechaza configuración sin token y CSRF',async()=>{assert.equal((await post('/auth/setup',account)).status,403);assert.equal((await post('/auth/setup',{...account,token:'token-de-prueba-no-real'},null,'https://otro.example')).status,403);});
  let cookie;
  await t.test('crea usuario, guarda hash y cookie HttpOnly',async()=>{const r=await post('/auth/setup',{...account,token:'token-de-prueba-no-real'});assert.equal(r.status,200);const value=r.headers.get('set-cookie');assert.match(value,/HttpOnly/);assert.match(value,/SameSite=Strict/);cookie=value.split(';')[0];const stored=await readFile(authPath,'utf8');assert.ok(!stored.includes(account.password));assert.equal(JSON.parse(stored).username,account.username);});
  await t.test('impide nuevos registros, sirve MIME correcto y biblioteca local',async()=>{assert.equal((await post('/auth/setup',{...account,token:'token-de-prueba-no-real'})).status,403);for(const p of ['/app.js','/core.mjs','/planner.mjs','/vendor/leaflet/leaflet.js','/estado-proyecto.js']){const r=await fetch(base+p,{headers:{Cookie:cookie}});assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/^text\/javascript/);}assert.equal((await fetch(base+'/.private/auth.json',{headers:{Cookie:cookie}})).status,404);assert.equal((await fetch(base+'/server.mjs',{headers:{Cookie:cookie}})).status,404);});
  await t.test('logout revoca cookie en servidor y login acepta solo clave correcta',async()=>{assert.equal((await post('/auth/logout',{},cookie)).status,200);assert.equal((await fetch(base+'/app.js',{headers:{Cookie:cookie}})).status,401);assert.equal((await post('/auth/login',{...account,password:'incorrecta'})).status,401);const r=await post('/auth/login',account);assert.equal(r.status,200);cookie=r.headers.get('set-cookie').split(';')[0];const state=await fetch(base+'/auth/status',{headers:{Cookie:cookie}}).then(r=>r.json());assert.equal(state.authenticated,true);});
  await t.test('limita intentos de contraseña',async()=>{for(let i=0;i<6;i++)assert.equal((await post('/auth/login',{...account,password:'incorrecta'})).status,401);assert.equal((await post('/auth/login',account)).status,429);});
 }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));await rm(dir,{recursive:true,force:true});}
});
