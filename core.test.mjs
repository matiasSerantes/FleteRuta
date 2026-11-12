import {test} from 'node:test';
import assert from 'node:assert/strict';
import {optimize,routeCost,blocks,mapsURL,navigationPlan,shortAddress,addressSearch,localAddressResults,BUENOS_AIRES,houseNumberMatches,recoverRouteQueries} from './core.mjs';
test('direcciones compactas conservan calle y altura sin inventar barrio ni puerta',()=>{
 assert.equal(shortAddress({address:'Farmacia JKS, 602, Avenida Ángel Torcuato de Alvear, Don Torcuato, Partido de Tigre, Argentina'}),'Avenida Ángel Torcuato de Alvear 602');
 assert.equal(shortAddress({address:'UNSAM, 79 - 25 de Mayo, Villa Progreso, Buenos Aires, Argentina'}),'79 - 25 de Mayo');
 assert.equal(shortAddress({address:'Dirección larga',shortAddress:'Iguazú 940'}),'Iguazú 940');
 assert.equal(shortAddress({address:'Punto de carga'}),'Punto de carga');
});

test('envía el máximo compatible y repone pendientes sin repetir entregadas',()=>{
 const stops=Array.from({length:30},(_,i)=>({id:i,lat:-34-i/1000,lon:-58,done:i<3})),seen=[];
 while(stops.some(s=>!s.done)){
  const plan=navigationPlan(stops);assert.ok(plan.sent.length<=4);
  const url=new URL(plan.url),coords=[...(url.searchParams.get('waypoints')||'').split('|').filter(Boolean),url.searchParams.get('destination')];
  assert.deepEqual(coords,plan.sent.map(s=>`${s.lat},${s.lon}`));
  plan.sent.forEach(s=>{assert.equal(s.done,false);seen.push(s.id);s.done=true;});
 }
 assert.deepEqual(seen,Array.from({length:27},(_,i)=>i+3));assert.equal(navigationPlan(stops).url,null);
 const pending=stops.map(s=>({...s,done:false}));assert.equal(navigationPlan(pending,'maps',{limit:10}).sent.length,10);
 const waze=navigationPlan(pending,'waze');assert.equal(waze.sent.length,1);assert.equal(waze.remaining,29);assert.match(waze.url,/waze.com/);
 const home={lat:-34.5,lon:-58.3};const back=navigationPlan(stops,'maps',{returnPoint:home});assert.deepEqual(back.sent,[home]);
});

test('Maps recibe origen explícito, destino y las paradas intermedias',()=>{
 const origin={lat:-34.5719394,lon:-58.6028684},stops=[{lat:-34.58,lon:-58.61},{lat:-34.59,lon:-58.62}];
 const url=new URL(navigationPlan(stops,'maps',{origin}).url);
 assert.equal(url.searchParams.get('origin'),'-34.5719394,-58.6028684');assert.equal(url.searchParams.get('destination'),'-34.59,-58.62');assert.equal(url.searchParams.get('waypoints'),'-34.58,-58.61');assert.equal(url.searchParams.has('dir_action'),false);
});
test('Maps recibe la altura escrita y no la coordenada aproximada de la calle',()=>{
 const stops=[{lat:-34.60,lon:-58.40,address:'Calle Falsa 1234, CABA',heightVerified:false},{lat:-34.61,lon:-58.41,address:'Avenida Ejemplo 55, CABA',heightVerified:true}];
 const url=new URL(mapsURL(stops,{lat:-34.5,lon:-58.3}));
 assert.equal(url.searchParams.get('waypoints'),'Calle Falsa 1234, CABA');
 assert.equal(url.searchParams.get('destination'),'Avenida Ejemplo 55, CABA');
 assert.equal(url.searchParams.get('origin'),'-34.5,-58.3');
 assert.equal(houseNumberMatches('Calle Falsa 1234, CABA',{address:{road:'Calle Falsa'}}),false);
 assert.equal(houseNumberMatches('Calle Falsa 1234, CABA',{address:{road:'Calle Falsa',house_number:'1234'}}),true);
});
test('un punto elegido manualmente se envía como coordenada exacta a Maps y Waze',()=>{
 const point={lat:-34.61,lon:-58.41,address:'Calle de Prueba 123, CABA',manualPoint:true,done:false};
 const maps=new URL(navigationPlan([point],'maps',{origin:{lat:-34.5,lon:-58.3}}).url);
 const waze=new URL(navigationPlan([point],'waze').url);
 assert.equal(maps.searchParams.get('destination'),'-34.61,-58.41');
 assert.equal(waze.searchParams.get('ll'),'-34.61,-58.41');
});
test('recupera la altura original de paradas antiguas cuando existe en el caché local',()=>{
 const result={display_name:'Calle Falsa, CABA',lat:'-34.6',lon:'-58.4',address:{country_code:'ar',road:'Calle Falsa'}};
 const key='address-local-v1:'+addressSearch('Calle Falsa 1234, CABA',BUENOS_AIRES).url.href;
 const recovered=recoverRouteQueries([{id:'1',address:result.display_name,lat:-34.6,lon:-58.4,done:false}],{[key]:[result]});
 assert.equal(recovered[0].address,'Calle Falsa 1234, CABA');assert.equal(recovered[0].heightVerified,false);
 assert.equal(recovered[0].resolvedAddress,'Calle Falsa, CABA');
});
test('enlaces largos reducen el bloque sin cortar direcciones',()=>{
 const stops=Array.from({length:10},(_,i)=>({lat:-34-i/100,lon:-58,address:`Avenida Ejemplo ${100+i}, Barrio de Prueba, Ciudad de Prueba, Provincia de Buenos Aires, Argentina ${'referencia '.repeat(12)}`,done:false}));
 const plan=navigationPlan(stops,'maps',{limit:10,origin:{lat:-34.5,lon:-58.3}});
 assert.ok(plan.url.length<=2048);assert.ok(plan.sent.length<10);assert.equal(plan.remaining,10-plan.sent.length);
 assert.equal(new URL(plan.url).searchParams.get('destination'),plan.sent.at(-1).address.trim());
});
test('recorrido abierto y regreso al origen cambian el orden óptimo',()=>{
 const m=[[0,1,2],[10,0,1],[1,10,0]];
 assert.deepEqual(optimize(m),[1,2]);assert.equal(routeCost(optimize(m,true),m,true),3);
});
test('conserva las 30 entregas sin duplicados y no empeora el orden inicial',()=>{
 const matrix=Array.from({length:31},(_,i)=>Array.from({length:31},(_,j)=>i===j?0:Math.abs(i-j)+((i*17+j*7)%13)));
 for(const round of [false,true]){const result=optimize(matrix,round);assert.equal(new Set(result).size,30);assert.deepEqual([...result].sort((a,b)=>a-b),Array.from({length:30},(_,i)=>i+1));assert.ok(routeCost(result,matrix,round)<=routeCost(Array.from({length:30},(_,i)=>i+1),matrix,round));}
});
test('rechaza puntos inaccesibles en lugar de inventar distancias',()=>{assert.throws(()=>optimize([[0,null],[1,0]]));});
test('una sola entrega',()=>{assert.deepEqual(optimize([[0,8],[9,0]],true),[1]);});
test('bloques conservan los 30 destinos y el regreso sin omisiones',()=>{
 const stops=Array.from({length:31},(_,i)=>({lat:-34-i/1000,lon:-58,id:i}));const chunks=blocks(stops);assert.equal(chunks.length,8);assert.deepEqual(chunks.flat(),stops);
 for(const chunk of chunks){const url=new URL(mapsURL(chunk));assert.equal(url.searchParams.get('destination'),`${chunk.at(-1).lat},${chunk.at(-1).lon}`);assert.ok((url.searchParams.get('waypoints')||'').split('|').filter(Boolean).length<=3);assert.equal(url.searchParams.has('origin'),false);}
});
test('búsqueda local restringida a Argentina y cercanía, sin reutilizar caché global',()=>{
 const local=addressSearch('San Martin 123',BUENOS_AIRES);
 assert.equal(local.url.searchParams.get('countrycodes'),'ar');assert.equal(local.url.searchParams.get('bounded'),'1');assert.equal(local.url.searchParams.get('addressdetails'),'1');
 const [west,north,east,south]=local.url.searchParams.get('viewbox').split(',').map(Number);assert.ok(west<BUENOS_AIRES.lon&&east>BUENOS_AIRES.lon&&south<BUENOS_AIRES.lat&&north>BUENOS_AIRES.lat);
 assert.notEqual(local.key,addressSearch('San Martin 123',BUENOS_AIRES,'argentina').key);assert.notEqual(local.key,addressSearch('San Martin 123',{lat:-31.4,lon:-64.2}).key);
});
test('descarta otros países y ciudades lejanas, ordena primero la más cercana',()=>{
 const nearby=addressSearch('San Martin 123',BUENOS_AIRES);
 const results=[{lat:-31.4,lon:-64.2,address:{country_code:'ar'}},{lat:-34.61,lon:-58.5,address:{country_code:'ar'}},{lat:-34.6,lon:-58.38,address:{country_code:'ar'}},{lat:-34.6,lon:-58.38,address:{country_code:'uy'}}];
 assert.deepEqual(localAddressResults(results,nearby),[results[2],results[1]]);
 assert.equal(localAddressResults(results,addressSearch('San Martin 123',BUENOS_AIRES,'argentina')).length,3);
});
test('sin GPS busca en Buenos Aires; toda Argentina requiere selección explícita',()=>{
 const local=addressSearch('Belgrano 1200',null);assert.deepEqual(local.center,BUENOS_AIRES);assert.equal(local.url.searchParams.get('bounded'),'1');
 const country=addressSearch('Belgrano 1200',null,'argentina');assert.equal(country.url.searchParams.get('countrycodes'),'ar');assert.equal(country.url.searchParams.has('bounded'),false);
});
