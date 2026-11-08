import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';

test('formulario real agrega filas, reordena tabla y marcadores y recalcula al entregar',async()=>{
 const window=new Window({url:'http://localhost:5173',settings:{enableJavaScriptEvaluation:true,disableJavaScriptFileLoading:true,enableCSSFileLoading:false,enableImageFileLoading:false,suppressInsecureJavaScriptEnvironmentWarning:true}});
 const html=(await readFile(new URL('./index.html',import.meta.url),'utf8')).replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace(/<link\b[^>]*>/g,'');
 window.document.write(html);
 Object.defineProperty(window,'isSecureContext',{value:true});
 const document=window.document;
 for(const [key,value] of Object.entries({window,document,location:window.location,localStorage:window.localStorage,ResizeObserver:window.ResizeObserver,navigator:{geolocation:{getCurrentPosition:resolve=>queueMicrotask(()=>resolve({coords:{latitude:-34.6037,longitude:-58.3816,accuracy:10}}))}}}))Object.defineProperty(globalThis,key,{value,configurable:true,writable:true});
 window.eval(await readFile(new URL('./vendor/leaflet/leaflet.js',import.meta.url),'utf8'));globalThis.L=window.L;
 const originalFetch=globalThis.fetch;
 const addresses={'Lejana 1234':.3,'Cercana 1234':.1,'Intermedia 1234':.2};let matrixCalls=0;
 globalThis.fetch=async input=>{
  const url=new URL(input,'http://localhost:5173');let data;
  if(url.pathname==='/auth/status')data={authenticated:true};
  else if(url.hostname==='nominatim.openstreetmap.org'){
   assert.equal(url.searchParams.get('countrycodes'),'ar');assert.equal(url.searchParams.get('bounded'),'1');assert.ok(url.searchParams.get('viewbox'));
   data=[{display_name:'Resultado extranjero',lat:'-34.6',lon:'-58.4',address:{country_code:'uy'}},{display_name:url.searchParams.get('q'),lat:'-34.6037',lon:String(-58.3816+addresses[url.searchParams.get('q')]),address:{country_code:'ar'}},{display_name:'Resultado en Córdoba',lat:'-31.4',lon:'-64.2',address:{country_code:'ar'}}];
  }
  else if(url.hostname==='router.project-osrm.org'){
   if(url.pathname.includes('/table/'))matrixCalls++;
   const coords=url.pathname.split('/').at(-1).split(';').map(p=>p.split(',').map(Number));
   data=url.pathname.includes('/table/')?{code:'Ok',distances:coords.map(a=>coords.map(b=>Math.abs(a[0]-b[0])*100000))}:{code:'Ok',routes:[{distance:30000,duration:1800,geometry:{type:'LineString',coordinates:coords}}]};
  }else throw Error('Solicitud inesperada en prueba: '+url.href);
  return {ok:true,status:200,json:async()=>data};
 };
 const $=id=>document.getElementById(id);
 const until=async predicate=>{const end=Date.now()+5000;while(!predicate()){if(Date.now()>end)throw Error('Tiempo agotado: '+$('message').textContent+' / '+$('route-state').textContent);await new Promise(resolve=>setTimeout(resolve,10));}};
 const rowAddresses=()=>[...document.querySelectorAll('#stops .address-text')].map(el=>el.textContent);
 const checkMapNumbers=()=>{for(const [i,address] of rowAddresses().entries()){const marker=[...document.querySelectorAll('.leaflet-marker-icon')].find(el=>el.title===`${i+1}. ${address}`||el.title===`${i+1}. ${address} · Entregada`);assert.ok(marker,`Marcador ${i+1}: ${address}`);assert.equal(marker.textContent,String(i+1));}};
 try{
  await import('./app.js');await until(()=>$('gps-label').textContent==='Ubicación actual lista'&&!$('search-button').disabled);
  $('address-list').value='Lejana 1234\tCliente lejano\tPortón azul\nCercana 1234\nIntermedia 1234';$('list-load').click();
  assert.equal($('recipient').value,'Cliente lejano');assert.equal($('notes').value,'Portón azul');
  for(const address of ['Lejana 1234','Cercana 1234','Intermedia 1234']){
   assert.equal($('address').value,address);$('search-form').dispatchEvent(new window.Event('submit',{cancelable:true}));
   await until(()=>!!$('results').querySelector('button')&&!$('search-button').disabled);
   assert.equal($('results').querySelectorAll('button').length,1);assert.ok(!$('results').textContent.includes('Resultado extranjero'));assert.ok(!$('results').textContent.includes('Resultado en Córdoba'));
   $('results').querySelector('button').click();await until(()=>rowAddresses().includes(address)&&!$('search-button').disabled);
  }
  assert.deepEqual(rowAddresses(),['Cercana 1234','Intermedia 1234','Lejana 1234']);checkMapNumbers();
  assert.equal($('list-load').hidden,false);assert.deepEqual(JSON.parse(localStorage.getItem('fleteruta-test-v1-address-list')),[]);
  assert.equal(document.querySelector('#stops tr td:last-child').dataset.label,'Acciones');
  assert.match(document.querySelectorAll('#stops tr')[2].textContent,/Cliente lejano/);
  await until(()=>$('route-state').dataset.state==='ready');checkMapNumbers();assert.match($('summary').textContent,/3 pendientes/);
  const beforeManual=matrixCalls;
  const move=(row,text)=>[...document.querySelectorAll('#stops tr')[row].querySelectorAll('button')].find(b=>b.textContent===text);
  assert.equal(move(0,'↑ Subir').disabled,true);assert.equal(move(2,'↓ Bajar').disabled,true);
  move(0,'↓ Bajar').click();assert.deepEqual(rowAddresses(),['Intermedia 1234','Cercana 1234','Lejana 1234']);checkMapNumbers();
  await until(()=>$('route-state').dataset.state==='ready');assert.match($('route-state').textContent,/Orden manual/);assert.equal(matrixCalls,beforeManual);
  assert.equal(JSON.parse(localStorage.getItem('fleteruta-test-v1')).manualOrder,true);
  const mapsURL=new URL($('trip-go').href);assert.equal(mapsURL.searchParams.get('waypoints').split('|')[0],'-34.6037,'+(-58.3816+.2));
  assert.equal(document.querySelectorAll('#stops .actions a').length,0);
  move(1,'↑ Subir').click();assert.deepEqual(rowAddresses(),['Cercana 1234','Intermedia 1234','Lejana 1234']);
  await until(()=>$('route-state').dataset.state==='ready');assert.equal(matrixCalls,beforeManual);
  $('auto-order').click();await until(()=>$('route-state').dataset.state==='ready');assert.ok(matrixCalls>beforeManual);assert.equal($('auto-order').hidden,true);
  [...document.querySelectorAll('#stops .actions button')].find(b=>b.textContent==='✓ Entregada').click();
  assert.deepEqual(rowAddresses(),['Intermedia 1234','Lejana 1234','Cercana 1234']);checkMapNumbers();
  await until(()=>$('route-state').dataset.state==='ready');assert.match($('delivery-count').textContent,/2 pendientes/);assert.equal(document.querySelectorAll('#stops tr.done').length,1);
  assert.equal(move(1,'↓ Bajar').disabled,true);assert.equal(move(2,'↑ Subir').disabled,true);
  const saved=JSON.parse(localStorage.getItem('fleteruta-test-v1'));assert.deepEqual(saved.stops.map(s=>s.address),rowAddresses());
  assert.ok(document.querySelector('.route-column .map-panel').compareDocumentPosition(document.querySelector('.deliveries-panel'))&window.Node.DOCUMENT_POSITION_FOLLOWING);
 }finally{globalThis.fetch=originalFetch;window.happyDOM.abort();window.close();}
});
