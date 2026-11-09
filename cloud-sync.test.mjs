import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountCloudStore} from './cloud-sync.js';
const empty=()=>({stops:[],roundTrip:false,manualOrder:true});
const stop=()=>({id:'a',address:'Cliente',lat:-34,lon:-58,done:false});
test('autoguarda avance y recupera lo pendiente al reabrir; protege conflictos',async()=>{
 const window=new Window({url:'https://fleteruta.example'}),document=window.document;
 document.body.innerHTML='<section id="cloud-panel" hidden><p id="cloud-status"></p><button id="cloud-save"></button><button id="cloud-load"></button><button id="cloud-import"></button></section>';
 for(const [key,value] of Object.entries({document,localStorage:window.localStorage,confirm:()=>true}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 const original=globalThis.fetch,stores=[];let snapshot=empty(),revision=1,writes=0,offline=false,conflict=false;
 let remote={stops:[stop()],round_trip:false,manual_order:true,revision:1};
 globalThis.fetch=async(_url,options)=>{
  if(offline)throw Error('Sin conexión');if(options.method==='GET')return Response.json({route:structuredClone(remote)});
  writes++;if(conflict)return Response.json({error:'Cambió en otro dispositivo'},{status:409});
  const body=JSON.parse(options.body);assert.equal(body.revision,revision);revision++;remote={stops:body.stops,round_trip:body.roundTrip,manual_order:body.manualOrder,revision};return Response.json({route:structuredClone(remote)});
 };
 const options=()=>({enabled:true,storageKey:'account-a-sync',getSnapshot:()=>snapshot,applySnapshot:value=>snapshot=value,message:()=>{}});
 const wait=async predicate=>{for(let i=0;!predicate();i++){if(i>200)throw Error('No terminó el guardado');await new Promise(r=>setTimeout(r,5));}};
 try{
  const store=mountCloudStore(options());stores.push(store);await store.initialize();assert.equal(writes,0);assert.equal(snapshot.stops[0].done,false);
  snapshot.stops[0].done=true;store.changed();await wait(()=>!JSON.parse(localStorage.getItem('account-a-sync')).dirty);assert.equal(remote.stops[0].done,true);
  snapshot=structuredClone(snapshot);const restored=mountCloudStore(options());stores.push(restored);await restored.initialize();restored.dispose();assert.equal(snapshot.stops[0].done,true);
  offline=true;snapshot.stops[0].notes='Cambio sin conexión';store.changed();await wait(()=>document.getElementById('cloud-status').textContent.includes('Sin guardar'));
  assert.equal(JSON.parse(localStorage.getItem('account-a-sync')).dirty,true);
  store.dispose();offline=false;const reopened=mountCloudStore(options());stores.push(reopened);await reopened.initialize();assert.equal(remote.stops[0].notes,'Cambio sin conexión');assert.equal(JSON.parse(localStorage.getItem('account-a-sync')).dirty,false);
  conflict=true;snapshot.stops[0].notes='Cambios nuevos';reopened.changed();await wait(()=>document.getElementById('cloud-status').textContent.includes('Conflicto'));assert.equal(snapshot.stops[0].notes,'Cambios nuevos');assert.equal(remote.stops[0].notes,'Cambio sin conexión');
  reopened.dispose();const reopenedAgain=mountCloudStore(options());stores.push(reopenedAgain);await reopenedAgain.initialize();assert.equal(snapshot.stops[0].notes,'Cambios nuevos');
  await document.getElementById('cloud-load').onclick();assert.equal(snapshot.stops[0].notes,'Cambio sin conexión');
 }finally{for(const store of stores)store.dispose();globalThis.fetch=original;window.close();}
});
test('no pisa progreso local previo sin metadatos al actualizar desde la versión manual',async()=>{
 const window=new Window({url:'https://fleteruta.example'}),document=window.document;
 document.body.innerHTML='<section id="cloud-panel"><p id="cloud-status"></p><button id="cloud-save"></button><button id="cloud-load"></button><button id="cloud-import"></button></section>';
 for(const [key,value] of Object.entries({document,localStorage:window.localStorage}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 const original=globalThis.fetch;let snapshot={...empty(),stops:[{...stop(),done:true}]};
 globalThis.fetch=async()=>Response.json({route:{stops:[stop()],round_trip:false,manual_order:true,revision:3}});
 try{const store=mountCloudStore({enabled:true,storageKey:'legacy-account',getSnapshot:()=>snapshot,applySnapshot:value=>snapshot=value,message:()=>{}});await store.initialize();assert.equal(snapshot.stops[0].done,true);assert.match(document.getElementById('cloud-status').textContent,/conserva tu avance local/);}finally{globalThis.fetch=original;window.close();}
});
test('un cambio durante el guardado se envía después sin perder la última entrega',async()=>{
 const window=new Window({url:'https://fleteruta.example'}),document=window.document;
 document.body.innerHTML='<section id="cloud-panel"><p id="cloud-status"></p><button id="cloud-save"></button><button id="cloud-load"></button><button id="cloud-import"></button></section>';
 for(const [key,value] of Object.entries({document,localStorage:window.localStorage}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 const original=globalThis.fetch;let snapshot=empty();const pending=[],bodies=[];
 globalThis.fetch=async(_url,options)=>{if(options.method==='GET')return Response.json({route:null});assert.equal(options.keepalive,true);bodies.push(JSON.parse(options.body));return new Promise(resolve=>pending.push(resolve));};
 const tick=()=>new Promise(resolve=>setTimeout(resolve,10));
 try{
  const store=mountCloudStore({enabled:true,storageKey:'in-flight',getSnapshot:()=>snapshot,applySnapshot:value=>snapshot=value,message:()=>{}});await store.initialize();
  snapshot.stops=[stop()];store.changed();assert.equal(JSON.parse(localStorage.getItem('in-flight')).dirty,true);
  snapshot.stops[0].done=true;store.changed();assert.equal(bodies.length,1);
  pending[0](Response.json({route:{revision:1}}));await tick();assert.equal(bodies.length,2);assert.equal(bodies[1].stops[0].done,true);assert.equal(bodies[1].revision,1);
  snapshot=empty();snapshot.manualOrder=false;store.changed();assert.equal(bodies.length,2);
  pending[1](Response.json({route:{revision:2}}));await tick();assert.equal(bodies[2].stops.length,0);pending[2](Response.json({route:{revision:3}}));await tick();assert.equal(JSON.parse(localStorage.getItem('in-flight')).dirty,false);
 }finally{globalThis.fetch=original;window.close();}
});
