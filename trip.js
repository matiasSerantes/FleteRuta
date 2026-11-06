import {mapsURL} from './core.mjs';
import {createArrivalDetector} from './planner.mjs';

export function mountTrip({getStops,getOrigin,onStart,onComplete,message}){
 const $=id=>document.getElementById(id),detector=createArrivalDetector();
 let active=false,watch=null,poll=null,current=null,lastPosition=null,registration=null,notification=null,base=null,checking=false,arrivalId=null;
 try{$('navigator-app').value=localStorage.getItem('fleteruta-navigator')==='waze'?'waze':'maps';}catch{}
 const next=()=>getStops().find(s=>!s.done);
 const urlFor=point=>$('navigator-app').value==='waze'?`https://waze.com/ul?ll=${point.lat}%2C${point.lon}&navigate=yes`:mapsURL([point]);
 function closeArrival(){arrivalId=null;if($('arrival-dialog').open)$('arrival-dialog').close();notification?.close();registration?.getNotifications({tag:'fleteruta-arrival'}).then(items=>items.forEach(n=>n.close())).catch(()=>{});}
 function sync(){
  const target=next(),key=target?`${target.id}:${target.lat}:${target.lon}`:null;
  if(key!==current){current=key;detector.reset();closeArrival();}
  $('trip-target').textContent=target?target.address:'No quedan entregas pendientes.';
  $('trip-start').hidden=active;$('trip-stop').hidden=!active;
  $('trip-start').textContent=getStops().some(s=>s.done)&&target?'Retomar seguimiento':'Iniciar seguimiento';
  $('trip-go').hidden=!target;
  if(target)$('trip-go').href=urlFor(target);
  if(active&&!target)stop('Reparto completado. Seguimiento detenido.');
 }
 function stop(text='Seguimiento detenido. Podés volver a iniciarlo.'){
  active=false;clearInterval(poll);poll=null;if(watch!==null){navigator.geolocation.clearWatch(watch);watch=null;}detector.reset();closeArrival();$('trip-status').textContent=text;sync();
 }
 async function notify(){
  if(!('Notification' in window)||Notification.permission!=='granted')return;
  const options={body:'Entrá a FleteRuta para confirmar la entrega y abrir la próxima parada.',tag:'fleteruta-arrival'};
  try{if(registration)await registration.showNotification('Llegaste a la parada',options);else{notification=new Notification('Llegaste a la parada',options);notification.onclick=()=>{window.focus();notification.close();};}}catch{$('trip-status').textContent='Llegada detectada. El aviso está dentro de la app; las notificaciones del sistema no están disponibles.';}
 }
 function showArrival(target){
  arrivalId=target.id;$('arrival-address').textContent=target.address;
  const pending=getStops().filter(s=>!s.done),index=pending.findIndex(s=>s.id===target.id),following=pending[index+1];
  const returnPoint=!following&&$('return').checked?base:null;
  const destination=following||returnPoint;
  $('arrival-next-address').textContent=following?`Próxima: ${following.address}`:returnPoint?'Última entrega. Después volvés al punto de salida.':'Es la última entrega del reparto.';
  $('arrival-yes').textContent=following?'Sí, entregar e ir a la siguiente':returnPoint?'Entregar y volver al inicio':'Sí, finalizar reparto';
  if(destination)$('arrival-yes').href=urlFor(destination);else $('arrival-yes').removeAttribute('href');
  if(!$('arrival-dialog').open)$('arrival-dialog').showModal();
  $('arrival-yes').focus();notify();
 }
 function positionReceived(position){
  if(!active)return;lastPosition=position;const target=next();if(!target){sync();return;}
  const result=detector.sample(position,target);
  $('trip-status').textContent=result.poorSignal?'GPS impreciso o antiguo. Esperando una ubicación confiable…':result.arrived?'Llegada detectada. Confirmá si querés continuar.':result.settling?'Estás cerca. Confirmando que llegaste…':`Seguimiento activo · ${Number.isFinite(result.distance)?Math.round(result.distance)+' m hasta la próxima parada':'esperando GPS'}`;
  if(result.arrived)showArrival(target);
 }
 function gpsError(error){$('trip-status').textContent=error.code===1?'Permiso de ubicación denegado. Habilitalo y reiniciá el seguimiento.':'Se perdió la señal GPS. Esperando una posición nueva…';if(error.code===1)stop($('trip-status').textContent);}
 function refresh(){
  if(!active||checking)return;checking=true;
  navigator.geolocation.getCurrentPosition(p=>{checking=false;positionReceived(p);},e=>{checking=false;gpsError(e);},{enableHighAccuracy:true,maximumAge:0,timeout:20000});
 }
 function start(){
  if(active)return;
  if(!window.isSecureContext||!navigator.geolocation?.watchPosition){message('El seguimiento necesita GPS y HTTPS o localhost.',true);return;}
  if(!next()){message('Cargá al menos una entrega pendiente.',true);return;}
  if(!getOrigin()){message('Primero obtené tu ubicación actual con el botón de salida.',true);return;}
  active=true;base={...getOrigin()};lastPosition=null;detector.reset();closeArrival();onStart();sync();$('trip-status').textContent='Seguimiento activo. Esperando GPS…';
  watch=navigator.geolocation.watchPosition(positionReceived,gpsError,{enableHighAccuracy:true,maximumAge:0,timeout:20000});
  // Stationary drivers may receive no watch callbacks: refresh while visible to verify dwell.
  poll=setInterval(()=>{if(!document.hidden)refresh();},5000);
 }
 $('trip-start').onclick=start;
 $('trip-stop').onclick=()=>stop();
 $('navigator-app').onchange=()=>{try{localStorage.setItem('fleteruta-navigator',$('navigator-app').value);}catch{}sync();if(arrivalId){const target=next();if(target)showArrival(target);}};
 $('arrival-no').onclick=()=>{detector.snooze();closeArrival();$('trip-status').textContent='Entrega pendiente. Volveremos a avisar después de un minuto si seguís cerca.';};
 $('arrival-dialog').addEventListener('cancel',e=>{e.preventDefault();$('arrival-no').click();});
 $('arrival-yes').onclick=event=>{
  const target=next();if(!active||!target||target.id!==arrivalId){event.preventDefault();closeArrival();message('La parada cambió. Esperá una nueva detección de llegada.',true);return;}
  const pending=getStops().filter(s=>!s.done),following=pending[1],destination=following||($('return').checked?base:null);
  if(destination)$('arrival-yes').href=urlFor(destination);else event.preventDefault();
  // Synchronous click keeps the external navigation within the user's gesture.
  closeArrival();onComplete(target.id,lastPosition);sync();
 };
 $('trip-notifications').onclick=async()=>{
  if(!window.isSecureContext||!('Notification' in window)){message('Este navegador no admite avisos del sistema. La llegada se mostrará dentro de FleteRuta.',true);return;}
  try{
   if(Notification.permission==='denied'){message('Las notificaciones están bloqueadas en el navegador. El aviso seguirá apareciendo dentro de la app.',true);return;}
   // Request directly from the click; some browsers discard delayed permission requests.
   const permission=await Notification.requestPermission();
   if(permission!=='granted'){message('No se habilitaron los avisos del sistema. Se mantiene el aviso dentro de la app.');return;}
   if('serviceWorker' in navigator){registration=await navigator.serviceWorker.register('/notifications-sw.js');registration=await navigator.serviceWorker.ready;}
   message('Notificaciones habilitadas. El GPS en segundo plano depende del navegador; volvé a la app al llegar.');
  }catch{message('No se pudo activar el aviso del sistema. La confirmación de llegada seguirá apareciendo dentro de la app.',true);}
 };
 document.addEventListener('visibilitychange',()=>{if(active){if(document.hidden)$('trip-status').textContent='App en segundo plano: el navegador puede pausar el GPS. Al volver comprobaremos tu ubicación.';else refresh();}});
 window.addEventListener('pagehide',()=>stop());sync();
 return {sync,stop,resume(){if(next()&&getOrigin()&&navigator.geolocation?.watchPosition)start();},get active(){return active;},get base(){return active?base:null;}};
}
