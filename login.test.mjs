import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
test('login mantiene el segundo factor y envía únicamente el código al verificar',async()=>{
 const window=new Window({url:'https://fleteruta.example/login',settings:{navigation:{disableMainFrameNavigation:true,disableFallbackToSetURL:true}}}),document=window.document;
 document.write((await readFile(new URL('./login.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 for(const [key,value] of Object.entries({document,location:window.location,history:window.history}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 const original=globalThis.fetch,writes=[];
 globalThis.fetch=async(path,options)=>{if(options?.method==='POST'){writes.push({path,body:JSON.parse(options.body)});return Response.json({error:'Código incorrecto'},{status:400});}return Response.json({configured:true,backend:'supabase',authenticated:true,mfaRequired:true});};
 try{
  await import('./login.js');const $=id=>document.getElementById(id);assert.equal($('mfa-wrap').hidden,false);assert.equal($('password').required,false);assert.equal($('username').disabled,true);
  $('mfa-code').value='123456';await $('login-form').onsubmit(new window.Event('submit',{cancelable:true}));assert.deepEqual(writes,[{path:'/auth/mfa',body:{code:'123456'}}]);assert.equal($('mfa-code').value,'');assert.match($('login-message').textContent,/incorrecto/);
 }finally{globalThis.fetch=original;window.close();}
});

test('crear cuenta solicita nombre y confirmación, muestra aprobación pendiente sin entrar',async()=>{
 const window=new Window({url:'https://fleteruta.example/login'}),document=window.document;
 document.write((await readFile(new URL('./login.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 for(const [key,value] of Object.entries({document,location:window.location,history:window.history}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 const original=globalThis.fetch,writes=[];globalThis.fetch=async(path,options)=>{if(options?.method==='POST'){writes.push({path,body:JSON.parse(options.body)});return Response.json({ok:true,pendingApproval:true});}return Response.json({configured:true,backend:'supabase',authenticated:false});};
 try{
  await import('./login.js?signup-test');const $=id=>document.getElementById(id);assert.equal($('toggle-signup').hidden,false);$('toggle-signup').click();assert.equal($('full-name').required,true);assert.equal($('confirm-password').required,true);
  $('full-name').value='Persona de prueba';$('username').value='new@example.com';$('password').value='fake-password-2026!';$('confirm-password').value='otra-clave';await $('login-form').onsubmit(new window.Event('submit',{cancelable:true}));assert.equal(writes.length,0);
  $('confirm-password').value='fake-password-2026!';await $('login-form').onsubmit(new window.Event('submit',{cancelable:true}));assert.equal(writes[0].path,'/auth/signup');assert.equal(writes[0].body.fullName,'Persona de prueba');assert.equal($('password').value,'');assert.match($('login-message').textContent,/administrador/);assert.equal($('submit-login').textContent,'Ingresar');
 }finally{globalThis.fetch=original;window.close();}
});
