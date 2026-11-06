import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import {mountAdmin,appLabel} from './admin.js';
test('panel muestra aplicaciones separadas, protege admin y envía cambios explícitos',async()=>{
 const window=new Window({url:'https://fleteruta.example/admin'}),document=window.document;
 document.write((await readFile(new URL('./admin.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 for(const [key,value] of Object.entries({document,confirm:()=>true}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 const original=globalThis.fetch,users=[{user_id:'a',email:'admin@example.com',full_name:'Admin',is_admin:true,fleteruta:true,hidrotrack:true,hidro_protected:true,hidro_memberships:0},{user_id:'b',email:'chofer@example.com',full_name:'Chofer',is_admin:false,fleteruta:false,hidrotrack:true,hidro_protected:false,hidro_memberships:1}],writes=[];
 globalThis.fetch=async(path,options)=>{if(options?.method==='PUT'){const body=JSON.parse(options.body);writes.push(body);const user=users.find(u=>u.user_id===body.userId);Object.assign(user,{fleteruta:body.fleteruta,hidrotrack:body.hidrotrack});return Response.json({ok:true});}return Response.json({users,total:2});};
 try{
  await mountAdmin().load();let rows=document.querySelectorAll('#users-list tr');assert.equal(rows.length,2);assert.equal(rows[0].querySelector('button').disabled,true);assert.match(rows[1].textContent,/Solo HidroTrack/);
  rows[1].querySelector('select').value='both';await rows[1].querySelector('button').onclick();assert.deepEqual(writes,[{userId:'b',fleteruta:true,hidrotrack:true}]);assert.match(document.querySelectorAll('#users-list tr')[1].textContent,/Ambas aplicaciones/);
  rows=document.querySelectorAll('#users-list tr');rows[1].querySelector('select').value='flete';await rows[1].querySelector('button').onclick();assert.equal(writes[1].hidrotrack,false);
  assert.equal(appLabel({fleteruta:true,hidrotrack:false}),'Solo FleteRuta');assert.equal(appLabel({fleteruta:false,hidrotrack:false}),'Sin acceso asignado');
 }finally{globalThis.fetch=original;window.close();}
});
