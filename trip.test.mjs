import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Window} from 'happy-dom';
import {readFile} from 'node:fs/promises';
import {mountTrip} from './trip.js';

test('llegada, notificación, rechazo y confirmación abren solo el siguiente destino',async()=>{
 const window=new Window({url:'http://localhost:5173'}),document=window.document;
 document.write((await readFile(new URL('./index.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 Object.defineProperty(window,'isSecureContext',{value:true});
 let callback,clears=0,completed=[],notices=0,registrations=0,trip;
 const registration={showNotification:async()=>notices++,getNotifications:async()=>[]};
 class Notifications{static permission='default';static async requestPermission(){this.permission='granted';return 'granted';}}
 window.Notification=Notifications;
 const navigator={geolocation:{watchPosition:success=>{callback=success;return 1;},clearWatch:()=>clears++},serviceWorker:{register:async path=>{assert.equal(path,'/notifications-sw.js');registrations++;return registration;},ready:Promise.resolve(registration)}};
 for(const [key,value] of Object.entries({window,document,navigator,Notification:Notifications,localStorage:window.localStorage}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 const stops=[{id:'a',lat:-34.6,lon:-58.4,address:'Entrega A',heightVerified:true,done:false},{id:'b',lat:-34.61,lon:-58.41,address:'Entrega B',heightVerified:true,done:false}];
 const $=id=>document.getElementById(id);
 trip=mountTrip({getStops:()=>stops,getOrigin:()=>({lat:-34.5,lon:-58.3}),onStart:()=>{},onComplete:id=>{completed.push(id);stops.find(s=>s.id===id).done=true;trip.sync();},message:()=>{}});
 const arrive=stop=>{const now=Date.now();for(const timestamp of [now-9000,now])callback({timestamp,coords:{latitude:stop.lat,longitude:stop.lon,accuracy:10,speed:0}});};
 try{
  await $('trip-notifications').onclick();assert.equal(registrations,1);
  assert.equal(new URL($('trip-go').href).searchParams.get('origin'),'-34.5,-58.3');
  trip.resume();assert.equal(trip.active,true);arrive(stops[0]);assert.equal($('arrival-dialog').open,true);assert.equal(notices,1);assert.equal(stops[0].done,false);
  assert.equal(new URL($('arrival-yes').href).searchParams.get('origin'),'-34.6,-58.4');
  $('arrival-no').click();assert.equal($('arrival-dialog').open,false);assert.deepEqual(completed,[]);
  $('trip-stop').click();$('trip-start').click();arrive(stops[0]);assert.equal($('arrival-dialog').open,true);
  const click=new window.MouseEvent('click',{cancelable:true});$('arrival-yes').onclick(click);
  assert.deepEqual(completed,['a']);assert.equal(click.defaultPrevented,false);assert.equal(new URL($('arrival-yes').href).searchParams.get('destination'),'Entrega B');assert.equal(new URL($('arrival-yes').href).searchParams.has('waypoints'),false);
  $('navigator-app').value='waze';$('navigator-app').dispatchEvent(new window.Event('change'));assert.match($('trip-go').href,/waze.com/);
  stops[1].heightVerified=false;trip.sync();arrive(stops[1]);assert.equal($('arrival-dialog').open,false);assert.match($('trip-status').textContent,/Altura sin confirmar/);
  stops[1].heightVerified=true;trip.sync();
  arrive(stops[1]);assert.match($('arrival-yes').textContent,/finalizar reparto/);
  const finish=new window.MouseEvent('click',{cancelable:true});$('arrival-yes').onclick(finish);
  assert.equal(finish.defaultPrevented,true);assert.deepEqual(completed,['a','b']);assert.equal(trip.active,false);assert.ok(clears>=2);
 }finally{trip.stop();window.close();}
});

test('envía diez pendientes a Google Maps y ofrece bloques de cuatro para navegador móvil',async()=>{
 const window=new Window({url:'http://localhost:5173',width:390,height:844}),document=window.document;
 document.write((await readFile(new URL('./index.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,''));
 Object.defineProperty(window,'isSecureContext',{value:true});let callback,trip;
 const navigator={userAgent:'Android',geolocation:{watchPosition:success=>{callback=success;return 1;},clearWatch(){}}};
 for(const [key,value] of Object.entries({window,document,navigator,localStorage:window.localStorage}))Object.defineProperty(globalThis,key,{value,writable:true,configurable:true});
 let stops=Array.from({length:10},(_,i)=>({id:String(i),lat:-34.6-i/100,lon:-58.4,address:'Entrega '+i,heightVerified:true,done:false}));
 const $=id=>document.getElementById(id),destinations=element=>{const url=new URL(element.href);return [...(url.searchParams.get('waypoints')||'').split('|').filter(Boolean),url.searchParams.get('destination')];};
 trip=mountTrip({getStops:()=>stops,getOrigin:()=>({lat:-34.5,lon:-58.3}),onStart(){},onComplete(id){stops.find(s=>s.id===id).done=true;trip.sync();},message(){}});
 try{
  assert.deepEqual(destinations($('trip-go')),stops.map(s=>s.address));assert.match($('trip-go').textContent,/10 paradas/);
  assert.equal(new URL($('trip-go').href).searchParams.get('waypoints').split('|').length,9);
  $('maps-browser-mode').click();assert.deepEqual(destinations($('trip-go')),stops.slice(0,4).map(s=>s.address));assert.match($('navigation-hint').textContent,/Quedan 6/);
  $('maps-browser-mode').click();assert.deepEqual(destinations($('trip-go')),stops.map(s=>s.address));
  stops[0].done=true;trip.sync();assert.deepEqual(destinations($('trip-go')),stops.slice(1).map(s=>s.address));
  stops=stops.filter(s=>s.id!=='2');trip.sync();assert.deepEqual(destinations($('trip-go')),stops.filter(s=>!s.done).map(s=>s.address));
  trip.resume();const target=stops.find(s=>!s.done),now=Date.now();for(const timestamp of [now-9000,now])callback({timestamp,coords:{latitude:target.lat,longitude:target.lon,accuracy:10,speed:0}});
  assert.equal($('arrival-dialog').open,true);const expected=stops.filter(s=>!s.done&&s.id!==target.id).map(s=>s.address);assert.deepEqual(destinations($('arrival-yes')),expected);
  $('arrival-yes').onclick(new window.MouseEvent('click',{cancelable:true}));assert.equal(target.done,true);assert.deepEqual(destinations($('trip-go')),expected);
  $('navigator-app').value='waze';$('navigator-app').dispatchEvent(new window.Event('change'));assert.match($('trip-go').href,/waze.com/);assert.match($('navigation-hint').textContent,/Waze acepta un destino/);
  stops.forEach(s=>s.done=true);trip.sync();assert.equal($('trip-go').hidden,true);assert.equal($('trip-go').hasAttribute('href'),false);
 }finally{trip.stop();window.close();}
});
