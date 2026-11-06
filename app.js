import {blocks,mapsURL,addressSearch,localAddressResults,distanceKm} from './core.mjs';
import {orderedStops,createRouteQueue} from './planner.mjs';
import {mountTrip} from './trip.js';
import {mountCloudStore} from './cloud-sync.js';
const $=id=>document.getElementById(id);
const boot=await fetch('/auth/status').then(r=>{if(!r.ok)throw Error();return r.json();}).catch(()=>({}));
if(boot.mfaRequired)location.replace('/login');
if(boot.isAdmin&&document.getElementById('admin-link'))document.getElementById('admin-link').hidden=false;
const localHost=['localhost','127.0.0.1','[::1]'].includes(location.hostname);
const KEY=boot.backend==='supabase'&&boot.userId?'fleteruta-user-'+boot.userId:localHost?'fleteruta-test-v1':'fleteruta-cloud-unavailable';
let stops=[],origin=null,busy=false,map,markers,line,tiles,editing=null,lastSearch=0,cache={},focusedId=null,manualOrder=false;
const markerById=new Map();
let trip=null;
try{const saved=JSON.parse(localStorage.getItem(KEY)||'{}');if(Array.isArray(saved.stops))stops=saved.stops.filter(p=>p&&typeof p.id==='string'&&typeof p.address==='string'&&Number.isFinite(p.lat)&&Math.abs(p.lat)<=90&&Number.isFinite(p.lon)&&Math.abs(p.lon)<=180).slice(0,30);$('return').checked=!!saved.roundTrip;cache=saved.cache||{};}catch{ }
function message(text,error=false){$('message').textContent=text;$('message').classList.toggle('error',error);}
function routeState(text,type=''){$('route-state').textContent=text;$('route-state').dataset.state=type;}
function searchHint(){$('search-area').textContent=$('search-scope').value==='argentina'?'Buscando solo en Argentina. Resultados ordenados por cercanía.':origin?'Solo Argentina, hasta 100 km de tu ubicación actual.':'Sin GPS: búsqueda en Buenos Aires y alrededores (hasta 100 km de CABA).';}
try{manualOrder=JSON.parse(localStorage.getItem(KEY)||'{}').manualOrder===true;}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify({stops,roundTrip:$('return').checked,cache,manualOrder}));}catch{message('No se pudo guardar en este navegador. Conservá la pestaña abierta.',true);}}
function lock(value){busy=value;document.querySelectorAll('button,input,select').forEach(el=>el.disabled=value||el.dataset.unavailable==='true');}
async function task(fn){if(busy)return;lock(true);try{const auth=await fetch('/auth/status').then(r=>r.json());if(!auth.authenticated){location.replace('/login');return;}await fn();}catch(e){message(e.message||'No se pudo completar la operación.',true);}finally{lock(false);}}
async function json(url,signal){let response;try{response=await fetch(url,{signal:signal?AbortSignal.any([signal,AbortSignal.timeout(25000)]):AbortSignal.timeout(25000)});}catch(e){if(signal?.aborted)throw e;throw Error('No se pudo contactar el servicio. Revisá Internet y volvé a intentar.');}if(!response.ok)throw Error(`El servicio respondió ${response.status}. Probá nuevamente más tarde.`);return response.json();}
function clearRoute(){$('summary').textContent='';$('navigation').replaceChildren();if(line&&map){map.removeLayer(line);line=null;}}
function node(tag,text,className){const el=document.createElement(tag);if(text)el.textContent=text;if(className)el.className=className;return el;}
function button(text,handler,label){const el=node('button',text);el.type='button';if(label)el.setAttribute('aria-label',label);el.onclick=()=>{if(!busy)handler();};return el;}
function navigationLink(text,url){const a=node('a',text);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;}
function fit(){if(map&&markers?.getLayers().length)map.fitBounds(markers.getBounds().pad(.15),{maxZoom:16});}
function selectStop(id,fromMap=false){focusedId=id;document.querySelectorAll('#stops tr').forEach(row=>row.classList.toggle('selected',row.dataset.id===id));if(fromMap){document.querySelectorAll('#stops tr').forEach(row=>{if(row.dataset.id===id)row.scrollIntoView({behavior:'smooth',block:'nearest'});});}else{const marker=markerById.get(id);if(marker){map.panTo(marker.getLatLng());marker.openPopup();}}}
function draw(){
 if(!map||!markers)return;markers.clearLayers();markerById.clear();
 const add=(p,text,title,extra='')=>L.marker([p.lat,p.lon],{title,icon:L.divIcon({className:'map-number '+extra,html:text,iconSize:[30,30]})}).bindPopup(node('div',title)).addTo(markers);
 if(origin)add(origin,'S','Salida: ubicación actual','origin-marker');
 stops.forEach((s,i)=>{const marker=add(s,String(i+1),`${i+1}. ${s.address}${s.done?' · Entregada':''}`,s.done?'delivered-marker':'');marker.on('click',()=>selectStop(s.id,true));markerById.set(s.id,marker);});
}
function render(){
 $('auto-order').hidden=!manualOrder;
 const pending=stops.filter(s=>!s.done).length;
 $('counter').textContent=`${stops.length} / 30`;$('delivery-count').textContent=`${pending} pendientes · ${stops.length-pending} entregadas`;$('empty').hidden=stops.length>0;$('stops').replaceChildren();
 stops.forEach((s,i)=>{
  const row=node('tr',null,'delivery-row'+(s.done?' done':'')+(s.id===focusedId?' selected':''));row.dataset.id=s.id;
  const address=node('td',null,'address-cell'),view=button('',()=>selectStop(s.id),`Ver parada ${i+1} en el mapa`);view.className='address-button';view.append(node('span',String(i+1),'number'),node('span',s.address,'address-text'));address.append(view);
  const state=node('td');state.append(node('span',s.done?'Entregada':'Pendiente','delivery-status '+(s.done?'is-done':'')));
  const actions=node('td',null,'actions-cell'),group=node('div',null,'actions');
  for(const [delta,label] of [[-1,'↑ Subir'],[1,'↓ Bajar']]){
   const move=button(label,()=>moveStop(s.id,delta),`${delta<0?'Subir':'Bajar'} parada ${i+1}`);
   const unavailable=s.done||!stops[i+delta]||stops[i+delta].done;
   move.dataset.unavailable=String(unavailable);move.disabled=busy||unavailable;group.append(move);
  }
  group.append(button(s.done?'↶ Pendiente':'✓ Entregada',()=>{s.done=!s.done;changed('Estado de entrega actualizado.');}),button('Editar',()=>{editing=s.id;$('address').value=s.address;$('recipient').value=s.recipient||'';$('notes').value=s.notes||'';$('address').focus();$('search-form').scrollIntoView({behavior:'smooth',block:'center'});message('Buscá y confirmá la dirección corregida para reemplazar esta entrega.');}),button('Eliminar',()=>{stops=stops.filter(p=>p.id!==s.id);if(editing===s.id)editing=null;changed('Entrega eliminada.');}),navigationLink('Maps ↗',mapsURL([s])),navigationLink('Waze ↗',`https://waze.com/ul?ll=${s.lat}%2C${s.lon}&navigate=yes`));
  actions.append(group);row.append(address,node('td',s.recipient||'—'),node('td',s.notes||'—'),state,actions);$('stops').append(row);
 });draw();trip?.sync();
}
function moveStop(id,delta){
 const index=stops.findIndex(s=>s.id===id),target=index+delta;
 if(index<0||!stops[target]||stops[index].done||stops[target].done)return;
 [stops[index],stops[target]]=[stops[target],stops[index]];manualOrder=true;focusedId=id;
 changed('Orden manual guardado. El mapa y la navegación respetan el orden elegido.');
}
const queue=createRouteQueue({
 async calculate(snapshot,signal){
  const pending=snapshot.stops.filter(s=>!s.done),points=[snapshot.origin,...pending];
  let ordered=snapshot.stops;
  if(!snapshot.manualOrder){
   const matrix=await json(`https://router.project-osrm.org/table/v1/driving/${points.map(p=>`${p.lon},${p.lat}`).join(';')}?annotations=distance`,signal);
   if(matrix.code!=='Ok'||!Array.isArray(matrix.distances))throw Error('No se pudo calcular la matriz por calles.');
   ordered=orderedStops(snapshot.stops,snapshot.origin,snapshot.roundTrip,matrix.distances);
  }
  const routePoints=[snapshot.origin,...ordered.filter(s=>!s.done),...(snapshot.roundTrip?[snapshot.returnTo]:[])];
  let route=null;
  try{const data=await json(`https://router.project-osrm.org/route/v1/driving/${routePoints.map(p=>`${p.lon},${p.lat}`).join(';')}?overview=full&geometries=geojson&steps=false`,signal);route=data.code==='Ok'?data.routes?.[0]:null;}catch(e){if(signal.aborted)throw e;}
  return {ordered,route};
 },
 onResult({ordered,route},snapshot){
  stops=ordered;save();render();clearRoute();
  if(route?.geometry){if(map)line=L.geoJSON(route.geometry,{style:{color:'#14695b',weight:5,opacity:.8}}).addTo(map);
   const minutes=Math.round(route.duration/60);$('summary').textContent=`${ordered.filter(s=>!s.done).length} pendientes · ${(route.distance/1000).toFixed(1)} km · ${Math.floor(minutes/60)} h ${minutes%60} min estimados. Sin tránsito ni tiempo de descarga.`;
   routeState(snapshot.manualOrder?'Orden manual · recorrido actualizado':'Orden actualizado por calles','ready');
  }else{routeState(snapshot.manualOrder?'Orden manual · trazado no disponible':'Orden por calles · trazado no disponible','warning');}
  showNavigation(snapshot.roundTrip);fit();
 },
 onError(error,snapshot){routeState(snapshot.manualOrder?'Orden manual · sin cálculo por calles':'Orden provisional por cercanía · sin cálculo por calles','warning');message(`${error.message} Se conservan todas las entregas. ${snapshot.manualOrder?'Se mantiene tu orden manual.':'El orden es provisional por cercanía.'} Pulsá Actualizar para reintentar.`,true);}
});
function showNavigation(roundTrip){
 const pending=stops.filter(s=>!s.done);if(!pending.length)return;
 $('navigation').append(navigationLink('Navegar a la próxima entrega ↗',mapsURL([pending[0]])));
 const destinations=[...pending,...(roundTrip?[{...(trip?.base||origin),address:'Regreso al origen'}]:[])];
 blocks(destinations).forEach((block,i)=>$('navigation').append(navigationLink(`Google Maps · bloque ${i+1} · ${block.length} destinos ↗`,mapsURL(block))));
 $('navigation').append(node('p','Abrí los bloques en orden al terminar el anterior. Cada uno usa tu ubicación al abrir Maps como origen.','help'));
}
function changed(text){
 queue.cancel();clearRoute();stops=manualOrder?[...stops.filter(s=>!s.done),...stops.filter(s=>s.done)]:orderedStops(stops,origin,$('return').checked);save();render();fit();
 if(text)message(text);
 const pending=stops.filter(s=>!s.done);
 if(!stops.length){routeState('Sin entregas');return;}
 if(!pending.length){routeState('Todas las entregas realizadas','ready');return;}
 if(!origin){routeState(manualOrder?'Orden manual · esperando ubicación para trazar':'Esperando tu ubicación para ordenar','warning');return;}
 routeState(manualOrder?'Orden manual · actualizando recorrido…':'Orden provisional por cercanía · ajustando por calles…','loading');
 queue.schedule({stops:stops.map(s=>({...s})),origin:{...origin},returnTo:{...(trip?.base||origin)},roundTrip:$('return').checked,manualOrder});
}
async function locate(){
 if(!window.isSecureContext)throw Error('El GPS necesita HTTPS o localhost. Una IP local por HTTP no habilita la ubicación.');
 if(!navigator.geolocation)throw Error('Este navegador no ofrece geolocalización. Probá Chrome o Safari.');
 queue.cancel();clearRoute();$('results').replaceChildren();$('gps-label').textContent='Obteniendo ubicación…';
 try{const position=await new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,{enableHighAccuracy:true,maximumAge:0,timeout:20000}));origin={lat:position.coords.latitude,lon:position.coords.longitude};$('gps-label').textContent='Ubicación actual lista';$('gps-detail').textContent=`Precisión aproximada: ${Math.round(position.coords.accuracy)} m · ${new Date().toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'})}`;changed('Salida actualizada. La tabla y el mapa se ordenan automáticamente.');}
 catch(e){origin=null;queue.cancel();clearRoute();render();routeState('Esperando ubicación · orden sin confirmar','warning');$('gps-label').textContent='Ubicación no disponible';$('gps-detail').textContent='Habilitá ubicación para este sitio y el GPS del dispositivo.';throw Error(e.code===1?'Permiso de ubicación denegado. Podés cargar direcciones; se ordenarán automáticamente cuando habilites tu ubicación.':e.code===3?'El GPS tardó demasiado. Activá ubicación y volvé a intentar.':'No pudimos obtener tu ubicación. Revisá el GPS y los permisos.');}
 finally{searchHint();}
}
$('locate').onclick=()=>task(locate);$('optimize').onclick=()=>task(locate);
$('auto-order').onclick=()=>{trip?.stop('Seguimiento detenido para reordenar. Volvé a iniciarlo cuando esté listo.');manualOrder=false;changed('Orden automático activado. Reacomodando las paradas por cercanía y calles.');};
$('search-scope').onchange=()=>{$('results').replaceChildren();searchHint();message('Zona de búsqueda actualizada. Volvé a buscar la dirección.');};
$('search-form').onsubmit=e=>{e.preventDefault();task(async()=>{
 if(stops.length>=30&&!editing)throw Error('Llegaste a las 30 entregas. Eliminá una para agregar otra.');
 const query=$('address').value.trim();if(query.length<4)throw Error('Ingresá calle, altura y localidad.');
 const search=addressSearch(query,origin,$('search-scope').value);
 $('results').replaceChildren();message('Buscando la dirección en Argentina y en la zona seleccionada…');let results=cache[search.key];
 if(!results){await new Promise(r=>setTimeout(r,Math.max(0,1100-(Date.now()-lastSearch))));lastSearch=Date.now();results=await json(search.url);if(!Array.isArray(results))throw Error('Respuesta de búsqueda inválida.');cache[search.key]=results;save();}
 results=localAddressResults(results,search);
 if(!results.length){message(search.scope==='argentina'?'No encontramos esa dirección en Argentina. Agregá localidad y provincia o corregí la altura.':'No encontramos esa dirección cerca de tu ubicación. Agregá la localidad o elegí Toda Argentina para ampliar la búsqueda.',true);return;}
 const queryAtSearch=query,editAtSearch=editing;
 results.forEach(result=>{
  const b=button(result.display_name,()=>task(async()=>{
   if($('address').value.trim()!==queryAtSearch||editing!==editAtSearch||addressSearch(queryAtSearch,origin,$('search-scope').value).key!==search.key)throw Error('La dirección o la zona cambió. Volvé a buscar antes de confirmar.');
   const lat=Number(result.lat),lon=Number(result.lon);if(!Number.isFinite(lat)||Math.abs(lat)>90||!Number.isFinite(lon)||Math.abs(lon)>180)throw Error('La ubicación recibida no es válida.');
   const old=stops.find(s=>s.id===editing);if(!old&&stops.length>=30)throw Error('Llegaste a las 30 entregas.');
   const item={id:old?.id||crypto.randomUUID(),lat,lon,address:result.display_name,recipient:$('recipient').value.trim(),notes:$('notes').value.trim(),done:old?.done||false};
   if(old)stops[stops.indexOf(old)]=item;else stops.push(item);focusedId=item.id;editing=null;
   $('search-form').reset();$('results').replaceChildren();changed(old?'Dirección corregida. Recorrido actualizado automáticamente.':'Dirección agregada a la tabla y al mapa. El recorrido se acomoda automáticamente.');
  }));b.className='result';const km=distanceKm(search.center,{lat:Number(result.lat),lon:Number(result.lon)});b.append(node('span',`${km.toFixed(1)} km ${origin?'de tu ubicación':'de CABA'} · Confirmar esta ubicación`));$('results').append(b);
 });message('Seleccioná la dirección correcta. Al confirmarla se agrega y se ordena sola.');
 });};
$('return').onchange=()=>changed('Destino final actualizado. Reacomodando las paradas.');
$('fit').onclick=fit;
$('clear').onclick=()=>{if(!busy&&confirm('¿Borrar todas las entregas de este reparto?')){stops=[];editing=null;focusedId=null;manualOrder=false;$('results').replaceChildren();$('search-form').reset();changed('Reparto borrado. Podés cargar nuevas entregas.');}};
function initMap(){
 try{if(!window.L)throw Error('No se pudo cargar la biblioteca local del mapa. Reiniciá con iniciar-prueba.cmd.');
  map=L.map('map').setView([-34.6037,-58.3816],11);markers=L.featureGroup().addTo(map);
  tiles=L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'});
  tiles.on('tileerror',()=>{$('map-status').textContent='No se pudieron cargar las imágenes del mapa. Revisá Internet y pulsá Reintentar.';$('retry-map').hidden=false;});
  tiles.on('tileload',()=>{$('map-status').textContent='Mapa conectado · OpenStreetMap';$('retry-map').hidden=true;});tiles.addTo(map);
  new ResizeObserver(()=>map.invalidateSize()).observe($('map'));
 }catch(e){$('map-status').textContent=e.message;$('retry-map').hidden=false;}
}
$('retry-map').onclick=()=>{if(tiles){$('map-status').textContent='Reintentando conexión del mapa…';tiles.redraw();map.invalidateSize();}else location.reload();};
$('logout').onclick=async()=>{queue.cancel();trip?.stop();const response=await fetch('/auth/logout',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});if(response.ok)location.replace('/login');else message('No se pudo cerrar la sesión. Volvé a intentar.',true);};
document.addEventListener('visibilitychange',async()=>{if(!document.hidden){try{const status=await fetch('/auth/status').then(r=>r.json());if(!status.authenticated){queue.cancel();trip?.stop();location.replace('/login');}}catch{}}});
trip=mountTrip({getStops:()=>stops,getOrigin:()=>origin,message,
 onStart(){manualOrder=true;changed('Seguimiento iniciado. Se conserva la secuencia de paradas para avanzar una por una.');},
 onComplete(id,position){const stop=stops.find(s=>s.id===id);if(!stop||stop.done)return;stop.done=true;manualOrder=true;
  if(position&&Date.now()-position.timestamp<=20000&&position.coords.accuracy<=60){origin={lat:position.coords.latitude,lon:position.coords.longitude};$('gps-label').textContent='Salida actualizada desde la entrega';searchHint();}
  changed('Entrega realizada. Continuamos con la siguiente parada de tu recorrido.');
 }
});
initMap();render();searchHint();if(stops.length)fit();
const cloud=mountCloudStore({enabled:boot.backend==='supabase',getSnapshot:()=>({stops,roundTrip:$('return').checked,manualOrder}),message,
 applySnapshot(snapshot){trip.stop('Reparto recuperado. Iniciá el seguimiento para continuar.');queue.cancel();stops=snapshot.stops;manualOrder=snapshot.manualOrder;$('return').checked=snapshot.roundTrip;editing=null;changed('Reparto cargado en la tabla y en el mapa.');}
});
await cloud.initialize();task(locate);
