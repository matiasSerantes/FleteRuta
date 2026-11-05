import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {mountCloudStore} from './cloud-sync.js';
test('nube: recuperación por cuenta, guardado explícito y conflicto sin perder cambios locales',async()=>{
 const window=new Window({url:'https://fleteruta.example'}),document=window.document;
 document.body.innerHTML='<section id="cloud-panel" hidden><p id="cloud-status"></p><button id="cloud-save"></button><button id="cloud-load"></button><button id="cloud-import"></button></section>';
 for(const [key,value] of Object.entries({document,localStorage:window.localStorage,confirm:()=>true}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 const original=globalThis.fetch;let snapshot={stops:[],roundTrip:false,manualOrder:false},revision=1,writes=0,conflict=false;
 const remote={stops:[{id:'a',address:'Guardada',lat:-34,lon:-58,done:false}],round_trip:false,manual_order:true,revision:1};
 globalThis.fetch=async(_url,options)=>{
  if(options.method==='GET')return Response.json({route:{...remote,revision}});
  writes++;if(conflict)return Response.json({error:'El reparto cambió en otro dispositivo.'},{status:409});
  const body=JSON.parse(options.body);assert.equal(body.revision,revision);revision++;return Response.json({route:{...remote,revision,updated_at:new Date().toISOString()}});
 };
 try{
  const store=mountCloudStore({enabled:true,getSnapshot:()=>snapshot,applySnapshot:value=>snapshot=value,message:()=>{}});await store.initialize();
  assert.equal(snapshot.stops[0].address,'Guardada');assert.equal(writes,0);
  snapshot.stops[0].address='Cambio local';await document.getElementById('cloud-save').onclick();assert.equal(writes,1);
  conflict=true;await document.getElementById('cloud-save').onclick();assert.equal(snapshot.stops[0].address,'Cambio local');assert.match(document.getElementById('cloud-status').textContent,/otro dispositivo/);
  await document.getElementById('cloud-load').onclick();assert.equal(snapshot.stops[0].address,'Guardada');
 }finally{globalThis.fetch=original;window.close();}
});
