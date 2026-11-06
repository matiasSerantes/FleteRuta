export function mountCloudStore({enabled,storageKey='fleteruta-cloud-state',getSnapshot,applySnapshot,message}){
 const $=id=>document.getElementById(id),view=document.defaultView;
 if(!enabled)return {initialize:async()=>{},changed(){}};
 let revision=0,synced='',dirty=false,ready=false,saving=false,conflict=false,applying=false,loading=false,retryTimer=null,disposed=false;
 const hash=s=>JSON.stringify({stops:s.stops.map(p=>({id:p.id,address:p.address,lat:p.lat,lon:p.lon,done:p.done,recipient:p.recipient||'',notes:p.notes||''})),roundTrip:s.roundTrip,manualOrder:s.manualOrder});
 try{const meta=JSON.parse(localStorage.getItem(storageKey)||'{}');revision=meta.revision||0;synced=meta.synced||'';dirty=meta.dirty===true||(!!synced&&hash(getSnapshot())!==synced)||(!synced&&getSnapshot().stops.length>0);}catch{dirty=getSnapshot().stops.length>0;}
 const snapshotOf=route=>({stops:route.stops,roundTrip:route.round_trip,manualOrder:route.manual_order});
 const status=text=>$('cloud-status').textContent=text;
 const persist=()=>{try{localStorage.setItem(storageKey,JSON.stringify({revision,synced,dirty}));}catch{status('No se pudo guardar la copia de recuperación. Revisá el almacenamiento del navegador.');}};
 $('cloud-panel').hidden=false;
 async function request(method,body){
  const encoded=body?JSON.stringify(body):undefined;
  const response=await fetch('/api/route',{method,headers:body?{'Content-Type':'application/json'}:{},...(body?{body:encoded,keepalive:new TextEncoder().encode(encoded).length<60000}:{}),signal:AbortSignal.timeout(20000)});
  const data=await response.json();if(!response.ok)throw Object.assign(Error(data.error||'No se pudo sincronizar.'),{status:response.status});return data.route;
 }
 function changed(){
  if(disposed||applying)return;if(hash(getSnapshot())===synced&&!dirty)return;
  dirty=true;persist();status(conflict?'Hay cambios en otro dispositivo. Se conserva tu avance local. Recuperá la nube para resolverlo.':'Avance guardado en este dispositivo · pendiente de guardar en nube');
  if(ready&&!saving&&!loading&&!conflict)void flush();
 }
 async function flush(){
  if(disposed||!ready||saving||loading||conflict||!dirty)return;
  saving=true;
  try{
   while(dirty&&!conflict){
    const snapshot=structuredClone(getSnapshot()),sentHash=hash(snapshot);status('Guardando avance automáticamente…');
    const route=await request('PUT',{...snapshot,revision});if(disposed)return;revision=route.revision;synced=sentHash;
    dirty=hash(getSnapshot())!==sentHash;persist();
   }
   status('Avance guardado en nube · podés retomar con tu cuenta');
  }catch(error){if(disposed)return;dirty=true;conflict=error.status===409;persist();status(conflict?'Conflicto con otro dispositivo. Tu avance sigue en la copia local; no se sobrescribió.':'Sin guardar en nube · copia local conservada. Reintentaremos al recuperar conexión.');message(error.message,true);if(!conflict){view.clearTimeout(retryTimer);retryTimer=view.setTimeout(()=>{if(!document.hidden)void retry();},30000);}}
  finally{saving=false;}
 }
 async function initialize(){
  if(disposed||loading||saving)return;loading=true;
  try{
   const route=await request('GET');if(disposed)return;const serverRevision=route?.revision||0,remoteHash=route?hash(snapshotOf(route)):hash({stops:[],roundTrip:false,manualOrder:false});
   ready=true;
   if(dirty){
    if(hash(getSnapshot())===remoteHash){revision=serverRevision;synced=remoteHash;dirty=false;conflict=false;}
    else if(revision!==serverRevision){conflict=true;status('La nube cambió mientras estabas desconectado. Se conserva tu avance local; recuperá la nube para resolverlo.');persist();return;}
    else{revision=serverRevision;conflict=false;}
   }else if(route){
    revision=serverRevision;synced=remoteHash;applying=true;try{applySnapshot(snapshotOf(route));}finally{applying=false;}
    dirty=hash(getSnapshot())!==synced;
   }else{revision=0;dirty=getSnapshot().stops.length>0;synced=dirty?'':hash(getSnapshot());}
   persist();status(dirty?'Copia local recuperada. Guardando los cambios pendientes…':'Reparto recuperado · continuá desde la próxima entrega pendiente');
  }catch(error){ready=false;status('No se pudo recuperar la nube. Tu copia local sigue disponible.');message(error.message,true);}
  finally{loading=false;}
  if(dirty&&!conflict)await flush();
 }
 $('cloud-save').onclick=async()=>{if(!ready)await initialize();else await flush();};
 $('cloud-load').onclick=async()=>{
  if(saving||loading)return;if(getSnapshot().stops.length&&!confirm('¿Reemplazar el avance local con el reparto de la nube? Los cambios locales pendientes se reemplazarán.'))return;
  loading=true;try{const route=await request('GET');revision=route?.revision||0;dirty=false;conflict=false;ready=true;
   const snapshot=route?snapshotOf(route):{stops:[],roundTrip:false,manualOrder:false};synced=hash(snapshot);applying=true;try{applySnapshot(snapshot);}finally{applying=false;}persist();status('Reparto recuperado de Supabase.');
  }catch(error){status(error.message);message(error.message,true);}finally{loading=false;}
 };
 $('cloud-import').onclick=()=>{
  if(saving||loading)return;let legacy;try{legacy=JSON.parse(localStorage.getItem('fleteruta-test-v1')||'{}');}catch{}
  if(!Array.isArray(legacy?.stops)||!legacy.stops.length){message('No hay un reparto local anterior para importar.');return;}
  if(getSnapshot().stops.length&&!confirm('¿Reemplazar esta tabla con el reparto de la versión local?'))return;
  applySnapshot({stops:legacy.stops.slice(0,30),roundTrip:!!legacy.roundTrip,manualOrder:!!legacy.manualOrder});changed();
 };
 const retry=()=>{if(disposed)return;if(!ready||conflict)return initialize();return flush();};
 const online=()=>{void retry();},hide=()=>{persist();void flush();},unload=event=>{if(dirty||saving){event.preventDefault();event.returnValue='';}},visible=()=>{if(!document.hidden)void retry();};
 view.addEventListener('online',online);view.addEventListener('pagehide',hide);view.addEventListener('beforeunload',unload);document.addEventListener('visibilitychange',visible);
 return {initialize,changed,flush,dispose(){disposed=true;view.clearTimeout(retryTimer);view.removeEventListener('online',online);view.removeEventListener('pagehide',hide);view.removeEventListener('beforeunload',unload);document.removeEventListener('visibilitychange',visible);}};
}
