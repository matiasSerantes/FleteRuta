import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import {mountPasswordForm} from './profile.js';
test('perfil valida contraseñas, muestra resultado y no conserva claves ni envía dos veces',async()=>{
 const window=new Window({url:'https://fleteruta.example'}),document=window.document;
 document.write((await readFile(new URL('./index.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 const previous=globalThis.document,original=globalThis.fetch;Object.defineProperty(globalThis,'document',{value:document,writable:true,configurable:true});const writes=[];let finish;
 globalThis.fetch=async(path,options)=>{writes.push({path,body:JSON.parse(options.body)});return new Promise(resolve=>finish=resolve);};
 const $=id=>document.getElementById(id),submit=()=>$('password-form').onsubmit(new window.Event('submit',{cancelable:true}));
 try{
  mountPasswordForm({enabled:false});assert.equal($('password-panel').hidden,true);mountPasswordForm({enabled:true});$('password-panel').open=true;assert.equal($('password-panel').hidden,false);
  $('new-password').value='corta';await submit();assert.equal(writes.length,0);assert.match($('password-status').textContent,/12/);
  $('new-password').value='FakeNewPassword123!';$('repeat-password').value='otra';await submit();assert.equal(writes.length,0);assert.match($('password-status').textContent,/no coinciden/);
  $('repeat-password').value=$('new-password').value;const pending=submit();await submit();assert.equal(writes.length,1);assert.equal($('password-submit').disabled,true);finish(Response.json({ok:true}));await pending;
  assert.equal(writes[0].path,'/auth/password');assert.equal($('new-password').value,'');assert.equal($('repeat-password').value,'');assert.equal($('password-status').dataset.kind,'success');assert.equal(window.localStorage.length,0);
  $('new-password').value=$('repeat-password').value='FakeOtherPassword123!';const failure=submit();finish(Response.json({error:'Volvé a ingresar antes de cambiarla'},{status:400}));await failure;assert.match($('password-status').textContent,/Volvé a ingresar/);assert.equal($('password-status').dataset.kind,'error');assert.equal($('password-submit').disabled,false);
  $('password-cancel').click();assert.equal($('password-panel').open,false);assert.equal($('password-status').textContent,'');
 }finally{globalThis.fetch=original;globalThis.document=previous;window.close();}
});
