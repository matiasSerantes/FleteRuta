import {test} from 'node:test';
import assert from 'node:assert/strict';
import {optimize,routeCost,blocks,mapsURL,addressSearch,localAddressResults,BUENOS_AIRES} from './core.mjs';
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
