import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
test('pantalla intermedia muestra solo aplicaciones autorizadas y deriva la única disponible',async()=>{
 for(const apps of [{fleteruta:true,hidrotrack:false},{fleteruta:true,hidrotrack:true},{fleteruta:false,hidrotrack:false}]){
  const window=new Window({url:'https://fleteruta.example/apps',settings:{navigation:{disableMainFrameNavigation:true,disableFallbackToSetURL:true}}}),document=window.document;
  document.write((await readFile(new URL('./apps.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
  const redirects=[];for(const [key,value] of Object.entries({document,location:{replace:value=>redirects.push(value)}}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
  const original=globalThis.fetch;globalThis.fetch=async()=>Response.json(apps);
  try{await import('./apps.js?test='+JSON.stringify(apps));assert.equal(document.getElementById('open-fleteruta').hidden,!apps.fleteruta);assert.equal(document.getElementById('open-hidrotrack').hidden,!apps.hidrotrack);assert.deepEqual(redirects,apps.fleteruta&&!apps.hidrotrack?['/']:[]);if(!apps.fleteruta)assert.match(document.getElementById('apps-status').textContent,/administrador/);}
  finally{globalThis.fetch=original;window.close();}
 }
});
