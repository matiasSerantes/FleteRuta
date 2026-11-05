export function mountCloudStore({enabled,getSnapshot,applySnapshot,message}){
 const $=id=>document.getElementById(id);let revision=0,ready=false,busy=false;
 if(!enabled)return {initialize:async()=>{}};
 $('cloud-panel').hidden=false;
 const status=text=>$('cloud-status').textContent=text;
 const setBusy=value=>{busy=value;for(const id of ['cloud-save','cloud-load','cloud-import'])$(id).disabled=value;};
 async function request(method,body){
  const response=await fetch('/api/route',{method,headers:body?{'Content-Type':'application/json'}:{},...(body?{body:JSON.stringify(body)}:{})});
  const data=await response.json();if(!response.ok)throw Error(data.error||'No se pudo sincronizar.');return data.route;
 }
 function apply(route){applySnapshot({stops:route.stops,roundTrip:route.round_trip,manualOrder:route.manual_order});revision=route.revision;}
 $('cloud-save').onclick=async()=>{
  if(busy)return;if(!ready){message('Primero recuperá el estado de la nube para comprobar su versión.',true);return;}
  setBusy(true);const snapshot=structuredClone(getSnapshot());status('Guardando…');
  try{const route=await request('PUT',{...snapshot,revision});revision=route.revision;status('Guardado en Supabase · '+new Date(route.updated_at).toLocaleString('es-AR'));message('Reparto guardado. Podés recuperarlo desde otro dispositivo con tu cuenta.');}
  catch(error){status('Sin guardar · '+error.message);message(error.message,true);}finally{setBusy(false);}
 };
 $('cloud-load').onclick=async()=>{
  if(busy)return;if(getSnapshot().stops.length&&!confirm('¿Reemplazar la tabla de este dispositivo con el reparto guardado en la nube?'))return;
  setBusy(true);try{const route=await request('GET');ready=true;revision=route?.revision||0;if(route){apply(route);status('Reparto recuperado de Supabase.');}else status('Todavía no hay un reparto guardado en tu cuenta.');}catch(error){status(error.message);message(error.message,true);}finally{setBusy(false);}
 };
 $('cloud-import').onclick=()=>{
  if(busy)return;let legacy;try{legacy=JSON.parse(localStorage.getItem('fleteruta-test-v1')||'{}');}catch{}
  if(!Array.isArray(legacy?.stops)||!legacy.stops.length){message('No hay un reparto de la versión local para importar.');return;}
  if(getSnapshot().stops.length&&!confirm('¿Reemplazar esta tabla con el reparto de la versión local?'))return;
  applySnapshot({stops:legacy.stops.slice(0,30),roundTrip:!!legacy.roundTrip,manualOrder:!!legacy.manualOrder});status('Importado a este dispositivo. Pulsá Guardar en nube para subirlo a tu cuenta.');
 };
 return {async initialize(){
  setBusy(true);try{const route=await request('GET');revision=route?.revision||0;ready=true;
   if(route&&!getSnapshot().stops.length){apply(route);status('Reparto recuperado de tu cuenta.');}
   else status(route?'Hay una copia en la nube. Guardar actualiza esa copia; Recuperar reemplaza la tabla local.':'Tu cuenta todavía no tiene un reparto guardado. Pulsá Guardar en nube cuando esté listo.');
  }catch(error){status('Sin conexión a la nube. '+error.message);}finally{setBusy(false);}
 }};
}
